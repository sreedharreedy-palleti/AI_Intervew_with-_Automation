"""
Configuration for AI Assignment Desktop Application.
"""

import os

# Base frontend server URL
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip("/")

# Dedicated profile directory for isolated exam session
USER_DATA_DIR = os.path.join(os.path.expandvars(r"%TEMP%"), "HirePulseExamProfile")

# Application window title
APP_TITLE = "AI Coding Assessment"

# Common browser executable locations on Windows
CHROME_PATHS = [
    os.path.expandvars(r"%ProgramFiles%\Google\Chrome\Application\chrome.exe"),
    os.path.expandvars(r"%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"),
    os.path.expandvars(r"%LocalAppData%\Google\Chrome\Application\chrome.exe"),
]

EDGE_PATHS = [
    os.path.expandvars(r"%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"),
    os.path.expandvars(r"%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"),
    os.path.expandvars(r"%LocalAppData%\Microsoft\Edge\Application\msedge.exe"),
]

# Browser security and media access flags
SECURE_FLAGS = [
    "--disable-pinch",
    "--overscroll-history-navigation=0",
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-features=Translate,OptimizationHints,MediaRouter",
    "--use-fake-ui-for-media-stream",  # Auto-grant camera and microphone permissions inside the dedicated app window
    "--autoplay-policy=no-user-gesture-required",  # Enable audio playback for AI instructions & sound checks
    "--enable-features=WebRTCPeerConnectionWithLocalId",
]

