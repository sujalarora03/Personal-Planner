import customtkinter as ctk
import tkinter as tk
from ui.landing_tab import LandingTab
from ui.dashboard_tab import DashboardTab
from ui.tasks_tab import TasksTab
from ui.work_hours_tab import WorkHoursTab
from ui.projects_tab import ProjectsTab
from ui.targets_tab import TargetsTab
from ui.courses_tab import CoursesTab
from ui.career_tab import CareerTab
from ui.ai_tab import AITab
from ui.profile_tab import ProfileTab
from ui.utils import export_data

NAV_ITEMS = [
    ("landing",      "🏠   Home"),
    ("profile",      "👤   Profile"),
    ("dashboard",    "📊   Dashboard"),
    ("tasks",        "✅   Tasks"),
    ("work_hours",   "⏱   Work Hours"),
    ("projects",     "🚀   Projects"),
    ("targets",      "🎯   Year Targets"),
    ("courses",      "📚   Courses"),
    ("career",       "🎓   Career"),
    ("ai_assistant", "🤖   AI Assistant"),
]

# ── Theme palette ─────────────────────────────────────────────────────────────
SIDEBAR_BG_DARK   = "#08080f"
SIDEBAR_BG_LIGHT  = "#f1f5f9"
CONTENT_BG_DARK   = "#0f0f1a"
CONTENT_BG_LIGHT  = "#f8fafc"
ACTIVE_BTN_DARK   = "#7c3aed"    # vibrant purple for Gen-Z feel
ACTIVE_BTN_LIGHT  = "#7c3aed"
INACTIVE_BTN      = "transparent"
ACTIVE_TEXT       = "white"
INACTIVE_TEXT_D   = "#64748b"
INACTIVE_TEXT_L   = "#475569"
HOVER_DARK        = "#1e1040"
HOVER_LIGHT       = "#e2e8f0"


class MainWindow:
    def __init__(self, root: ctk.CTk, db):
        self.root = root
        self.db = db
        self.current_tab: str | None = None
        self.nav_buttons: dict = {}
        self.tabs: dict = {}
        self._appearance = "dark"

        self._build_layout()
        self._build_tabs()
        self.show_tab("landing")

    # ── Layout ─────────────────────────────────────────────────────────────

    def _build_layout(self):
        self.root.grid_columnconfigure(1, weight=1)
        self.root.grid_rowconfigure(0, weight=1)

        # ── Sidebar (canvas-backed for gradient effect) ──
        self._sidebar_canvas = tk.Canvas(
            self.root, width=230, highlightthickness=0, bg=SIDEBAR_BG_DARK
        )
        self._sidebar_canvas.grid(row=0, column=0, sticky="nsew")
        self._sidebar_canvas.bind("<Configure>", self._draw_sidebar_gradient)

        self.sidebar = ctk.CTkFrame(
            self._sidebar_canvas, width=230, corner_radius=0,
            fg_color="transparent"
        )
        self._sidebar_win = self._sidebar_canvas.create_window(
            0, 0, anchor="nw", window=self.sidebar
        )
        self.sidebar.bind(
            "<Configure>",
            lambda e: self._sidebar_canvas.configure(
                scrollregion=self._sidebar_canvas.bbox("all")
            ),
        )

        self.sidebar.grid_propagate(False)
        self.sidebar.grid_columnconfigure(0, weight=1)
        self.sidebar.grid_rowconfigure(14, weight=1)

        # Purple accent strip on left edge
        self._accent_strip = tk.Frame(self._sidebar_canvas, width=3, bg="#7c3aed")
        self._sidebar_canvas.create_window(0, 0, anchor="nw", window=self._accent_strip,
                                           height=4000)

        # Logo area
        logo_frame = ctk.CTkFrame(self.sidebar, fg_color="transparent")
        logo_frame.grid(row=0, column=0, padx=(18, 12), pady=(24, 8), sticky="ew")

        ctk.CTkLabel(
            logo_frame, text="⚡", font=("Segoe UI Emoji", 30)
        ).pack()
        ctk.CTkLabel(
            logo_frame, text="Personal Planner",
            font=("Segoe UI", 13, "bold"), text_color="#e2e8f0"
        ).pack(pady=(2, 0))

        self._sidebar_name_lbl = ctk.CTkLabel(
            logo_frame, text="Plan · Track · Achieve",
            font=("Segoe UI", 10), text_color="#475569"
        )
        self._sidebar_name_lbl.pack(pady=(2, 0))
        self._sidebar_role_lbl = ctk.CTkLabel(
            logo_frame, text="",
            font=("Segoe UI", 9), text_color="#374151"
        )
        self._sidebar_role_lbl.pack()

        # Divider
        ctk.CTkFrame(self.sidebar, height=1, fg_color="#1e1040").grid(
            row=1, column=0, sticky="ew", padx=14, pady=6
        )

        # Nav buttons
        for i, (tab_id, label) in enumerate(NAV_ITEMS):
            btn = ctk.CTkButton(
                self.sidebar,
                text=label,
                anchor="w",
                font=("Segoe UI", 13),
                height=42,
                corner_radius=10,
                fg_color=INACTIVE_BTN,
                hover_color=HOVER_DARK,
                text_color=INACTIVE_TEXT_D,
                command=lambda t=tab_id: self.show_tab(t),
            )
            btn.grid(row=i + 2, column=0, padx=(14, 10), pady=2, sticky="ew")
            self.nav_buttons[tab_id] = btn

        # Utility buttons
        ctk.CTkButton(
            self.sidebar, text="📤  Export Data",
            anchor="w", height=36, corner_radius=10,
            fg_color="transparent", hover_color=HOVER_DARK,
            text_color=INACTIVE_TEXT_D, font=("Segoe UI", 12),
            command=lambda: export_data(self.db, self.root)
        ).grid(row=13, column=0, padx=(14, 10), pady=(6, 1), sticky="ew")

        self._mode_btn = ctk.CTkButton(
            self.sidebar, text="☀️  Light Mode",
            anchor="w", height=36, corner_radius=10,
            fg_color="transparent", hover_color=HOVER_DARK,
            text_color=INACTIVE_TEXT_D, font=("Segoe UI", 12),
            command=self._toggle_appearance
        )
        self._mode_btn.grid(row=14, column=0, padx=(14, 10), pady=(1, 4), sticky="ew")

        ctk.CTkFrame(self.sidebar, height=1, fg_color="#1e1040").grid(
            row=15, column=0, sticky="ew", padx=14, pady=4
        )

        # Privacy banner
        privacy = ctk.CTkFrame(
            self.sidebar, fg_color="#0a150a", corner_radius=10,
            border_width=1, border_color="#14532d"
        )
        privacy.grid(row=16, column=0, padx=(14, 10), pady=(0, 6), sticky="ew")
        privacy.grid_columnconfigure(0, weight=1)

        ctk.CTkLabel(
            privacy, text="🔒  100% Private",
            font=("Segoe UI", 10, "bold"), text_color="#4ade80"
        ).grid(row=0, column=0, sticky="w", padx=10, pady=(8, 2))

        ctk.CTkLabel(
            privacy,
            text="All data stays on this machine.\nNothing is sent online — ever.",
            font=("Segoe UI", 9), text_color="#86efac",
            justify="left", anchor="w"
        ).grid(row=1, column=0, sticky="w", padx=10, pady=(0, 8))

        ctk.CTkLabel(
            self.sidebar, text="Personal Planner v1.0",
            font=("Segoe UI", 9), text_color="#1e293b"
        ).grid(row=17, column=0, pady=(0, 10))

        # ── Content area ──
        self.content = ctk.CTkFrame(self.root, corner_radius=0, fg_color=CONTENT_BG_DARK)
        self.content.grid(row=0, column=1, sticky="nsew")
        self.content.grid_columnconfigure(0, weight=1)
        self.content.grid_rowconfigure(0, weight=1)

    def _draw_sidebar_gradient(self, _event=None):
        w = self._sidebar_canvas.winfo_width()
        h = self._sidebar_canvas.winfo_height()
        if w < 2 or h < 2:
            return
        self._sidebar_canvas.delete("grad")
        bg = SIDEBAR_BG_DARK if self._appearance == "dark" else SIDEBAR_BG_LIGHT

        # Solid base
        self._sidebar_canvas.create_rectangle(
            0, 0, w, h, fill=bg, outline="", tags="grad"
        )
        # Subtle gradient from left (slightly lighter purple tinge)
        if self._appearance == "dark":
            for i in range(20):
                alpha = 1 - (i / 20)
                r = int(0x1a * alpha)
                g = int(0x00 * alpha)
                b = int(0x40 * alpha)
                col = f"#{r:02x}{g:02x}{b:02x}"
                self._sidebar_canvas.create_rectangle(
                    0, 0, 20 - i, h, fill=col, outline="", tags="grad"
                )
        # Raise nav frame and accent strip
        self._sidebar_canvas.tag_raise(self._sidebar_win)

    def _build_tabs(self):
        self.tabs["landing"]      = LandingTab(self.content, self.db)
        self.tabs["profile"]      = ProfileTab(self.content, self.db)
        self.tabs["dashboard"]    = DashboardTab(self.content, self.db)
        self.tabs["tasks"]        = TasksTab(self.content, self.db)
        self.tabs["work_hours"]   = WorkHoursTab(self.content, self.db)
        self.tabs["projects"]     = ProjectsTab(self.content, self.db)
        self.tabs["targets"]      = TargetsTab(self.content, self.db)
        self.tabs["courses"]      = CoursesTab(self.content, self.db)
        self.tabs["career"]       = CareerTab(self.content, self.db)
        self.tabs["ai_assistant"] = AITab(self.content, self.db)

        # Wire landing page quick-action buttons
        landing: LandingTab = self.tabs["landing"]
        landing.set_nav_callbacks(
            on_tasks  = lambda: self.show_tab("tasks"),
            on_ai     = lambda: self.show_tab("ai_assistant"),
            on_career = lambda: self.show_tab("career"),
        )

        # Give the AI assistant a nav callback so its write-banner can jump to tabs
        self.tabs["ai_assistant"].set_nav_callback(self.show_tab)

    # ── Navigation ─────────────────────────────────────────────────────────

    def show_tab(self, tab_id: str):
        if self.current_tab and self.current_tab in self.tabs:
            self.tabs[self.current_tab].frame.grid_remove()
            is_dark = self._appearance == "dark"
            self.nav_buttons[self.current_tab].configure(
                fg_color=INACTIVE_BTN,
                text_color=INACTIVE_TEXT_D if is_dark else INACTIVE_TEXT_L,
                hover_color=HOVER_DARK if is_dark else HOVER_LIGHT,
            )

        self.current_tab = tab_id
        self.tabs[tab_id].frame.grid(row=0, column=0, sticky="nsew")
        self.tabs[tab_id].refresh()
        self._refresh_sidebar_profile()
        self.nav_buttons[tab_id].configure(
            fg_color=ACTIVE_BTN_DARK if self._appearance == "dark" else ACTIVE_BTN_LIGHT,
            text_color=ACTIVE_TEXT,
            hover_color=ACTIVE_BTN_DARK,
        )

    def _toggle_appearance(self):
        self._appearance = "light" if self._appearance == "dark" else "dark"
        ctk.set_appearance_mode(self._appearance)

        is_dark   = self._appearance == "dark"
        sidebar_bg = SIDEBAR_BG_DARK if is_dark else SIDEBAR_BG_LIGHT
        content_bg = CONTENT_BG_DARK if is_dark else CONTENT_BG_LIGHT
        inactive_t = INACTIVE_TEXT_D if is_dark else INACTIVE_TEXT_L
        hover      = HOVER_DARK if is_dark else HOVER_LIGHT

        # Update canvas and content backgrounds
        self._sidebar_canvas.configure(bg=sidebar_bg)
        self._draw_sidebar_gradient()
        self.content.configure(fg_color=content_bg)

        # Update all tab frame backgrounds
        for tab in self.tabs.values():
            if hasattr(tab, "frame"):
                try:
                    tab.frame.configure(fg_color=content_bg)
                except Exception:
                    pass

        # Update inactive nav buttons
        for tab_id, btn in self.nav_buttons.items():
            if tab_id != self.current_tab:
                btn.configure(text_color=inactive_t, hover_color=hover)

        self._mode_btn.configure(
            text="🌙  Dark Mode" if not is_dark else "☀️  Light Mode",
            text_color=inactive_t,
            hover_color=hover,
        )

    # ── Sidebar profile refresh ─────────────────────────────────────────────

    def _refresh_sidebar_profile(self):
        try:
            p = self.db.get_profile()
        except Exception:
            return
        if p and p.get("name"):
            self._sidebar_name_lbl.configure(
                text=p["name"],
                font=("Segoe UI", 11, "bold"),
                text_color="#e2e8f0" if self._appearance == "dark" else "#1e293b"
            )
            self._sidebar_role_lbl.configure(
                text=p.get("role") or "",
                text_color="#6b7280"
            )
        else:
            self._sidebar_name_lbl.configure(
                text="Plan · Track · Achieve",
                font=("Segoe UI", 10),
                text_color="#475569"
            )
            self._sidebar_role_lbl.configure(text="")
