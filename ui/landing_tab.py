"""
Landing Page — the first thing you see every time.

Gen-Z inspired:  deep dark gradient background, glowing orbs, personalised
greeting, AI-generated motivational quote (with offline fallback), and a
quick stats dashboard.
"""
import customtkinter as ctk
import tkinter as tk
import threading
import random
from datetime import date, datetime

try:
    import requests
    _REQUESTS = True
except ImportError:
    _REQUESTS = False

# ── Fallback quotes (used when Ollama is offline) ─────────────────────────────
FALLBACK_QUOTES = [
    ("Let's conquer the world today — tell me what to do.", "AI Assistant"),
    ("You didn't come this far to only come this far.", "Unknown"),
    ("Make it happen. Shock everyone.", "Unknown"),
    ("Build the life you can't stop thinking about.", "Unknown"),
    ("Stop waiting for the right moment. Create it.", "Unknown"),
    ("You're not behind. You're on your own timeline — make it legendary.", "Unknown"),
    ("Dream big. Execute harder. No excuses.", "Unknown"),
    ("The grind is real. So is the reward.", "Unknown"),
    ("Your potential is endless. Go do the work.", "Unknown"),
    ("Less talk, more action, massive results.", "Unknown"),
    ("Wake up. Level up. Repeat.", "Unknown"),
    ("Your future self is watching. Don't let them down.", "Unknown"),
    ("Success is built line by line, day by day.", "Unknown"),
    ("Be the main character — not a side quest.", "Unknown"),
    ("One year from now you'll wish you started today.", "Unknown"),
    ("Discipline is choosing your future self over your present comfort.", "Unknown"),
    ("Hard work beats talent when talent doesn't work hard.", "Unknown"),
    ("Every expert was once a beginner. Keep going.", "Unknown"),
]


def _greeting_text() -> str:
    hour = datetime.now().hour
    if hour < 5:
        return "Burning the midnight oil 🌙"
    elif hour < 12:
        return "Good morning"
    elif hour < 17:
        return "Good afternoon"
    elif hour < 21:
        return "Good evening"
    else:
        return "Late night grind 🌙"


def _tagline_text() -> str:
    hour = datetime.now().hour
    if hour < 12:
        return "Let's make today legendary. ⚡"
    elif hour < 17:
        return "Stay locked in — the grind continues. 🔥"
    else:
        return "Evening hustle hits different. 💜"


class LandingTab:
    def __init__(self, parent, db):
        self.db     = db
        self.frame  = ctk.CTkFrame(parent, fg_color="#0a0a18", corner_radius=0)
        self.frame.grid_columnconfigure(0, weight=1)
        self.frame.grid_rowconfigure(0, weight=1)

        self._action_btns: list[ctk.CTkButton] = []
        self._stat_vals:   list[ctk.CTkLabel]  = []

        self._build_canvas_bg()
        self._build_overlay()

    # ── Canvas gradient background ─────────────────────────────────────────
    def _build_canvas_bg(self):
        self._canvas = tk.Canvas(
            self.frame, highlightthickness=0, bg="#0a0a18"
        )
        self._canvas.grid(row=0, column=0, sticky="nsew")
        self._canvas.bind("<Configure>", self._redraw_bg)

        # Overlay frame lives inside canvas
        self._ov = ctk.CTkFrame(self._canvas, fg_color="transparent")
        self._ov_id = self._canvas.create_window(0, 0, anchor="nw", window=self._ov)
        self._ov.bind(
            "<Configure>",
            lambda e: self._canvas.configure(
                scrollregion=self._canvas.bbox("all")
            ),
        )

    def _redraw_bg(self, _event=None):
        w = self._canvas.winfo_width()
        h = self._canvas.winfo_height()
        if w < 2 or h < 2:
            return
        self._canvas.delete("bg")

        # Vertical gradient: very dark navy → slightly purple-tinged dark
        for i, col in enumerate(self._gradient("#0a0a18", "#120820", 80)):
            y0 = i * h / 80
            y1 = y0 + h / 80 + 1
            self._canvas.create_rectangle(0, y0, w, y1, fill=col, outline="", tags="bg")

        # Glowing background orbs for depth
        orb_specs = [
            (w * 0.75, -60,  340, "#1a0d40"),   # top-right purple blob
            (-60,  h * 0.65, 260, "#061430"),   # left-bottom blue blob
            (w * 0.45, h * 0.85, 200, "#0a2510"),  # bottom-center green blob
            (w * 0.2,  h * 0.1,  150, "#160525"),  # top-left faint blob
        ]
        for cx, cy, r, fill in orb_specs:
            self._canvas.create_oval(
                cx - r, cy - r, cx + r, cy + r,
                fill=fill, outline="", tags="bg"
            )

        # Raise overlay window above drawn rectangles
        self._canvas.tag_raise(self._ov_id)
        self._ov.configure(width=w, height=h)

    @staticmethod
    def _gradient(c1: str, c2: str, steps: int) -> list[str]:
        def hx(h):
            h = h.lstrip("#")
            return int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)

        r1, g1, b1 = hx(c1)
        r2, g2, b2 = hx(c2)
        out = []
        for i in range(steps):
            t  = i / max(steps - 1, 1)
            out.append(
                f"#{int(r1+(r2-r1)*t):02x}{int(g1+(g2-g1)*t):02x}{int(b1+(b2-b1)*t):02x}"
            )
        return out

    # ── Content overlay ────────────────────────────────────────────────────
    def _build_overlay(self):
        ov = self._ov
        ov.grid_columnconfigure(0, weight=1)
        # rows: greeting | quote | stats | actions | spacer
        ov.grid_rowconfigure(4, weight=1)

        # ── GREETING ──────────────────────────────────────────────────────
        greet_frame = ctk.CTkFrame(ov, fg_color="transparent")
        greet_frame.grid(row=0, column=0, sticky="ew", padx=52, pady=(52, 0))
        greet_frame.grid_columnconfigure(0, weight=1)
        greet_frame.grid_columnconfigure(1, weight=0)

        # Version badge — top right
        version_badge = ctk.CTkFrame(
            greet_frame, fg_color="#1a0d3d",
            corner_radius=12,
            border_width=1, border_color="#7c3aed"
        )
        version_badge.grid(row=0, column=1, rowspan=2, sticky="ne", pady=(4, 0))
        ctk.CTkLabel(
            version_badge, text="v0.7 BETA",
            font=("Segoe UI", 10, "bold"), text_color="#a78bfa",
            padx=12, pady=6
        ).pack()

        today_str = date.today().strftime("%A, %B %d, %Y")
        ctk.CTkLabel(
            greet_frame, text=f"✦  {today_str}  ✦",
            font=("Segoe UI", 11, "bold"), text_color="#7c3aed"
        ).grid(row=0, column=0, sticky="w")

        self._greet_lbl = ctk.CTkLabel(
            greet_frame, text="Hey there 👋",
            font=("Segoe UI", 42, "bold"), text_color="white",
            anchor="w", justify="left"
        )
        self._greet_lbl.grid(row=1, column=0, sticky="w", pady=(4, 0))

        self._tagline_lbl = ctk.CTkLabel(
            greet_frame, text="Ready to own the day?",
            font=("Segoe UI", 16), text_color="#a78bfa",
            anchor="w"
        )
        self._tagline_lbl.grid(row=2, column=0, sticky="w")

        # ── QUOTE CARD ────────────────────────────────────────────────────
        quote_card = ctk.CTkFrame(
            ov, fg_color="#12082a",
            corner_radius=20,
            border_width=1, border_color="#4c1d95"
        )
        quote_card.grid(row=1, column=0, padx=52, pady=28, sticky="ew")
        quote_card.grid_columnconfigure(0, weight=1)

        # Top accent line
        accent_bar = tk.Frame(quote_card._canvas if hasattr(quote_card, '_canvas') else quote_card,
                              height=3, bg="#7c3aed")

        ctk.CTkLabel(
            quote_card, text="💫  Today's Vibe",
            font=("Segoe UI", 10, "bold"), text_color="#7c3aed"
        ).grid(row=0, column=0, sticky="w", padx=26, pady=(18, 6))

        self._quote_lbl = ctk.CTkLabel(
            quote_card,
            text='"Generating your daily spark..."',
            font=("Segoe UI", 22, "bold"), text_color="white",
            wraplength=760, justify="left", anchor="w"
        )
        self._quote_lbl.grid(row=1, column=0, sticky="w", padx=26, pady=(0, 4))

        self._quote_author_lbl = ctk.CTkLabel(
            quote_card, text="",
            font=("Segoe UI", 12, "italic"), text_color="#7c3aed"
        )
        self._quote_author_lbl.grid(row=2, column=0, sticky="w", padx=30, pady=(0, 20))

        # ── STATS STRIP ───────────────────────────────────────────────────
        stats_frame = ctk.CTkFrame(ov, fg_color="transparent")
        stats_frame.grid(row=2, column=0, padx=52, pady=(0, 20), sticky="ew")
        stats_frame.grid_columnconfigure((0, 1, 2, 3), weight=1)

        stat_defs = [
            ("📝", "Active Tasks",     "#a78bfa", "#1a0d3d"),
            ("🚀", "Live Projects",    "#22d3ee", "#071a2e"),
            ("📚", "Courses",          "#34d399", "#0a2010"),
            ("🎯", "Year Goals",       "#fb923c", "#2a1000"),
        ]
        self._stat_vals = []
        for col, (icon, label, accent, bg) in enumerate(stat_defs):
            card = ctk.CTkFrame(
                stats_frame, fg_color=bg,
                corner_radius=16,
                border_width=1, border_color=accent
            )
            card.grid(row=0, column=col, padx=8, sticky="nsew")
            card.grid_columnconfigure(0, weight=1)

            ctk.CTkLabel(
                card, text=icon,
                font=("Segoe UI Emoji", 26)
            ).grid(row=0, column=0, pady=(20, 2))

            val = ctk.CTkLabel(
                card, text="—",
                font=("Segoe UI", 30, "bold"), text_color=accent
            )
            val.grid(row=1, column=0, pady=(0, 2))

            ctk.CTkLabel(
                card, text=label,
                font=("Segoe UI", 11), text_color="#6b7280"
            ).grid(row=2, column=0, pady=(0, 20))

            self._stat_vals.append(val)

        # ── QUICK-ACTION BUTTONS ───────────────────────────────────────────
        actions_frame = ctk.CTkFrame(ov, fg_color="transparent")
        actions_frame.grid(row=3, column=0, padx=52, pady=(0, 40), sticky="ew")
        actions_frame.grid_columnconfigure((0, 1, 2), weight=1)

        action_defs = [
            ("✅   My Tasks",      "#7c3aed", "#5b21b6"),
            ("🤖   Ask AI",        "#0ea5e9", "#0369a1"),
            ("🎓   Career Coach",  "#10b981", "#047857"),
        ]
        self._action_btns = []
        for col, (text, fg, hover) in enumerate(action_defs):
            btn = ctk.CTkButton(
                actions_frame, text=text,
                height=52, corner_radius=14,
                fg_color=fg, hover_color=hover,
                font=("Segoe UI", 14, "bold"),
                text_color="white"
            )
            btn.grid(row=0, column=col, padx=8, sticky="ew")
            self._action_btns.append(btn)

    # ── Public API ─────────────────────────────────────────────────────────
    def set_nav_callbacks(self, on_tasks, on_ai, on_career):
        callbacks = [on_tasks, on_ai, on_career]
        for btn, cb in zip(self._action_btns, callbacks):
            btn.configure(command=cb)

    def refresh(self):
        self._update_greeting()
        self._update_stats()
        self._fetch_quote_async()

    # ── Internal helpers ───────────────────────────────────────────────────
    def _update_greeting(self):
        greeting = _greeting_text()
        try:
            p    = self.db.get_profile()
            name = (p or {}).get("name", "")
        except Exception:
            name = ""

        if name:
            first = name.split()[0]
            self._greet_lbl.configure(text=f"{greeting}, {first}! 👋")
        else:
            self._greet_lbl.configure(text=f"{greeting}! 👋")

        self._tagline_lbl.configure(text=_tagline_text())

    def _update_stats(self):
        # Active tasks (todo + in-progress)
        try:
            stats = self.db.get_task_stats()
            active_tasks = stats.get("todo", 0) + stats.get("in_progress", 0)
            self._stat_vals[0].configure(text=str(active_tasks))
        except Exception:
            self._stat_vals[0].configure(text="—")

        # Active projects
        try:
            projects = self.db.get_projects(status="Active")
            self._stat_vals[1].configure(text=str(len(projects)))
        except Exception:
            self._stat_vals[1].configure(text="—")

        # Courses in progress or planned
        try:
            courses = self.db.get_courses()
            active_c = sum(
                1 for c in courses if c["status"] in ("In Progress", "Planned")
            )
            self._stat_vals[2].configure(text=str(active_c))
        except Exception:
            self._stat_vals[2].configure(text="—")

        # Year targets
        try:
            targets = self.db.get_targets(year=date.today().year)
            self._stat_vals[3].configure(text=str(len(targets)))
        except Exception:
            self._stat_vals[3].configure(text="—")

    def _fetch_quote_async(self):
        # Immediate fallback
        q, a = random.choice(FALLBACK_QUOTES)
        self._set_quote(q, a)

        if _REQUESTS:
            threading.Thread(target=self._try_ai_quote, daemon=True).start()

    def _try_ai_quote(self):
        try:
            r = requests.get("http://localhost:11434/api/tags", timeout=2)
            if r.status_code != 200:
                return
            models = [m["name"] for m in r.json().get("models", [])]
            if not models:
                return
            model = models[0]

            try:
                p    = self.db.get_profile()
                name = (p or {}).get("name", "")
                role = (p or {}).get("role", "")
            except Exception:
                name = role = ""

            context = ""
            if name:
                context += f"The user's name is {name.split()[0]}. "
            if role:
                context += f"They work as {role}. "

            resp = requests.post(
                "http://localhost:11434/api/chat",
                json={
                    "model": model,
                    "messages": [
                        {
                            "role": "system",
                            "content": (
                                "You generate ultra-short, punchy motivational one-liners. "
                                "Gen-Z vibes. Bold and electric. No clichés. Max 18 words. "
                                "Output ONLY the quote text — no quotes, no author, no explanation."
                            ),
                        },
                        {
                            "role": "user",
                            "content": (
                                f"Give me one motivational line for today. {context}"
                                "Make it feel electric and real. Max 18 words. Just the line."
                            ),
                        },
                    ],
                    "stream": False,
                },
                timeout=8,
            )
            if resp.status_code == 200:
                content = resp.json().get("message", {}).get("content", "").strip()
                content = content.strip('"').strip("'").strip()
                if content and 5 < len(content) < 200:
                    self.frame.after(
                        0,
                        lambda c=content: self._set_quote(
                            c, "AI — generated just for you ✨"
                        ),
                    )
        except Exception:
            pass  # fallback quote already shown

    def _set_quote(self, text: str, author: str):
        self._quote_lbl.configure(text=f'"{text}"')
        self._quote_author_lbl.configure(text=f"— {author}")
