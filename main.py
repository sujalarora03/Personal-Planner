"""
Personal Planner & Progress Tracker
Desktop app: FastAPI (port 7432) + React frontend displayed via PyWebView.
System-tray support via pystray — close button hides to tray, tray icon shows/quits.
"""
import sys
import os
import time
import socket
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

from PIL import Image, ImageDraw
import pystray
import webview

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))


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
    PORT = 7432

    def __init__(self):
        base_dir = os.path.dirname(os.path.abspath(__file__))
        log_path = os.path.join(base_dir, 'planner.log')
        logging.basicConfig(
            filename=log_path, level=logging.WARNING,
            format='%(asctime)s %(levelname)s %(name)s: %(message)s',
            encoding='utf-8'
        )

        # Init DB
        from database import Database
        self.db = Database()
        self.db.init_db()
        self.db.backup()

        # Pre-generate icon file (used by tray and window)
        ensure_icon_file(base_dir)

        # Start FastAPI backend in a background thread
        self._start_api()

        # Create PyWebView window (doesn't open until webview.start())
        self.window = webview.create_window(
            "Personal Planner",
            f"http://127.0.0.1:{self.PORT}",
            width=1280,
            height=780,
            min_size=(960, 620),
        )
        self.window.events.closing += self._on_closing

        # System tray (runs in its own daemon thread)
        tray_img = create_tray_image()
        menu = pystray.Menu(
            pystray.MenuItem("Open Planner", self._show_window, default=True),
            pystray.Menu.SEPARATOR,
            pystray.MenuItem("Quit", self._quit_app),
        )
        self.tray = pystray.Icon("PersonalPlanner", tray_img, "Personal Planner", menu)
        threading.Thread(target=self.tray.run, daemon=True).start()

        # Due-date notifications (background, checks every hour)
        threading.Thread(target=self._notification_loop, daemon=True).start()

        # Start PyWebView — blocks main thread until all windows are destroyed
        webview.start(debug=False)

    # ── API startup ────────────────────────────────────────────────────────

    def _start_api(self):
        """Start uvicorn in a daemon thread; wait until the port is open."""
        import uvicorn
        from api import app as fastapi_app

        def run():
            uvicorn.run(fastapi_app, host="127.0.0.1", port=self.PORT, log_level="error")

        threading.Thread(target=run, daemon=True).start()

        # Poll until the server accepts connections (max 6 s)
        for _ in range(30):
            try:
                with socket.create_connection(("127.0.0.1", self.PORT), timeout=0.3):
                    return
            except OSError:
                time.sleep(0.2)
        logging.warning("API server did not start within 6 seconds")

    # ── Window / tray helpers ──────────────────────────────────────────────

    def _on_closing(self):
        """Hide to tray instead of quitting when the user closes the window."""
        self.window.hide()
        return False   # returning False cancels the default close

    def _show_window(self, icon=None, item=None):
        self.window.show()

    def _quit_app(self, icon=None, item=None):
        self.tray.stop()
        self.window.destroy()   # unblocks webview.start()

    # ── Due-date notifications ─────────────────────────────────────────────

    def _notification_loop(self):
        time.sleep(5)   # brief startup delay
        while True:
            try:
                from datetime import date as _date
                today = _date.today().isoformat()
                tasks = self.db.get_tasks()
                due_today = [t for t in tasks if t.get("due_date") == today and t.get("status") != "Done"]
                overdue   = [t for t in tasks if t.get("due_date") and t["due_date"] < today and t.get("status") != "Done"]
                parts = []
                if due_today:
                    parts.append(f"{len(due_today)} task(s) due today")
                if overdue:
                    parts.append(f"{len(overdue)} overdue")
                if parts:
                    try:
                        self.tray.notify(" · ".join(parts), "Personal Planner 📌")
                    except Exception:
                        pass
            except Exception as exc:
                logging.warning("Notification check failed: %s", exc)
            time.sleep(3_600)   # 1 hour


if __name__ == "__main__":
    PersonalPlannerApp()
