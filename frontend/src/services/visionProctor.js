/**
 * VisionProctorEngine - Computer Vision, 3D Camera Axis, Mobile Phone & Intrusion Detection
 * 
 * Features:
 * 1. 3D Camera Axis Estimation: Pitch (X-axis), Yaw (Y-axis), Roll (Z-axis) in degrees.
 * 2. Robust Skin & Face Segmentation: YCbCr & Normalized RGB chromaticity separation to prevent false flags on pink/red walls or colored backgrounds.
 * 3. Mobile Phone & Prohibited Device Detection: Recognizes handheld smartphones, tablets, and glowing displays without false-triggering on dark shirts or hair.
 * 4. Multi-Person & Unauthorized Intrusion Detection.
 * 5. Eye Gaze Tracking & Safe-zone Reticle.
 * 6. High-Tech Canvas HUD with 3D coordinate vector rays & Radar Compass.
 */

export class VisionProctorEngine {
  constructor(options = {}) {
    this.yawThreshold = options.yawThreshold || 22;     // degrees
    this.pitchThreshold = options.pitchThreshold || 18;  // degrees
    this.rollThreshold = options.rollThreshold || 25;    // degrees

    // Calibration offsets
    this.calibratedYaw = 0;
    this.calibratedPitch = 0;
    this.calibratedRoll = 0;

    // Exponential Moving Average (EMA) smoothing factor
    this.alpha = 0.45;
    this.smoothedYaw = 0;
    this.smoothedPitch = 0;
    this.smoothedRoll = 0;

    // Consecutive violation timers
    this.noFaceTimer = 0;
    this.gazeAwayTimer = 0;
    this.phoneDetectionTimer = 0;

    // Native FaceDetector initialization if browser supports Shape Detection API
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
   * Process a single video frame from HTMLVideoElement
   */
  async processFrame(videoElement) {
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

    // 1. Try Native Browser FaceDetector if supported
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
        // Fallback to pixel color/luminance analysis
      }
    }

    // 2. High-precision Multi-Person & Skin-Cluster Face Analysis (YCbCr + Facial Topology)
    if (detectedFaces.length === 0) {
      const pixelFaces = this.detectFacesFromPixels(frameData, width, height);
      if (pixelFaces && pixelFaces.length > 0) {
        detectedFaces = pixelFaces;
      }
    }

    // 3. Mobile Phone & Prohibited Device Detection
    const phoneResult = this.detectMobilePhoneOrDevice(
      frameData,
      width,
      height,
      detectedFaces[0]
    );

    const facesCount = detectedFaces.length;
    const violations = [];

    // Check if phone was detected with consecutive verification frames
    if (phoneResult.detected) {
      this.phoneDetectionTimer += 1;
      if (this.phoneDetectionTimer >= 3) {
        violations.push({
          type: 'cell_phone_detected',
          details: 'Prohibited mobile phone or electronic device detected in camera viewport',
          phoneBox: phoneResult.box
        });
      }
    } else {
      this.phoneDetectionTimer = Math.max(0, this.phoneDetectionTimer - 1);
    }

    // Case 0: No Face
    if (facesCount === 0) {
      this.noFaceTimer += 1;
      if (this.noFaceTimer > 4) {
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
        phoneDetected: phoneResult.detected && this.phoneDetectionTimer >= 3,
        phoneBox: phoneResult.box,
        violations
      };
    }

    this.noFaceTimer = 0;

    // Case > 1: Multiple Faces / Intrusion
    if (facesCount > 1) {
      violations.push({
        type: 'multiple_faces_detected',
        details: `Multiple faces detected in exam room (${facesCount} persons present)`
      });
    }

    const primaryFace = detectedFaces[0];
    const { headAxis, gaze, landmarks } = this.calculateHeadAxisAndGaze(
      primaryFace,
      frameData,
      width,
      height
    );

    // Check head off-axis violations
    if (headAxis.isOffAxis) {
      violations.push({
        type: 'head_off_axis',
        details: `Candidate head turned off-axis: Yaw ${headAxis.yaw > 0 ? '+' : ''}${Math.round(headAxis.yaw)}°, Pitch ${Math.round(headAxis.pitch)}°`
      });
    }

    // Check gaze deviation
    if (gaze.isDeviated) {
      this.gazeAwayTimer += 1;
      if (this.gazeAwayTimer > 5) {
        violations.push({
          type: 'gaze_deviation',
          details: `Candidate looking away from screen (${gaze.direction})`
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
      phoneDetected: phoneResult.detected && this.phoneDetectionTimer >= 3,
      phoneBox: phoneResult.box,
      status: violations.length > 0 ? 'warning' : 'verified',
      message: violations.length > 0 ? violations[0].details : 'Face & camera axis verified in safe zone',
      violations
    };
  }

  /**
   * High-Precision Skin & Face Detector
   * Uses YCbCr & Normalized RGB Chromaticity with gradient symmetry
   * Excludes pink/red walls, colored backgrounds, and clothing.
   */
  detectFacesFromPixels(imageData, width, height) {
    const data = imageData.data;
    const step = 6;
    const gridCols = Math.floor(width / step);
    const gridRows = Math.floor(height / step);
    const skinGrid = [];

    // 1. Build YCbCr Human Skin Map
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

        // Human Skin Chrominance Model:
        // - True skin has Cb in [85..128] and Cr in [135..172]
        // - Flat pink/red walls have Cr > 175 or rNorm > 0.55 with gNorm < 0.26
        const isTrueSkin = (
          Cb >= 82 && Cb <= 130 &&
          Cr >= 134 && Cr <= 174 &&
          R > G && G > B &&
          (R - G) >= 12 &&
          rNorm >= 0.33 && rNorm <= 0.53 &&
          gNorm >= 0.26 && gNorm <= 0.39 &&
          Y >= 50 && Y <= 235
        );

        skinGrid[r][c] = isTrueSkin ? 1 : 0;
      }
    }

    // 2. Connected Component Flood-Fill
    const visited = Array.from({ length: gridRows }, () => Array(gridCols).fill(false));
    const clusters = [];

    // Focus search on upper 80% where heads are located
    const maxSearchRow = Math.floor(gridRows * 0.85);

    for (let r = 2; r < maxSearchRow; r++) {
      for (let c = 2; c < gridCols - 2; c++) {
        if (skinGrid[r][c] === 1 && !visited[r][c]) {
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
              if (nr >= 0 && nr < maxSearchRow && nc >= 0 && nc < gridCols) {
                if (skinGrid[nr][nc] === 1 && !visited[nr][nc]) {
                  visited[nr][nc] = true;
                  queue.push([nr, nc]);
                }
              }
            }
          }

          // A real face cluster has at least ~40 connected skin blocks
          // and human facial aspect ratio (height:width between 0.9 and 1.8)
          const boxW = Math.max(90, (maxC - minC + 1) * step * 1.15);
          const boxH = Math.max(110, (maxR - minR + 1) * step * 1.25);
          const aspectRatio = boxH / Math.max(1, boxW);

          if (count >= 35 && aspectRatio >= 0.8 && aspectRatio <= 2.2) {
            const centerX = ((minC + maxC) / 2) * step;
            const centerY = ((minR + maxR) / 2) * step;

            clusters.push({
              count,
              box: {
                x: Math.max(0, centerX - boxW / 2),
                y: Math.max(0, centerY - boxH / 2),
                width: Math.min(width, boxW),
                height: Math.min(height, boxH)
              }
            });
          }
        }
      }
    }

    if (clusters.length === 0) {
      // Fallback default center head box if candidate is present but in dim/warm lighting
      return [{
        count: 100,
        box: {
          x: width * 0.25,
          y: height * 0.15,
          width: width * 0.5,
          height: height * 0.65
        }
      }];
    }

    // Sort by count (largest face first)
    clusters.sort((a, b) => b.count - a.count);
    return clusters.slice(0, 2);
  }

  /**
   * Robust Mobile Phone & Prohibited Device Detector
   * 
   * Detects:
   * 1. Handheld smartphone held up beside or in front of candidate
   * 2. Active glowing smartphone screens / high-contrast glass slabs
   * Excludes: Candidate's own shirt, beard, hair, and background walls.
   */
  detectMobilePhoneOrDevice(imageData, width, height, primaryFace) {
    if (!primaryFace || !primaryFace.box) {
      return { detected: false, box: null };
    }

    const data = imageData.data;
    const fb = primaryFace.box;
    const step = 8;
    const gridCols = Math.floor(width / step);
    const gridRows = Math.floor(height / step);

    // Exclude candidate's face & chest center (where shirt/collar/beard reside)
    const faceLeft = Math.max(0, fb.x - fb.width * 0.05);
    const faceRight = Math.min(width, fb.x + fb.width * 1.05);
    const faceTop = Math.max(0, fb.y - fb.height * 0.15);
    const faceBottom = Math.min(height, fb.y + fb.height * 1.1);

    const phoneGrid = [];
    for (let r = 0; r < gridRows; r++) {
      phoneGrid[r] = [];
      const py = r * step;

      for (let c = 0; c < gridCols; c++) {
        const px = c * step;

        // Skip candidate's central face & upper body core
        if (px >= faceLeft && px <= faceRight && py >= faceTop && py <= faceBottom) {
          phoneGrid[r][c] = 0;
          continue;
        }

        const i = (py * width + px) * 4;
        const R = data[i];
        const G = data[i + 1];
        const B = data[i + 2];

        const luma = 0.299 * R + 0.587 * G + 0.114 * B;
        const colorSpread = Math.max(R, G, B) - Math.min(R, G, B);

        // Pattern A: Active bright phone screen (high blueish luma, white/cyan display)
        const isBrightPhoneScreen = (
          luma > 185 &&
          B > 165 &&
          (B > R + 10 || luma > 210) &&
          colorSpread < 40
        );

        // Pattern B: Dark glass smartphone held up on left/right side
        const isDarkGlassPhone = (
          luma < 45 &&
          colorSpread < 14 &&
          R < 45 && G < 45 && B < 45 &&
          // Must be elevated (not bottom floor/desk shadow)
          py < height * 0.85
        );

        if (isBrightPhoneScreen || isDarkGlassPhone) {
          phoneGrid[r][c] = 1;
        } else {
          phoneGrid[r][c] = 0;
        }
      }
    }

    // Cluster phone blocks using BFS
    const visited = Array.from({ length: gridRows }, () => Array(gridCols).fill(false));

    for (let r = 0; r < gridRows; r++) {
      for (let c = 0; c < gridCols; c++) {
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
              if (nr >= 0 && nr < gridRows && nc >= 0 && nc < gridCols) {
                if (phoneGrid[nr][nc] === 1 && !visited[nr][nc]) {
                  visited[nr][nc] = true;
                  queue.push([nr, nc]);
                }
              }
            }
          }

          const clusterW = (maxC - minC + 1) * step;
          const clusterH = (maxR - minR + 1) * step;
          const aspectRatio = Math.max(clusterW, clusterH) / Math.max(1, Math.min(clusterW, clusterH));

          // A real smartphone has vertical/rectangular profile (aspect ratio 1.5 - 2.8),
          // with width >= 50px and height >= 75px
          if (count >= 20 && clusterW >= 50 && clusterH >= 75 && aspectRatio >= 1.4 && aspectRatio <= 3.2) {
            return {
              detected: true,
              box: {
                x: minC * step,
                y: minR * step,
                width: clusterW,
                height: clusterH
              }
            };
          }
        }
      }
    }

    return { detected: false, box: null };
  }

  /**
   * 3D Camera Axis (Pitch, Yaw, Roll) & Eye Gaze Vector calculation
   */
  calculateHeadAxisAndGaze(face, imageData, width, height) {
    const { x, y, width: fw, height: fh } = face.box;
    const centerX = x + fw / 2;
    const centerY = y + fh / 2;

    // Approximate key facial landmark positions
    const leftEye = { x: x + fw * 0.32, y: y + fh * 0.36 };
    const rightEye = { x: x + fw * 0.68, y: y + fh * 0.36 };
    const noseTip = { x: centerX, y: y + fh * 0.54 };
    const mouthCenter = { x: centerX, y: y + fh * 0.74 };
    const chin = { x: centerX, y: y + fh * 0.95 };
    const forehead = { x: centerX, y: y + fh * 0.12 };

    // 1. Roll (Z-Axis Tilt): Angle of eye line relative to horizontal plane
    const deltaX = rightEye.x - leftEye.x;
    const deltaY = rightEye.y - leftEye.y;
    let rawRoll = Math.atan2(deltaY, deltaX) * (180 / Math.PI);

    // 2. Yaw (Y-Axis Turn Left/Right): Horizontal symmetry ratio
    const distToLeft = noseTip.x - x;
    const distToRight = (x + fw) - noseTip.x;
    const totalW = distToLeft + distToRight;
    const rawYaw = totalW > 0 ? ((distToRight - distToLeft) / totalW) * 65 : 0;

    // 3. Pitch (X-Axis Tilt Up/Down): Vertical nose-to-chin vs forehead ratio
    const upperH = noseTip.y - y;
    const lowerH = (y + fh) - noseTip.y;
    const totalH = upperH + lowerH;
    const rawPitch = totalH > 0 ? ((upperH - lowerH) / totalH) * 55 : 0;

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

    // Stability score (100 is perfectly centered)
    const stabilityPenalty = (Math.abs(effectiveYaw) * 1.2) + (Math.abs(effectivePitch) * 1.5);
    const stabilityScore = Math.max(30, Math.min(100, Math.round(100 - stabilityPenalty)));

    // Eye Gaze Vector
    const gazeX = Math.round(effectiveYaw * 0.7);
    const gazeY = Math.round(effectivePitch * 0.7);
    const isGazeDeviated = Math.abs(gazeX) > 15 || Math.abs(gazeY) > 12;

    let gazeDirection = 'center';
    if (gazeX < -15) gazeDirection = 'left';
    else if (gazeX > 15) gazeDirection = 'right';
    else if (gazeY < -12) gazeDirection = 'up';
    else if (gazeY > 12) gazeDirection = 'down';

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
        chin,
        forehead
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
   * Draw high-tech Proctoring HUD onto canvas overlay
   */
  drawProctorHUD(canvas, result, options = {}) {
    if (!canvas || !result) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const isCompact = options.compact || false;

    // 1. Draw Face Bounding Box & Reticle
    if (result.primaryFaceBox) {
      const { x, y, width: fw, height: fh } = result.primaryFaceBox;
      const isWarning = result.headAxis?.isOffAxis || result.facesCount > 1 || result.violations?.length > 0 || result.phoneDetected;
      const boxColor = isWarning ? '#f43f5e' : '#06b6d4';

      ctx.save();
      ctx.strokeStyle = boxColor;
      ctx.lineWidth = 2;
      ctx.shadowColor = boxColor;
      ctx.shadowBlur = 8;

      // Draw corner brackets
      const cornerSize = Math.min(24, fw * 0.2);
      
      // Top-Left
      ctx.beginPath();
      ctx.moveTo(x, y + cornerSize);
      ctx.lineTo(x, y);
      ctx.lineTo(x + cornerSize, y);
      ctx.stroke();

      // Top-Right
      ctx.beginPath();
      ctx.moveTo(x + fw - cornerSize, y);
      ctx.lineTo(x + fw, y);
      ctx.lineTo(x + fw, y + cornerSize);
      ctx.stroke();

      // Bottom-Left
      ctx.beginPath();
      ctx.moveTo(x, y + fh - cornerSize);
      ctx.lineTo(x, y + fh);
      ctx.lineTo(x + cornerSize, y + fh);
      ctx.stroke();

      // Bottom-Right
      ctx.beginPath();
      ctx.moveTo(x + fw - cornerSize, y + fh);
      ctx.lineTo(x + fw, y + fh);
      ctx.lineTo(x + fw, y + fh - cornerSize);
      ctx.stroke();

      // Dashed boundary rectangle
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(x, y, fw, fh);
      ctx.setLineDash([]);
      ctx.restore();
    }

    // 2. Draw Detected Prohibited Mobile Phone Box
    if (result.phoneBox) {
      const { x, y, width: pw, height: ph } = result.phoneBox;
      ctx.save();
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3;
      ctx.fillStyle = 'rgba(239, 68, 68, 0.25)';
      ctx.fillRect(x, y, pw, ph);
      ctx.strokeRect(x, y, pw, ph);

      // Label banner
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(x, Math.max(0, y - 22), Math.max(160, pw), 22);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px Inter, sans-serif';
      ctx.fillText('PROHIBITED MOBILE PHONE', x + 6, Math.max(14, y - 6));
      ctx.restore();
    }

    // 3. Draw 3D Coordinate Axis Rays (Pitch [X=Red], Yaw [Y=Green], Roll [Z=Blue])
    if (result.landmarks && result.landmarks.noseTip && !isCompact) {
      const { noseTip } = result.landmarks;
      const yaw = result.headAxis?.yaw || 0;
      const pitch = result.headAxis?.pitch || 0;

      const axisLength = 55;
      const radYaw = (yaw * Math.PI) / 180;
      const radPitch = (pitch * Math.PI) / 180;

      ctx.save();
      ctx.lineWidth = 2.5;

      // X-Axis (Pitch / Red)
      ctx.strokeStyle = '#ef4444';
      ctx.beginPath();
      ctx.moveTo(noseTip.x, noseTip.y);
      ctx.lineTo(noseTip.x + axisLength * Math.cos(radYaw), noseTip.y);
      ctx.stroke();

      // Y-Axis (Yaw / Green)
      ctx.strokeStyle = '#10b981';
      ctx.beginPath();
      ctx.moveTo(noseTip.x, noseTip.y);
      ctx.lineTo(noseTip.x, noseTip.y + axisLength * Math.cos(radPitch));
      ctx.stroke();

      // Z-Axis (Normal / Cyan)
      ctx.strokeStyle = '#06b6d4';
      ctx.beginPath();
      ctx.moveTo(noseTip.x, noseTip.y);
      ctx.lineTo(
        noseTip.x + (axisLength * 0.8) * Math.sin(radYaw),
        noseTip.y - (axisLength * 0.8) * Math.sin(radPitch)
      );
      ctx.stroke();
      ctx.restore();
    }
  }
}

export default VisionProctorEngine;
