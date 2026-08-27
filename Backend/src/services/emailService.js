const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

/**
 * Sends exam invitation email with embedded candidate ID & test link
 */
const sendExamInvitation = async ({ recipientEmail, candidateName, candidateId, targetRole, atsScore }) => {
  const frontendBaseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const examLink = `${frontendBaseUrl}/assessment?candidateId=${candidateId}&role=${encodeURIComponent(targetRole)}`;

  const mailOptions = {
    from: `"AI Interview Assessment Portal" <${process.env.EMAIL_USER}>`,
    to: recipientEmail,
    subject: `Congratulations! Invitation to Online Interview Assessment - ${targetRole}`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #2563eb;">Interview Assessment Invitation</h2>
        <p>Dear <strong>${candidateName}</strong>,</p>
        <p>Thank you for submitting your profile for the <strong>${targetRole}</strong> role.</p>
        <p>Your resume successfully passed our preliminary ATS screening with a score of <strong>${atsScore}%</strong>.</p>
        
        <div style="background-color: #f8fafc; border-left: 4px solid #2563eb; padding: 12px 16px; margin: 20px 0;">
          <p style="margin: 0; font-size: 14px;"><strong>Candidate ID:</strong> ${candidateId}</p>
          <p style="margin: 0; font-size: 14px;"><strong>Applied Role:</strong> ${targetRole}</p>
        </div>

        <p>Please click the button below to start your proctored assessment:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${examLink}" target="_blank" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            Start Assessment Now
          </a>
        </div>

        <p style="font-size: 12px; color: #64748b;">If the button does not work, copy and paste this link into your browser:<br>
          <a href="${examLink}" style="color: #2563eb;">${examLink}</a>
        </p>

        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;" />
        <p style="font-size: 12px; color: #94a3b8;">* Note: Ensure your camera and microphone permissions are enabled prior to starting the session.</p>
      </div>
    `
  };

  return transporter.sendMail(mailOptions);
};

module.exports = { sendExamInvitation };