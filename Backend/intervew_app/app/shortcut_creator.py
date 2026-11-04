"""
Windows Desktop shortcut creator utility for AI Technical Interview.
"""

import os
import subprocess


def create_desktop_shortcut(target_exe: str, target_args: str, shortcut_name: str = "AI Technical Interview") -> bool:
    """
    Creates a .lnk shortcut on the current user's Desktop using WScript.Shell.
    """
    try:
        desktop = os.path.join(os.path.expanduser("~"), "Desktop")
        if not os.path.exists(desktop):
            return False

        shortcut_vbs = os.path.join(desktop, "_temp_interview_shortcut.vbs")
        shortcut_path = os.path.join(desktop, f"{shortcut_name}.lnk")

        script = f"""
Set oWS = WScript.CreateObject("WScript.Shell")
sLinkFile = "{shortcut_path}"
Set oLink = oWS.CreateShortcut(sLinkFile)
oLink.TargetPath = "{target_exe}"
oLink.Arguments = "{target_args}"
oLink.Description = "{shortcut_name}"
oLink.Save
"""
        with open(shortcut_vbs, "w") as f:
            f.write(script)

        flags = 0x08000000 if hasattr(subprocess, "CREATE_NO_WINDOW") else 0
        subprocess.run(["cscript", "//nologo", shortcut_vbs], check=True, creationflags=flags)

        if os.path.exists(shortcut_vbs):
            os.remove(shortcut_vbs)
        return True
    except Exception:
        return False

