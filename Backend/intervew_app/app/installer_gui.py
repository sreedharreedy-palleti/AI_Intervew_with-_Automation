"""
System Permissions & Setup Wizard GUI for AI Technical Interview.
Presents the candidate with required hardware, proctoring, and system access permissions
before launching the isolated interview window.
"""

import sys
import tkinter as tk
from tkinter import messagebox
from typing import Dict, Any


def prompt_permissions_wizard(app_title: str = "AI Technical Interview", exam_type: str = "Voice & Technical Interview") -> Dict[str, Any]:
    """
    Displays the permissions confirmation wizard.
    Returns a dictionary of granted permissions and user choices.
    """
    result = {
        "granted": False,
        "camera_mic": True,
        "screen_focus": True,
        "anti_tamper": True,
        "create_shortcut": True,
    }

    try:
        root = tk.Tk()
        root.title(f"Setup & Permissions - {app_title}")
        root.geometry("540x660")
        root.resizable(False, False)
        root.configure(bg="#0b0f19")

        # Center window on screen
        root.update_idletasks()
        width = 540
        height = 660
        x = (root.winfo_screenwidth() // 2) - (width // 2)
        y = (root.winfo_screenheight() // 2) - (height // 2)
        root.geometry(f"{width}x{height}+{x}+{y}")

        # Top Header Frame
        header = tk.Frame(root, bg="#111827", padx=24, pady=18)
        header.pack(fill="x")

        badge = tk.Label(
            header,
            text="🔒 SECURE AI INTERVIEW CLIENT SETUP",
            font=("Segoe UI", 9, "bold"),
            fg="#10b981",
            bg="rgba(16, 185, 129, 0.12)",
            padx=8,
            pady=3,
        )
        badge.pack(anchor="w", pady=(0, 6))

        title_lbl = tk.Label(
            header,
            text=f"{app_title}",
            font=("Segoe UI", 16, "bold"),
            fg="#ffffff",
            bg="#111827",
        )
        title_lbl.pack(anchor="w")

        sub_lbl = tk.Label(
            header,
            text=f"System & Hardware Access Permissions Required for {exam_type}",
            font=("Segoe UI", 10),
            fg="#94a3b8",
            bg="#111827",
        )
        sub_lbl.pack(anchor="w", pady=(2, 0))

        # Main Body Frame
        body = tk.Frame(root, bg="#0b0f19", padx=24, pady=16)
        body.pack(fill="both", expand=True)

        intro = tk.Label(
            body,
            text="To participate in the AI Voice & Technical Interview, this desktop application requires access to your audio/video devices and secure system environment:",
            font=("Segoe UI", 9),
            fg="#cbd5e1",
            bg="#0b0f19",
            wraplength=490,
            justify="left",
        )
        intro.pack(anchor="w", pady=(0, 12))

        # Permissions List Container
        cards_frame = tk.Frame(body, bg="#161e2e", padx=14, pady=10, relief="solid", bd=1)
        cards_frame.pack(fill="x", pady=(0, 12))

        permissions_info = [
            ("🎙️ Microphone & Voice Stream", "Essential for speaking with the AI Interviewer and voice analysis."),
            ("📷 Camera & Facial Integrity", "Verifies candidate identity and prevents multi-person assistance."),
            ("🖥️ Screen & Application Focus", "Monitors window switching and secondary display connections."),
            ("🛡️ Anti-Cheating Environment", "Prevents unauthorized background recording or assistance tools."),
        ]

        for p_title, p_desc in permissions_info:
            p_box = tk.Frame(cards_frame, bg="#161e2e", pady=4)
            p_box.pack(fill="x", anchor="w")
            p_t = tk.Label(p_box, text=p_title, font=("Segoe UI", 9, "bold"), fg="#10b981", bg="#161e2e")
            p_t.pack(anchor="w")
            p_d = tk.Label(p_box, text=p_desc, font=("Segoe UI", 8), fg="#94a3b8", bg="#161e2e", wraplength=460, justify="left")
            p_d.pack(anchor="w")

        # Checkbox Toggles
        var_cam = tk.BooleanVar(value=True)
        var_focus = tk.BooleanVar(value=True)
        var_shield = tk.BooleanVar(value=True)
        var_shortcut = tk.BooleanVar(value=True)

        chk_frame = tk.Frame(body, bg="#0b0f19")
        chk_frame.pack(fill="x", pady=(4, 8))

        c1 = tk.Checkbutton(
            chk_frame,
            text="Grant Microphone & Camera Device Access",
            variable=var_cam,
            font=("Segoe UI", 9, "bold"),
            fg="#f1f5f9",
            bg="#0b0f19",
            selectcolor="#1e293b",
            activebackground="#0b0f19",
            activeforeground="#10b981",
        )
        c1.pack(anchor="w", pady=2)

        c2 = tk.Checkbutton(
            chk_frame,
            text="Allow Display Focus & Screen Proctoring",
            variable=var_focus,
            font=("Segoe UI", 9, "bold"),
            fg="#f1f5f9",
            bg="#0b0f19",
            selectcolor="#1e293b",
            activebackground="#0b0f19",
            activeforeground="#10b981",
        )
        c2.pack(anchor="w", pady=2)

        c3 = tk.Checkbutton(
            chk_frame,
            text="Enable Background Process & Integrity Shield",
            variable=var_shield,
            font=("Segoe UI", 9, "bold"),
            fg="#f1f5f9",
            bg="#0b0f19",
            selectcolor="#1e293b",
            activebackground="#0b0f19",
            activeforeground="#10b981",
        )
        c3.pack(anchor="w", pady=2)

        c4 = tk.Checkbutton(
            chk_frame,
            text="Create Desktop Launch Shortcut (.lnk)",
            variable=var_shortcut,
            font=("Segoe UI", 9),
            fg="#94a3b8",
            bg="#0b0f19",
            selectcolor="#1e293b",
            activebackground="#0b0f19",
            activeforeground="#10b981",
        )
        c4.pack(anchor="w", pady=2)

        # Footer Buttons
        footer = tk.Frame(root, bg="#111827", padx=24, pady=16)
        footer.pack(fill="x", side="bottom")

        def on_cancel():
            root.destroy()
            sys.exit(0)

        def on_grant():
            if not var_cam.get() or not var_focus.get() or not var_shield.get():
                msg = "All core system permissions (Microphone, Camera, Screen, Integrity Shield) are required to take this AI interview.\n\nDo you want to grant them now?"
                if not messagebox.askyesno("Permissions Required", msg):
                    return
                var_cam.set(True)
                var_focus.set(True)
                var_shield.set(True)

            result["granted"] = True
            result["camera_mic"] = var_cam.get()
            result["screen_focus"] = var_focus.get()
            result["anti_tamper"] = var_shield.get()
            result["create_shortcut"] = var_shortcut.get()
            root.destroy()

        btn_cancel = tk.Button(
            footer,
            text="Cancel",
            command=on_cancel,
            font=("Segoe UI", 9),
            fg="#94a3b8",
            bg="#1e293b",
            activebackground="#334155",
            activeforeground="#ffffff",
            bd=0,
            padx=16,
            pady=8,
            cursor="hand2",
        )
        btn_cancel.pack(side="left")

        btn_confirm = tk.Button(
            footer,
            text="Grant Permissions & Launch Interview",
            command=on_grant,
            font=("Segoe UI", 10, "bold"),
            fg="#ffffff",
            bg="#059669",
            activebackground="#047857",
            activeforeground="#ffffff",
            bd=0,
            padx=20,
            pady=8,
            cursor="hand2",
        )
        btn_confirm.pack(side="right")

        root.mainloop()
    except Exception as exc:
        print(f"[!] Headless or non-GUI execution fallback: {exc}")
        result["granted"] = True

    return result
