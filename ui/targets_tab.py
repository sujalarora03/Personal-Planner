import customtkinter as ctk
import matplotlib
from matplotlib.figure import Figure
from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg
from datetime import date
from ui.utils import confirm_delete
from ui.theme import CARD_BG, FIG_BG, AXES_BG

CATEGORIES = ["Personal", "Health", "Career", "Finance", "Learning", "Fitness", "Travel", "Other"]
PALETTE    = [
    "#3b82f6", "#10b981", "#f59e0b", "#ef4444",
    "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16",
    "#f97316", "#6b7280",
]


class TargetsTab:
    def __init__(self, parent, db):
        self.db   = db
        self.frame = ctk.CTkFrame(parent, fg_color="#111827", corner_radius=0)
        self.frame.grid_columnconfigure(0, weight=1)
        self.frame.grid_rowconfigure(1, weight=1)
        self._year = date.today().year
        self._build_ui()

    # ── Layout ─────────────────────────────────────────────────────────────

    def _build_ui(self):
        # Header
        hdr = ctk.CTkFrame(self.frame, fg_color="transparent")
        hdr.grid(row=0, column=0, padx=24, pady=(18, 6), sticky="ew")
        hdr.grid_columnconfigure(1, weight=1)

        ctk.CTkLabel(hdr, text="Year Targets",
                     font=("Segoe UI", 22, "bold"), text_color="white").grid(row=0, column=0, sticky="w")

        ctrl = ctk.CTkFrame(hdr, fg_color="transparent")
        ctrl.grid(row=0, column=1, sticky="e")

        ctk.CTkLabel(ctrl, text="Year:", text_color="#6b7280",
                     font=("Segoe UI", 12)).pack(side="left", padx=(0, 4))

        years = [str(y) for y in range(date.today().year - 2, date.today().year + 4)]
        self.year_combo = ctk.CTkComboBox(ctrl, values=years, width=90,
                                          command=self._on_year_change)
        self.year_combo.set(str(self._year))
        self.year_combo.pack(side="left", padx=(0, 14))

        ctk.CTkButton(ctrl, text="＋  Add Target", width=120,
                      fg_color="#1a73e8", hover_color="#1557b0",
                      font=("Segoe UI", 12, "bold"),
                      command=self._open_add_dialog).pack(side="left")

        # Two-column layout: list + chart
        body = ctk.CTkFrame(self.frame, fg_color="transparent")
        body.grid(row=1, column=0, sticky="nsew", padx=12, pady=4)
        body.grid_columnconfigure(0, weight=3)
        body.grid_columnconfigure(1, weight=2)
        body.grid_rowconfigure(0, weight=1)

        # Left: targets list
        self.list_scroll = ctk.CTkScrollableFrame(body, fg_color="transparent", corner_radius=0)
        self.list_scroll.grid(row=0, column=0, sticky="nsew", padx=(0, 6))
        self.list_scroll.grid_columnconfigure(0, weight=1)

        # Right: chart
        self.chart_slot = ctk.CTkFrame(body, fg_color="transparent", corner_radius=0)
        self.chart_slot.grid(row=0, column=1, sticky="nsew", padx=(6, 0))
        self.chart_slot.grid_columnconfigure(0, weight=1)

    # ── Refresh ────────────────────────────────────────────────────────────

    def _on_year_change(self, val):
        self._year = int(val)
        self.refresh()

    def refresh(self):
        for w in self.list_scroll.winfo_children():
            w.destroy()
        for w in self.chart_slot.winfo_children():
            w.destroy()

        targets = self.db.get_targets(year=self._year)

        if not targets:
            ctk.CTkLabel(self.list_scroll,
                         text=f"No targets for {self._year}.\nAdd your first one!",
                         font=("Segoe UI", 14), text_color="#374151",
                         justify="center").grid(row=0, column=0, pady=60)
            return

        for i, t in enumerate(targets):
            self._render_target(t, i)

        self._render_chart(targets)

    # ── Target row ─────────────────────────────────────────────────────────

    def _render_target(self, target, row):
        card = ctk.CTkFrame(self.list_scroll, fg_color=CARD_BG, corner_radius=12)
        card.grid(row=row, column=0, padx=4, pady=5, sticky="ew")
        card.grid_columnconfigure(0, weight=1)

        pct = min(1.0, target["current_value"] / target["target_value"]) \
              if target["target_value"] > 0 else 0
        pct_int = round(pct * 100)

        # Title row
        top = ctk.CTkFrame(card, fg_color="transparent")
        top.grid(row=0, column=0, sticky="ew", padx=14, pady=(12, 4))
        top.grid_columnconfigure(0, weight=1)

        ctk.CTkLabel(top, text=target["title"],
                     font=("Segoe UI", 14, "bold"), text_color="white",
                     anchor="w").grid(row=0, column=0, sticky="w")

        badge_color = target["color"]
        ctk.CTkLabel(top, text=target["category"], font=("Segoe UI", 10),
                     fg_color=badge_color + "33", text_color=badge_color,
                     corner_radius=4, padx=6, pady=1).grid(row=0, column=1, sticky="e")

        # Description
        if target["description"]:
            ctk.CTkLabel(card, text=target["description"],
                         font=("Segoe UI", 11), text_color="#6b7280",
                         anchor="w").grid(row=1, column=0, sticky="w", padx=14)

        # Progress bar
        prog_row = ctk.CTkFrame(card, fg_color="transparent")
        prog_row.grid(row=2, column=0, sticky="ew", padx=14, pady=(6, 4))
        prog_row.grid_columnconfigure(0, weight=1)

        bar = ctk.CTkProgressBar(prog_row, height=14, corner_radius=6,
                                  progress_color=target["color"])
        bar.set(pct)
        bar.grid(row=0, column=0, sticky="ew")

        ctk.CTkLabel(
            prog_row,
            text=f"{target['current_value']:.1f} / {target['target_value']:.1f} {target['unit']}  —  {pct_int}%",
            font=("Segoe UI", 11), text_color="#9ca3af"
        ).grid(row=1, column=0, sticky="w", pady=(2, 0))

        # Actions
        actions = ctk.CTkFrame(card, fg_color="transparent")
        actions.grid(row=3, column=0, padx=14, pady=(4, 12))

        ctk.CTkButton(actions, text="📈 Update", width=85, height=28,
                      fg_color="#374151", hover_color="#4b5563",
                      font=("Segoe UI", 11),
                      command=lambda t=target: self._open_progress_dialog(t)).pack(side="left", padx=3)

        ctk.CTkButton(actions, text="✏ Edit", width=72, height=28,
                      fg_color="#374151", hover_color="#4b5563",
                      font=("Segoe UI", 11),
                      command=lambda t=target: self._open_edit_dialog(t)).pack(side="left", padx=3)

        ctk.CTkButton(actions, text="🗑", width=36, height=28,
                      fg_color="#374151", hover_color="#7f1d1d",
                      font=("Segoe UI", 11),
                      command=lambda tid=target["id"], ttl=target["title"]: confirm_delete(
                          self.frame, ttl, lambda: self._delete(tid))
                      ).pack(side="left", padx=3)

    # ── Progress chart (horizontal bars) ──────────────────────────────────

    def _render_chart(self, targets):
        card = ctk.CTkFrame(self.chart_slot, fg_color=CARD_BG, corner_radius=12)
        card.grid(row=0, column=0, sticky="nsew")
        card.grid_rowconfigure(1, weight=1)

        ctk.CTkLabel(card, text=f"📊  {self._year} Overview",
                     font=("Segoe UI", 13, "bold"), text_color="white").grid(
            row=0, column=0, sticky="w", padx=16, pady=(12, 4)
        )

        n = len(targets)
        h = max(2.5, n * 0.55)
        fig = Figure(figsize=(4.0, h), dpi=90, facecolor=FIG_BG)
        ax  = fig.add_subplot(111, facecolor=AXES_BG)

        labels = [t["title"][:22] for t in reversed(targets)]
        pcts   = [
            min(100, t["current_value"] / t["target_value"] * 100)
            if t["target_value"] > 0 else 0
            for t in reversed(targets)
        ]
        colors = [t["color"] for t in reversed(targets)]

        y = range(len(labels))
        bars = ax.barh(list(y), pcts, color=colors, alpha=0.85, height=0.55)

        ax.set_xlim(0, 105)
        ax.set_yticks(list(y))
        ax.set_yticklabels(labels, fontsize=9, color="#d1d5db")
        ax.set_xlabel("Progress %", color="#6b7280", fontsize=8)
        ax.tick_params(colors="#6b7280", labelsize=8)
        for sp in ("top", "right"):
            ax.spines[sp].set_visible(False)
        for sp in ("bottom", "left"):
            ax.spines[sp].set_color("#374151")

        for bar, pct in zip(bars, pcts):
            ax.text(bar.get_width() + 1, bar.get_y() + bar.get_height() / 2,
                    f"{pct:.0f}%", va="center", color="#9ca3af", fontsize=8)

        fig.tight_layout(pad=0.5)
        canvas = FigureCanvasTkAgg(fig, master=card)
        canvas.draw()
        canvas.get_tk_widget().grid(row=1, column=0, padx=8, pady=(0, 12), sticky="nsew")

    # ── Actions ────────────────────────────────────────────────────────────

    def _open_add_dialog(self):
        TargetDialog(self.frame, self.db, year=self._year, callback=self.refresh)

    def _open_edit_dialog(self, target):
        TargetDialog(self.frame, self.db, target=target, year=self._year, callback=self.refresh)

    def _open_progress_dialog(self, target):
        TargetProgressDialog(self.frame, self.db, target, callback=self.refresh)

    def _delete(self, target_id):
        self.db.delete_target(target_id)
        self.refresh()


# ── Add / Edit target dialog ───────────────────────────────────────────────

class TargetDialog(ctk.CTkToplevel):
    def __init__(self, parent, db, target=None, year=None, callback=None):
        super().__init__(parent)
        self.db       = db
        self.target   = target
        self.year     = year or date.today().year
        self.callback = callback
        self.chosen_color = target["color"] if target else PALETTE[0]

        self.title("Edit Target" if target else "New Target")
        self.geometry("470x500")
        self.resizable(False, False)
        self.grab_set()
        self.focus_set()
        self._center()
        self._build()
        if target:
            self._populate(target)

    def _center(self):
        self.update_idletasks()
        x = (self.winfo_screenwidth() - 470) // 2
        y = (self.winfo_screenheight() - 500) // 2
        self.geometry(f"470x500+{x}+{y}")

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

        lbl("Title  *", 0)
        self.title_ent = ctk.CTkEntry(main, placeholder_text="e.g. Read 24 books", height=36)
        self.title_ent.grid(row=1, column=0, sticky="ew", padx=12)

        lbl("Description", 2)
        self.desc_box = ctk.CTkTextbox(main, height=60, fg_color="#374151",
                                       font=("Segoe UI", 12))
        self.desc_box.grid(row=3, column=0, sticky="ew", padx=12)

        # Target value + unit + category
        r = ctk.CTkFrame(main, fg_color="transparent")
        r.grid(row=4, column=0, sticky="ew", padx=12, pady=(8, 0))
        r.grid_columnconfigure((0, 1, 2), weight=1)

        def rlbl(text, col):
            ctk.CTkLabel(r, text=text, font=("Segoe UI", 11),
                         text_color="#9ca3af", anchor="w").grid(row=0, column=col, sticky="w")

        rlbl("Target Value", 0)
        rlbl("Unit", 1)
        rlbl("Category", 2)

        self.target_val = ctk.CTkEntry(r, placeholder_text="100")
        self.target_val.grid(row=1, column=0, sticky="ew", padx=(0, 4))
        self.unit_ent = ctk.CTkEntry(r, placeholder_text="%")
        self.unit_ent.grid(row=1, column=1, sticky="ew", padx=4)
        self.category = ctk.CTkComboBox(r, values=CATEGORIES)
        self.category.set("Personal")
        self.category.grid(row=1, column=2, sticky="ew", padx=(4, 0))

        # Current progress + year
        r2 = ctk.CTkFrame(main, fg_color="transparent")
        r2.grid(row=5, column=0, sticky="ew", padx=12, pady=(8, 0))
        r2.grid_columnconfigure((0, 1), weight=1)

        ctk.CTkLabel(r2, text="Current Value", font=("Segoe UI", 11),
                     text_color="#9ca3af").grid(row=0, column=0, sticky="w")
        ctk.CTkLabel(r2, text="Year", font=("Segoe UI", 11),
                     text_color="#9ca3af").grid(row=0, column=1, sticky="w")
        self.current_val = ctk.CTkEntry(r2, placeholder_text="0")
        self.current_val.grid(row=1, column=0, sticky="ew", padx=(0, 4))
        years = [str(y) for y in range(date.today().year - 2, date.today().year + 4)]
        self.year_combo = ctk.CTkComboBox(r2, values=years)
        self.year_combo.set(str(self.year))
        self.year_combo.grid(row=1, column=1, sticky="ew", padx=(4, 0))

        # Colour picker
        lbl("Color", 6)
        clr_frame = ctk.CTkFrame(main, fg_color="transparent")
        clr_frame.grid(row=7, column=0, sticky="w", padx=12)
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
        btns.grid(row=8, column=0, sticky="ew", padx=12, pady=(14, 0))
        ctk.CTkButton(btns, text="Cancel", fg_color="#374151",
                      command=self.destroy).pack(side="left")
        ctk.CTkButton(btns, text="Save Target", fg_color="#1a73e8",
                      command=self._save).pack(side="right")

    def _pick_color(self, color):
        self.chosen_color = color
        for c, btn in self.color_btns.items():
            btn.configure(border_width=3 if c == color else 0, border_color="white")

    def _populate(self, t):
        self.title_ent.insert(0, t["title"])
        if t["description"]:
            self.desc_box.insert("1.0", t["description"])
        self.target_val.insert(0, str(t["target_value"]))
        self.unit_ent.insert(0, t["unit"])
        self.category.set(t["category"])
        self.current_val.insert(0, str(t["current_value"]))
        self.year_combo.set(str(t["year"]))
        self._pick_color(t["color"])

    def _save(self):
        title = self.title_ent.get().strip()
        if not title:
            self.title_ent.configure(border_color="#ef4444")
            return
        try:
            tv = float(self.target_val.get().strip() or "100")
            cv = float(self.current_val.get().strip() or "0")
        except ValueError:
            return
        desc  = self.desc_box.get("1.0", "end").strip()
        unit  = self.unit_ent.get().strip() or "%"
        cat   = self.category.get()
        yr    = int(self.year_combo.get())

        if self.target:
            self.db.update_target(self.target["id"], title=title, description=desc,
                                  category=cat, target_value=tv, current_value=cv,
                                  unit=unit, color=self.chosen_color, year=yr)
        else:
            self.db.add_target(yr, title, desc, cat, tv, unit, self.chosen_color)

        if self.callback:
            self.callback()
        self.destroy()


# ── Quick progress update dialog ───────────────────────────────────────────

class TargetProgressDialog(ctk.CTkToplevel):
    def __init__(self, parent, db, target, callback=None):
        super().__init__(parent)
        self.db       = db
        self.target   = target
        self.callback = callback

        self.title(f"Update — {target['title']}")
        self.geometry("380x240")
        self.resizable(False, False)
        self.grab_set()
        self.focus_set()
        self._center()
        self._build()

    def _center(self):
        self.update_idletasks()
        x = (self.winfo_screenwidth() - 380) // 2
        y = (self.winfo_screenheight() - 240) // 2
        self.geometry(f"380x240+{x}+{y}")

    def _build(self):
        self.configure(fg_color="#1a2332")
        main = ctk.CTkFrame(self, fg_color="#1f2937", corner_radius=10)
        main.pack(fill="both", expand=True, padx=16, pady=16)
        main.grid_columnconfigure(0, weight=1)

        t = self.target
        pct = min(100, t["current_value"] / t["target_value"] * 100) \
              if t["target_value"] > 0 else 0

        ctk.CTkLabel(main, text=t["title"],
                     font=("Segoe UI", 14, "bold"), text_color="white").grid(
            row=0, column=0, pady=(12, 4), padx=12, sticky="w"
        )
        ctk.CTkLabel(main,
                     text=f"Current: {t['current_value']} / {t['target_value']} {t['unit']}  ({pct:.0f}%)",
                     font=("Segoe UI", 11), text_color="#6b7280").grid(
            row=1, column=0, padx=12, sticky="w"
        )

        ctk.CTkLabel(main, text=f"New value  ({t['unit']})",
                     font=("Segoe UI", 11), text_color="#9ca3af").grid(
            row=2, column=0, padx=12, pady=(12, 2), sticky="w"
        )
        self.val_ent = ctk.CTkEntry(main, placeholder_text=str(t["current_value"]),
                                    height=36)
        self.val_ent.insert(0, str(t["current_value"]))
        self.val_ent.grid(row=3, column=0, sticky="ew", padx=12)

        btns = ctk.CTkFrame(main, fg_color="transparent")
        btns.grid(row=4, column=0, pady=(14, 12))
        ctk.CTkButton(btns, text="Cancel", fg_color="#374151",
                      command=self.destroy).pack(side="left", padx=6)
        ctk.CTkButton(btns, text="Update", fg_color="#1a73e8",
                      command=self._save).pack(side="left", padx=6)

    def _save(self):
        try:
            val = float(self.val_ent.get().strip())
        except ValueError:
            return
        self.db.update_target(self.target["id"], current_value=val)
        if self.callback:
            self.callback()
        self.destroy()
