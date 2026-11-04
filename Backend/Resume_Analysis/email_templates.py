import os
import smtplib
import ssl
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from dotenv import load_dotenv

load_dotenv()

SMTP_SERVER = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
SMTP_ACCOUNT = os.getenv("SMTP_USER", "")
SMTP_CREDENTIAL = os.getenv("SMTP_PASSWORD", "").replace(" ", "")
SENDER_DISPLAY = os.getenv("EMAILS_FROM_NAME", "AI Assessment Portal")
CLIENT_ORIGIN = os.getenv("FRONTEND_URL", "http://localhost:5173")
BACKEND_ORIGIN = os.getenv("BACKEND_URL", "http://localhost:8000")


def notify_shortlisted_candidate(
    email: str,
    name: str,
    course: str,
    ats_score: int,
    test_token: str,
    unique_code: str = "",
    username: str = "",
    assignment_datetime: str = "",
    duration_minutes: int = 60,
    **kwargs,
):
    """
    Sends congratulations, scheduled routine date/time, candidate username,
    unique exam number, and exam security instructions.
    """
    if not SMTP_ACCOUNT or not SMTP_CREDENTIAL:
        print("[SMTP NOTICE] Credentials missing in environment. Email bypassed.")
        return

    c_username = username or email
    c_unique_code = unique_code or "EXAM-REQUIRED"
    c_routine = assignment_datetime or "Active & Open for 48 Hours"
    assignment_web_link = f"{CLIENT_ORIGIN}/assignment/{test_token}"
    app_download_link = f"{BACKEND_ORIGIN}/api/v1/assignment/download/app"

    message = MIMEMultipart("alternative")
    message["Subject"] = f"Shortlisted & AI Coding Assignment Access: {course}"
    message["From"] = f"{SENDER_DISPLAY} <{SMTP_ACCOUNT}>"
    message["To"] = email

    body = f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f19; padding: 32px 12px; color: #f3f4f6;">
      <div style="max-width: 600px; margin: auto; background: #111827; padding: 36px 28px; border-radius: 14px; border: 1px solid rgba(255, 255, 255, 0.12); box-shadow: 0 16px 40px rgba(0,0,0,0.65);">
        
        <!-- Header -->
        <div style="border-bottom: 1px solid rgba(255, 255, 255, 0.1); padding-bottom: 20px; margin-bottom: 24px;">
          <div style="display: inline-block; background: rgba(99, 102, 241, 0.15); color: #818cf8; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; padding: 4px 10px; border-radius: 4px; margin-bottom: 10px; border: 1px solid rgba(99, 102, 241, 0.3);">
            Official Shortlist Notification
          </div>
          <h2 style="color: #ffffff; margin: 0 0 8px 0; font-size: 24px; font-weight: 700;">Application Shortlisted</h2>
          <p style="color: #9ca3af; font-size: 14px; margin: 0;">Target Course: <strong style="color: #60a5fa;">{course}</strong></p>
        </div>

        <!-- Greeting -->
        <p style="font-size: 15px; color: #f3f4f6; margin-top: 0;">Dear <strong>{name}</strong>,</p>
        <p style="color: #9ca3af; font-size: 14px; line-height: 1.6; margin-bottom: 20px;">
          Congratulations! Your resume has been evaluated and your technical match score is <strong style="color: #34d399;">{ats_score}%</strong> (Benchmark: 70%+).
          You have been officially shortlisted for the practical AI coding simulation assessment.
        </p>

        <!-- Credentials & Routine Box -->
        <div style="background: rgba(30, 41, 59, 0.7); border: 1px solid rgba(99, 102, 241, 0.35); border-radius: 10px; padding: 20px; margin: 24px 0;">
          <h3 style="color: #c7d2fe; margin: 0 0 14px 0; font-size: 15px; text-transform: uppercase; letter-spacing: 0.05em; display: flex; align-items: center;">
            Exam Schedule & Access Credentials
          </h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
              <td style="color: #9ca3af; padding: 8px 0; width: 42%;"><strong>Date & Time Routine:</strong></td>
              <td style="color: #34d399; font-weight: 700; padding: 8px 0;">{c_routine}</td>
            </tr>
            <tr>
              <td style="color: #9ca3af; padding: 8px 0;"><strong>Username / Email:</strong></td>
              <td style="color: #ffffff; font-weight: 600; padding: 8px 0; font-family: monospace;">{c_username}</td>
            </tr>
            <tr>
              <td style="color: #9ca3af; padding: 8px 0;"><strong>Unique Exam Code:</strong></td>
              <td style="padding: 8px 0;">
                <span style="background: #1e1b4b; color: #a5b4fc; padding: 4px 10px; border-radius: 6px; font-weight: 800; font-family: monospace; font-size: 15px; border: 1px solid #4338ca; letter-spacing: 0.08em;">
                  {c_unique_code}
                </span>
              </td>
            </tr>
            <tr>
              <td style="color: #9ca3af; padding: 8px 0;"><strong>Duration:</strong></td>
              <td style="color: #ffffff; font-weight: 600; padding: 8px 0;">{duration_minutes} Minutes</td>
            </tr>
          </table>
        </div>

        <!-- AI Assignment Notification Banner -->
        <div style="background: rgba(16, 185, 129, 0.08); border-left: 4px solid #10b981; border-radius: 0 8px 8px 0; padding: 14px 16px; margin: 22px 0;">
          <h4 style="color: #34d399; margin: 0 0 6px 0; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em;">
            ✨ Official AI Coding Simulation Client
          </h4>
          <p style="color: #cbd5e1; font-size: 13px; line-height: 1.5; margin: 0;">
            Your personalized technical assignment has been generated. Please download and install the dedicated <strong>AI Assignment Desktop Application (.exe)</strong> to complete your assessment.
          </p>
        </div>

        <!-- Download Dedicated Application (.exe) Box -->
        <div style="background: rgba(99, 102, 241, 0.08); border: 2px solid rgba(99, 102, 241, 0.45); border-radius: 12px; padding: 24px 20px; text-align: center; margin: 24px 0;">
          <div style="display: inline-block; background: #4f46e5; color: #ffffff; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; padding: 4px 10px; border-radius: 4px; margin-bottom: 12px;">
            Recommended Desktop Client
          </div>
          <h3 style="color: #ffffff; font-size: 18px; margin: 0 0 8px 0; font-weight: 700;">
            Download AI Assignment App (.exe)
          </h3>
          <p style="color: #94a3b8; font-size: 13px; line-height: 1.5; margin: 0 0 16px 0;">
            Install our dedicated desktop client for a secure, distraction-free environment with integrated proctoring and code execution.
          </p>

          <div style="margin-bottom: 14px;">
            <a href="{app_download_link}" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: 800; font-size: 15px; display: inline-block; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.45);">
              📥 Download AIAssignmentSetup.exe (Windows)
            </a>
          </div>

          <!-- Installation Steps -->
          <div style="background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 8px; padding: 14px; text-align: left; font-size: 12px; color: #cbd5e1; margin-top: 14px;">
            <strong style="color: #60a5fa; font-size: 13px;">Simple Installation & Launch Steps:</strong>
            <ol style="margin: 8px 0 0 18px; padding: 0; line-height: 1.7;">
              <li>Click the green button above to download <strong>AIAssignmentSetup.exe</strong>.</li>
              <li>Run the application installer on your Windows computer.</li>
              <li>Enter your Registered Username (<strong>{c_username}</strong>) and Unique Exam Code (<strong>{c_unique_code}</strong>).</li>
              <li>Click <strong>Launch Secure Assessment Window</strong> to begin your assessment!</li>
            </ol>
          </div>
        </div>

        <p style="color: #6b7280; font-size: 12px; text-align: center; margin-top: 10px;">
          Passcode: <strong style="color: #93c5fd;">{c_unique_code}</strong> | Assessment Token: {test_token}
        </p>

        <!-- Footer -->
        <div style="border-top: 1px solid rgba(255, 255, 255, 0.08); padding-top: 18px; margin-top: 26px; color: #64748b; font-size: 12px; line-height: 1.5;">
          Please ensure your webcam and microphone are connected. For technical assistance, reach out to admissions support.
        </div>
      </div>
    </div>
    """
    message.attach(MIMEText(body, "html"))
    _dispatch_smtp(email, message)


def notify_rejected_candidate(email: str, name: str, course: str, ats_score: int):
    """Sends notification if ATS score is below 70%."""
    if not SMTP_ACCOUNT or not SMTP_CREDENTIAL:
        return

    message = MIMEMultipart("alternative")
    message["Subject"] = f"Application Status: {course}"
    message["From"] = f"{SENDER_DISPLAY} <{SMTP_ACCOUNT}>"
    message["To"] = email

    body = f"""
    <div style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 24px;">
      <div style="max-width: 520px; margin: auto; background: #ffffff; padding: 28px; border-radius: 8px; border: 1px solid #e2e8f0;">
        <h2 style="color: #0f172a; margin-top: 0;">Application Status Update</h2>
        <p>Dear <strong>{name}</strong>,</p>
        <p>Thank you for submitting your application for <strong>{course}</strong>.</p>
        
        <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 12px; margin: 16px 0;">
          <strong style="color: #991b1b;">ATS Resume Match Score: {ats_score}% (Minimum required: 70%)</strong>
        </div>

        <p>At this stage, your technical profile does not meet the minimum prerequisites. We recommend updating your core project credentials and reapplying for upcoming cohorts.</p>
      </div>
    </div>
    """
    message.attach(MIMEText(body, "html"))
    _dispatch_smtp(email, message)


def notify_assignment_scheduled(
    email: str,
    name: str,
    course: str,
    assignment_datetime: str,
    assignment_policy: str,
    test_token: str,
    unique_code: str = "",
    username: str = "",
    duration_minutes: int = 60,
    **kwargs,
) -> bool:
    """
    Sends scheduled assignment date, time routine, candidate username,
    unique exam number, and policy rules.
    """
    if not SMTP_ACCOUNT or not SMTP_CREDENTIAL:
        print("[SMTP NOTICE] Credentials missing in environment. Email bypassed.")
        return False

    c_username = username or email
    c_unique_code = unique_code or "EXAM-REQUIRED"
    assignment_link = f"{CLIENT_ORIGIN}/assignment/{test_token}"
    app_download_link = f"{BACKEND_ORIGIN}/api/v1/assignment/download/app"

    message = MIMEMultipart("alternative")
    message["Subject"] = f"Scheduled AI Coding Assignment & Access Code: {course}"
    message["From"] = f"{SENDER_DISPLAY} <{SMTP_ACCOUNT}>"
    message["To"] = email

    policy_lines = [p.strip() for p in (assignment_policy or "").split("\n") if p.strip()]
    if not policy_lines:
        policy_lines = [
            "Application Requirement: Complete this examination exclusively in the dedicated AI Assignment Desktop Application (.exe).",
            "Complete the technical assignment within the allotted duration.",
            "Webcam, microphone, and screen proctoring will be active throughout the interactive session.",
            "Unauthorized tab switching or background applications will disqualify your attempt.",
        ]
    policy_html = "".join([f"<li style='margin-bottom: 8px;'>{line}</li>" for line in policy_lines])

    body = f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f19; padding: 32px 12px; color: #f3f4f6;">
      <div style="max-width: 600px; margin: auto; background: #111827; padding: 36px 28px; border-radius: 14px; border: 1px solid rgba(255, 255, 255, 0.12); box-shadow: 0 16px 40px rgba(0,0,0,0.65);">
        
        <!-- Header -->
        <div style="border-bottom: 1px solid rgba(255, 255, 255, 0.1); padding-bottom: 20px; margin-bottom: 24px;">
          <div style="display: inline-block; background: rgba(16, 185, 129, 0.15); color: #34d399; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; padding: 4px 10px; border-radius: 4px; margin-bottom: 10px; border: 1px solid rgba(16, 185, 129, 0.3);">
            Official Examination Schedule
          </div>
          <h2 style="color: #818cf8; margin: 0 0 6px 0; font-size: 24px; font-weight: 700;">AI Technical Assessment Routine</h2>
          <p style="color: #9ca3af; font-size: 14px; margin: 0;">Course Track: <strong style="color: #ffffff;">{course}</strong></p>
        </div>

        <p style="font-size: 15px; color: #f3f4f6;">Dear <strong>{name}</strong>,</p>
        <p style="color: #9ca3af; font-size: 14px; line-height: 1.6;">
          Your technical AI coding exam has been scheduled by the admissions board. Review your routine date/time and access credentials below:
        </p>

        <!-- Scheduled Routine & Credentials Card -->
        <div style="background: rgba(99, 102, 241, 0.08); border: 1px solid rgba(99, 102, 241, 0.35); border-radius: 10px; padding: 20px; margin: 22px 0;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
              <td style="color: #9ca3af; padding: 8px 0; width: 44%;"><strong>Scheduled Date & Time:</strong></td>
              <td style="color: #34d399; font-weight: 700; padding: 8px 0; font-size: 15px;">{assignment_datetime}</td>
            </tr>
            <tr>
              <td style="color: #9ca3af; padding: 8px 0;"><strong>Username / Email:</strong></td>
              <td style="color: #ffffff; font-weight: 600; padding: 8px 0; font-family: monospace;">{c_username}</td>
            </tr>
            <tr>
              <td style="color: #9ca3af; padding: 8px 0;"><strong>Unique Exam Code:</strong></td>
              <td style="padding: 8px 0;">
                <span style="background: #1e1b4b; color: #a5b4fc; padding: 5px 12px; border-radius: 6px; font-weight: 800; font-family: monospace; font-size: 16px; border: 1px solid #4338ca; letter-spacing: 0.08em;">
                  {c_unique_code}
                </span>
              </td>
            </tr>
            <tr>
              <td style="color: #9ca3af; padding: 8px 0;"><strong>Assessment Duration:</strong></td>
              <td style="color: #ffffff; font-weight: 600; padding: 8px 0;">{duration_minutes} Minutes</td>
            </tr>
          </table>
        </div>

        <!-- Download Dedicated Application (.exe) Box -->
        <div style="background: rgba(99, 102, 241, 0.08); border: 2px solid rgba(99, 102, 241, 0.45); border-radius: 12px; padding: 24px 20px; text-align: center; margin: 24px 0;">
          <div style="display: inline-block; background: #4f46e5; color: #ffffff; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; padding: 4px 10px; border-radius: 4px; margin-bottom: 12px;">
            Recommended Desktop Client
          </div>
          <h3 style="color: #ffffff; font-size: 18px; margin: 0 0 8px 0; font-weight: 700;">
            Download AI Assignment App (.exe)
          </h3>
          <p style="color: #94a3b8; font-size: 13px; line-height: 1.5; margin: 0 0 16px 0;">
            Install our dedicated desktop client for a secure, distraction-free environment with integrated proctoring and code execution.
          </p>

          <div style="margin-bottom: 14px;">
            <a href="{app_download_link}" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: 800; font-size: 15px; display: inline-block; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.45);">
              📥 Download AIAssignmentSetup.exe (Windows)
            </a>
          </div>

          <!-- Installation Steps -->
          <div style="background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 8px; padding: 14px; text-align: left; font-size: 12px; color: #cbd5e1; margin-top: 14px;">
            <strong style="color: #60a5fa; font-size: 13px;">Simple Installation & Launch Steps:</strong>
            <ol style="margin: 8px 0 0 18px; padding: 0; line-height: 1.7;">
              <li>Click the green button above to download <strong>AIAssignmentSetup.exe</strong>.</li>
              <li>Run the application installer on your Windows computer.</li>
              <li>Enter your Registered Username (<strong>{c_username}</strong>) and Unique Exam Code (<strong>{c_unique_code}</strong>).</li>
              <li>Click <strong>Launch Secure Assessment Window</strong> to begin your assessment!</li>
            </ol>
          </div>
        </div>

        <!-- Policy Guidelines -->
        <div style="background: rgba(30, 41, 59, 0.5); padding: 16px 20px; border-radius: 8px; margin: 20px 0;">
          <h4 style="color: #94a3b8; margin: 0 0 10px 0; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em;">Proctoring Rules & Policy:</h4>
          <ul style="color: #cbd5e1; font-size: 13px; line-height: 1.6; margin: 0; padding-left: 18px;">
            {policy_html}
          </ul>
        </div>

        <p style="color: #6b7280; font-size: 12px; text-align: center; margin-top: 14px;">
          Passcode: <strong style="color: #93c5fd;">{c_unique_code}</strong> | Assessment Token: {test_token}
        </p>

        <div style="border-top: 1px solid rgba(255, 255, 255, 0.08); padding-top: 16px; margin-top: 24px; color: #6b7280; font-size: 12px; line-height: 1.5;">
          Ensure your camera and network are verified before starting. Good luck with your assessment!
        </div>
      </div>
    </div>
    """
    message.attach(MIMEText(body, "html"))
    _dispatch_smtp(email, message)
    return True


def _dispatch_smtp(target_email: str, email_msg: MIMEMultipart):
    try:
        ctx = ssl.create_default_context()
        if SMTP_PORT == 465:
            with smtplib.SMTP_SSL(SMTP_SERVER, SMTP_PORT, context=ctx) as server:
                server.login(SMTP_ACCOUNT, SMTP_CREDENTIAL)
                server.send_message(email_msg)
        else:
            with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
                server.starttls(context=ctx)
                server.login(SMTP_ACCOUNT, SMTP_CREDENTIAL)
                server.send_message(email_msg)
        print(f"[SMTP DISPATCH SUCCESS] Delivered email to {target_email}")
    except Exception as exc:
        print(f"[SMTP DISPATCH ERROR] Failed to send email to {target_email}: {exc}")