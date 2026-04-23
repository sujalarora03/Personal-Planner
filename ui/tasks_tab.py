import customtkinter as ctk
from datetime import datetime, date
import tkinter as tk
from ui.utils import confirm_delete
from ui.theme import CARD_BG, FIG_BG, AXES_BG

PRIORITIES  = ["Low", "Medium", "High", "Urgent"]
STATUSES    = ["Todo", "In Progress", "Done"]
CATEGORIES  = ["General", "Work", "Personal", "Health", "Learning", "Finance", "Other"]

PRIORITY_COLORS = {
    "Low":    "#6b7280",
    "Medium": "#3b82f6",
    "High":   "#f59e0b",
    "Urgent": "#ef4444",
}
STATUS_COLORS = {
    "Todo":        "#6b7280",
    "In Progress": "#3b82f6",
    "Done":        "#10b981",
}
STATUS_NEXT = {"Todo": "In Progress", "In Progress": "Done", "Done": "Todo"}
STATUS_ICON = {"Todo": "▶", "In Progress": "✓", "Done": "↩"}


class TasksTab:
    def __init__(self, parent, db):
        self.db = db
        self.frame = ctk.CTkFrame(parent, fg_color="#111827", corner_radius=0)
        self.frame.grid_columnconfigure(0, weight=1)
        self.frame.grid_rowconfigure(1, weight=1)
        self._build_ui()

    # ── Layout ─────────────────────────────────────────────────────────────

    def _build_ui(self):
        # Header bar
        hdr = ctk.CTkFrame(self.frame, fg_color="transparent")
        hdr.grid(row=0, column=0, padx=24, pady=(18, 6), sticky="ew")
        hdr.grid_columnconfigure(1, weight=1)

        ctk.CTkLabel(hdr, text="Tasks",
                     font=("Segoe UI", 22, "bold"), text_color="white").grid(row=0, column=0, sticky="w")

        # Filters + add button
        ctrl = ctk.CTkFrame(hdr, fg_color="transparent")
        ctrl.grid(row=0, column=1, sticky="e")

        ctk.CTkLabel(ctrl, text="Status:", text_color="#6b7280",
                     font=("Segoe UI", 12)).pack(side="left", padx=(0, 4))
        self.status_filter = ctk.CTkComboBox(ctrl, values=["All"] + STATUSES + ["Archived"],
                                             width=130, command=self._refresh_from_filter)
        self.status_filter.set("All")
        self.status_filter.pack(side="left", padx=(0, 10))

        ctk.CTkLabel(ctrl, text="Category:", text_color="#6b7280",
                     font=("Segoe UI", 12)).pack(side="left", padx=(0, 4))
        self.cat_filter = ctk.CTkComboBox(ctrl, values=["All"] + CATEGORIES,
                                          width=130, command=self._refresh_from_filter)
        self.cat_filter.set("All")
        self.cat_filter.pack(side="left", padx=(0, 14))

        ctk.CTkButton(ctrl, text="＋  Add Task", width=115,
                      fg_color="#1a73e8", hover_color="#1557b0",
                      font=("Segoe UI", 13, "bold"),
                      command=self._open_add_dialog).pack(side="left")

        # Search bar
        search_row = ctk.CTkFrame(hdr, fg_color="transparent")
        search_row.grid(row=1, column=0, columnspan=2, sticky="ew", pady=(8, 0))
        search_row.grid_columnconfigure(0, weight=1)
        self._search_var = ctk.StringVar()
        ctk.CTkEntry(
            search_row,
            textvariable=self._search_var,
            placeholder_text="🔍  Search tasks by title or description...",
            height=38,
            font=("Segoe UI", 12)
        ).grid(row=0, column=0, sticky="ew")
        self._search_var.trace_add("write", lambda *_: self.refresh())

        # Scrollable task list
        self.scroll = ctk.CTkScrollableFrame(self.frame, fg_color="transparent", corner_radius=0)
        self.scroll.grid(row=1, column=0, sticky="nsew", padx=12, pady=4)
        self.scroll.grid_columnconfigure(0, weight=1)

    # ── Refresh ────────────────────────────────────────────────────────────

    def _refresh_from_filter(self, _=None):
        self.refresh()

    def refresh(self):
        for w in self.scroll.winfo_children():
            w.destroy()

        status_sel = self.status_filter.get()
        category   = None if self.cat_filter.get() == "All" else self.cat_filter.get()

        if status_sel == "Archived":
            tasks = self.db.get_tasks(include_archived=True)
            tasks = [t for t in tasks if t["archived"]]
        else:
            status = None if status_sel == "All" else status_sel
            tasks  = self.db.get_tasks(status=status, category=category)

        # Live search filter
        q = self._search_var.get().strip().lower() if hasattr(self, "_search_var") else ""
        if q:
            tasks = [t for t in tasks
                     if q in t["title"].lower() or q in (t["description"] or "").lower()]

        if not tasks:
            empty = ctk.CTkFrame(self.scroll, fg_color="transparent")
            empty.grid(row=0, column=0, pady=60)
            ctk.CTkLabel(empty,
                         text="No tasks found" if q else "No tasks yet — add your first one!",
                         font=("Segoe UI", 14), text_color="#374151").pack()
            if not q:
                ctk.CTkButton(empty, text="＋  Add Task", width=130, height=36,
                              fg_color="#1a73e8", hover_color="#1557b0",
                              font=("Segoe UI", 12, "bold"),
                              command=self._open_add_dialog).pack(pady=(12, 0))
            return

        for i, task in enumerate(tasks):
            self._render_card(task, i)

    # ── Task card ──────────────────────────────────────────────────────────

    def _render_card(self, task, row):
        card = ctk.CTkFrame(self.scroll, fg_color=CARD_BG, corner_radius=10)
        card.grid(row=row, column=0, padx=6, pady=4, sticky="ew")
        card.grid_columnconfigure(1, weight=1)

        # Priority colour accent
        accent_color = PRIORITY_COLORS.get(task["priority"], "#6b7280")
        accent = ctk.CTkFrame(card, width=5, fg_color=accent_color, corner_radius=3)
        accent.grid(row=0, column=0, rowspan=3, padx=(8, 6), pady=10, sticky="ns")

        # Content
        body = ctk.CTkFrame(card, fg_color="transparent")
        body.grid(row=0, column=1, pady=10, sticky="ew")
        body.grid_columnconfigure(0, weight=1)

        # Title row
        title_row = ctk.CTkFrame(body, fg_color="transparent")
        title_row.grid(row=0, column=0, sticky="ew")
        title_row.grid_columnconfigure(0, weight=1)

        done = task["status"] == "Done"
        title_text = ("✓  " if done else "") + task["title"]
        ctk.CTkLabel(title_row, text=title_text,
                     font=("Segoe UI", 13, "bold" if not done else "normal"),
                     text_color="#e5e7eb" if not done else "#4b5563",
                     anchor="w").grid(row=0, column=0, sticky="w")

        # Badges
        badges = ctk.CTkFrame(title_row, fg_color="transparent")
        badges.grid(row=0, column=1, sticky="e", padx=6)

        pc = PRIORITY_COLORS.get(task["priority"], "#6b7280")
        ctk.CTkLabel(badges, text=task["priority"], font=("Segoe UI", 10),
                     fg_color=pc + "33", text_color=pc,
                     corner_radius=4, padx=6, pady=1).pack(side="left", padx=2)
        ctk.CTkLabel(badges, text=task["category"], font=("Segoe UI", 10),
                     fg_color="#374151", text_color="#9ca3af",
                     corner_radius=4, padx=6, pady=1).pack(side="left", padx=2)

        # Description
        if task["description"]:
            ctk.CTkLabel(body, text=task["description"],
                         font=("Segoe UI", 11), text_color="#6b7280",
                         anchor="w", justify="left").grid(row=1, column=0, sticky="w", pady=(2, 0))

        # Due date
        if task["due_date"]:
            due = datetime.strptime(task["due_date"], "%Y-%m-%d").date()
            overdue = due < date.today() and not done
            clr = "#ef4444" if overdue else "#6b7280"
            text = f"Due: {due.strftime('%b %d, %Y')}" + ("  ⚠ Overdue" if overdue else "")
            ctk.CTkLabel(body, text=text, font=("Segoe UI", 11),
                         text_color=clr, anchor="w").grid(row=2, column=0, sticky="w")

        # Action buttons
        actions = ctk.CTkFrame(card, fg_color="transparent")
        actions.grid(row=0, column=2, padx=(0, 10), pady=10)

        sc = STATUS_COLORS.get(task["status"], "#374151")
        next_s = STATUS_NEXT[task["status"]]
        ctk.CTkButton(actions, text=STATUS_ICON[task["status"]],
                      width=32, height=32, corner_radius=6,
                      fg_color=sc, hover_color="#374151",
                      font=("Segoe UI", 13),
                      command=lambda tid=task["id"], s=next_s: self._toggle_status(tid, s)
                      ).pack(side="left", padx=2)

        ctk.CTkButton(actions, text="✏", width=32, height=32, corner_radius=6,
                      fg_color="#374151", hover_color="#4b5563",
                      command=lambda t=task: self._open_edit_dialog(t)
                      ).pack(side="left", padx=2)

        ctk.CTkButton(actions, text="🗑", width=32, height=32, corner_radius=6,
                      fg_color="#374151", hover_color="#7f1d1d",
                      command=lambda tid=task["id"], ttl=task["title"]: confirm_delete(
                          self.frame, ttl, lambda: self._delete(tid))
                      ).pack(side="left", padx=2)

        if task["status"] == "Done" and not task.get("archived"):
            ctk.CTkButton(actions, text="📦", width=32, height=32, corner_radius=6,
                          fg_color="#374151", hover_color="#4b5563",
                          command=lambda tid=task["id"]: self._archive(tid)
                          ).pack(side="left", padx=2)

    # ── Actions ────────────────────────────────────────────────────────────

    def _toggle_status(self, task_id, new_status):
        self.db.update_task_status(task_id, new_status)
        self.refresh()

    def _delete(self, task_id):
        self.db.delete_task(task_id)
        self.refresh()

    def _archive(self, task_id):
        self.db.archive_task(task_id)
        self.refresh()

    def _open_add_dialog(self):
        TaskDialog(self.frame, self.db, callback=self.refresh)

    def _open_edit_dialog(self, task):
        TaskDialog(self.frame, self.db, task=task, callback=self.refresh)


# ── Add / Edit dialog ──────────────────────────────────────────────────────

class TaskDialog(ctk.CTkToplevel):
    def __init__(self, parent, db, task=None, callback=None):
        super().__init__(parent)
        self.db       = db
        self.task     = task
        self.callback = callback

        title = "Edit Task" if task else "New Task"
        self.title(title)
        self.geometry("460x520")
        self.resizable(False, False)
        self.grab_set()
        self.focus_set()
        self._center()
        self._build()
        if task:
            self._populate(task)

    def _center(self):
        self.update_idletasks()
        sw = self.winfo_screenwidth()
        sh = self.winfo_screenheight()
        x = (sw - 460) // 2
        y = (sh - 520) // 2
        self.geometry(f"460x520+{x}+{y}")

    def _build(self):
        self.configure(fg_color="#1a2332")
        main = ctk.CTkFrame(self, fg_color="#1f2937", corner_radius=10)
        main.pack(fill="both", expand=True, padx=16, pady=16)
        main.grid_columnconfigure(0, weight=1)

        def lbl(text):
            return ctk.CTkLabel(main, text=text, font=("Segoe UI", 11),
                                text_color="#9ca3af", anchor="w")

        lbl("Title  *").grid(row=0, column=0, sticky="w", padx=12, pady=(12, 2))
        self.title_ent = ctk.CTkEntry(main, placeholder_text="Task title…", height=36)
        self.title_ent.grid(row=1, column=0, sticky="ew", padx=12, pady=(0, 8))

        lbl("Description").grid(row=2, column=0, sticky="w", padx=12, pady=(0, 2))
        self.desc_box = ctk.CTkTextbox(main, height=72, fg_color="#374151",
                                       font=("Segoe UI", 12))
        self.desc_box.grid(row=3, column=0, sticky="ew", padx=12, pady=(0, 8))

        r1 = ctk.CTkFrame(main, fg_color="transparent")
        r1.grid(row=4, column=0, sticky="ew", padx=12, pady=(0, 8))
        r1.grid_columnconfigure((0, 1), weight=1)

        lbl2 = lambda t, parent=r1: ctk.CTkLabel(parent, text=t, font=("Segoe UI", 11),
                                                  text_color="#9ca3af", anchor="w")
        lbl2("Priority").grid(row=0, column=0, sticky="w")
        self.priority = ctk.CTkComboBox(r1, values=PRIORITIES, width=160)
        self.priority.set("Medium")
        self.priority.grid(row=1, column=0, sticky="ew", padx=(0, 5))

        lbl2("Category").grid(row=0, column=1, sticky="w")
        self.category = ctk.CTkComboBox(r1, values=CATEGORIES, width=160)
        self.category.set("General")
        self.category.grid(row=1, column=1, sticky="ew", padx=(5, 0))

        r2 = ctk.CTkFrame(main, fg_color="transparent")
        r2.grid(row=5, column=0, sticky="ew", padx=12, pady=(0, 8))
        r2.grid_columnconfigure((0, 1), weight=1)

        lbl3 = lambda t, parent=r2: ctk.CTkLabel(parent, text=t, font=("Segoe UI", 11),
                                                  text_color="#9ca3af", anchor="w")
        lbl3("Status").grid(row=0, column=0, sticky="w")
        self.status = ctk.CTkComboBox(r2, values=STATUSES, width=160)
        self.status.set("Todo")
        self.status.grid(row=1, column=0, sticky="ew", padx=(0, 5))

        lbl3("Due Date  (YYYY-MM-DD)").grid(row=0, column=1, sticky="w")
        self.due = ctk.CTkEntry(r2, placeholder_text="2025-12-31")
        self.due.grid(row=1, column=1, sticky="ew", padx=(5, 0))

        # Buttons
        btns = ctk.CTkFrame(main, fg_color="transparent")
        btns.grid(row=6, column=0, sticky="ew", padx=12, pady=(10, 12))

        ctk.CTkButton(btns, text="Cancel", fg_color="#374151", hover_color="#4b5563",
                      command=self.destroy).pack(side="left")
        ctk.CTkButton(btns, text="Save Task", fg_color="#1a73e8", hover_color="#1557b0",
                      command=self._save).pack(side="right")

    def _populate(self, task):
        self.title_ent.insert(0, task["title"])
        if task["description"]:
            self.desc_box.insert("1.0", task["description"])
        self.priority.set(task["priority"])
        self.category.set(task["category"])
        self.status.set(task["status"])
        if task["due_date"]:
            self.due.insert(0, task["due_date"])

    def _save(self):
        title = self.title_ent.get().strip()
        if not title:
            self.title_ent.configure(border_color="#ef4444")
            return
        desc     = self.desc_box.get("1.0", "end").strip()
        priority = self.priority.get()
        category = self.category.get()
        status   = self.status.get()
        due      = self.due.get().strip() or None

        if self.task:
            self.db.update_task(self.task["id"], title, desc, category, priority, due, status)
        else:
            self.db.add_task(title, desc, category, priority, due)

        if self.callback:
            self.callback()
        self.destroy()
