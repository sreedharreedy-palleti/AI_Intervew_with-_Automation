# AI Assignment Desktop Application (`assignment_app`)

The dedicated Windows client application for the **HirePulse AI Coding Assessment Platform**.

## Folder Structure

```
assignment_app/
├── app/                        # Application Source Code
│   ├── __init__.py             # Package initializer
│   ├── main.py                 # Application entry point
│   ├── config.py               # URLs, paths, and security flags
│   ├── browser_launcher.py     # Chromium launcher (--app & --user-data-dir mode)
│   └── shortcut_creator.py     # Desktop shortcut (.lnk) utility
├── dist/                       # Output directory for compiled binaries
│   └── AIAssignmentSetup.exe   # Standalone Windows executable
├── build_app.py                # Automated PyInstaller build script
├── build_app.bat               # 1-Click Windows batch script to compile
├── requirements.txt            # Python dependencies (pyinstaller)
└── README.md                   # Documentation
```

## How It Works

1. **Single-Window Launch**:
   - The launcher discovers Google Chrome or Microsoft Edge on the candidate's machine.
   - It starts the examination window in dedicated standalone mode (`--app=...`) using an isolated user profile (`--user-data-dir`).
   - The launcher process exits immediately (`sys.exit(0)`), ensuring **zero background processes** and only **one application window** on screen.

2. **Linear 3-Step Candidate Experience**:
   - **Step 1: Login Gmail & Code**: Candidate enters their registered email and Unique Exam Code.
   - **Step 2: Camera & Voice Access**: Candidate grants webcam and microphone permissions, checks live feed, and captures reference snapshot.
   - **Step 3: AI Assignment Opens**: The coding workspace unlocks with questions, code editor, test runner, and AI proctoring feed.

## Building the Executable

### Option 1: 1-Click Batch Script
Double-click `build_app.bat` in Windows Explorer.

### Option 2: Python Script
```powershell
python build_app.py
```

The compiled binary is automatically output to `assignment_app/dist/AIAssignmentSetup.exe` and copied to `Backend/static/downloads/AIAssignmentSetup.exe` for candidate downloads.

