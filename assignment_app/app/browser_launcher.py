"""
Browser discovery and secure window launcher.
"""

import os
import subprocess
import webbrowser
from typing import Optional, List

from .config import CHROME_PATHS, EDGE_PATHS, SECURE_FLAGS, USER_DATA_DIR


def find_browser() -> Optional[str]:
    """
    Finds Google Chrome or Microsoft Edge executable on Windows.
    Prefers Google Chrome; falls back to Microsoft Edge if Chrome is not present.
    """
    for path in CHROME_PATHS:
        if os.path.exists(path):
            return path

    for path in EDGE_PATHS:
        if os.path.exists(path):
            return path

    return None


def launch_assessment_window(target_url: str) -> None:
    """
    Launches target assessment URL inside a dedicated single application window.
    Uses an isolated profile to prevent interference from other browser windows.
    """
    browser_exe = find_browser()

    if browser_exe:
        cmd: List[str] = [
            browser_exe,
            f"--app={target_url}",
            f"--user-data-dir={USER_DATA_DIR}",
            "--start-maximized",
            *SECURE_FLAGS,
        ]
        subprocess.Popen(cmd)
    else:
        # Fallback to standard system browser
        webbrowser.open(target_url)

