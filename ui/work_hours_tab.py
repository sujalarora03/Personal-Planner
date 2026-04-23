import customtkinter as ctk
import matplotlib
from matplotlib.figure import Figure
from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg
from datetime import datetime, date, timedelta
from ui.utils import confirm_delete
from ui.theme import CARD_BG, FIG_BG, AXES_BG

CATEGORIES = ["Work", "Meeting", "Deep Work", "Admin", "Learning", "Other"]


class WorkHoursTab:
    """Live timer + manual log + bar chart of the last 7 days."""

    def __init__(self, parent, db):
        self.db = db
        self.frame = ctk.CTkFrame(parent, fg_color="#111827", corner_radius=0)
        self.frame.grid_columnconfigure(0, weight=1)
        self.frame.grid_rowconfigure(1, weight=1)

        # Timer state
        self._running   = False
        self._paused    = False
        self._start_ts  = None      # datetime when current segment started
        self._elapsed   = 0        # accumulated seconds (across pauses)
        self._timer_job = None

        self._build_ui()

    # ── Layout ─────────────────────────────────────────────────────────────

    def _build_ui(self):
        # Header
        hdr = ctk.CTkFrame(self.frame, fg_color="transparent")
        hdr.grid(row=0, column=0, padx=24, pady=(18, 6), sticky="ew")
        ctk.CTkLabel(hdr, text="Work Hours",
                     font=("Segoe UI", 22, "bold"), text_color="white").pack(side="left")

        # Scrollable body
        self.scroll = ctk.CTkScrollableFrame(
            self.frame, fg_color="transparent", corner_radius=0
        )
        self.scroll.grid(row=1, column=0, sticky="nsew", padx=12, pady=4)
        self.scroll.grid_columnconfigure((0, 1), weight=1)

        # Left column: timer + chart
        self.left = ctk.CTkFrame(self.scroll, fg_color="transparent")
        self.left.grid(row=0, column=0, sticky="nsew", padx=(0, 6))
        self.left.grid_columnconfigure(0, weight=1)

        # Right column: manual entry + log
        self.right = ctk.CTkFrame(self.scroll, fg_color="transparent")
        self.right.grid(row=0, column=1, sticky="nsew", padx=(6, 0))
        self.right.grid_columnconfigure(0, weight=1)

        self._build_timer_card()
        self._build_manual_card()
        self._build_chart_placeholder()
        self._build_log_placeholder()

    # ── Timer card ─────────────────────────────────────────────────────────

    def _build_timer_card(self):
        card = ctk.CTkFrame(self.left, fg_color=CARD_BG, corner_radius=12)
        card.grid(row=0, column=0, sticky="ew", pady=(0, 8))
        card.grid_columnconfigure(0, weight=1)

        ctk.CTkLabel(card, text="⏱  Live Timer",
                     font=("Segoe UI", 13, "bold"), text_color="white").pack(
            anchor="w", padx=16, pady=(12, 6)
        )

        # Big clock display
        self.clock_lbl = ctk.CTkLabel(card, text="00:00:00",
                                      font=("Courier New", 42, "bold"),
                                      text_color="#60a5fa")
        self.clock_lbl.pack(pady=(0, 8))

        # Buttons row
        btns = ctk.CTkFrame(card, fg_color="transparent")
        btns.pack(pady=(0, 8))

        self.btn_start = ctk.CTkButton(btns, text="▶  Start", width=90,
                                       fg_color="#16a34a", hover_color="#15803d",
                                       font=("Segoe UI", 12, "bold"),
                                       command=self._start)
        self.btn_start.pack(side="left", padx=4)

        self.btn_pause = ctk.CTkButton(btns, text="⏸  Pause", width=90,
                                       fg_color="#d97706", hover_color="#b45309",
                                       font=("Segoe UI", 12),
                                       state="disabled",
                                       command=self._pause_resume)
        self.btn_pause.pack(side="left", padx=4)

        self.btn_stop = ctk.CTkButton(btns, text="⏹  Stop", width=90,
                                      fg_color="#dc2626", hover_color="#b91c1c",
                                      font=("Segoe UI", 12),
                                      state="disabled",
                                      command=self._stop)
        self.btn_stop.pack(side="left", padx=4)

        # Timer meta
        meta = ctk.CTkFrame(card, fg_color="#111827", corner_radius=8)
        meta.pack(fill="x", padx=14, pady=(0, 14))
        meta.grid_columnconfigure((0, 1), weight=1)

        ctk.CTkLabel(meta, text="Project", font=("Segoe UI", 11),
                     text_color="#6b7280").grid(row=0, column=0, sticky="w", padx=10, pady=(8, 2))
        ctk.CTkLabel(meta, text="Category", font=("Segoe UI", 11),
                     text_color="#6b7280").grid(row=0, column=1, sticky="w", padx=10, pady=(8, 2))

        self.timer_project = ctk.CTkComboBox(meta, values=["(none)"], width=160)
        self.timer_project.set("(none)")
        self.timer_project.grid(row=1, column=0, sticky="ew", padx=10, pady=(0, 8))

        self.timer_category = ctk.CTkComboBox(meta, values=CATEGORIES, width=140)
        self.timer_category.set("Work")
        self.timer_category.grid(row=1, column=1, sticky="ew", padx=10, pady=(0, 8))

        ctk.CTkLabel(meta, text="Note (optional)", font=("Segoe UI", 11),
                     text_color="#6b7280").grid(row=2, column=0, columnspan=2,
                                                sticky="w", padx=10, pady=(0, 2))
        self.timer_note = ctk.CTkEntry(meta, placeholder_text="What are you working on?")
        self.timer_note.grid(row=3, column=0, columnspan=2, sticky="ew",
                             padx=10, pady=(0, 10))

    # ── Manual entry card ──────────────────────────────────────────────────

    def _build_manual_card(self):
        card = ctk.CTkFrame(self.right, fg_color=CARD_BG, corner_radius=12)
        card.grid(row=0, column=0, sticky="ew", pady=(0, 8))
        card.grid_columnconfigure(0, weight=1)

        ctk.CTkLabel(card, text="📝  Log Hours Manually",
                     font=("Segoe UI", 13, "bold"), text_color="white").pack(
            anchor="w", padx=16, pady=(12, 8)
        )

        body = ctk.CTkFrame(card, fg_color="transparent")
        body.pack(fill="x", padx=14, pady=(0, 14))
        body.grid_columnconfigure((0, 1), weight=1)

        def lbl(parent, text, r, c):
            ctk.CTkLabel(parent, text=text, font=("Segoe UI", 11),
                         text_color="#6b7280", anchor="w").grid(row=r, column=c, sticky="w", pady=(4, 1))

        lbl(body, "Date  (YYYY-MM-DD)", 0, 0)
        self.m_date = ctk.CTkEntry(body, placeholder_text=date.today().isoformat())
        self.m_date.grid(row=1, column=0, sticky="ew", padx=(0, 5))

        lbl(body, "Duration (hrs : mins)", 0, 1)
        dur_row = ctk.CTkFrame(body, fg_color="transparent")
        dur_row.grid(row=1, column=1, sticky="ew", padx=(5, 0))
        self.m_hours = ctk.CTkEntry(dur_row, placeholder_text="0", width=70)
        self.m_hours.pack(side="left")
        ctk.CTkLabel(dur_row, text=" h  ", text_color="#9ca3af").pack(side="left")
        self.m_mins = ctk.CTkEntry(dur_row, placeholder_text="30", width=70)
        self.m_mins.pack(side="left")
        ctk.CTkLabel(dur_row, text=" m", text_color="#9ca3af").pack(side="left")

        lbl(body, "Project", 2, 0)
        self.m_project = ctk.CTkComboBox(body, values=["(none)"], width=160)
        self.m_project.set("(none)")
        self.m_project.grid(row=3, column=0, sticky="ew", padx=(0, 5))

        lbl(body, "Category", 2, 1)
        self.m_category = ctk.CTkComboBox(body, values=CATEGORIES, width=140)
        self.m_category.set("Work")
        self.m_category.grid(row=3, column=1, sticky="ew", padx=(5, 0))

        lbl(body, "Description", 4, 0)
        self.m_desc = ctk.CTkEntry(body, placeholder_text="Brief description…")
        self.m_desc.grid(row=5, column=0, columnspan=2, sticky="ew", pady=(0, 10))

        self.m_err = ctk.CTkLabel(body, text="", text_color="#ef4444", font=("Segoe UI", 11))
        self.m_err.grid(row=6, column=0, columnspan=2, sticky="w")

        ctk.CTkButton(card, text="＋  Log Session",
                      fg_color="#1a73e8", hover_color="#1557b0",
                      font=("Segoe UI", 12, "bold"),
                      command=self._log_manual).pack(pady=(0, 14))

    # ── Placeholder slots for chart + log ──────────────────────────────────

    def _build_chart_placeholder(self):
        self.chart_slot = ctk.CTkFrame(self.left, fg_color="transparent")
        self.chart_slot.grid(row=1, column=0, sticky="ew")

    def _build_log_placeholder(self):
        self.log_slot = ctk.CTkFrame(self.right, fg_color="transparent")
        self.log_slot.grid(row=1, column=0, sticky="nsew")
        self.log_slot.grid_columnconfigure(0, weight=1)

    # ── Refresh ────────────────────────────────────────────────────────────

    def refresh(self):
        self._refresh_project_dropdowns()
        self._refresh_chart()
        self._refresh_log()

    def _refresh_project_dropdowns(self):
        projects = self.db.get_projects()
        names = ["(none)"] + [p["name"] for p in projects]
        self._project_id_map = {"(none)": None}
        for p in projects:
            self._project_id_map[p["name"]] = p["id"]

        self.timer_project.configure(values=names)
        self.m_project.configure(values=names)

    # ── Weekly bar chart ───────────────────────────────────────────────────

    def _refresh_chart(self):
        for w in self.chart_slot.winfo_children():
            w.destroy()

        weekly = self.db.get_weekly_hours()
        card = ctk.CTkFrame(self.chart_slot, fg_color=CARD_BG, corner_radius=12)
        card.pack(fill="x", pady=(0, 8))

        ctk.CTkLabel(card, text="📊  Daily Hours — Last 7 Days",
                     font=("Segoe UI", 13, "bold"), text_color="white").pack(
            anchor="w", padx=16, pady=(12, 4)
        )

        fig = Figure(figsize=(5.0, 2.8), dpi=92, facecolor=FIG_BG)
        ax  = fig.add_subplot(111, facecolor=AXES_BG)

        daily = {r["date"]: r["total_minutes"] for r in weekly}
        days, hrs = [], []
        for i in range(6, -1, -1):
            d = date.today() - timedelta(days=i)
            days.append(d.strftime("%a\n%d"))
            hrs.append(daily.get(d.isoformat(), 0) / 60)

        bars = ax.bar(days, hrs, color="#3b82f6", alpha=0.85, width=0.55)

        total = sum(hrs)
        ax.set_title(f"Total: {total:.1f} h", color="#9ca3af", fontsize=9, pad=4)
        ax.set_ylabel("Hours", color="#6b7280", fontsize=8)
        ax.tick_params(colors="#6b7280", labelsize=8)
        for sp in ("top", "right"):
            ax.spines[sp].set_visible(False)
        for sp in ("bottom", "left"):
            ax.spines[sp].set_color("#374151")

        for bar, h in zip(bars, hrs):
            if h > 0:
                ax.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + 0.04,
                        f"{h:.1f}", ha="center", va="bottom",
                        color="#d1d5db", fontsize=7)

        fig.tight_layout(pad=0.4)
        canvas = FigureCanvasTkAgg(fig, master=card)
        canvas.draw()
        canvas.get_tk_widget().pack(padx=8, pady=(0, 12), fill="x")

    # ── Session log ────────────────────────────────────────────────────────

    def _refresh_log(self):
        for w in self.log_slot.winfo_children():
            w.destroy()

        sessions = self.db.get_work_sessions(limit=30)

        card = ctk.CTkFrame(self.log_slot, fg_color=CARD_BG, corner_radius=12)
        card.grid(row=0, column=0, sticky="ew")
        card.grid_columnconfigure(0, weight=1)

        ctk.CTkLabel(card, text="🗒  Recent Sessions",
                     font=("Segoe UI", 13, "bold"), text_color="white").pack(
            anchor="w", padx=16, pady=(12, 6)
        )

        if not sessions:
            ctk.CTkLabel(card, text="No sessions logged yet.",
                         font=("Segoe UI", 12), text_color="#374151").pack(pady=20)
            return

        for s in sessions:
            mins = s["duration_minutes"]
            h, m = divmod(mins, 60)
            dur  = f"{h}h {m:02d}m" if h else f"{m}m"
            proj = s["project_name"] or "—"

            row = ctk.CTkFrame(card, fg_color="#111827", corner_radius=8)
            row.pack(fill="x", padx=12, pady=3)
            row.grid_columnconfigure(1, weight=1)

            ctk.CTkLabel(row, text=s["date"], font=("Segoe UI", 10),
                         text_color="#6b7280", width=80).grid(row=0, column=0, padx=8, pady=6, sticky="w")

            info = ctk.CTkFrame(row, fg_color="transparent")
            info.grid(row=0, column=1, sticky="ew")
            ctk.CTkLabel(info, text=s["description"] or "(no note)",
                         font=("Segoe UI", 11), text_color="#d1d5db", anchor="w").pack(anchor="w")
            ctk.CTkLabel(info, text=f"{proj}  ·  {s['category']}",
                         font=("Segoe UI", 10), text_color="#4b5563", anchor="w").pack(anchor="w")

            ctk.CTkLabel(row, text=dur, font=("Segoe UI", 12, "bold"),
                         text_color="#60a5fa", width=60).grid(row=0, column=2, padx=6)

            ctk.CTkButton(row, text="🗑", width=28, height=28, corner_radius=6,
                          fg_color="#374151", hover_color="#7f1d1d",
                          command=lambda sid=s["id"], desc=s["description"]: confirm_delete(
                              self.frame,
                              desc or f"session on {s['date']}",
                              lambda: self._delete_session(sid))
                          ).grid(row=0, column=3, padx=(0, 8))

        ctk.CTkFrame(card, height=8, fg_color="transparent").pack()

    # ── Timer logic ────────────────────────────────────────────────────────

    def _start(self):
        if not self._running:
            self._running   = True
            self._paused    = False
            self._start_ts  = datetime.now()
            self._elapsed   = 0
            self.btn_start.configure(state="disabled")
            self.btn_pause.configure(state="normal")
            self.btn_stop.configure(state="normal")
            self._tick()

    def _pause_resume(self):
        if not self._running:
            return
        if not self._paused:
            # Pause: bank elapsed
            self._elapsed += int((datetime.now() - self._start_ts).total_seconds())
            self._paused   = True
            self._start_ts = None
            if self._timer_job:
                self.frame.after_cancel(self._timer_job)
                self._timer_job = None
            self.btn_pause.configure(text="▶  Resume")
        else:
            # Resume
            self._paused   = False
            self._start_ts = datetime.now()
            self.btn_pause.configure(text="⏸  Pause")
            self._tick()

    def _stop(self):
        if not self._running:
            return
        if not self._paused:
            self._elapsed += int((datetime.now() - self._start_ts).total_seconds())
        total_secs = self._elapsed

        # Reset state
        self._running   = False
        self._paused    = False
        self._elapsed   = 0
        self._start_ts  = None
        if self._timer_job:
            self.frame.after_cancel(self._timer_job)
            self._timer_job = None

        self.clock_lbl.configure(text="00:00:00")
        self.btn_start.configure(state="normal")
        self.btn_pause.configure(state="disabled", text="⏸  Pause")
        self.btn_stop.configure(state="disabled")

        if total_secs < 30:
            return   # Discard very short sessions

        total_mins = max(1, round(total_secs / 60))
        now_str    = datetime.now().isoformat(timespec="seconds")
        proj_name  = self.timer_project.get()
        proj_id    = self._project_id_map.get(proj_name)
        desc       = self.timer_note.get().strip()
        category   = self.timer_category.get()
        start_str  = (datetime.now() - timedelta(seconds=total_secs)).isoformat(timespec="seconds")

        self.db.add_work_session(start_str, now_str, total_mins, desc, proj_id, category)
        self.timer_note.delete(0, "end")
        self._refresh_chart()
        self._refresh_log()

    def _tick(self):
        if self._running and not self._paused:
            current = self._elapsed + int((datetime.now() - self._start_ts).total_seconds())
            h, rem  = divmod(current, 3600)
            m, s    = divmod(rem, 60)
            self.clock_lbl.configure(text=f"{h:02d}:{m:02d}:{s:02d}")
            self._timer_job = self.frame.after(1000, self._tick)

    # ── Manual log ─────────────────────────────────────────────────────────

    def _log_manual(self):
        self.m_err.configure(text="")
        d_str = self.m_date.get().strip() or date.today().isoformat()
        h_str = self.m_hours.get().strip() or "0"
        m_str = self.m_mins.get().strip() or "0"

        try:
            hrs  = int(h_str)
            mins = int(m_str)
        except ValueError:
            self.m_err.configure(text="Hours and minutes must be whole numbers.")
            return

        total = hrs * 60 + mins
        if total <= 0:
            self.m_err.configure(text="Duration must be greater than 0.")
            return

        try:
            datetime.strptime(d_str, "%Y-%m-%d")
        except ValueError:
            self.m_err.configure(text="Date must be YYYY-MM-DD.")
            return

        proj_name = self.m_project.get()
        proj_id   = self._project_id_map.get(proj_name)
        category  = self.m_category.get()
        desc      = self.m_desc.get().strip()

        fake_start = f"{d_str}T09:00:00"
        fake_end   = f"{d_str}T{9 + hrs:02d}:{mins:02d}:00"
        self.db.add_work_session(fake_start, fake_end, total, desc, proj_id, category, d_str)

        # Clear fields
        self.m_date.delete(0, "end")
        self.m_hours.delete(0, "end")
        self.m_mins.delete(0, "end")
        self.m_desc.delete(0, "end")

        self._refresh_chart()
        self._refresh_log()

    def _delete_session(self, session_id):
        self.db.delete_work_session(session_id)
        self._refresh_chart()
        self._refresh_log()
