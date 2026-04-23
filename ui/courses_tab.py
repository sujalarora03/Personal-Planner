"""
Courses Tab — track every course you're learning, plan new ones,
log completions, and view progress charts.
"""
import customtkinter as ctk
import matplotlib
from matplotlib.figure import Figure
from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg
from collections import Counter
from datetime import date
from ui.utils import confirm_delete
from ui.theme import CARD_BG, FIG_BG, AXES_BG

STATUSES   = ["Planned", "In Progress", "Completed", "Dropped"]
CATEGORIES = ["Learning", "Career", "Technical", "Soft Skills",
              "Language", "Finance", "Health", "Other"]

STATUS_COLORS = {
    "Planned":     "#6b7280",
    "In Progress": "#3b82f6",
    "Completed":   "#10b981",
    "Dropped":     "#ef4444",
}


class CoursesTab:
    def __init__(self, parent, db):
        self.db   = db
        self.frame = ctk.CTkFrame(parent, fg_color="#111827", corner_radius=0)
        self.frame.grid_columnconfigure(0, weight=1)
        self.frame.grid_rowconfigure(1, weight=1)
        self._filter_status = "All"
        self._build_ui()

    # ── Layout ─────────────────────────────────────────────────────────────

    def _build_ui(self):
        # Header
        hdr = ctk.CTkFrame(self.frame, fg_color="transparent")
        hdr.grid(row=0, column=0, padx=24, pady=(18, 6), sticky="ew")
        hdr.grid_columnconfigure(1, weight=1)
        ctk.CTkLabel(hdr, text="Courses & Learning",
                     font=("Segoe UI", 22, "bold"), text_color="white").grid(row=0, column=0, sticky="w")

        ctrl = ctk.CTkFrame(hdr, fg_color="transparent")
        ctrl.grid(row=0, column=1, sticky="e")

        self.filter_btns: dict[str, ctk.CTkButton] = {}
        for label in ["All"] + STATUSES:
            btn = ctk.CTkButton(ctrl, text=label, width=88, height=28, corner_radius=6,
                                font=("Segoe UI", 11), fg_color="#374151", hover_color="#4b5563",
                                text_color="#d1d5db",
                                command=lambda l=label: self._set_filter(l))
            btn.pack(side="left", padx=2)
            self.filter_btns[label] = btn

        ctk.CTkButton(ctrl, text="＋  Add Course", width=120, height=28,
                      fg_color="#1a73e8", hover_color="#1557b0",
                      font=("Segoe UI", 12, "bold"),
                      command=self._open_add).pack(side="left", padx=(10, 0))

        # Search bar
        search_row = ctk.CTkFrame(hdr, fg_color="transparent")
        search_row.grid(row=1, column=0, columnspan=2, sticky="ew", pady=(8, 0))
        search_row.grid_columnconfigure(0, weight=1)
        self._search_var = ctk.StringVar()
        ctk.CTkEntry(
            search_row, textvariable=self._search_var, height=36,
            placeholder_text="🔍  Search courses by title, provider, or notes...",
            font=("Segoe UI", 12)
        ).grid(row=0, column=0, sticky="ew")
        self._search_var.trace_add("write", lambda *_: self.refresh())

        # Two-column body: list (left) + chart (right)
        body = ctk.CTkFrame(self.frame, fg_color="transparent")
        body.grid(row=1, column=0, sticky="nsew", padx=12, pady=4)
        body.grid_columnconfigure(0, weight=3)
        body.grid_columnconfigure(1, weight=2)
        body.grid_rowconfigure(0, weight=1)

        self.list_scroll = ctk.CTkScrollableFrame(body, fg_color="transparent", corner_radius=0)
        self.list_scroll.grid(row=0, column=0, sticky="nsew", padx=(0, 6))
        self.list_scroll.grid_columnconfigure(0, weight=1)

        self.chart_slot = ctk.CTkFrame(body, fg_color="transparent")
        self.chart_slot.grid(row=0, column=1, sticky="nsew", padx=(6, 0))
        self.chart_slot.grid_columnconfigure(0, weight=1)

    # ── Refresh ────────────────────────────────────────────────────────────

    def _set_filter(self, label):
        self._filter_status = label
        self.refresh()

    def refresh(self):
        for w in self.list_scroll.winfo_children():
            w.destroy()
        for w in self.chart_slot.winfo_children():
            w.destroy()

        # Update filter button highlights
        for label, btn in self.filter_btns.items():
            active = label == self._filter_status
            btn.configure(fg_color="#1a73e8" if active else "#374151",
                          text_color="white" if active else "#d1d5db")

        status = None if self._filter_status == "All" else self._filter_status
        courses = self.db.get_courses(status=status)

        # Live search filter
        q = self._search_var.get().strip().lower() if hasattr(self, "_search_var") else ""
        if q:
            courses = [c for c in courses
                       if q in c["title"].lower()
                       or q in (c["provider"] or "").lower()
                       or q in (c["notes"] or "").lower()]

        if not courses:
            ctk.CTkLabel(self.list_scroll,
                         text="No courses yet.\nAdd one or let the AI suggest some!",
                         font=("Segoe UI", 14), text_color="#374151",
                         justify="center").grid(row=0, column=0, pady=60)
        else:
            for i, c in enumerate(courses):
                self._render_card(c, i)

        self._render_chart(self.db.get_courses())

    # ── Course card ────────────────────────────────────────────────────────

    def _render_card(self, course, row):
        card = ctk.CTkFrame(self.list_scroll, fg_color=CARD_BG, corner_radius=10)
        card.grid(row=row, column=0, padx=4, pady=4, sticky="ew")
        card.grid_columnconfigure(0, weight=1)

        sc = STATUS_COLORS.get(course["status"], "#6b7280")

        # Title row
        top = ctk.CTkFrame(card, fg_color="transparent")
        top.grid(row=0, column=0, sticky="ew", padx=14, pady=(10, 2))
        top.grid_columnconfigure(0, weight=1)

        ctk.CTkLabel(top, text=course["title"],
                     font=("Segoe UI", 13, "bold"), text_color="white",
                     anchor="w").grid(row=0, column=0, sticky="w")
        ctk.CTkLabel(top, text=course["status"], font=("Segoe UI", 10),
                     fg_color=sc + "33", text_color=sc,
                     corner_radius=4, padx=6, pady=1).grid(row=0, column=1, sticky="e")

        # Provider + category
        meta = []
        if course["provider"]:
            meta.append(course["provider"])
        meta.append(course["category"])
        ctk.CTkLabel(card, text="  ·  ".join(meta),
                     font=("Segoe UI", 10), text_color="#4b5563",
                     anchor="w").grid(row=1, column=0, sticky="w", padx=14)

        # Progress bar (for in-progress)
        if course["status"] == "In Progress":
            pct = max(0, min(100, course["progress"]))
            ctk.CTkLabel(card, text=f"Progress: {pct}%",
                         font=("Segoe UI", 10), text_color="#9ca3af",
                         anchor="w").grid(row=2, column=0, sticky="w", padx=14, pady=(6, 1))
            bar = ctk.CTkProgressBar(card, height=8, corner_radius=4,
                                     progress_color="#3b82f6")
            bar.set(pct / 100)
            bar.grid(row=3, column=0, sticky="ew", padx=14, pady=(0, 4))

        # Star rating
        if course["rating"] > 0:
            stars = "★" * course["rating"] + "☆" * (5 - course["rating"])
            ctk.CTkLabel(card, text=stars, font=("Segoe UI", 12),
                         text_color="#f59e0b", anchor="w").grid(
                row=4, column=0, sticky="w", padx=14
            )

        # URL link label
        if course["url"]:
            url_short = course["url"][:60] + ("…" if len(course["url"]) > 60 else "")
            ctk.CTkLabel(card, text=f"🔗 {url_short}",
                         font=("Segoe UI", 10), text_color="#60a5fa",
                         anchor="w").grid(row=5, column=0, sticky="w", padx=14)

        # Notes
        if course["notes"]:
            ctk.CTkLabel(card, text=course["notes"],
                         font=("Segoe UI", 10), text_color="#6b7280",
                         anchor="w", wraplength=380, justify="left").grid(
                row=6, column=0, sticky="w", padx=14, pady=(2, 0)
            )

        # Actions
        actions = ctk.CTkFrame(card, fg_color="transparent")
        actions.grid(row=7, column=0, padx=14, pady=(6, 10))

        ctk.CTkButton(actions, text="✏ Edit", width=68, height=26,
                      fg_color="#374151", hover_color="#4b5563",
                      font=("Segoe UI", 10),
                      command=lambda c=course: self._open_edit(c)).pack(side="left", padx=2)

        if course["status"] == "Planned":
            ctk.CTkButton(actions, text="▶ Start", width=68, height=26,
                          fg_color="#16a34a", hover_color="#15803d",
                          font=("Segoe UI", 10),
                          command=lambda cid=course["id"]: self._start_course(cid)).pack(side="left", padx=2)

        if course["status"] == "In Progress":
            ctk.CTkButton(actions, text="📈 Progress", width=90, height=26,
                          fg_color="#374151", hover_color="#4b5563",
                          font=("Segoe UI", 10),
                          command=lambda c=course: self._update_progress(c)).pack(side="left", padx=2)
            ctk.CTkButton(actions, text="✓ Complete", width=90, height=26,
                          fg_color="#16a34a", hover_color="#15803d",
                          font=("Segoe UI", 10),
                          command=lambda cid=course["id"]: self._complete_course(cid)).pack(side="left", padx=2)

        ctk.CTkButton(actions, text="🗑", width=32, height=26,
                      fg_color="#7f1d1d", hover_color="#991b1b",
                      command=lambda cid=course["id"], t=course["title"]: confirm_delete(
                          self.frame, t, lambda: self._delete(cid))).pack(side="left", padx=2)

    # ── Chart ──────────────────────────────────────────────────────────────

    def _render_chart(self, all_courses):
        if not all_courses:
            return

        # Status doughnut
        card = ctk.CTkFrame(self.chart_slot, fg_color=CARD_BG, corner_radius=12)
        card.grid(row=0, column=0, sticky="ew", pady=(0, 8))
        ctk.CTkLabel(card, text="Status Breakdown",
                     font=("Segoe UI", 12, "bold"), text_color="white").pack(
            anchor="w", padx=14, pady=(12, 4)
        )
        counts = Counter(c["status"] for c in all_courses)
        labels = list(counts.keys())
        vals   = list(counts.values())
        colors = [STATUS_COLORS.get(l, "#6b7280") for l in labels]

        fig = Figure(figsize=(3.5, 2.8), dpi=90, facecolor=FIG_BG)
        ax  = fig.add_subplot(111, facecolor=FIG_BG)
        ax.pie(vals, labels=labels, colors=colors, autopct="%1.0f%%",
               startangle=90,
               textprops={"color": "#d1d5db", "fontsize": 9},
               wedgeprops={"linewidth": 2, "edgecolor": FIG_BG})
        fig.tight_layout(pad=0.3)
        canvas = FigureCanvasTkAgg(fig, master=card)
        canvas.draw()
        canvas.get_tk_widget().pack(padx=8, pady=(0, 12), fill="x")

        # Category bar
        card2 = ctk.CTkFrame(self.chart_slot, fg_color=CARD_BG, corner_radius=12)
        card2.grid(row=1, column=0, sticky="ew")
        ctk.CTkLabel(card2, text="By Category",
                     font=("Segoe UI", 12, "bold"), text_color="white").pack(
            anchor="w", padx=14, pady=(12, 4)
        )
        cat_counts = Counter(c["category"] for c in all_courses)
        fig2 = Figure(figsize=(3.5, 2.6), dpi=90, facecolor=FIG_BG)
        ax2  = fig2.add_subplot(111, facecolor=AXES_BG)
        cats = list(cat_counts.keys())
        cnts = list(cat_counts.values())
        bars = ax2.barh(cats, cnts, color="#3b82f6", alpha=0.85, height=0.55)
        ax2.tick_params(colors="#6b7280", labelsize=8)
        for sp in ("top", "right"):
            ax2.spines[sp].set_visible(False)
        for sp in ("bottom", "left"):
            ax2.spines[sp].set_color("#374151")
        for bar, cnt in zip(bars, cnts):
            ax2.text(bar.get_width() + 0.05, bar.get_y() + bar.get_height() / 2,
                     str(cnt), va="center", color="#9ca3af", fontsize=8)
        fig2.tight_layout(pad=0.4)
        canvas2 = FigureCanvasTkAgg(fig2, master=card2)
        canvas2.draw()
        canvas2.get_tk_widget().pack(padx=8, pady=(0, 12), fill="x")

    # ── Quick status updates ───────────────────────────────────────────────

    def _start_course(self, course_id):
        self.db.update_course(course_id, status="In Progress",
                              started_date=date.today().isoformat())
        self.refresh()

    def _complete_course(self, course_id):
        self.db.update_course(course_id, status="Completed", progress=100,
                              completed_date=date.today().isoformat())
        self.refresh()

    def _delete(self, course_id):
        self.db.delete_course(course_id)
        self.refresh()

    def _update_progress(self, course):
        ProgressDialog(self.frame, self.db, course, callback=self.refresh)

    def _open_add(self):
        CourseDialog(self.frame, self.db, callback=self.refresh)

    def _open_edit(self, course):
        CourseDialog(self.frame, self.db, course=course, callback=self.refresh)


# ── Add / Edit dialog ──────────────────────────────────────────────────────

class CourseDialog(ctk.CTkToplevel):
    def __init__(self, parent, db, course=None, callback=None):
        super().__init__(parent)
        self.db       = db
        self.course   = course
        self.callback = callback

        self.title("Edit Course" if course else "New Course")
        self.geometry("480x520")
        self.resizable(False, False)
        self.grab_set()
        self.focus_set()
        self._center()
        self._build()
        if course:
            self._populate(course)

    def _center(self):
        self.update_idletasks()
        x = (self.winfo_screenwidth() - 480) // 2
        y = (self.winfo_screenheight() - 520) // 2
        self.geometry(f"480x520+{x}+{y}")

    def _build(self):
        self.configure(fg_color="#1a2332")
        main = ctk.CTkFrame(self, fg_color="#1f2937", corner_radius=10)
        main.pack(fill="both", expand=True, padx=16, pady=16)
        main.grid_columnconfigure(0, weight=1)

        def lbl(text, r):
            ctk.CTkLabel(main, text=text, font=("Segoe UI", 11),
                         text_color="#9ca3af", anchor="w").grid(
                row=r, column=0, sticky="w", padx=12, pady=(8, 1))

        lbl("Course Title  *", 0)
        self.title_ent = ctk.CTkEntry(main, placeholder_text="e.g. Machine Learning Specialisation", height=36)
        self.title_ent.grid(row=1, column=0, sticky="ew", padx=12)

        r = ctk.CTkFrame(main, fg_color="transparent")
        r.grid(row=2, column=0, sticky="ew", padx=12, pady=(8, 0))
        r.grid_columnconfigure((0, 1), weight=1)

        ctk.CTkLabel(r, text="Provider", font=("Segoe UI", 11),
                     text_color="#9ca3af").grid(row=0, column=0, sticky="w")
        ctk.CTkLabel(r, text="Category", font=("Segoe UI", 11),
                     text_color="#9ca3af").grid(row=0, column=1, sticky="w")
        self.provider = ctk.CTkEntry(r, placeholder_text="Coursera, Udemy…")
        self.provider.grid(row=1, column=0, sticky="ew", padx=(0, 5))
        self.category = ctk.CTkComboBox(r, values=CATEGORIES)
        self.category.set("Learning")
        self.category.grid(row=1, column=1, sticky="ew", padx=(5, 0))

        r2 = ctk.CTkFrame(main, fg_color="transparent")
        r2.grid(row=3, column=0, sticky="ew", padx=12, pady=(8, 0))
        r2.grid_columnconfigure((0, 1), weight=1)

        ctk.CTkLabel(r2, text="Status", font=("Segoe UI", 11),
                     text_color="#9ca3af").grid(row=0, column=0, sticky="w")
        ctk.CTkLabel(r2, text="Rating (1–5)", font=("Segoe UI", 11),
                     text_color="#9ca3af").grid(row=0, column=1, sticky="w")
        self.status = ctk.CTkComboBox(r2, values=STATUSES)
        self.status.set("Planned")
        self.status.grid(row=1, column=0, sticky="ew", padx=(0, 5))
        self.rating = ctk.CTkComboBox(r2, values=["0", "1", "2", "3", "4", "5"], width=100)
        self.rating.set("0")
        self.rating.grid(row=1, column=1, sticky="w", padx=(5, 0))

        lbl("URL (optional)", 4)
        self.url = ctk.CTkEntry(main, placeholder_text="https://…")
        self.url.grid(row=5, column=0, sticky="ew", padx=12)

        lbl("Notes", 6)
        self.notes = ctk.CTkTextbox(main, height=70, fg_color="#374151",
                                    font=("Segoe UI", 12))
        self.notes.grid(row=7, column=0, sticky="ew", padx=12)

        btns = ctk.CTkFrame(main, fg_color="transparent")
        btns.grid(row=8, column=0, sticky="ew", padx=12, pady=(14, 4))
        ctk.CTkButton(btns, text="Cancel", fg_color="#374151",
                      command=self.destroy).pack(side="left")
        ctk.CTkButton(btns, text="Save Course", fg_color="#1a73e8",
                      command=self._save).pack(side="right")

    def _populate(self, c):
        self.title_ent.insert(0, c["title"])
        if c["provider"]:
            self.provider.insert(0, c["provider"])
        self.category.set(c["category"])
        self.status.set(c["status"])
        self.rating.set(str(c["rating"]))
        if c["url"]:
            self.url.insert(0, c["url"])
        if c["notes"]:
            self.notes.insert("1.0", c["notes"])

    def _save(self):
        title = self.title_ent.get().strip()
        if not title:
            self.title_ent.configure(border_color="#ef4444")
            return
        kwargs = dict(
            title    = title,
            provider = self.provider.get().strip(),
            category = self.category.get(),
            status   = self.status.get(),
            rating   = int(self.rating.get() or 0),
            url      = self.url.get().strip(),
            notes    = self.notes.get("1.0", "end").strip(),
        )
        if self.course:
            self.db.update_course(self.course["id"], **{k: v for k, v in kwargs.items()
                                                        if k != 'title'})
            self.db.update_course(self.course["id"], title=title)
        else:
            self.db.add_course(**kwargs)
        if self.callback:
            self.callback()
        self.destroy()


class ProgressDialog(ctk.CTkToplevel):
    def __init__(self, parent, db, course, callback=None):
        super().__init__(parent)
        self.db       = db
        self.course   = course
        self.callback = callback
        self.title(f"Progress — {course['title'][:40]}")
        self.geometry("340x200")
        self.resizable(False, False)
        self.grab_set()
        self.focus_set()
        self.update_idletasks()
        x = (self.winfo_screenwidth() - 340) // 2
        y = (self.winfo_screenheight() - 200) // 2
        self.geometry(f"340x200+{x}+{y}")
        self._build()

    def _build(self):
        self.configure(fg_color="#1a2332")
        main = ctk.CTkFrame(self, fg_color="#1f2937", corner_radius=10)
        main.pack(fill="both", expand=True, padx=16, pady=16)
        main.grid_columnconfigure(0, weight=1)

        ctk.CTkLabel(main, text="Progress %",
                     font=("Segoe UI", 11), text_color="#9ca3af").grid(row=0, column=0, sticky="w", padx=12, pady=(12, 2))
        self.slider = ctk.CTkSlider(main, from_=0, to=100, number_of_steps=100,
                                    command=lambda v: self.pct_lbl.configure(text=f"{int(v)}%"))
        self.slider.set(self.course["progress"])
        self.slider.grid(row=1, column=0, sticky="ew", padx=12)
        self.pct_lbl = ctk.CTkLabel(main, text=f"{self.course['progress']}%",
                                    font=("Segoe UI", 20, "bold"), text_color="#60a5fa")
        self.pct_lbl.grid(row=2, column=0, pady=6)
        btns = ctk.CTkFrame(main, fg_color="transparent")
        btns.grid(row=3, column=0, pady=4)
        ctk.CTkButton(btns, text="Cancel", fg_color="#374151",
                      command=self.destroy).pack(side="left", padx=6)
        ctk.CTkButton(btns, text="Save", fg_color="#1a73e8",
                      command=self._save).pack(side="left", padx=6)

    def _save(self):
        self.db.update_course(self.course["id"], progress=int(self.slider.get()))
        if self.callback:
            self.callback()
        self.destroy()
