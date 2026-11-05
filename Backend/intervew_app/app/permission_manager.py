"""
System Access and Permissions Manager for AI Interview Client.
Configures isolated browser profile permissions (Camera, Microphone, Notifications)
and validates hardware device access.
"""

import os
import json
from typing import Dict, Any


def preconfigure_browser_profile(user_data_dir: str, frontend_url: str) -> bool:
    """
    Pre-configures Chrome/Edge Preferences in the dedicated profile directory.
    Automatically grants media stream (camera and microphone) permissions to the interview URL,
    preventing blocking permission prompts during the AI voice interview.
    """
    try:
        default_dir = os.path.join(user_data_dir, "Default")
        os.makedirs(default_dir, exist_ok=True)
        prefs_file = os.path.join(default_dir, "Preferences")

        prefs: Dict[str, Any] = {}
        if os.path.exists(prefs_file):
            try:
                with open(prefs_file, "r", encoding="utf-8") as f:
                    prefs = json.load(f)
            except Exception:
                prefs = {}

        profile = prefs.setdefault("profile", {})
        content_settings = profile.setdefault("content_settings", {})
        exceptions = content_settings.setdefault("exceptions", {})

        clean_url = frontend_url.rstrip("/")
        origins = [
            f"{clean_url},*",
            "http://localhost:5173,*",
            "http://localhost:8000,*",
            "http://127.0.0.1:5173,*",
            "http://127.0.0.1:8000,*",
        ]

        permissions_to_grant = [
            "media_stream_camera",
            "media_stream_mic",
            "notifications",
            "popups",
            "automatic_downloads",
            "clipboard",
        ]

        for perm in permissions_to_grant:
            perm_dict = exceptions.setdefault(perm, {})
            for origin in origins:
                perm_dict[origin] = {"setting": 1}

        with open(prefs_file, "w", encoding="utf-8") as f:
            json.dump(prefs, f, indent=2)

        return True
    except Exception as exc:
        print(f"[!] Warning: Could not preconfigure profile permissions: {exc}")
        return False
