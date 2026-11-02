"""
AI Technical Assessment - Secure Desktop Client & Installer
Allows candidates to download, install, and run their AI coding assessment
in a dedicated, secure desktop application environment.
"""

import sys
import os
import subprocess
import webbrowser
import shutil
from pathlib import Path
import tkinter as tk
from tkinter import ttk, messagebox


def find_browser():
    """Finds Chrome or Edge executable on Windows."""
    paths = [
        # Chrome paths
        os.path.expandvars(r"%ProgramFiles%\Google\Chrome\Application\chrome.exe"),
        os.path.expandvars(r"%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"),
        os.path.expandvars(r"%LocalAppData%\Google\Chrome\Application\chrome.exe"),
        # Edge paths
        os.path.expandvars(r"%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"),
        os.path.expandvars(r"%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"),
        os.path.expandvars(r"%LocalAppData%\Microsoft\Edge\Application\msedge.exe"),
    ]
    for p in paths:
        if os.path.exists(p):
            return p
    return None


class AIAssignmentDesktopApp:
    def __init__(self, root, default_token=""):
        self.root = root
        self.root.title("AI Assignment Portal - Secure Desktop Client")
        self.root.geometry("560x640")
        self.root.minsize(500, 580)
        self.root.configure(bg="#0b0f19")

        # Style configuration
        self.bg_dark = "#0b0f19"
        self.card_bg = "#111827"
        self.input_bg = "#1f2937"
        self.border_color = "#374151"
        self.primary_color = "#6366f1"
        self.primary_hover = "#4f46e5"
        self.text_primary = "#f3f4f6"
        self.text_secondary = "#9ca3af"
        self.success_color = "#10b981"

        self.default_token = default_token
        self.build_ui()

    def build_ui(self):
        container = tk.Frame(self.root, bg=self.card_bg, padx=32, pady=28, highlightbackground=self.border_color, highlightthickness=1)
        container.pack(fill="both", expand=True, padx=24, pady=24)

        # Header Badge
        badge = tk.Label(
            container,
            text="OFFICIAL DESKTOP CLIENT",
            bg="#1e1b4b",
            fg="#a5b4fc",
            font=("Segoe UI", 8, "bold"),
            padx=8,
            pady=3,
        )
        badge.pack(anchor="w", pady=(0, 6))

        # Title
        title_lbl = tk.Label(
            container,
            text="AI Coding Assessment App",
            bg=self.card_bg,
            fg="#ffffff",
            font=("Segoe UI", 18, "bold"),
        )
        title_lbl.pack(anchor="w")

        subtitle_lbl = tk.Label(
            container,
            text="Dedicated secure environment for practical coding simulations.",
            bg=self.card_bg,
            fg=self.text_secondary,
            font=("Segoe UI", 9),
        )
        subtitle_lbl.pack(anchor="w", pady=(2, 16))

        # Divider
        sep = tk.Frame(container, bg=self.border_color, height=1)
        sep.pack(fill="x", pady=(0, 16))

        # Form Fields
        # 1. Server Address
        tk.Label(container, text="Portal Server Address:", bg=self.card_bg, fg=self.text_secondary, font=("Segoe UI", 9, "bold")).pack(anchor="w")
        self.server_entry = tk.Entry(container, bg=self.input_bg, fg=self.text_primary, insertbackground="#fff", relief="flat", font=("Consolas", 10))
        self.server_entry.insert(0, "http://localhost:5173")
        self.server_entry.pack(fill="x", ipady=6, pady=(4, 12))

        # 2. Registered Email
        tk.Label(container, text="Candidate Email / Username:", bg=self.card_bg, fg=self.text_secondary, font=("Segoe UI", 9, "bold")).pack(anchor="w")
        self.email_entry = tk.Entry(container, bg=self.input_bg, fg=self.text_primary, insertbackground="#fff", relief="flat", font=("Segoe UI", 10))
        self.email_entry.pack(fill="x", ipady=6, pady=(4, 12))

        # 3. Exam Code
        tk.Label(container, text="Unique Exam Code (from invitation email):", bg=self.card_bg, fg=self.text_secondary, font=("Segoe UI", 9, "bold")).pack(anchor="w")
        self.code_entry = tk.Entry(container, bg=self.input_bg, fg="#38bdf8", insertbackground="#fff", relief="flat", font=("Consolas", 11, "bold"))
        self.code_entry.pack(fill="x", ipady=6, pady=(4, 12))

        # 4. Assessment Token
        tk.Label(container, text="Assessment Token / Invitation Link:", bg=self.card_bg, fg=self.text_secondary, font=("Segoe UI", 9, "bold")).pack(anchor="w")
        self.token_entry = tk.Entry(container, bg=self.input_bg, fg=self.text_primary, insertbackground="#fff", relief="flat", font=("Consolas", 10))
        if self.default_token:
            self.token_entry.insert(0, self.default_token)
        self.token_entry.pack(fill="x", ipady=6, pady=(4, 16))

        # Launch Button
        self.launch_btn = tk.Button(
            container,
            text="🚀 Launch Secure Assessment Window",
            bg=self.primary_color,
            fg="#ffffff",
            activebackground=self.primary_hover,
            activeforeground="#ffffff",
            font=("Segoe UI", 11, "bold"),
            relief="flat",
            cursor="hand2",
            command=self.launch_exam,
        )
        self.launch_btn.pack(fill="x", ipady=10, pady=(6, 12))

        # Install Desktop Shortcut Button
        self.shortcut_btn = tk.Button(
            container,
            text="📌 Create Desktop Shortcut",
            bg="#1f2937",
            fg="#e5e7eb",
            activebackground="#374151",
            activeforeground="#ffffff",
            font=("Segoe UI", 9, "bold"),
            relief="flat",
            cursor="hand2",
            command=self.create_desktop_shortcut,
        )
        self.shortcut_btn.pack(fill="x", ipady=6, pady=(0, 16))

        # Instructions Footer
        info_frame = tk.Frame(container, bg="#090d16", padx=14, pady=10, highlightbackground=self.border_color, highlightthickness=1)
        info_frame.pack(fill="x", side="bottom")

        tk.Label(
            info_frame,
            text="Proctoring Notice: Camera, microphone, and full-screen proctoring are verified when the examination starts. Do not close this launcher until finished.",
            bg="#090d16",
            fg="#94a3b8",
            font=("Segoe UI", 8),
            wraplength=440,
            justify="left",
        ).pack(anchor="w")

    def launch_exam(self):
        server = self.server_entry.get().strip().rstrip("/")
        email = self.email_entry.get().strip()
        code = self.code_entry.get().strip()
        token = self.token_entry.get().strip()

        # If full link is pasted into token
        if "assignment/" in token:
            token = token.split("assignment/")[-1].split("?")[0].split("/")[0].strip()

        if not token:
            messagebox.showwarning(
                "Assessment Token Required",
                "Please enter your Assessment Token or paste your invitation link from your Gmail notification."
            )
            return

        # Target URL inside the dedicated app window
        target_url = f"{server}/assignment/{token}?from_app=true"
        if code:
            target_url += f"&exam_code={code}"
        if email:
            target_url += f"&username={email}"

        browser_exe = find_browser()

        try:
            if browser_exe:
                # Launch in standalone application window mode (removes address bar, buttons, and extensions)
                cmd = [browser_exe, f"--app={target_url}", "--start-maximized"]
                subprocess.Popen(cmd)
            else:
                # Fallback to default browser
                webbrowser.open(target_url)

            messagebox.showinfo(
                "Assessment Launched",
                "The AI Coding Assessment application window has been opened.\n\nComplete your coding tasks within the allotted duration."
            )
        except Exception as e:
            messagebox.showerror("Launch Error", f"Unable to launch assessment window: {e}")

    def create_desktop_shortcut(self):
        """Creates a desktop shortcut for the candidate."""
        try:
            desktop = os.path.join(os.path.expanduser("~"), "Desktop")
            if not os.path.exists(desktop):
                messagebox.showerror("Error", "Could not locate Desktop folder.")
                return

            shortcut_vbs = os.path.join(desktop, "_temp_shortcut.vbs")
            shortcut_path = os.path.join(desktop, "AI Coding Assessment.lnk")
            current_exe = sys.executable

            script = f"""
Set oWS = WScript.CreateObject("WScript.Shell")
sLinkFile = "{shortcut_path}"
Set oLink = oWS.CreateShortcut(sLinkFile)
oLink.TargetPath = "{current_exe}"
oLink.Description = "AI Coding Assessment Portal"
oLink.WorkingDirectory = "{os.path.dirname(current_exe)}"
oLink.Save
"""
            with open(shortcut_vbs, "w") as f:
                f.write(script)

            subprocess.run(["cscript", "//nologo", shortcut_vbs], check=True)
            if os.path.exists(shortcut_vbs):
                os.remove(shortcut_vbs)

            messagebox.showinfo(
                "Shortcut Created",
                f"Desktop shortcut created successfully:\n{shortcut_path}"
            )
        except Exception as e:
            messagebox.showwarning(
                "Notice",
                f"Application is portable and can be launched directly from its download location: {sys.executable}"
            )


def main():
    default_token = ""
    # Check command-line args for token
    if len(sys.argv) > 1:
        for i, arg in enumerate(sys.argv):
            if arg in ("--token", "-t") and i + 1 < len(sys.argv):
                default_token = sys.argv[i + 1]
            elif not arg.startswith("-") and len(arg) > 8:
                default_token = arg

    root = tk.Tk()
    app = AIAssignmentDesktopApp(root, default_token=default_token)
    root.mainloop()


if __name__ == "__main__":
    main()
