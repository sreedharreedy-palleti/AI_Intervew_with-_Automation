"""
AI Technical Assessment - Dedicated Desktop Client Launcher
Launches the single unified AI Assignment application window without separate launcher windows:
Step 1: Details Entering (Candidate Email & Unique Exam Code)
Step 2: Normal Camera & Voice Checking
Step 3: AI Coding Assessment Simulation
"""

import sys
import os
import subprocess
import webbrowser


def find_browser():
    """Finds Chrome or Edge executable on Windows."""
    paths = [
        # Chrome paths
        os.path.expandvars(r"%ProgramFiles%\Google\Chrome\Application\chrome.exe"),
        os.path.expandvars(r"%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"),
        os.path.expandvars(r"%LocalAppData%\Google\Chrome\Application\chrome.exe"),
        # Edge paths (Installed on all Windows 10 & 11)
        os.path.expandvars(r"%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"),
        os.path.expandvars(r"%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"),
        os.path.expandvars(r"%LocalAppData%\Microsoft\Edge\Application\msedge.exe"),
    ]
    for p in paths:
        if os.path.exists(p):
            return p
    return None


def create_desktop_shortcut(target_exe, target_args):
    """Creates a desktop shortcut for the candidate to re-open the exam."""
    try:
        desktop = os.path.join(os.path.expanduser("~"), "Desktop")
        if not os.path.exists(desktop):
            return

        shortcut_vbs = os.path.join(desktop, "_temp_exam_shortcut.vbs")
        shortcut_path = os.path.join(desktop, "AI Coding Assessment.lnk")

        script = f"""
Set oWS = WScript.CreateObject("WScript.Shell")
sLinkFile = "{shortcut_path}"
Set oLink = oWS.CreateShortcut(sLinkFile)
oLink.TargetPath = "{target_exe}"
oLink.Arguments = "{target_args}"
oLink.Description = "AI Coding Assessment"
oLink.Save
"""
        with open(shortcut_vbs, "w") as f:
            f.write(script)

        subprocess.run(["cscript", "//nologo", shortcut_vbs], check=True, creationflags=0x08000000 if hasattr(subprocess, "CREATE_NO_WINDOW") else 0)
        if os.path.exists(shortcut_vbs):
            os.remove(shortcut_vbs)
    except Exception:
        pass


def main():
    base_url = os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip("/")
    token = ""

    # Parse command line argument if token passed
    if len(sys.argv) > 1:
        for i, arg in enumerate(sys.argv):
            if arg in ("--token", "-t") and i + 1 < len(sys.argv):
                token = sys.argv[i + 1]
            elif not arg.startswith("-") and len(arg) > 6:
                token = arg

    if token and token not in ("app", "portal", "direct"):
        target_url = f"{base_url}/assignment/{token}?from_app=true"
    else:
        target_url = f"{base_url}/assignment/app?from_app=true"

    browser = find_browser()

    if browser:
        # Launch directly in dedicated single application window mode
        user_data = os.path.join(os.path.expandvars(r"%TEMP%"), "HirePulseExamProfile")
        cmd = [
            browser,
            f"--app={target_url}",
            f"--user-data-dir={user_data}",
            "--start-maximized",
            "--disable-pinch",
            "--overscroll-history-navigation=0",
            "--no-first-run",
            "--no-default-browser-check",
        ]
        create_desktop_shortcut(browser, f'--app={target_url} --user-data-dir="{user_data}" --start-maximized')
        subprocess.Popen(cmd)
    else:
        # Fallback to system browser
        webbrowser.open(target_url)

    # Immediately exit launcher process so no second app or feather icon remains in taskbar
    sys.exit(0)


if __name__ == "__main__":
    main()
