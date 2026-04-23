"""
Personal Planner & Progress Tracker
Runs as a Windows system-tray application.
Double-click the tray icon to open the planner window.
"""
import sys
import os
import threading
import logging

# ── Fix Windows DPI blurriness — must be called before any UI is created ──────
import ctypes
try:
    ctypes.windll.shcore.SetProcessDpiAwareness(2)   # Per-monitor DPI aware v2
except Exception:
    try:
        ctypes.windll.user32.SetProcessDPIAware()    # Fallback (Vista+)
    except Exception:
        pass

import matplotlib
matplotlib.use("TkAgg")          # must be set before any tab imports
import customtkinter as ctk
from PIL import Image, ImageDraw
import pystray

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from database import Database
from ui.main_window import MainWindow
from ui.profile_tab import ProfileSetupDialog


def create_app_image(size: int = 256) -> Image.Image:
    """
    Draw the Personal Planner icon: deep purple circle with a white
    lightning-bolt ⚡ silhouette — matches the Gen-Z sidebar theme.
    """
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d   = ImageDraw.Draw(img)

    # Outer glow ring (semi-transparent purple)
    glow = int(size * 0.04)
    d.ellipse([glow, glow, size - glow, size - glow], fill=(124, 58, 237, 60))

    # Main circle — deep purple gradient simulation (two overlapping ellipses)
    pad = int(size * 0.06)
    d.ellipse([pad, pad, size - pad, size - pad], fill=(80, 20, 180))
    d.ellipse([pad, pad, size - int(pad * 0.6), size - int(pad * 1.6)],
              fill=(110, 40, 220))

    # Lightning bolt polygon (centred, white)
    s = size
    bolt = [
        (s * 0.58, s * 0.10),   # top right
        (s * 0.32, s * 0.52),   # mid left top
        (s * 0.50, s * 0.50),   # centre notch
        (s * 0.38, s * 0.90),   # bottom left
        (s * 0.66, s * 0.46),   # mid right bottom
        (s * 0.50, s * 0.48),   # centre notch
    ]
    bolt = [(int(x), int(y)) for x, y in bolt]
    d.polygon(bolt, fill="white")

    # Soft inner highlight on bolt
    highlight = [
        (s * 0.58, s * 0.10),
        (s * 0.42, s * 0.46),
        (s * 0.52, s * 0.44),
    ]
    highlight = [(int(x), int(y)) for x, y in highlight]
    d.polygon(highlight, fill=(220, 200, 255))

    return img


def create_tray_image() -> Image.Image:
    """Smaller version for the system tray (32 px looks clean)."""
    return create_app_image(64)


def ensure_icon_file(base_dir: str) -> str:
    """
    Generate icon.ico next to main.py if it doesn't exist yet.
    Returns the absolute path.
    """
    ico_path = os.path.join(base_dir, "icon.ico")
    if not os.path.exists(ico_path):
        big = create_app_image(256)
        # Pillow saves multi-resolution ICO automatically
        big.save(ico_path, format="ICO",
                 sizes=[(16, 16), (32, 32), (48, 48), (64, 64), (256, 256)])
    return ico_path


class PersonalPlannerApp:
    def __init__(self):
        # Logging — write warnings+ to planner.log next to main.py
        log_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'planner.log')
        logging.basicConfig(
            filename=log_path, level=logging.WARNING,
            format='%(asctime)s %(levelname)s %(name)s: %(message)s',
            encoding='utf-8'
        )

        self.db = Database()
        self.db.init_db()
        self.db.backup()          # daily backup on startup

        ctk.set_appearance_mode("dark")
        ctk.set_default_color_theme("blue")

        # Main window
        self.root = ctk.CTk()
        self.root.title("Personal Planner")
        self.root.geometry("1280x780")
        self.root.minsize(960, 620)
        self._center_window(1280, 780)

        # ── Taskbar & window icon ──────────────────────────────────────────
        base_dir  = os.path.dirname(os.path.abspath(__file__))
        ico_path  = ensure_icon_file(base_dir)
        self._ico_path = ico_path

        # Build UI
        self.main_window = MainWindow(self.root, self.db)

        # Show profile setup on first launch (no name saved yet)
        profile = self.db.get_profile()
        if not profile or not profile.get("name"):
            self.root.after(300, lambda: ProfileSetupDialog(self.root, self.db))

        # Minimize to tray on close
        self.root.protocol("WM_DELETE_WINDOW", self.hide_to_tray)

        # System tray
        self.tray_icon = self._create_tray_icon()
        tray_thread = threading.Thread(target=self.tray_icon.run, daemon=True)
        tray_thread.start()

        # Due-date notifications (check now + every hour)
        self.root.after(5000, self._check_due_notifications)

        # Set icon after mainloop starts so the window handle is ready
        self.root.after(200, self._apply_icon)

        self.root.mainloop()

    # ── Window helpers ─────────────────────────────────────────────────────

    def _apply_icon(self):
        """Set window icon after the event loop is running (required on Windows)."""
        try:
            self.root.iconbitmap(self._ico_path)
        except Exception:
            try:
                from PIL import ImageTk
                _img = create_app_image(64)
                _photo = ImageTk.PhotoImage(_img)
                self.root.iconphoto(True, _photo)
                self._icon_photo = _photo   # keep reference to avoid GC
            except Exception:
                pass

    def _center_window(self, w: int, h: int):
        self.root.update_idletasks()
        sw = self.root.winfo_screenwidth()
        sh = self.root.winfo_screenheight()
        x = (sw - w) // 2
        y = (sh - h) // 2
        self.root.geometry(f"{w}x{h}+{x}+{y}")

    # ── Tray helpers ───────────────────────────────────────────────────────

    def _create_tray_icon(self) -> pystray.Icon:
        img = create_tray_image()
        menu = pystray.Menu(
            pystray.MenuItem("Open Planner", self._show_window, default=True),
            pystray.Menu.SEPARATOR,
            pystray.MenuItem("Quit", self._quit_app),
        )
        return pystray.Icon("PersonalPlanner", img, "Personal Planner", menu)

    def _show_window(self, icon=None, item=None):
        # Must schedule UI work on the main thread
        self.root.after(0, self._do_show)

    def _do_show(self):
        self.root.deiconify()
        self.root.lift()
        self.root.focus_force()
        self.root.state("normal")

    def hide_to_tray(self):
        self.root.withdraw()

    def _check_due_notifications(self):
        """Show a tray notification if tasks are due today or overdue."""
        try:
            from datetime import date as _date
            today = _date.today().isoformat()
            tasks = self.db.get_tasks()
            due_today = [t for t in tasks if t["due_date"] == today and t["status"] != "Done"]
            overdue   = [t for t in tasks if t["due_date"] and t["due_date"] < today and t["status"] != "Done"]
            parts = []
            if due_today:
                parts.append(f"{len(due_today)} task(s) due today")
            if overdue:
                parts.append(f"{len(overdue)} overdue")
            if parts:
                try:
                    self.tray_icon.notify(" · ".join(parts), "Personal Planner 📌")
                except Exception:
                    pass
        except Exception as exc:
            logging.warning("Notification check failed: %s", exc)
        # Repeat every hour
        self.root.after(3_600_000, self._check_due_notifications)

    def _quit_app(self, icon=None, item=None):
        self.tray_icon.stop()
        self.root.after(0, self.root.quit)


if __name__ == "__main__":
    PersonalPlannerApp()
