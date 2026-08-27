let pdfParse = require('pdf-parse');
if (typeof pdfParse !== 'function' && pdfParse.default) {
  pdfParse = pdfParse.default;
}

const extractResumeDetails = require('../utils/resumeExtractor');
const analyzeAtsScore = require('../utils/atsScorer');
const { generateOllamaResponse } = require('../services/ollamaService');
const { sendExamInvitation } = require('../services/emailService');
const ResumeAnalysis = require('../models/ResumeAnalysis');

const analyzeResumeDirectly = async (req, res) => {
  try {
    // 1. Destructure & validate form fields
    const {
      fullName,
      email,
      phone,
      targetRole,
      experienceYears,
      expectedSalary,
      portfolioOrLinkedIn,
      jobDescription
    } = req.body || {};

    if (!fullName || !email || !phone || !targetRole) {
      return res.status(400).json({
        success: false,
        error: 'Mandatory form fields missing: fullName, email, phone, and targetRole are required.'
      });
    }

    // 2. Validate PDF file presence
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Please upload a PDF resume file.'
      });
    }

    // 3. Parse PDF buffer into readable text
    const parsedPdf = await pdfParse(req.file.buffer);
    const rawText = parsedPdf.text;

    if (!rawText || rawText.trim().length === 0) {
      return res.status(422).json({
        success: false,
        error: 'Unable to read text from the PDF. It may be a scanned image or empty.'
      });
    }

    // 4. Extract skills, contact details, and sections
    const extractedData = extractResumeDetails(rawText);

    // 5. Algorithmic ATS scoring
    const targetJD = jobDescription || targetRole;
    const ruleBasedResult = analyzeAtsScore(extractedData, targetJD);

    // 6. Ollama AI evaluation
    let aiAnalysis = null;
    try {
      const systemPrompt = `You are an expert ATS (Applicant Tracking System) reviewer and hiring manager.
Analyze the candidate's resume against their applied role and job description. Return STRICT JSON matching:
{
  "overallAtsScore": number (0-100),
  "matchSummary": "string",
  "matchedSkills": ["skill1", "skill2"],
  "missingSkills": ["skill1", "skill2"],
  "strengths": ["point1", "point2"],
  "improvementSuggestions": ["point1", "point2"],
  "verdict": "string (Shortlisted / Consider / Low Match)"
}`;

      const userPrompt = `
Candidate Applied Role: ${targetRole}
Candidate Stated Experience: ${experienceYears || 0} years
Target Job Description:
${targetJD}

Candidate Extracted Resume Text:
${rawText}
`;

      aiAnalysis = await generateOllamaResponse(userPrompt, systemPrompt);
    } catch (ollamaErr) {
      console.warn('Ollama evaluation warning:', ollamaErr.message);
    }

    const finalScore = aiAnalysis?.overallAtsScore ?? ruleBasedResult.score;

    // 7. Store candidate form data, resume details, and ATS scores into MongoDB
    const savedRecord = await ResumeAnalysis.create({
      candidateDetails: {
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        targetRole: targetRole.trim(),
        experienceYears: Number(experienceYears) || 0,
        expectedSalary: expectedSalary ? expectedSalary.trim() : '',
        portfolioOrLinkedIn: portfolioOrLinkedIn ? portfolioOrLinkedIn.trim() : ''
      },
      jobDescription: targetJD,
      fileName: req.file.originalname,
      fileSize: `${(req.file.size / 1024).toFixed(2)} KB`,
      rawText: rawText,
      detectedSkills: extractedData.detectedSkills || [],
      presentSections: extractedData.presentSections || [],
      finalAtsScore: finalScore,
      ruleBasedAnalysis: ruleBasedResult,
      aiAnalysis: aiAnalysis
    });

    // 8. Trigger Email if ATS score passes threshold
    const passThreshold = Number(process.env.ATS_PASS_THRESHOLD) || 70;
    let emailSent = false;

    if (finalScore >= passThreshold) {
      try {
        await sendExamInvitation({
          recipientEmail: email.trim(),
          candidateName: fullName.trim(),
          candidateId: savedRecord._id.toString(),
          targetRole: targetRole.trim(),
          atsScore: finalScore
        });
        emailSent = true;
      } catch (mailErr) {
        console.error('Failed to send exam invitation email:', mailErr.message);
      }
    }

    return res.status(201).json({
      success: true,
      message: 'Candidate application, resume extraction, and ATS evaluation completed.',
      finalAtsScore: finalScore,
      shortlisted: finalScore >= passThreshold,
      emailNotificationSent: emailSent,
      candidate: savedRecord.candidateDetails,
      atsAnalysis: {
        ruleBased: savedRecord.ruleBasedAnalysis,
        aiEvaluation: savedRecord.aiAnalysis
      },
      recordId: savedRecord._id
    });

  } catch (error) {
    console.error('Error saving application and ATS analysis:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process application and resume',
      details: error.message
    });
  }
};

module.exports = {
  analyzeResumeDirectly
};