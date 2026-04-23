import customtkinter as ctk
import matplotlib
from matplotlib.figure import Figure
from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg
from datetime import datetime, date, timedelta
import threading
import json
import queue

try:
    import requests as _req
    _REQUESTS = True
except ImportError:
    _REQUESTS = False

CARD_BG = "#1f2937"
FIG_BG  = "#1f2937"
AXES_BG = "#111827"

# Session-level quote cache (survives tab switches but not app restarts)
_QUOTE_CACHE: dict | None = None   # {"text": str, "speaker": str}


class DashboardTab:
    def __init__(self, parent, db):
        self.db = db
        self.frame = ctk.CTkFrame(parent, fg_color="#111827", corner_radius=0)
        self.frame.grid_columnconfigure(0, weight=1)
        self.frame.grid_rowconfigure(2, weight=1)
        self._chart_figs: list = []
        self._build_skeleton()

    # ── Skeleton (static shell) ────────────────────────────────────────────

    def _build_skeleton(self):
        # Header
        hdr = ctk.CTkFrame(self.frame, fg_color="transparent")
        hdr.grid(row=0, column=0, padx=24, pady=(18, 4), sticky="ew")
        hdr.grid_columnconfigure(1, weight=1)

        self.greeting_lbl = ctk.CTkLabel(
            hdr, text="Welcome back 👋",
            font=("Segoe UI", 22, "bold"), text_color="white"
        )
        self.greeting_lbl.grid(row=0, column=0, sticky="w")

        self.date_lbl = ctk.CTkLabel(
            hdr, text=datetime.now().strftime("%A, %B %d  %Y"),
            font=("Segoe UI", 12), text_color="#6b7280"
        )
        self.date_lbl.grid(row=0, column=1, sticky="e")

        # Scrollable body
        self.scroll = ctk.CTkScrollableFrame(
            self.frame, fg_color="transparent", corner_radius=0
        )
        self.scroll.grid(row=2, column=0, sticky="nsew", padx=12, pady=4)
        self.scroll.grid_columnconfigure((0, 1, 2, 3), weight=1)

        # Quote banner (row=1, between header and scroll)
        self.quote_banner = ctk.CTkFrame(
            self.frame, fg_color="#16213e", corner_radius=14,
            border_width=1, border_color="#1e3a6e"
        )
        self.quote_banner.grid(row=1, column=0, padx=24, pady=(2, 6), sticky="ew")
        self.quote_banner.grid_columnconfigure(1, weight=1)

        # Left quotation mark accent
        ctk.CTkLabel(
            self.quote_banner, text="\u201c",
            font=("Georgia", 52, "bold"), text_color="#1a73e8"
        ).grid(row=0, column=0, padx=(16, 4), pady=(4, 0), sticky="n")

        quote_right = ctk.CTkFrame(self.quote_banner, fg_color="transparent")
        quote_right.grid(row=0, column=1, sticky="ew", padx=(0, 20), pady=14)
        quote_right.grid_columnconfigure(0, weight=1)

        self.quote_text_lbl = ctk.CTkLabel(
            quote_right,
            text="Fetching your daily inspiration...",
            font=("Georgia", 13, "italic"),
            text_color="#cbd5e1",
            wraplength=900,
            justify="left",
            anchor="w",
        )
        self.quote_text_lbl.grid(row=0, column=0, sticky="ew")

        self.quote_speaker_lbl = ctk.CTkLabel(
            quote_right,
            text="",
            font=("Segoe UI", 11, "bold"),
            text_color="#1a73e8",
            anchor="w",
        )
        self.quote_speaker_lbl.grid(row=1, column=0, sticky="w", pady=(4, 0))

        self.frame.grid_rowconfigure(2, weight=1)

    # ── Refresh (re-draws all dynamic content) ─────────────────────────────

    def refresh(self):
        global _QUOTE_CACHE

        # Personalised greeting
        hour = datetime.now().hour
        greeting = "Good morning" if hour < 12 else ("Good afternoon" if hour < 17 else "Good evening")
        try:
            profile   = self.db.get_profile()
            first     = profile["name"].split()[0] if profile and profile.get("name") else ""
        except Exception:
            first = ""
        self.greeting_lbl.configure(
            text=f"{greeting}, {first}! \U0001f44b" if first else f"{greeting}! \U0001f44b"
        )
        self.date_lbl.configure(text=datetime.now().strftime("%A, %B %d  %Y"))

        # Quote: use cache if available, otherwise fetch
        if _QUOTE_CACHE:
            self._render_quote(_QUOTE_CACHE["text"], _QUOTE_CACHE["speaker"])
        elif _REQUESTS:
            threading.Thread(target=self._fetch_quote, daemon=True).start()
        else:
            self._render_quote(
                "The secret of getting ahead is getting started.",
                "Mark Twain"
            )

        # Clean up old chart figures before rebuilding
        for fig in self._chart_figs:
            try:
                fig.clf()
            except Exception:
                pass
        self._chart_figs.clear()

        for w in self.scroll.winfo_children():
            w.destroy()

        self.scroll.grid_columnconfigure((0, 1, 2, 3), weight=1)

        task_stats  = self.db.get_task_stats()
        projects    = self.db.get_projects(status="Active")
        weekly      = self.db.get_weekly_hours()
        today_str   = date.today().isoformat()
        today_sess  = self.db.get_work_sessions(today_str, today_str)

        week_mins   = sum(r["total_minutes"] for r in weekly)
        week_hrs    = round(week_mins / 60, 1)
        today_hrs   = round(sum(s["duration_minutes"] for s in today_sess) / 60, 1)

        # ── Stat cards ──
        cards_row = ctk.CTkFrame(self.scroll, fg_color="transparent")
        cards_row.grid(row=0, column=0, columnspan=4, sticky="ew", pady=(0, 8))
        cards_row.grid_columnconfigure((0, 1, 2, 3), weight=1)

        self._stat_card(cards_row, 0, "Total Tasks",       task_stats["total"],
                        f"{task_stats['done']} completed",        "#60a5fa", "✅")
        self._stat_card(cards_row, 1, "In Progress",       task_stats["in_progress"],
                        f"{task_stats['todo']} still todo",       "#34d399", "🔄")
        self._stat_card(cards_row, 2, "Hours This Week",   f"{week_hrs}h",
                        f"Today: {today_hrs}h",                   "#fbbf24", "⏱️")
        self._stat_card(cards_row, 3, "Active Projects",   len(projects),
                        f"{task_stats['overdue']} tasks overdue", "#f87171", "🚀")

        # ── Charts row ──
        charts_row = ctk.CTkFrame(self.scroll, fg_color="transparent")
        charts_row.grid(row=1, column=0, columnspan=4, sticky="ew", pady=4)
        charts_row.grid_columnconfigure((0, 1), weight=1)

        self._task_pie_chart(charts_row, task_stats)
        self._weekly_bar_chart(charts_row, weekly)

        # ── Year targets overview ──
        year = date.today().year
        targets = self.db.get_targets(year=year)
        if targets:
            self._targets_overview(targets, year)

    # ── Quote helpers ──────────────────────────────────────────────────────

    def _fetch_quote(self):
        """Background thread: ask Ollama for a quote, then update the banner."""
        global _QUOTE_CACHE
        prompt = (
            "Give me a single short motivational quote from a famous speaker, "
            "thinker, or leader. Return ONLY valid JSON with exactly two keys: "
            "\"text\" (the quote, no quotation marks) and \"speaker\" (full name). "
            "Example: {\"text\": \"...\", \"speaker\": \"...\"}. No other text."
        )
        try:
            resp = _req.post(
                "http://localhost:11434/api/chat",
                json={
                    "model": "llama3.2",
                    "messages": [
                        {"role": "system",
                         "content": "You are a quote generator. Return only valid JSON."},
                        {"role": "user", "content": prompt},
                    ],
                    "stream": False,
                },
                timeout=15,
            )
            if resp.status_code == 200:
                raw = resp.json().get("message", {}).get("content", "")
                import re
                m = re.search(r'\{[^}]+\}', raw, re.DOTALL)
                if m:
                    data = json.loads(m.group())
                    if "text" in data and "speaker" in data:
                        _QUOTE_CACHE = {"text": data["text"], "speaker": data["speaker"]}
                        self.frame.after(
                            0,
                            lambda t=data["text"], s=data["speaker"]: self._render_quote(t, s)
                        )
                        return
        except Exception:
            pass
        # Fallback — offline or model unavailable
        _QUOTE_CACHE = {
            "text":    "The secret of getting ahead is getting started.",
            "speaker": "Mark Twain",
        }
        self.frame.after(
            0,
            lambda: self._render_quote(_QUOTE_CACHE["text"], _QUOTE_CACHE["speaker"])
        )

    def _render_quote(self, text: str, speaker: str):
        self.quote_text_lbl.configure(text=text)
        self.quote_speaker_lbl.configure(text=f"— {speaker}")

    # ── Stat card ──────────────────────────────────────────────────────────

    def _stat_card(self, parent, col, title, value, subtitle, color, icon):
        card = ctk.CTkFrame(parent, fg_color=CARD_BG, corner_radius=12)
        card.grid(row=0, column=col, padx=5, pady=4, sticky="ew")
        card.grid_columnconfigure(1, weight=1)

        # Left accent bar
        ctk.CTkFrame(card, width=4, fg_color=color, corner_radius=2).grid(
            row=0, column=0, sticky="ns", padx=(10, 0), pady=12
        )

        inner = ctk.CTkFrame(card, fg_color="transparent")
        inner.grid(row=0, column=1, padx=(12, 16), pady=14, sticky="ew")

        top = ctk.CTkFrame(inner, fg_color="transparent")
        top.pack(fill="x")
        ctk.CTkLabel(top, text=icon, font=("Segoe UI Emoji", 18)).pack(side="left")
        ctk.CTkLabel(top, text=title, font=("Segoe UI", 10),
                     text_color="#9ca3af").pack(side="right")

        ctk.CTkLabel(inner, text=str(value), font=("Segoe UI", 28, "bold"),
                     text_color=color).pack(anchor="w", pady=(4, 0))
        ctk.CTkLabel(inner, text=subtitle, font=("Segoe UI", 11),
                     text_color="#4b5563").pack(anchor="w")

    # ── Task pie chart ─────────────────────────────────────────────────────

    def _task_pie_chart(self, parent, stats):
        card = ctk.CTkFrame(parent, fg_color=CARD_BG, corner_radius=12)
        card.grid(row=0, column=0, padx=5, pady=4, sticky="nsew")

        ctk.CTkLabel(card, text="Task Status Breakdown",
                     font=("Segoe UI", 13, "bold"), text_color="white").pack(pady=(12, 4))

        fig = Figure(figsize=(4.2, 3.0), dpi=92, facecolor=FIG_BG)
        ax = fig.add_subplot(111, facecolor=FIG_BG)
        self._chart_figs.append(fig)

        labels = ["Todo", "In Progress", "Done"]
        vals   = [stats["todo"], stats["in_progress"], stats["done"]]
        colors = ["#f87171", "#fbbf24", "#34d399"]

        if sum(vals) == 0:
            vals = [1]
            labels = ["No tasks yet"]
            colors = ["#374151"]

        wedges, texts, autotexts = ax.pie(
            vals, labels=labels, colors=colors,
            autopct=lambda p: f"{p:.0f}%" if p > 0 else "",
            startangle=90,
            textprops={"color": "#d1d5db", "fontsize": 9},
            wedgeprops={"linewidth": 2, "edgecolor": FIG_BG},
        )
        for at in autotexts:
            at.set_color("white")
            at.set_fontsize(9)

        fig.tight_layout(pad=0.5)
        canvas = FigureCanvasTkAgg(fig, master=card)
        canvas.draw()
        canvas.get_tk_widget().pack(padx=8, pady=(0, 10), fill="both", expand=True)

    # ── Weekly bar chart ───────────────────────────────────────────────────

    def _weekly_bar_chart(self, parent, weekly):
        card = ctk.CTkFrame(parent, fg_color=CARD_BG, corner_radius=12)
        card.grid(row=0, column=1, padx=5, pady=4, sticky="nsew")

        ctk.CTkLabel(card, text="Work Hours — Last 7 Days",
                     font=("Segoe UI", 13, "bold"), text_color="white").pack(pady=(12, 4))

        fig = Figure(figsize=(4.2, 3.0), dpi=92, facecolor=FIG_BG)
        ax = fig.add_subplot(111, facecolor=AXES_BG)
        self._chart_figs.append(fig)

        daily = {r["date"]: r["total_minutes"] for r in weekly}
        days, hrs = [], []
        for i in range(6, -1, -1):
            d = date.today() - timedelta(days=i)
            days.append(d.strftime("%a"))
            hrs.append(daily.get(d.isoformat(), 0) / 60)

        bars = ax.bar(days, hrs, color="#3b82f6", alpha=0.85, width=0.55)

        ax.set_ylabel("Hours", color="#6b7280", fontsize=8)
        ax.tick_params(colors="#6b7280", labelsize=8)
        for spine in ("top", "right"):
            ax.spines[spine].set_visible(False)
        for spine in ("bottom", "left"):
            ax.spines[spine].set_color("#374151")

        for bar, h in zip(bars, hrs):
            if h > 0:
                ax.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + 0.04,
                        f"{h:.1f}", ha="center", va="bottom",
                        color="#d1d5db", fontsize=7)

        fig.tight_layout(pad=0.5)
        canvas = FigureCanvasTkAgg(fig, master=card)
        canvas.draw()
        canvas.get_tk_widget().pack(padx=8, pady=(0, 10), fill="both", expand=True)

    # ── Targets overview ───────────────────────────────────────────────────

    def _targets_overview(self, targets, year):
        card = ctk.CTkFrame(self.scroll, fg_color=CARD_BG, corner_radius=12)
        card.grid(row=2, column=0, columnspan=4, padx=5, pady=4, sticky="ew")
        card.grid_columnconfigure(0, weight=1)

        ctk.CTkLabel(card, text=f"🎯  Year Targets — {year}",
                     font=("Segoe UI", 13, "bold"), text_color="white").pack(
            anchor="w", padx=16, pady=(12, 6)
        )

        for t in targets[:6]:
            pct = min(1.0, t["current_value"] / t["target_value"]) if t["target_value"] > 0 else 0

            row = ctk.CTkFrame(card, fg_color="transparent")
            row.pack(fill="x", padx=16, pady=4)
            row.grid_columnconfigure(1, weight=1)

            ctk.CTkLabel(row, text=t["title"], font=("Segoe UI", 12),
                         text_color="#e5e7eb", anchor="w", width=160).grid(row=0, column=0, sticky="w")

            bar = ctk.CTkProgressBar(row, height=10, corner_radius=5,
                                     progress_color=t["color"])
            bar.set(pct)
            bar.grid(row=0, column=1, padx=(10, 10), sticky="ew")

            ctk.CTkLabel(
                row,
                text=f"{t['current_value']:.0f} / {t['target_value']:.0f} {t['unit']}  ({pct*100:.0f}%)",
                font=("Segoe UI", 10), text_color="#6b7280", anchor="e", width=160
            ).grid(row=0, column=2, sticky="e")

        ctk.CTkFrame(card, height=10, fg_color="transparent").pack()
