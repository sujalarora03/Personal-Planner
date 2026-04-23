"""
Profile Tab — user personal info (name, birthdate, company, role, experience).
Skills are auto-extracted from uploaded resumes and displayed here read-only.

Also exports ProfileSetupDialog, shown on first launch when no profile exists.
"""
import customtkinter as ctk
from datetime import date, datetime

from ui.theme import CARD_BG, FIG_BG, AXES_BG

# ── Category display colours ───────────────────────────────────────────────────
CAT_COLORS = {
    "Programming Languages":  "#7c3aed",
    "Frameworks & Libraries": "#0369a1",
    "Databases":              "#047857",
    "Cloud & DevOps":         "#b45309",
    "Tools & Platforms":      "#374151",
    "Data & AI":              "#7e22ce",
}
PILL_BG = "#1e3a5f"
PILL_FG = "#93c5fd"


# ── Profile Tab ───────────────────────────────────────────────────────────────

class ProfileTab:
    def __init__(self, parent, db):
        self.db = db
        self.frame = ctk.CTkFrame(parent, fg_color=AXES_BG, corner_radius=0)
        self.frame.grid_columnconfigure(0, weight=1)
        self.frame.grid_columnconfigure(1, weight=1)
        self.frame.grid_rowconfigure(1, weight=1)
        self._entries = {}
        self._build_ui()

    # ── Layout ────────────────────────────────────────────────────────────────

    def _build_ui(self):
        self._build_hero()
        self._build_form()
        self._build_skills_panel()

    def _build_hero(self):
        """Full-width hero banner: avatar circle + name + role/company/experience."""
        hero = ctk.CTkFrame(
            self.frame, fg_color="#16213e", corner_radius=16,
            border_width=1, border_color="#1e3a6e"
        )
        hero.grid(row=0, column=0, columnspan=2, padx=24, pady=(18, 8), sticky="ew")
        hero.grid_columnconfigure(1, weight=1)

        # Avatar circle (high corner_radius = circle)
        av = ctk.CTkFrame(hero, width=80, height=80, fg_color="#1a73e8", corner_radius=40)
        av.grid(row=0, column=0, rowspan=2, padx=(24, 0), pady=20)
        av.grid_propagate(False)
        self._avatar_lbl = ctk.CTkLabel(
            av, text="?", font=("Segoe UI", 26, "bold"), text_color="white"
        )
        self._avatar_lbl.pack(expand=True)

        # Name
        self._hero_name = ctk.CTkLabel(
            hero, text="Your Name",
            font=("Segoe UI", 20, "bold"), text_color="white", anchor="w"
        )
        self._hero_name.grid(row=0, column=1, sticky="sw", padx=(20, 24), pady=(20, 2))

        # Subtitle — role · company · experience
        self._hero_sub = ctk.CTkLabel(
            hero, text="Complete your profile below  ↓",
            font=("Segoe UI", 12), text_color="#93c5fd", anchor="w"
        )
        self._hero_sub.grid(row=1, column=1, sticky="nw", padx=(20, 24), pady=(2, 20))

    def _build_form(self):
        left = ctk.CTkFrame(self.frame, fg_color="transparent")
        left.grid(row=1, column=0, sticky="nsew", padx=(24, 8), pady=(0, 20))
        left.grid_columnconfigure(0, weight=1)

        card = ctk.CTkFrame(left, fg_color=CARD_BG, corner_radius=12)
        card.pack(fill="both", expand=True)
        card.grid_columnconfigure(1, weight=1)

        ctk.CTkLabel(
            card, text="Personal Information",
            font=("Segoe UI", 14, "bold"), text_color="white"
        ).grid(row=0, column=0, columnspan=2, sticky="w", padx=18, pady=(16, 12))

        FIELD_DEFS = [
            ("Full Name",           "name",      "e.g. Jane Doe",          False),
            ("Date of Birth",       "birthdate", "YYYY-MM-DD",             False),
            ("Age",                 "_age",      None,                     True),
            ("Company",             "company",   "Current employer",       False),
            ("Role / Job Title",    "role",      "e.g. Software Engineer", False),
            ("Years of Experience", "exp",       "e.g. 5",                 False),
        ]

        for r, (label, key, placeholder, readonly) in enumerate(FIELD_DEFS):
            ctk.CTkLabel(
                card, text=label, font=("Segoe UI", 11), text_color="#9ca3af"
            ).grid(row=r + 1, column=0, sticky="w", padx=18, pady=(8, 0))

            if readonly:
                lbl = ctk.CTkLabel(
                    card, text="—",
                    font=("Segoe UI", 12, "bold"), text_color="#34d399"
                )
                lbl.grid(row=r + 1, column=1, sticky="w", padx=18, pady=(8, 0))
                self._entries[key] = lbl
            else:
                ent = ctk.CTkEntry(card, placeholder_text=placeholder, height=36)
                ent.grid(row=r + 1, column=1, sticky="ew", padx=18, pady=(8, 0))
                self._entries[key] = ent
                if key == "birthdate":
                    ent.bind("<FocusOut>", lambda e: self._recalc_age())
                    ent.bind("<Return>",   lambda e: self._recalc_age())

        # Live hero update on typing
        for key in ("name", "role", "company", "exp"):
            w = self._entries.get(key)
            if isinstance(w, ctk.CTkEntry):
                w.bind("<KeyRelease>", lambda e: self._update_hero())

        n = len(FIELD_DEFS)
        ctk.CTkButton(
            card, text="💾  Save Profile", height=40,
            fg_color="#1a73e8", hover_color="#1557b0",
            font=("Segoe UI", 12, "bold"),
            command=self._save
        ).grid(row=n + 1, column=0, columnspan=2, padx=18, pady=(16, 6), sticky="ew")

        self._status_lbl = ctk.CTkLabel(
            card, text="", font=("Segoe UI", 10), text_color="#34d399"
        )
        self._status_lbl.grid(row=n + 2, column=0, columnspan=2, pady=(0, 14))

    def _build_skills_panel(self):
        right = ctk.CTkFrame(self.frame, fg_color="transparent")
        right.grid(row=1, column=1, sticky="nsew", padx=(8, 24), pady=(0, 20))
        right.grid_columnconfigure(0, weight=1)
        right.grid_rowconfigure(0, weight=1)

        card = ctk.CTkFrame(right, fg_color=CARD_BG, corner_radius=12)
        card.pack(fill="both", expand=True)
        card.grid_columnconfigure(0, weight=1)
        card.grid_rowconfigure(1, weight=1)

        hdr = ctk.CTkFrame(card, fg_color="transparent")
        hdr.grid(row=0, column=0, sticky="ew", padx=18, pady=(16, 8))
        hdr.grid_columnconfigure(0, weight=1)

        ctk.CTkLabel(
            hdr, text="🔧  Skills from Resume",
            font=("Segoe UI", 14, "bold"), text_color="white"
        ).grid(row=0, column=0, sticky="w")
        ctk.CTkLabel(
            hdr, text="Auto-extracted on resume upload · no manual input needed",
            font=("Segoe UI", 10), text_color="#6b7280"
        ).grid(row=1, column=0, sticky="w")

        self._skills_scroll = ctk.CTkScrollableFrame(
            card, fg_color="transparent", corner_radius=0
        )
        self._skills_scroll.grid(row=1, column=0, sticky="nsew", padx=10, pady=(0, 14))
        self._skills_scroll.grid_columnconfigure(0, weight=1)

    # ── Helpers ───────────────────────────────────────────────────────────────

    def _recalc_age(self):
        raw = self._entries["birthdate"].get().strip()
        lbl = self._entries["_age"]
        if not raw:
            lbl.configure(text="—")
            return
        try:
            bd    = datetime.strptime(raw, "%Y-%m-%d").date()
            today = date.today()
            age   = today.year - bd.year - ((today.month, today.day) < (bd.month, bd.day))
            lbl.configure(text=f"{age} years old")
        except ValueError:
            lbl.configure(text="Invalid date")

    def _save(self):
        name      = self._entries["name"].get().strip()
        birthdate = self._entries["birthdate"].get().strip()
        company   = self._entries["company"].get().strip()
        role      = self._entries["role"].get().strip()
        try:
            exp = float(self._entries["exp"].get().strip() or 0)
        except ValueError:
            exp = 0.0
        self.db.save_profile(name, birthdate, company, role, exp)
        self._update_hero()
        self._status_lbl.configure(text="✓ Saved", text_color="#34d399")
        self.frame.after(2500, lambda: self._status_lbl.configure(text=""))

    def _load_profile(self):
        p = self.db.get_profile()
        if not p:
            return

        def _set(key, val):
            w = self._entries.get(key)
            if isinstance(w, ctk.CTkEntry):
                w.delete(0, "end")
                if val:
                    w.insert(0, str(val))

        _set("name",      p["name"])
        _set("birthdate", p["birthdate"])
        _set("company",   p["company"])
        _set("role",      p["role"])
        _set("exp",       p["experience_years"] if p["experience_years"] else "")
        self._recalc_age()
        self._update_hero()

    def _refresh_skills(self):
        for w in self._skills_scroll.winfo_children():
            w.destroy()

        skills = self.db.get_skills()
        if not skills:
            ctk.CTkLabel(
                self._skills_scroll,
                text="No skills found yet.\nUpload a resume in the Career tab.",
                font=("Segoe UI", 11), text_color="#4b5563", justify="center"
            ).pack(pady=40)
            return

        # Group by category
        cats: dict = {}
        for s in skills:
            cats.setdefault(s["category"], []).append(s["skill"])

        for cat, skill_list in sorted(cats.items()):
            color = CAT_COLORS.get(cat, "#374151")
            ctk.CTkLabel(
                self._skills_scroll, text=f"  {cat}",
                font=("Segoe UI", 11, "bold"), text_color="white",
                fg_color=color, corner_radius=6, anchor="w"
            ).pack(fill="x", pady=(10, 4))

            # Display skills as pills, 4 per row
            row_frame = None
            for idx, skill in enumerate(sorted(skill_list)):
                if idx % 4 == 0:
                    row_frame = ctk.CTkFrame(self._skills_scroll, fg_color="transparent")
                    row_frame.pack(fill="x", pady=1)
                ctk.CTkLabel(
                    row_frame, text=skill,
                    font=("Segoe UI", 10),
                    fg_color=PILL_BG, corner_radius=8, text_color=PILL_FG
                ).pack(side="left", padx=3, pady=2)

    def refresh(self):
        self._load_profile()
        self._refresh_skills()


# ── First-run setup dialog ────────────────────────────────────────────────────

class ProfileSetupDialog(ctk.CTkToplevel):
    """Shown on first launch to collect the user's basic profile info."""

    def __init__(self, parent, db):
        super().__init__(parent)
        self.db = db
        self.title("Welcome — Set Up Your Profile")
        self.geometry("520x580")
        self.resizable(False, False)
        self.configure(fg_color=CARD_BG)
        self.grab_set()
        self.lift()
        self.focus_force()
        self._entries = {}
        self._build()
        self._center(parent)

    def _center(self, parent):
        self.update_idletasks()
        px = parent.winfo_rootx() + (parent.winfo_width()  - 520) // 2
        py = parent.winfo_rooty() + (parent.winfo_height() - 580) // 2
        self.geometry(f"520x580+{px}+{py}")

    def _build(self):
        ctk.CTkLabel(
            self, text="👋  Welcome to Personal Planner",
            font=("Segoe UI", 18, "bold"), text_color="white"
        ).pack(padx=28, pady=(24, 4), anchor="w")

        ctk.CTkLabel(
            self,
            text="Tell us a bit about yourself.\nYou can always update this in the Profile tab.",
            font=("Segoe UI", 11), text_color="#9ca3af",
            wraplength=460, justify="left"
        ).pack(padx=28, pady=(0, 20), anchor="w")

        FIELD_DEFS = [
            ("Full Name *",          "name",      "e.g. Jane Doe",          False),
            ("Date of Birth",        "birthdate", "YYYY-MM-DD",             False),
            ("Age",                  "_age",      None,                     True),
            ("Company",              "company",   "Your current employer",  False),
            ("Role / Job Title",     "role",      "e.g. Software Engineer", False),
            ("Years of Experience",  "exp",       "e.g. 5",                 False),
        ]

        frm = ctk.CTkFrame(self, fg_color="transparent")
        frm.pack(fill="x", padx=28)
        frm.grid_columnconfigure(1, weight=1)

        for r, (label, key, placeholder, readonly) in enumerate(FIELD_DEFS):
            ctk.CTkLabel(
                frm, text=label, font=("Segoe UI", 11),
                text_color="#9ca3af", width=170, anchor="w"
            ).grid(row=r, column=0, sticky="w", pady=7)

            if readonly:
                lbl = ctk.CTkLabel(
                    frm, text="—",
                    font=("Segoe UI", 12, "bold"), text_color="#34d399", anchor="w"
                )
                lbl.grid(row=r, column=1, sticky="w", padx=(8, 0), pady=7)
                self._entries[key] = lbl
            else:
                ent = ctk.CTkEntry(frm, placeholder_text=placeholder, height=36)
                ent.grid(row=r, column=1, sticky="ew", padx=(8, 0), pady=7)
                self._entries[key] = ent
                if key == "birthdate":
                    ent.bind("<FocusOut>", lambda e: self._recalc_age())
                    ent.bind("<Return>",   lambda e: self._recalc_age())

        btn_row = ctk.CTkFrame(self, fg_color="transparent")
        btn_row.pack(fill="x", padx=28, pady=(20, 8))
        btn_row.grid_columnconfigure(0, weight=1)
        btn_row.grid_columnconfigure(1, weight=1)

        ctk.CTkButton(
            btn_row, text="Skip for now",
            fg_color="transparent", hover_color="#374151",
            text_color="#6b7280", border_width=1, border_color="#374151",
            command=self.destroy
        ).grid(row=0, column=0, padx=(0, 6), sticky="ew")

        ctk.CTkButton(
            btn_row, text="✓  Save & Continue",
            fg_color="#1a73e8", hover_color="#1557b0",
            font=("Segoe UI", 12, "bold"),
            command=self._save
        ).grid(row=0, column=1, padx=(6, 0), sticky="ew")

        self._status = ctk.CTkLabel(
            self, text="", font=("Segoe UI", 10), text_color="#ef4444"
        )
        self._status.pack()

    def _recalc_age(self):
        raw = self._entries["birthdate"].get().strip()
        lbl = self._entries["_age"]
        try:
            bd    = datetime.strptime(raw, "%Y-%m-%d").date()
            today = date.today()
            age   = today.year - bd.year - ((today.month, today.day) < (bd.month, bd.day))
            lbl.configure(text=f"{age} years old")
        except Exception:
            lbl.configure(text="—")

    def _save(self):
        name = self._entries["name"].get().strip()
        if not name:
            self._status.configure(text="Full Name is required.")
            return
        birthdate = self._entries["birthdate"].get().strip()
        company   = self._entries["company"].get().strip()
        role      = self._entries["role"].get().strip()
        try:
            exp = float(self._entries["exp"].get().strip() or 0)
        except ValueError:
            exp = 0.0
        self.db.save_profile(name, birthdate, company, role, exp)
        self.destroy()
