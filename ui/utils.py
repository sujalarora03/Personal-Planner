"""
Shared UI utilities:
  - confirm_delete()  – modal confirmation before any destructive action
  - export_data()     – export planner data to CSV + JSON
"""
import customtkinter as ctk
import csv
import json
import os
import tkinter.filedialog as fd
import tkinter.messagebox as mb
from datetime import datetime


# ── Confirm-delete dialog ──────────────────────────────────────────────────────

def confirm_delete(parent, item_name: str, on_confirm):
    """Show a small modal dialog before any destructive deletion."""
    dlg = ctk.CTkToplevel(parent)
    dlg.title("Confirm Delete")
    dlg.geometry("360x175")
    dlg.resizable(False, False)
    dlg.configure(fg_color="#1a2332")
    dlg.grab_set()
    dlg.lift()
    dlg.focus_force()
    _center(dlg, 360, 175, parent)

    ctk.CTkLabel(
        dlg, text="🗑  Confirm Delete",
        font=("Segoe UI", 14, "bold"), text_color="#f87171"
    ).pack(pady=(20, 6))

    label = (item_name[:55] + "…") if len(item_name) > 55 else item_name
    ctk.CTkLabel(
        dlg,
        text=f'"{label}"\nwill be permanently removed. This cannot be undone.',
        font=("Segoe UI", 11), text_color="#9ca3af",
        wraplength=320, justify="center"
    ).pack(pady=(0, 18))

    btn_row = ctk.CTkFrame(dlg, fg_color="transparent")
    btn_row.pack()

    ctk.CTkButton(
        btn_row, text="Cancel", width=120,
        fg_color="#374151", hover_color="#4b5563",
        command=dlg.destroy
    ).pack(side="left", padx=8)

    def _confirm():
        dlg.destroy()
        on_confirm()

    ctk.CTkButton(
        btn_row, text="Delete", width=120,
        fg_color="#dc2626", hover_color="#b91c1c",
        font=("Segoe UI", 12, "bold"),
        command=_confirm
    ).pack(side="left", padx=8)


def _center(dlg, w, h, parent=None):
    dlg.update_idletasks()
    try:
        if parent:
            px = parent.winfo_rootx() + (parent.winfo_width()  - w) // 2
            py = parent.winfo_rooty() + (parent.winfo_height() - h) // 2
        else:
            raise ValueError
    except Exception:
        px = (dlg.winfo_screenwidth()  - w) // 2
        py = (dlg.winfo_screenheight() - h) // 2
    dlg.geometry(f"{w}x{h}+{px}+{py}")


# ── Export data to CSV + JSON ──────────────────────────────────────────────────

def export_data(db, parent_window):
    """Export tasks, projects, courses, targets to CSV files and a full JSON."""
    folder = fd.askdirectory(title="Select export folder", parent=parent_window)
    if not folder:
        return

    tag        = datetime.now().strftime("%Y%m%d_%H%M%S")
    export_dir = os.path.join(folder, f"planner_export_{tag}")
    os.makedirs(export_dir, exist_ok=True)

    datasets = {
        "tasks":    db.get_tasks(),
        "projects": db.get_projects(),
        "courses":  db.get_courses(),
        "targets":  db.get_targets(),
    }

    all_data: dict = {}
    for name, rows in datasets.items():
        all_data[name] = [dict(r) for r in rows]
        if not rows:
            continue
        cols = list(rows[0].keys())
        with open(os.path.join(export_dir, f"{name}.csv"),
                  "w", newline="", encoding="utf-8") as f:
            w = csv.DictWriter(f, fieldnames=cols)
            w.writeheader()
            w.writerows([dict(r) for r in rows])

    profile = db.get_profile()
    if profile:
        all_data["profile"] = dict(profile)

    with open(os.path.join(export_dir, "planner_full.json"),
              "w", encoding="utf-8") as f:
        json.dump(all_data, f, indent=2, default=str)

    mb.showinfo(
        "Export Complete",
        f"Data exported to:\n{export_dir}",
        parent=parent_window
    )
