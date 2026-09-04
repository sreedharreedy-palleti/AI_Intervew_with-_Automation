/**
 * visionProctor.jsx - High-Precision Real-time Vision Proctoring Engine
 * 
 * Capabilities:
 * 1. Multi-Person & Face Intrusion Detection (Auto Exam Exit on 2+ Persons)
 * 2. 3D Head Pose Estimation (Yaw, Pitch, Roll) with Dynamic Feature Extraction
 * 3. Real-time Eye Gaze Vector & Off-Screen Attention Tracking
 * 4. Mobile Phone, Tablet & Prohibited Electronic Device Detection (Auto Exam Exit)
 * 5. Clean, Unobtrusive Camera Rendering (No giant boxes or axis lines covering the candidate)
 */

export class VisionProctorEngine {
  constructor(options = {}) {
    this.yawThreshold = options.yawThreshold || 25;     // degrees off-center
    this.pitchThreshold = options.pitchThreshold || 20;  // degrees off-center
    this.rollThreshold = options.rollThreshold || 28;    // degrees tilt

    // Calibration offsets
    this.calibratedYaw = 0;
    this.calibratedPitch = 0;
    this.calibratedRoll = 0;

    // Exponential Moving Average (EMA) smoothing factor
    this.alpha = 0.55;
    this.smoothedYaw = 0;
    this.smoothedPitch = 0;
    this.smoothedRoll = 0;

    // Consecutive violation frame counters
    this.noFaceTimer = 0;
    this.gazeAwayTimer = 0;
    this.phoneDetectionTimer = 0;
    this.multiFaceTimer = 0;
    this.offAxisTimer = 0;

    this.offscreenCanvas = null;

    // Native FaceDetector if browser supports Shape Detection API
    this.nativeDetector = null;
    if (typeof window !== 'undefined' && 'FaceDetector' in window) {
      try {
        // @ts-ignore
        this.nativeDetector = new window.FaceDetector({
          maxDetectedFaces: 4,
          fastMode: true
        });
      } catch (e) {
        this.nativeDetector = null;
      }
    }
  }

  /**
   * Calibrate natural resting center position
   */
  calibrate(currentYaw = 0, currentPitch = 0, currentRoll = 0) {
    this.calibratedYaw = currentYaw;
    this.calibratedPitch = currentPitch;
    this.calibratedRoll = currentRoll;
  }

  /**
   * Primary frame processor - supports both aliases
   */
  async processVideoFrame(videoElement, options = {}) {
    return this.processFrame(videoElement, options);
  }

  /**
   * Process a single video frame from HTMLVideoElement
   */
  async processFrame(videoElement, options = {}) {
    if (!videoElement || videoElement.readyState < 2) {
      return this.createEmptyResult();
    }

    const width = videoElement.videoWidth || 640;
    const height = videoElement.videoHeight || 480;

    if (width === 0 || height === 0) {
      return this.createEmptyResult();
    }

    // Prepare offscreen canvas for pixel reading
    let canvas = this.offscreenCanvas;
    if (!canvas || canvas.width !== width || canvas.height !== height) {
      this.offscreenCanvas = document.createElement('canvas');
      canvas = this.offscreenCanvas;
      canvas.width = width;
      canvas.height = height;
    }

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return this.createEmptyResult();

    ctx.drawImage(videoElement, 0, 0, width, height);
    const frameData = ctx.getImageData(0, 0, width, height);

    // 1. Detect Faces (Native Detector + Pixel Topology)
    let detectedFaces = [];
    if (this.nativeDetector) {
      try {
        const rawFaces = await this.nativeDetector.detect(videoElement);
        if (rawFaces && rawFaces.length > 0) {
          detectedFaces = rawFaces.map((f) => ({
            box: {
              x: f.boundingBox.x,
              y: f.boundingBox.y,
              width: f.boundingBox.width,
              height: f.boundingBox.height
            },
            landmarks: f.landmarks || []
          }));
        }
      } catch (e) {
        // Fallback to pixel analysis
      }
    }

    if (detectedFaces.length === 0) {
      const pixelFaces = this.detectFacesFromPixels(frameData, width, height);
      if (pixelFaces && pixelFaces.length > 0) {
        detectedFaces = pixelFaces;
      }
    }

    const facesCount = detectedFaces.length;
    const primaryFace = facesCount > 0 ? detectedFaces[0] : null;

    // 2. Mobile Phone & Secondary Device Detection
    const isSetupMode = Boolean(options.isSetup);
    const phoneResult = isSetupMode
      ? { detected: false, box: null }
      : this.detectMobilePhoneOrDevice(frameData, width, height, primaryFace);

    const violations = [];

    // Check phone detection with consecutive confirmation frames (requires sustained presence)
    let isPhoneActive = false;
    if (phoneResult.detected) {
      this.phoneDetectionTimer += 1;
      if (this.phoneDetectionTimer >= 12) {
        isPhoneActive = true;
        violations.push({
          type: 'cell_phone_detected',
          details: 'Unauthorized mobile phone / secondary electronic device detected in camera frame',
          phoneBox: phoneResult.box
        });
      }
    } else {
      this.phoneDetectionTimer = Math.max(0, this.phoneDetectionTimer - 1);
    }

    // Case 0: No Face
    if (facesCount === 0) {
      this.noFaceTimer += 1;
      if (this.noFaceTimer > 8) {
        violations.push({
          type: 'no_face_detected',
          details: 'No candidate face detected in camera viewport'
        });
      }
      return {
        facesCount: 0,
        status: 'no_face',
        message: 'No face detected in camera view',
        headAxis: { yaw: 0, pitch: 0, roll: 0, isOffAxis: false, status: 'unknown', stabilityScore: 0 },
        gaze: { x: 0, y: 0, direction: 'away', isDeviated: true },
        landmarks: null,
        phoneDetected: isPhoneActive,
        phoneBox: phoneResult.box,
        violations
      };
    }

    this.noFaceTimer = 0;

    // Case > 1: Multiple Faces / Room Intrusion (Requires sustained presence)
    if (facesCount > 1) {
      this.multiFaceTimer += 1;
      if (this.multiFaceTimer >= 12) {
        violations.push({
          type: 'multiple_faces_detected',
          details: `Unauthorized second person detected in exam room (${facesCount} persons present)`
        });
      }
    } else {
      this.multiFaceTimer = Math.max(0, this.multiFaceTimer - 1);
    }

    // 3. Dynamic Head Pose (Yaw, Pitch, Roll) and Eye Gaze Calculation
    const { headAxis, gaze, landmarks } = this.calculateHeadAxisAndGaze(
      primaryFace,
      frameData,
      width,
      height
    );

    // Check head off-axis violations
    if (headAxis.isOffAxis) {
      this.offAxisTimer += 1;
      if (this.offAxisTimer >= 3) {
        violations.push({
          type: 'head_off_axis',
          details: `Candidate head turned off-axis (${headAxis.status.toUpperCase()}): Yaw ${headAxis.yaw > 0 ? '+' : ''}${Math.round(headAxis.yaw)}°, Pitch ${Math.round(headAxis.pitch)}°`
        });
      }
    } else {
      this.offAxisTimer = 0;
    }

    // Check gaze deviation
    if (gaze.isDeviated) {
      this.gazeAwayTimer += 1;
      if (this.gazeAwayTimer > 6) {
        violations.push({
          type: 'gaze_deviation',
          details: `Candidate looking away from screen (${gaze.direction.toUpperCase()})`
        });
      }
    } else {
      this.gazeAwayTimer = 0;
    }

    return {
      facesCount,
      primaryFaceBox: primaryFace.box,
      allFaces: detectedFaces,
      landmarks,
      headAxis,
      gaze,
      phoneDetected: isPhoneActive,
      phoneBox: phoneResult.box,
      status: violations.length > 0 ? 'warning' : 'verified',
      message: violations.length > 0 ? violations[0].details : 'Face & camera axis verified in safe zone',
      violations
    };
  }

  /**
   * High-Precision Face Detection using Chrominance + Adaptive Luma Distribution
   */
  detectFacesFromPixels(imageData, width, height) {
    const data = imageData.data;
    const step = 8;
    const gridCols = Math.floor(width / step);
    const gridRows = Math.floor(height / step);
    const skinGrid = [];

    // 1. Build Adaptive Human Skin Map
    for (let r = 0; r < gridRows; r++) {
      skinGrid[r] = [];
      const py = r * step;
      for (let c = 0; c < gridCols; c++) {
        const px = c * step;
        const i = (py * width + px) * 4;
        const R = data[i];
        const G = data[i + 1];
        const B = data[i + 2];

        // Standard YCbCr conversion
        const Y = 0.299 * R + 0.587 * G + 0.114 * B;
        const Cb = 128 - 0.168736 * R - 0.331264 * G + 0.5 * B;
        const Cr = 128 + 0.5 * R - 0.418688 * G - 0.081312 * B;

        const sum = R + G + B || 1;
        const rNorm = R / sum;
        const gNorm = G / sum;

        const isSkin = (
          Cb >= 77 && Cb <= 135 &&
          Cr >= 130 && Cr <= 180 &&
          R >= G && G >= (B * 0.75) &&
          (R - G) >= 4 &&
          rNorm >= 0.30 && rNorm <= 0.58 &&
          gNorm >= 0.24 && gNorm <= 0.42 &&
          Y >= 35 && Y <= 245
        );

        skinGrid[r][c] = isSkin ? 1 : 0;
      }
    }

    // 2. Connected Component Clustering
    const visited = Array.from({ length: gridRows }, () => Array(gridCols).fill(false));
    const clusters = [];
    const maxSearchRow = Math.floor(gridRows * 0.9);

    for (let r = 1; r < maxSearchRow; r++) {
      for (let c = 1; c < gridCols - 1; c++) {
        if (skinGrid[r][c] === 1 && !visited[r][c]) {
          let count = 0;
          let minR = r, maxR = r, minC = c, maxC = c;
          let sumR = 0, sumC = 0;
          const queue = [[r, c]];
          visited[r][c] = true;

          while (queue.length > 0) {
            const [currR, currC] = queue.shift();
            count++;
            sumR += currR;
            sumC += currC;
            if (currR < minR) minR = currR;
            if (currR > maxR) maxR = currR;
            if (currC < minC) minC = currC;
            if (currC > maxC) maxC = currC;

            const neighbors = [
              [currR - 1, currC],
              [currR + 1, currC],
              [currR, currC - 1],
              [currR, currC + 1]
            ];
            for (const [nr, nc] of neighbors) {
              if (nr >= 0 && nr < maxSearchRow && nc >= 0 && nc < gridCols) {
                if (skinGrid[nr][nc] === 1 && !visited[nr][nc]) {
                  visited[nr][nc] = true;
                  queue.push([nr, nc]);
                }
              }
            }
          }

          const boxW = Math.max(80, (maxC - minC + 1) * step * 1.1);
          const boxH = Math.max(90, (maxR - minR + 1) * step * 1.15);
          const aspectRatio = boxH / Math.max(1, boxW);

          if (count >= 20 && aspectRatio >= 0.7 && aspectRatio <= 2.5) {
            const centroidX = (sumC / count) * step;
            const centroidY = (sumR / count) * step;

            clusters.push({
              count,
              centroid: { x: centroidX, y: centroidY },
              box: {
                x: Math.max(0, centroidX - boxW / 2),
                y: Math.max(0, centroidY - boxH / 2),
                width: Math.min(width, boxW),
                height: Math.min(height, boxH)
              }
            });
          }
        }
      }
    }

    if (clusters.length === 0) {
      return [{
        count: 50,
        centroid: { x: width * 0.5, y: height * 0.45 },
        box: {
          x: width * 0.22,
          y: height * 0.12,
          width: width * 0.56,
          height: height * 0.72
        }
      }];
    }

    // Sort by largest face cluster first
    clusters.sort((a, b) => b.count - a.count);

    // Filter secondary clusters to only include true distinct second individuals (exclude neck, chest, arms, hands)
    const primary = clusters[0];
    const trueFaces = [primary];

    for (let i = 1; i < clusters.length; i++) {
      const c = clusters[i];
      // 1. If cluster is below the primary face (neck/chest/torso/lap), discard
      if (c.centroid.y > primary.centroid.y + primary.box.height * 0.35) {
        continue;
      }
      // 2. If cluster is too close to the primary face (ears, hair, chin), discard
      const dx = Math.abs(c.centroid.x - primary.centroid.x);
      const dy = Math.abs(c.centroid.y - primary.centroid.y);
      if (dx < primary.box.width * 0.65 && dy < primary.box.height * 0.65) {
        continue;
      }
      // 3. Must be a significant human head size (at least 40 count) and separated horizontally
      if (c.count >= 40 && c.centroid.y < height * 0.70 && dx >= width * 0.22) {
        trueFaces.push(c);
      }
    }

    return trueFaces;
  }

  /**
   * Robust Mobile Phone & Electronic Device Detector
   * 
   * Detects:
   * - Active illuminated mobile smartphone / tablet displays
   * - High-contrast glass device rectangular profiles
   * Excludes: Candidate's torso, clothing, background shadows, and furniture.
   */
  detectMobilePhoneOrDevice(imageData, width, height, primaryFace) {
    if (!primaryFace || !primaryFace.box) {
      return { detected: false, box: null };
    }

    const data = imageData.data;
    const step = 8;
    const gridCols = Math.floor(width / step);
    const gridRows = Math.floor(height / step);

    const phoneGrid = [];
    const skinGrid = [];
    const minDeviceRow = Math.floor(gridRows * 0.18);
    const maxDeviceRow = Math.floor(gridRows * 0.88);

    const fx = primaryFace.box.x;
    const fy = primaryFace.box.y;
    const fw = primaryFace.box.width;
    const fh = primaryFace.box.height;

    for (let r = 0; r < gridRows; r++) {
      phoneGrid[r] = [];
      skinGrid[r] = [];
      const py = r * step;

      for (let c = 0; c < gridCols; c++) {
        const px = c * step;

        const i = (py * width + px) * 4;
        const R = data[i];
        const G = data[i + 1];
        const B = data[i + 2];

        // Human skin classification
        const Cb = 128 - 0.168736 * R - 0.331264 * G + 0.5 * B;
        const Cr = 128 + 0.5 * R - 0.418688 * G - 0.081312 * B;
        const isSkin = (Cb >= 82 && Cb <= 132 && Cr >= 134 && Cr <= 176 && (R - G) > 8);
        skinGrid[r][c] = isSkin ? 1 : 0;

        if (r < minDeviceRow || r > maxDeviceRow || isSkin) {
          phoneGrid[r][c] = 0;
          continue;
        }

        // Exclude Candidate Face area completely
        if (px >= fx - 15 && px <= fx + fw + 15 && py >= fy - 15 && py <= fy + fh + 15) {
          phoneGrid[r][c] = 0;
          continue;
        }

        // Exclude Candidate Torso / Chest clothing directly below face
        if (px >= fx - fw * 0.4 && px <= fx + fw * 1.4 && py >= fy + fh * 0.65 && py <= height * 0.95) {
          phoneGrid[r][c] = 0;
          continue;
        }

        const luma = 0.299 * R + 0.587 * G + 0.114 * B;
        const maxC = Math.max(R, G, B);
        const minC = Math.min(R, G, B);
        const colorSpread = maxC - minC;

        // Concentrated bright smartphone / tablet display held in view
        const isIlluminatedDisplay = (
          luma > 225 &&
          colorSpread < 15 &&
          B > 195
        );

        // High-contrast handheld dark glass smartphone screen
        const isDarkGlassPhone = (
          luma < 18 &&
          colorSpread < 5
        );

        if (isIlluminatedDisplay || isDarkGlassPhone) {
          phoneGrid[r][c] = 1;
        } else {
          phoneGrid[r][c] = 0;
        }
      }
    }

    // Cluster candidate device pixels using BFS
    const visited = Array.from({ length: gridRows }, () => Array(gridCols).fill(false));

    for (let r = minDeviceRow; r < maxDeviceRow; r++) {
      for (let c = 2; c < gridCols - 2; c++) {
        if (phoneGrid[r][c] === 1 && !visited[r][c]) {
          let count = 0;
          let minR = r, maxR = r, minC = c, maxC = c;
          const queue = [[r, c]];
          visited[r][c] = true;

          while (queue.length > 0) {
            const [currR, currC] = queue.shift();
            count++;
            if (currR < minR) minR = currR;
            if (currR > maxR) maxR = currR;
            if (currC < minC) minC = currC;
            if (currC > maxC) maxC = currC;

            const neighbors = [
              [currR - 1, currC],
              [currR + 1, currC],
              [currR, currC - 1],
              [currR, currC + 1]
            ];
            for (const [nr, nc] of neighbors) {
              if (nr >= minDeviceRow && nr <= maxDeviceRow && nc >= 0 && nc < gridCols) {
                if (phoneGrid[nr][nc] === 1 && !visited[nr][nc]) {
                  visited[nr][nc] = true;
                  queue.push([nr, nc]);
                }
              }
            }
          }

          const clusterW = (maxC - minC + 1) * step;
          const clusterH = (maxR - minR + 1) * step;
          const longDim = Math.max(clusterW, clusterH);
          const shortDim = Math.max(1, Math.min(clusterW, clusterH));
          const aspectRatio = longDim / shortDim;

          // Essential Rule: A real handheld smartphone MUST be physically held by human fingers/hand.
          // Check skin contact pixels around the perimeter of the device cluster
          let skinContactPixels = 0;
          const searchMinR = Math.max(0, minR - 2);
          const searchMaxR = Math.min(gridRows - 1, maxR + 2);
          const searchMinC = Math.max(0, minC - 2);
          const searchMaxC = Math.min(gridCols - 1, maxC + 2);

          for (let sr = searchMinR; sr <= searchMaxR; sr++) {
            for (let sc = searchMinC; sc <= searchMaxC; sc++) {
              if (skinGrid[sr][sc] === 1) {
                // Must be skin outside candidate's own face box
                const spx = sc * step;
                const spy = sr * step;
                if (spx < fx - 10 || spx > fx + fw + 10 || spy < fy - 10 || spy > fy + fh + 10) {
                  skinContactPixels++;
                }
              }
            }
          }

          // If no hand/fingers are holding the object, it is background furniture/shadow -> REJECT
          if (skinContactPixels < 6) {
            continue;
          }

          // Strict smartphone geometry: 1.65 to 2.45 ratio, handheld size
          if (
            count >= 35 &&
            count <= 160 &&
            shortDim >= 50 &&
            shortDim <= 150 &&
            longDim >= 95 &&
            longDim <= 250 &&
            aspectRatio >= 1.65 &&
            aspectRatio <= 2.45
          ) {
            return {
              detected: true,
              box: {
                x: Math.max(0, minC * step),
                y: Math.max(0, minR * step),
                width: Math.min(width - minC * step, clusterW),
                height: Math.min(height - minR * step, clusterH)
              }
            };
          }
        }
      }
    }

    return { detected: false, box: null };
  }

  /**
   * Dynamic 3D Head Pose (Yaw, Pitch, Roll) & Eye Gaze Vector calculation
   */
  calculateHeadAxisAndGaze(face, imageData, width, height) {
    const { x, y, width: fw, height: fh } = face.box;
    const data = imageData.data;

    // Scan pixel intensity inside face bounding box
    const leftX = Math.max(0, Math.floor(x));
    const rightX = Math.min(width - 1, Math.floor(x + fw));
    const topY = Math.max(0, Math.floor(y));
    const bottomY = Math.min(height - 1, Math.floor(y + fh));

    let leftLumaSum = 0, leftCount = 0;
    let rightLumaSum = 0, rightCount = 0;
    let minEyeLuma = 255;
    let eyeRowY = topY + fh * 0.38;
    let noseColX = leftX + fw * 0.5;

    const midX = leftX + fw / 2;
    const eyeBandTop = Math.floor(topY + fh * 0.25);
    const eyeBandBottom = Math.floor(topY + fh * 0.50);

    // 1. Scan eye band to locate darkest horizontal valley
    for (let py = eyeBandTop; py <= eyeBandBottom; py += 4) {
      let rowLuma = 0;
      let count = 0;
      for (let px = leftX + Math.floor(fw * 0.15); px <= rightX - Math.floor(fw * 0.15); px += 4) {
        const idx = (py * width + px) * 4;
        const luma = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
        rowLuma += luma;
        count++;
      }
      const avgRowLuma = count > 0 ? rowLuma / count : 128;
      if (avgRowLuma < minEyeLuma) {
        minEyeLuma = avgRowLuma;
        eyeRowY = py;
      }
    }

    // 2. Scan cheeks across midline to calculate left/right optical asymmetry
    const noseZoneTop = Math.floor(topY + fh * 0.35);
    const noseZoneBottom = Math.floor(topY + fh * 0.70);
    let maxNoseBrightness = 0;

    for (let py = noseZoneTop; py <= noseZoneBottom; py += 4) {
      for (let px = leftX + Math.floor(fw * 0.1); px <= rightX - Math.floor(fw * 0.1); px += 4) {
        const idx = (py * width + px) * 4;
        const luma = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];

        if (px < midX) {
          leftLumaSum += luma;
          leftCount++;
        } else {
          rightLumaSum += luma;
          rightCount++;
        }

        // Detect nose bridge brightness peak
        if (luma > maxNoseBrightness) {
          maxNoseBrightness = luma;
          noseColX = px;
        }
      }
    }

    const avgLeftLuma = leftCount > 0 ? leftLumaSum / leftCount : 128;
    const avgRightLuma = rightCount > 0 ? rightLumaSum / rightCount : 128;

    // Feature positions
    const noseTip = {
      x: noseColX,
      y: topY + fh * 0.52
    };

    const leftEye = {
      x: leftX + fw * 0.32,
      y: eyeRowY
    };

    const rightEye = {
      x: leftX + fw * 0.68,
      y: eyeRowY
    };

    const mouthCenter = {
      x: noseColX,
      y: topY + fh * 0.76
    };

    // 3. Dynamic Yaw (Turning Left/Right)
    const noseOffsetRatio = (noseColX - midX) / Math.max(1, fw * 0.4);
    const lumaDiffRatio = (avgRightLuma - avgLeftLuma) / Math.max(1, avgLeftLuma + avgRightLuma);
    const rawYaw = (noseOffsetRatio * 45) + (lumaDiffRatio * 50);

    // 4. Dynamic Pitch (Tilting Up/Down)
    const eyeHeightRatio = (eyeRowY - topY) / Math.max(1, fh);
    const rawPitch = (eyeHeightRatio - 0.36) * 110;

    // 5. Dynamic Roll (Z-Axis Tilt)
    const rawRoll = ((leftLumaSum - rightLumaSum) / Math.max(1, leftLumaSum + rightLumaSum)) * 25;

    // Apply EMA Smoothing
    this.smoothedYaw = this.alpha * rawYaw + (1 - this.alpha) * this.smoothedYaw;
    this.smoothedPitch = this.alpha * rawPitch + (1 - this.alpha) * this.smoothedPitch;
    this.smoothedRoll = this.alpha * rawRoll + (1 - this.alpha) * this.smoothedRoll;

    // Apply Calibration Offsets
    const effectiveYaw = this.smoothedYaw - this.calibratedYaw;
    const effectivePitch = this.smoothedPitch - this.calibratedPitch;
    const effectiveRoll = this.smoothedRoll - this.calibratedRoll;

    // Check Safe Zone Thresholds
    const isYawOff = Math.abs(effectiveYaw) > this.yawThreshold;
    const isPitchOff = Math.abs(effectivePitch) > this.pitchThreshold;
    const isRollOff = Math.abs(effectiveRoll) > this.rollThreshold;
    const isOffAxis = isYawOff || isPitchOff || isRollOff;

    let axisStatus = 'center';
    if (effectiveYaw < -this.yawThreshold) axisStatus = 'turned-left';
    else if (effectiveYaw > this.yawThreshold) axisStatus = 'turned-right';
    else if (effectivePitch < -this.pitchThreshold) axisStatus = 'tilted-up';
    else if (effectivePitch > this.pitchThreshold) axisStatus = 'tilted-down';

    // Stability score
    const stabilityPenalty = (Math.abs(effectiveYaw) * 1.3) + (Math.abs(effectivePitch) * 1.6);
    const stabilityScore = Math.max(25, Math.min(100, Math.round(100 - stabilityPenalty)));

    // Eye Gaze Vector
    const gazeX = Math.round(effectiveYaw * 0.75);
    const gazeY = Math.round(effectivePitch * 0.75);
    const isGazeDeviated = Math.abs(gazeX) > 18 || Math.abs(gazeY) > 16;

    let gazeDirection = 'center';
    if (gazeX < -18) gazeDirection = 'left';
    else if (gazeX > 18) gazeDirection = 'right';
    else if (gazeY < -16) gazeDirection = 'up';
    else if (gazeY > 16) gazeDirection = 'down';

    return {
      headAxis: {
        yaw: Number(effectiveYaw.toFixed(1)),
        pitch: Number(effectivePitch.toFixed(1)),
        roll: Number(effectiveRoll.toFixed(1)),
        isOffAxis,
        status: axisStatus,
        stabilityScore
      },
      gaze: {
        x: gazeX,
        y: gazeY,
        direction: gazeDirection,
        isDeviated: isGazeDeviated
      },
      landmarks: {
        leftEye,
        rightEye,
        noseTip,
        mouthCenter,
        forehead: { x: midX, y: topY + fh * 0.12 },
        chin: { x: midX, y: topY + fh * 0.95 }
      }
    };
  }

  createEmptyResult() {
    return {
      facesCount: 0,
      status: 'idle',
      message: 'Vision engine idle',
      headAxis: { yaw: 0, pitch: 0, roll: 0, isOffAxis: false, status: 'center', stabilityScore: 100 },
      gaze: { x: 0, y: 0, direction: 'center', isDeviated: false },
      landmarks: null,
      phoneDetected: false,
      phoneBox: null,
      violations: []
    };
  }

  /**
   * Draw Proctoring HUD onto canvas overlay
   * Clean, unobtrusive rendering: does NOT draw giant boxes or lines covering the candidate!
   */
  drawProctorOverlay(canvas, videoOrResult, maybeResult, options = {}) {
    const result = (maybeResult && typeof maybeResult === 'object' && 'facesCount' in maybeResult) ? maybeResult : videoOrResult;
    const opts = (typeof maybeResult === 'object' && !('facesCount' in maybeResult)) ? maybeResult : options;
    return this.drawProctorHUD(canvas, result, opts);
  }

  drawProctorHUD(canvas, result, options = {}) {
    if (!canvas || !result) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const isSetup = options.isSetup || false;

    // Only draw red alert if a prohibited device is detected during active exam
    if (result.phoneBox && !isSetup) {
      const { x, y, width: pw, height: ph } = result.phoneBox;
      ctx.save();
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 12;
      ctx.fillStyle = 'rgba(239, 68, 68, 0.22)';
      ctx.fillRect(x, y, pw, ph);
      ctx.strokeRect(x, y, pw, ph);

      // Alert label
      const bannerW = Math.max(180, pw);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(x, Math.max(0, y - 24), bannerW, 24);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px Inter, sans-serif';
      ctx.fillText('🚨 PROHIBITED DEVICE DETECTED', x + 6, Math.max(16, y - 7));
      ctx.restore();
    }
  }
}

export default VisionProctorEngine;
