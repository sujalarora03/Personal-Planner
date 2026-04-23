import customtkinter as ctk
from datetime import datetime, date
from ui.utils import confirm_delete
from ui.theme import CARD_BG, FIG_BG, AXES_BG

STATUSES = ["Active", "Paused", "Completed"]
PALETTE  = [
    "#3b82f6", "#10b981", "#f59e0b", "#ef4444",
    "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16",
    "#f97316", "#6b7280",
]


class ProjectsTab:
    def __init__(self, parent, db):
        self.db = db
        self.frame = ctk.CTkFrame(parent, fg_color="#111827", corner_radius=0)
        self.frame.grid_columnconfigure(0, weight=1)
        self.frame.grid_rowconfigure(1, weight=1)
        self._filter = "All"
        self._build_ui()

    # ── Layout ─────────────────────────────────────────────────────────────

    def _build_ui(self):
        # Header
        hdr = ctk.CTkFrame(self.frame, fg_color="transparent")
        hdr.grid(row=0, column=0, padx=24, pady=(18, 6), sticky="ew")
        hdr.grid_columnconfigure(1, weight=1)

        ctk.CTkLabel(hdr, text="Projects",
                     font=("Segoe UI", 22, "bold"), text_color="white").grid(row=0, column=0, sticky="w")

        ctrl = ctk.CTkFrame(hdr, fg_color="transparent")
        ctrl.grid(row=0, column=1, sticky="e")

        # Filter pills
        self.filter_btns: dict[str, ctk.CTkButton] = {}
        for label in ["All"] + STATUSES:
            btn = ctk.CTkButton(ctrl, text=label, width=80, height=30,
                                corner_radius=6, font=("Segoe UI", 11),
                                fg_color="#374151", hover_color="#4b5563",
                                text_color="#d1d5db",
                                command=lambda l=label: self._set_filter(l))
            btn.pack(side="left", padx=2)
            self.filter_btns[label] = btn

        ctk.CTkButton(ctrl, text="＋  New Project", width=125, height=30,
                      fg_color="#1a73e8", hover_color="#1557b0",
                      font=("Segoe UI", 12, "bold"),
                      command=self._open_add_dialog).pack(side="left", padx=(10, 0))

        # Search bar
        search_row = ctk.CTkFrame(hdr, fg_color="transparent")
        search_row.grid(row=1, column=0, columnspan=2, sticky="ew", pady=(8, 0))
        search_row.grid_columnconfigure(0, weight=1)
        self._search_var = ctk.StringVar()
        ctk.CTkEntry(
            search_row, textvariable=self._search_var, height=36,
            placeholder_text="🔍  Search projects by name or description...",
            font=("Segoe UI", 12)
        ).grid(row=0, column=0, sticky="ew")
        self._search_var.trace_add("write", lambda *_: self.refresh())

        # Project grid (scrollable)
        self.scroll = ctk.CTkScrollableFrame(self.frame, fg_color="transparent", corner_radius=0)
        self.scroll.grid(row=1, column=0, sticky="nsew", padx=12, pady=4)
        self.scroll.grid_columnconfigure((0, 1), weight=1)

    # ── Refresh ────────────────────────────────────────────────────────────

    def _set_filter(self, label: str):
        self._filter = label
        self.refresh()

    def refresh(self):
        for w in self.scroll.winfo_children():
            w.destroy()

        # Highlight active filter btn
        for label, btn in self.filter_btns.items():
            if label == self._filter:
                btn.configure(fg_color="#1a73e8", text_color="white")
            else:
                btn.configure(fg_color="#374151", text_color="#d1d5db")

        status  = None if self._filter == "All" else self._filter
        projects = self.db.get_projects(status=status)

        # Live search filter
        q = self._search_var.get().strip().lower() if hasattr(self, "_search_var") else ""
        if q:
            projects = [p for p in projects
                        if q in p["name"].lower() or q in (p["description"] or "").lower()]

        if not projects:
            ctk.CTkLabel(self.scroll, text="No projects yet — create one!",
                         font=("Segoe UI", 14), text_color="#374151").grid(
                row=0, column=0, columnspan=2, pady=60
            )
            return

        for i, project in enumerate(projects):
            col = i % 2
            row = i // 2
            self._render_card(project, row, col)

    # ── Project card ───────────────────────────────────────────────────────

    def _render_card(self, project, row, col):
        card = ctk.CTkFrame(self.scroll, fg_color=CARD_BG, corner_radius=12)
        card.grid(row=row, column=col, padx=6, pady=6, sticky="nsew")
        card.grid_columnconfigure(0, weight=1)

        # Color header strip
        header = ctk.CTkFrame(card, fg_color=project["color"], corner_radius=0,
                               height=6)
        header.grid(row=0, column=0, sticky="ew", columnspan=2)

        # Body
        body = ctk.CTkFrame(card, fg_color="transparent")
        body.grid(row=1, column=0, sticky="ew", padx=14, pady=10)
        body.grid_columnconfigure(0, weight=1)

        # Name + status badge
        name_row = ctk.CTkFrame(body, fg_color="transparent")
        name_row.grid(row=0, column=0, sticky="ew")
        name_row.grid_columnconfigure(0, weight=1)

        ctk.CTkLabel(name_row, text=project["name"],
                     font=("Segoe UI", 15, "bold"), text_color="white",
                     anchor="w").grid(row=0, column=0, sticky="w")

        status_colors = {"Active": "#16a34a", "Paused": "#d97706", "Completed": "#2563eb"}
        sc = status_colors.get(project["status"], "#6b7280")
        ctk.CTkLabel(name_row, text=project["status"], font=("Segoe UI", 10),
                     fg_color=sc + "33", text_color=sc,
                     corner_radius=4, padx=6, pady=1).grid(row=0, column=1, sticky="e")

        # Description
        if project["description"]:
            ctk.CTkLabel(body, text=project["description"],
                         font=("Segoe UI", 11), text_color="#6b7280",
                         anchor="w", wraplength=300, justify="left").grid(
                row=1, column=0, sticky="w", pady=(4, 0)
            )

        # Dates
        date_parts = []
        if project["start_date"]:
            date_parts.append(f"Start: {project['start_date']}")
        if project["target_date"]:
            d = datetime.strptime(project["target_date"], "%Y-%m-%d").date()
            overdue = d < date.today() and project["status"] != "Completed"
            date_parts.append(("⚠ Due: " if overdue else "Due: ") + project["target_date"])
        if date_parts:
            ctk.CTkLabel(body, text="  ·  ".join(date_parts),
                         font=("Segoe UI", 10), text_color="#4b5563",
                         anchor="w").grid(row=2, column=0, sticky="w", pady=(4, 0))

        # Progress bar
        pct = max(0, min(100, project["progress"]))
        ctk.CTkLabel(body, text=f"Progress — {pct}%",
                     font=("Segoe UI", 11), text_color="#9ca3af",
                     anchor="w").grid(row=3, column=0, sticky="w", pady=(8, 2))
        bar = ctk.CTkProgressBar(body, height=10, corner_radius=5,
                                  progress_color=project["color"])
        bar.set(pct / 100)
        bar.grid(row=4, column=0, sticky="ew", pady=(0, 8))

        # Actions
        actions = ctk.CTkFrame(card, fg_color="transparent")
        actions.grid(row=2, column=0, padx=14, pady=(0, 12))

        ctk.CTkButton(actions, text="✏ Edit", width=72, height=28,
                      fg_color="#374151", hover_color="#4b5563",
                      font=("Segoe UI", 11),
                      command=lambda p=project: self._open_edit_dialog(p)).pack(side="left", padx=3)

        ctk.CTkButton(actions, text="📈 Progress", width=90, height=28,
                      fg_color="#374151", hover_color="#4b5563",
                      font=("Segoe UI", 11),
                      command=lambda p=project: self._update_progress_dialog(p)).pack(side="left", padx=3)

        ctk.CTkButton(actions, text="🗑", width=36, height=28,
                      fg_color="#374151", hover_color="#7f1d1d",
                      font=("Segoe UI", 11),
                      command=lambda pid=project["id"], pname=project["name"]: confirm_delete(
                          self.frame, pname, lambda: self._delete(pid))
                      ).pack(side="left", padx=3)

    # ── Actions ────────────────────────────────────────────────────────────

    def _open_add_dialog(self):
        ProjectDialog(self.frame, self.db, callback=self.refresh)

    def _open_edit_dialog(self, project):
        ProjectDialog(self.frame, self.db, project=project, callback=self.refresh)

    def _update_progress_dialog(self, project):
        ProgressDialog(self.frame, self.db, project, callback=self.refresh)

    def _delete(self, project_id):
        self.db.delete_project(project_id)
        self.refresh()


# ── Project dialog ─────────────────────────────────────────────────────────

class ProjectDialog(ctk.CTkToplevel):
    def __init__(self, parent, db, project=None, callback=None):
        super().__init__(parent)
        self.db       = db
        self.project  = project
        self.callback = callback
        self.chosen_color = project["color"] if project else PALETTE[0]

        self.title("Edit Project" if project else "New Project")
        self.geometry("480x480")
        self.resizable(False, False)
        self.grab_set()
        self.focus_set()
        self._center()
        self._build()
        if project:
            self._populate(project)

    def _center(self):
        self.update_idletasks()
        x = (self.winfo_screenwidth() - 480) // 2
        y = (self.winfo_screenheight() - 480) // 2
        self.geometry(f"480x480+{x}+{y}")

    def _build(self):
        self.configure(fg_color="#1a2332")
        main = ctk.CTkFrame(self, fg_color="#1f2937", corner_radius=10)
        main.pack(fill="both", expand=True, padx=16, pady=16)
        main.grid_columnconfigure(0, weight=1)

        def lbl(text, r):
            ctk.CTkLabel(main, text=text, font=("Segoe UI", 11),
                         text_color="#9ca3af", anchor="w").grid(
                row=r, column=0, sticky="w", padx=12, pady=(8, 1)
            )

        lbl("Project Name  *", 0)
        self.name_ent = ctk.CTkEntry(main, placeholder_text="Project name…", height=36)
        self.name_ent.grid(row=1, column=0, sticky="ew", padx=12)

        lbl("Description", 2)
        self.desc_box = ctk.CTkTextbox(main, height=60, fg_color="#374151",
                                       font=("Segoe UI", 12))
        self.desc_box.grid(row=3, column=0, sticky="ew", padx=12)

        r = ctk.CTkFrame(main, fg_color="transparent")
        r.grid(row=4, column=0, sticky="ew", padx=12, pady=(8, 0))
        r.grid_columnconfigure((0, 1), weight=1)

        ctk.CTkLabel(r, text="Start Date  (YYYY-MM-DD)", font=("Segoe UI", 11),
                     text_color="#9ca3af").grid(row=0, column=0, sticky="w")
        ctk.CTkLabel(r, text="Target Date  (YYYY-MM-DD)", font=("Segoe UI", 11),
                     text_color="#9ca3af").grid(row=0, column=1, sticky="w")
        self.start_ent = ctk.CTkEntry(r, placeholder_text=date.today().isoformat())
        self.start_ent.grid(row=1, column=0, sticky="ew", padx=(0, 5))
        self.target_ent = ctk.CTkEntry(r, placeholder_text="2025-12-31")
        self.target_ent.grid(row=1, column=1, sticky="ew", padx=(5, 0))

        lbl("Status", 5)
        self.status_var = ctk.CTkComboBox(main, values=STATUSES, width=160)
        self.status_var.set("Active")
        self.status_var.grid(row=6, column=0, sticky="w", padx=12)

        # Colour picker
        lbl("Color", 7)
        clr_frame = ctk.CTkFrame(main, fg_color="transparent")
        clr_frame.grid(row=8, column=0, sticky="w", padx=12)
        self.color_btns: dict[str, ctk.CTkButton] = {}
        for c in PALETTE:
            b = ctk.CTkButton(clr_frame, text="", width=24, height=24, corner_radius=6,
                              fg_color=c, hover_color=c,
                              command=lambda col=c: self._pick_color(col))
            b.pack(side="left", padx=2)
            self.color_btns[c] = b
        self._pick_color(self.chosen_color)

        # Buttons
        btns = ctk.CTkFrame(main, fg_color="transparent")
        btns.grid(row=9, column=0, sticky="ew", padx=12, pady=(14, 0))
        ctk.CTkButton(btns, text="Cancel", fg_color="#374151", hover_color="#4b5563",
                      command=self.destroy).pack(side="left")
        ctk.CTkButton(btns, text="Save Project", fg_color="#1a73e8", hover_color="#1557b0",
                      command=self._save).pack(side="right")

    def _pick_color(self, color: str):
        self.chosen_color = color
        for c, btn in self.color_btns.items():
            btn.configure(border_width=3 if c == color else 0,
                          border_color="white")

    def _populate(self, p):
        self.name_ent.insert(0, p["name"])
        if p["description"]:
            self.desc_box.insert("1.0", p["description"])
        if p["start_date"]:
            self.start_ent.insert(0, p["start_date"])
        if p["target_date"]:
            self.target_ent.insert(0, p["target_date"])
        self.status_var.set(p["status"])
        self._pick_color(p["color"])

    def _save(self):
        name = self.name_ent.get().strip()
        if not name:
            self.name_ent.configure(border_color="#ef4444")
            return
        desc   = self.desc_box.get("1.0", "end").strip()
        start  = self.start_ent.get().strip() or None
        target = self.target_ent.get().strip() or None
        status = self.status_var.get()

        if self.project:
            self.db.update_project(self.project["id"],
                                   name=name, description=desc,
                                   color=self.chosen_color, status=status,
                                   start_date=start, target_date=target)
        else:
            self.db.add_project(name, desc, self.chosen_color, start, target)

        if self.callback:
            self.callback()
        self.destroy()


# ── Progress update dialog ─────────────────────────────────────────────────

class ProgressDialog(ctk.CTkToplevel):
    def __init__(self, parent, db, project, callback=None):
        super().__init__(parent)
        self.db       = db
        self.project  = project
        self.callback = callback

        self.title(f"Update Progress — {project['name']}")
        self.geometry("360x220")
        self.resizable(False, False)
        self.grab_set()
        self.focus_set()
        self._center()
        self._build()

    def _center(self):
        self.update_idletasks()
        x = (self.winfo_screenwidth() - 360) // 2
        y = (self.winfo_screenheight() - 220) // 2
        self.geometry(f"360x220+{x}+{y}")

    def _build(self):
        self.configure(fg_color="#1a2332")
        main = ctk.CTkFrame(self, fg_color="#1f2937", corner_radius=10)
        main.pack(fill="both", expand=True, padx=16, pady=16)
        main.grid_columnconfigure(0, weight=1)

        ctk.CTkLabel(main, text=f"Set progress for\n\"{self.project['name']}\"",
                     font=("Segoe UI", 13, "bold"), text_color="white",
                     justify="center").grid(row=0, column=0, pady=(12, 8))

        self.slider = ctk.CTkSlider(main, from_=0, to=100, number_of_steps=100,
                                    command=self._on_slide)
        self.slider.set(self.project["progress"])
        self.slider.grid(row=1, column=0, sticky="ew", padx=20)

        self.pct_lbl = ctk.CTkLabel(main,
                                     text=f"{self.project['progress']}%",
                                     font=("Segoe UI", 22, "bold"),
                                     text_color="#60a5fa")
        self.pct_lbl.grid(row=2, column=0, pady=8)

        btns = ctk.CTkFrame(main, fg_color="transparent")
        btns.grid(row=3, column=0, pady=(4, 12))
        ctk.CTkButton(btns, text="Cancel", fg_color="#374151",
                      command=self.destroy).pack(side="left", padx=6)
        ctk.CTkButton(btns, text="Save", fg_color="#1a73e8",
                      command=self._save).pack(side="left", padx=6)

    def _on_slide(self, val):
        self.pct_lbl.configure(text=f"{int(val)}%")

    def _save(self):
        pct = int(self.slider.get())
        self.db.update_project(self.project["id"], progress=pct)
        if self.callback:
            self.callback()
        self.destroy()
