"""
FastAPI backend — local REST API for Personal Planner.
Runs on http://localhost:7432 (chosen to avoid common port conflicts).
All data goes through the existing Database class unchanged.
"""
import os
import sys
import threading
import json
import random
import webbrowser
from datetime import date, datetime, timedelta
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse, StreamingResponse
from pydantic import BaseModel

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from database import Database

app = FastAPI(title="Personal Planner API", version="0.5")
db  = Database()
db.init_db()

# ── Local LLM Directory & Lazy Loader Logic ────────────────────────────────────
if getattr(sys, 'frozen', False):
    USER_DIR = os.path.join(os.environ.get('APPDATA', os.path.expanduser('~')), 'PersonalPlanner')
else:
    USER_DIR = os.path.dirname(os.path.abspath(__file__))

MODELS_DIR = os.path.join(USER_DIR, "models")
os.makedirs(MODELS_DIR, exist_ok=True)

MODEL_FILENAME = "qwen2.5-3b-instruct-q4_k_m.gguf"
MODEL_PATH = os.path.join(MODELS_DIR, MODEL_FILENAME)

_llama_instance = None
_download_status = {"status": "idle", "progress": 0, "error": None, "error_message": None}

def get_llama_model():
    global _llama_instance
    if _llama_instance is not None:
        return _llama_instance

    if not os.path.exists(MODEL_PATH):
        return None

    try:
        from llama_cpp import Llama
        _llama_instance = Llama(
            model_path=MODEL_PATH,
            n_ctx=2048,
            n_threads=None, # auto-detect threads
            verbose=False
        )
        return _llama_instance
    except Exception as e:
        print(f"Error loading llama model: {e}")
        return None

def _download_thread():
    global _download_status
    url = "https://huggingface.co/Qwen/Qwen2.5-3B-Instruct-GGUF/resolve/main/qwen2.5-3b-instruct-q4_k_m.gguf"
    
    try:
        _download_status = {"status": "downloading", "progress": 0, "error": None, "error_message": None}
        os.makedirs(MODELS_DIR, exist_ok=True)
        temp_path = MODEL_PATH + ".tmp"
        
        import urllib.request
        def reporthook(blocknum, blocksize, totalsize):
            if totalsize > 0:
                percent = min(100.0, blocknum * blocksize * 100 / totalsize)
                _download_status["progress"] = round(percent, 1)

        urllib.request.urlretrieve(url, temp_path, reporthook)
        
        if os.path.exists(MODEL_PATH):
            os.remove(MODEL_PATH)
        os.rename(temp_path, MODEL_PATH)
        
        global _llama_instance
        _llama_instance = None # clear old reference to force reload
        _download_status = {"status": "completed", "progress": 100, "error": None, "error_message": None}
    except Exception as e:
        _download_status = {"status": "error", "progress": 0, "error": str(e), "error_message": str(e)}

# ── CORS (PyWebView uses file:// or localhost origin) ─────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:7432",
        "http://127.0.0.1:7432",
        "null",          # PyWebView / file:// sends Origin: null
    ],
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

# ── Serve built React frontend ─────────────────────────────────────────────────
def _get_base_dir() -> str:
    """sys._MEIPASS when running as PyInstaller bundle, else script directory."""
    if getattr(sys, 'frozen', False):
        return sys._MEIPASS  # type: ignore[attr-defined]
    return os.path.dirname(os.path.abspath(__file__))

FRONTEND_DIST = os.path.join(_get_base_dir(), "frontend", "dist")

# Static assets mount (must be before catch-all, but assets/ prefix is specific enough)
if os.path.exists(FRONTEND_DIST):
    app.mount("/assets", StaticFiles(directory=os.path.join(FRONTEND_DIST, "assets")), name="assets")


# ═══════════════════════════════════════════════════════════════════════════════
# TASKS
# ═══════════════════════════════════════════════════════════════════════════════

class TaskCreate(BaseModel):
    title: str
    description: str = ""
    category: str = "General"
    priority: str = "Medium"
    due_date: Optional[str] = None
    project_id: Optional[int] = None

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    priority: Optional[str] = None
    due_date: Optional[str] = None
    status: Optional[str] = None
    project_id: Optional[int] = None

@app.get("/api/tasks")
def get_tasks(status: Optional[str] = None, category: Optional[str] = None,
              include_archived: bool = False, project_id: Optional[int] = None):
    rows = db.get_tasks(status=status, category=category,
                        include_archived=include_archived, project_id=project_id)
    return [dict(r) for r in rows]

@app.post("/api/tasks", status_code=201)
def create_task(body: TaskCreate):
    db.add_task(title=body.title, description=body.description,
                category=body.category, priority=body.priority,
                due_date=body.due_date, project_id=body.project_id)
    return {"ok": True}

@app.patch("/api/tasks/{task_id}")
def update_task(task_id: int, body: TaskUpdate):
    updates = body.model_dump(exclude_none=True)
    if updates:
        db.update_task_fields(task_id, **updates)
    return {"ok": True}

@app.patch("/api/tasks/{task_id}/archive")
def archive_task(task_id: int):
    db.archive_task(task_id)
    return {"ok": True}

@app.delete("/api/tasks/{task_id}")
def delete_task(task_id: int):
    db.delete_task(task_id)
    return {"ok": True}

@app.get("/api/tasks/stats")
def task_stats():
    return db.get_task_stats()


# ═══════════════════════════════════════════════════════════════════════════════
# PROJECTS
# ═══════════════════════════════════════════════════════════════════════════════

class ProjectCreate(BaseModel):
    name: str
    description: str = ""
    color: str = "#3b82f6"
    start_date: Optional[str] = None
    target_date: Optional[str] = None

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None
    status: Optional[str] = None
    progress: Optional[int] = None
    target_date: Optional[str] = None

@app.get("/api/projects")
def get_projects():
    return [dict(r) for r in db.get_projects()]

@app.post("/api/projects", status_code=201)
def create_project(body: ProjectCreate):
    db.add_project(name=body.name, description=body.description,
                   color=body.color, start_date=body.start_date,
                   target_date=body.target_date)
    return {"ok": True}

@app.patch("/api/projects/{project_id}")
def update_project(project_id: int, body: ProjectUpdate):
    db.update_project(project_id, name=body.name, description=body.description,
                      color=body.color, status=body.status, progress=body.progress,
                      target_date=body.target_date)
    return {"ok": True}

@app.delete("/api/projects/{project_id}")
def delete_project(project_id: int):
    db.delete_project(project_id)
    return {"ok": True}


# ═══════════════════════════════════════════════════════════════════════════════
# WORK HOURS
# ═══════════════════════════════════════════════════════════════════════════════

class WorkSessionCreate(BaseModel):
    duration_minutes: int
    description: str = ""
    category: str = "Work"
    date: Optional[str] = None
    project_id: Optional[int] = None

@app.get("/api/work-hours")
def get_work_hours(limit: int = 50):
    return [dict(r) for r in db.get_work_sessions(limit=limit)]

@app.get("/api/work-hours/weekly")
def get_weekly():
    return [dict(r) for r in db.get_weekly_hours()]

@app.get("/api/work-hours/monthly")
def get_monthly():
    return [dict(r) for r in db.get_monthly_hours()]

@app.post("/api/work-hours", status_code=201)
def log_work(body: WorkSessionCreate):
    d = body.date or date.today().isoformat()
    now = datetime.now()
    start_dt = now - timedelta(minutes=body.duration_minutes)
    start_time = f"{d}T{start_dt.strftime('%H:%M:%S')}"
    end_time   = f"{d}T{now.strftime('%H:%M:%S')}"
    db.add_work_session(
        start_time=start_time,
        end_time=end_time,
        duration_minutes=body.duration_minutes,
        description=body.description,
        project_id=body.project_id,
        category=body.category,
        date_str=d,
    )
    return {"ok": True}

@app.delete("/api/work-hours/{session_id}")
def delete_work_session(session_id: int):
    db.delete_work_session(session_id)
    return {"ok": True}


# ═══════════════════════════════════════════════════════════════════════════════
# TARGETS
# ═══════════════════════════════════════════════════════════════════════════════

class TargetCreate(BaseModel):
    title: str
    description: str = ""
    category: str = "Personal"
    target_value: float = 100.0
    unit: str = "%"
    color: str = "#3b82f6"
    year: Optional[int] = None

class TargetUpdate(BaseModel):
    current_value: Optional[float] = None
    title: Optional[str] = None
    description: Optional[str] = None
    target_value: Optional[float] = None
    category: Optional[str] = None
    unit: Optional[str] = None
    color: Optional[str] = None

@app.get("/api/targets")
def get_targets(year: Optional[int] = None):
    return [dict(r) for r in db.get_targets(year=year or date.today().year)]

@app.post("/api/targets", status_code=201)
def create_target(body: TargetCreate):
    db.add_target(year=body.year or date.today().year, title=body.title,
                  description=body.description, category=body.category,
                  target_value=body.target_value, unit=body.unit, color=body.color)
    return {"ok": True}

@app.patch("/api/targets/{target_id}")
def update_target(target_id: int, body: TargetUpdate):
    updates = body.model_dump(exclude_none=True)
    if updates:
        db.update_target(target_id, **updates)
    return {"ok": True}

@app.delete("/api/targets/{target_id}")
def delete_target(target_id: int):
    db.delete_target(target_id)
    return {"ok": True}


# ═══════════════════════════════════════════════════════════════════════════════
# COURSES
# ═══════════════════════════════════════════════════════════════════════════════

class CourseCreate(BaseModel):
    title: str
    provider: str = ""
    url: str = ""
    category: str = "Learning"
    status: str = "Planned"
    notes: str = ""

class CourseUpdate(BaseModel):
    title: Optional[str] = None
    provider: Optional[str] = None
    url: Optional[str] = None
    category: Optional[str] = None
    status: Optional[str] = None
    progress: Optional[int] = None
    notes: Optional[str] = None
    rating: Optional[int] = None

@app.get("/api/courses")
def get_courses(status: Optional[str] = None):
    return [dict(r) for r in db.get_courses(status=status)]

@app.post("/api/courses", status_code=201)
def create_course(body: CourseCreate):
    db.add_course(title=body.title, provider=body.provider, url=body.url,
                  category=body.category, status=body.status, notes=body.notes)
    return {"ok": True}

@app.patch("/api/courses/{course_id}")
def update_course(course_id: int, body: CourseUpdate):
    updates = body.model_dump(exclude_none=True)
    if updates:
        db.update_course(course_id, **updates)
    return {"ok": True}

@app.delete("/api/courses/{course_id}")
def delete_course(course_id: int):
    db.delete_course(course_id)
    return {"ok": True}


# ═══════════════════════════════════════════════════════════════════════════════
# PROFILE & SKILLS
# ═══════════════════════════════════════════════════════════════════════════════

class ProfileUpdate(BaseModel):
    name: str
    birthdate: str = ""
    company: str = ""
    role: str = ""
    experience_years: float = 0
    youtube_api_key: str = ""

@app.get("/api/profile")
def get_profile():
    p = db.get_profile()
    return dict(p) if p else {}

@app.post("/api/profile")
def save_profile(body: ProfileUpdate):
    db.save_profile(name=body.name, birthdate=body.birthdate,
                    company=body.company, role=body.role,
                    experience_years=body.experience_years,
                    youtube_api_key=body.youtube_api_key)
    return {"ok": True}

@app.get("/api/skills")
def get_skills():
    rows = db.get_skills()
    cats: dict = {}
    for r in rows:
        cats.setdefault(r["category"], []).append(r["skill"])
    return cats


class DownloadRequest(BaseModel):
    download_url: Optional[str] = None
    installer_url: Optional[str] = None
    version: Optional[str] = None

class ModelRequest(BaseModel):
    name: str

_pull_status = {"status": "idle", "model": "", "error": ""}

def _bg_pull(model_name: str):
    global _pull_status
    _pull_status["status"] = "pulling"
    _pull_status["model"] = model_name
    _pull_status["error"] = ""
    try:
        import requests as _requests
        resp = _requests.post("http://localhost:11434/api/pull", json={"name": model_name, "stream": False}, timeout=300)
        if resp.status_code == 200:
            _pull_status["status"] = "completed"
        else:
            _pull_status["status"] = "error"
            _pull_status["error"] = resp.text
    except Exception as e:
        _pull_status["status"] = "error"
        _pull_status["error"] = str(e)

@app.get("/api/version")
def get_version():
    from version import APP_VERSION
    return {"version": APP_VERSION}

@app.get("/api/update/check")
def check_update():
    """Check GitHub main branch for a newer version of the app."""
    try:
        from updater import check_for_update
        return check_for_update()
    except Exception as e:
        return {"available": False, "error": str(e)}

@app.post("/api/update/download")
def trigger_download(body: DownloadRequest):
    from updater import start_download_thread
    url = body.installer_url or body.download_url
    if not url:
        raise HTTPException(status_code=400, detail="Missing download_url or installer_url")
    version = body.version or "0.0.0"
    start_download_thread(url, version)
    return {"ok": True}

@app.get("/api/update/progress")
@app.get("/api/update/download/status")
def download_status():
    from updater import get_download_status
    return get_download_status()

@app.post("/api/update/install")
def install_update():
    from updater import launch_installer
    ok = launch_installer()
    if not ok:
        raise HTTPException(status_code=400, detail="Installer file not found or download incomplete")
    return {"ok": True}

@app.post("/api/ollama/models/pull")
def pull_ollama_model(body: ModelRequest):
    if _pull_status["status"] == "pulling":
        raise HTTPException(status_code=400, detail="A model pull is already in progress")
    threading.Thread(target=_bg_pull, args=(body.name,), daemon=True).start()
    return {"ok": True}

@app.get("/api/ollama/models/pull/status")
def pull_ollama_status():
    return _pull_status

@app.post("/api/ollama/models/delete")
def delete_ollama_model(body: ModelRequest):
    try:
        import requests as _requests
        resp = _requests.delete("http://localhost:11434/api/delete", json={"name": body.name}, timeout=30)
        if resp.status_code == 200:
            return {"ok": True}
        return {"ok": False, "error": resp.text}
    except Exception as e:
        return {"ok": False, "error": str(e)}


# ═══════════════════════════════════════════════════════════════════════════════
# DASHBOARD SUMMARY
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/api/dashboard")
def dashboard():
    today = date.today()
    tasks   = db.get_tasks()
    active  = [t for t in tasks if t["status"] != "Done"]
    done    = [t for t in tasks if t["status"] == "Done"]
    overdue = [t for t in active if t["due_date"] and t["due_date"] < today.isoformat()]

    weekly  = db.get_weekly_hours()
    week_min = sum(r["total_minutes"] for r in weekly)

    projects = db.get_projects()
    courses  = db.get_courses()
    targets  = db.get_targets(year=today.year)

    return {
        "tasks_active":  len(active),
        "tasks_done":    len(done),
        "tasks_overdue": len(overdue),
        "week_hours":    round(week_min / 60, 1),
        "projects":      len(projects),
        "courses":       len(courses),
        "targets":       len(targets),
    }


# ═══════════════════════════════════════════════════════════════════════════════
# DATA EXPORT
# ═══════════════════════════════════════════════════════════════════════════════

from fastapi.responses import JSONResponse

@app.get("/api/export")
def export_data():
    """Export all user data as a single JSON download."""
    data = db.export_all()
    filename = f"personal-planner-export-{date.today().isoformat()}.json"
    return JSONResponse(
        content=data,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ═══════════════════════════════════════════════════════════════════════════════
# HABITS
# ═══════════════════════════════════════════════════════════════════════════════

class HabitCreate(BaseModel):
    name: str
    color: str = '#7c3aed'
    icon: str = '✓'

@app.get("/api/habits")
def get_habits():
    return db.get_habits()

@app.post("/api/habits", status_code=201)
def create_habit(body: HabitCreate):
    db.add_habit(name=body.name, color=body.color, icon=body.icon)
    return {"ok": True}

@app.post("/api/habits/{habit_id}/log")
def toggle_habit(habit_id: int):
    checked = db.toggle_habit(habit_id)
    return {"checked": checked}

@app.delete("/api/habits/{habit_id}")
def delete_habit(habit_id: int):
    db.delete_habit(habit_id)
    return {"ok": True}


# ═══════════════════════════════════════════════════════════════════════════════
# NOTES
# ═══════════════════════════════════════════════════════════════════════════════

class NoteCreate(BaseModel):
    title: str = ""
    content: str = ""
    note_date: Optional[str] = None
    project_id: Optional[int] = None

class NoteUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    note_date: Optional[str] = None
    project_id: Optional[int] = None

@app.get("/api/notes")
def get_notes(note_date: Optional[str] = None, project_id: Optional[int] = None):
    return [dict(r) for r in db.get_notes(note_date=note_date, project_id=project_id)]

@app.post("/api/notes", status_code=201)
def create_note(body: NoteCreate):
    note_id = db.add_note(title=body.title, content=body.content,
                          note_date=body.note_date, project_id=body.project_id)
    return {"ok": True, "id": note_id}

@app.patch("/api/notes/{note_id}")
def update_note(note_id: int, body: NoteUpdate):
    updates = body.model_dump(exclude_none=True)
    if updates:
        db.update_note(note_id, **updates)
    return {"ok": True}

@app.delete("/api/notes/{note_id}")
def delete_note(note_id: int):
    db.delete_note(note_id)
    return {"ok": True}


# ═══════════════════════════════════════════════════════════════════════════════
# PLANNER — today's unified view
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/api/planner/today")
def get_today_planner():
    return db.get_today_planner()


# ═══════════════════════════════════════════════════════════════════════════════
# WEEKLY AI REVIEW
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/api/review/weekly")
def weekly_review():
    today = date.today()
    week_ago = (today - timedelta(days=7)).isoformat()
    all_tasks = db.get_tasks()
    done_this_week = [t for t in all_tasks if t.get('completed_at') and str(t['completed_at'])[:10] >= week_ago]
    weekly_hours = db.get_weekly_hours()
    total_min = sum(r['total_minutes'] for r in weekly_hours)
    targets = db.get_targets(year=today.year)
    profile = db.get_profile() or {}
    name = (profile.get('name') or '').split()[0] if profile.get('name') else ''

    stats = {
        "done": len(done_this_week),
        "hours": round(total_min / 60, 1),
        "targets": len(targets),
    }

    summary = (
        f"Tasks completed this week: {len(done_this_week)}. "
        f"Work time logged: {total_min // 60}h {total_min % 60}m. "
        f"Active year targets: {len(targets)}."
    )
    if done_this_week:
        titles = ', '.join(str(t.get('title','')) for t in done_this_week[:5])
        summary += f" Completed: {titles}."

    try:
        llm = get_llama_model()
        if not llm:
            fallback = (
                f"This week you logged {total_min // 60}h {total_min % 60}m of work"
                f" and completed {len(done_this_week)} task{'s' if len(done_this_week) != 1 else ''}. "
                "Download the local AI model to enable automated coaching insights!"
            )
            return {"review": fallback, "source": "fallback", "stats": stats}

        resp = llm.create_chat_completion(
            messages=[
                {"role": "system", "content": "Write a short, warm, encouraging weekly productivity review in 3-4 sentences. Be specific and actionable."},
                {"role": "user", "content": f"Weekly review{' for ' + name if name else ''}:\n{summary}"},
            ],
            temperature=0.7,
            max_tokens=256
        )
        text = resp["choices"][0]["message"]["content"].strip()
        if len(text) > 10:
            return {"review": text, "source": "local_llm", "stats": stats}
    except Exception:
        pass

    fallback = (
        f"This week you logged {total_min // 60}h {total_min % 60}m of work"
        f" and completed {len(done_this_week)} task{'s' if len(done_this_week) != 1 else ''}. "
        "Keep the momentum going — every session counts!"
    )
    return {"review": fallback, "source": "fallback", "stats": stats}


# ═══════════════════════════════════════════════════════════════════════════════
# DAILY QUOTE (OLLAMA + FALLBACK)
# ═══════════════════════════════════════════════════════════════════════════════

_FALLBACK_QUOTES = [
    {"quote": "You didn't come this far to only come this far.", "author": "Unknown"},
    {"quote": "Make it happen. Shock everyone.", "author": "Unknown"},
    {"quote": "The secret of getting ahead is getting started.", "author": "Mark Twain"},
    {"quote": "It does not matter how slowly you go as long as you do not stop.", "author": "Confucius"},
    {"quote": "Our greatest glory is not in never falling, but in rising every time we fall.", "author": "Confucius"},
    {"quote": "The only way to do great work is to love what you do.", "author": "Steve Jobs"},
    {"quote": "In the middle of every difficulty lies opportunity.", "author": "Albert Einstein"},
    {"quote": "The future belongs to those who believe in the beauty of their dreams.", "author": "Eleanor Roosevelt"},
    {"quote": "It always seems impossible until it's done.", "author": "Nelson Mandela"},
    {"quote": "Success is not final, failure is not fatal: it is the courage to continue that counts.", "author": "Winston Churchill"},
    {"quote": "The harder I work, the luckier I get.", "author": "Samuel Goldwyn"},
    {"quote": "Don't watch the clock; do what it does. Keep going.", "author": "Sam Levenson"},
]

@app.get("/api/quote")
def get_daily_quote():
    fallback = random.choice(_FALLBACK_QUOTES)
    try:
        llm = get_llama_model()
        if not llm:
            return {**fallback, "source": "fallback"}

        p = db.get_profile() or {}
        role = p.get("role") or ""
        context = f"The person is a {role}." if role else ""

        resp = llm.create_chat_completion(
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You return a famous motivational quote with its real author. "
                        "Output ONLY in this exact format, nothing else: "
                        'QUOTE: <quote text> | AUTHOR: <author name>'
                    ),
                },
                {
                    "role": "user",
                    "content": f"Give me an inspiring quote for a productive person. {context} Pick a well-known quote from a famous thinker, leader, or philosopher.",
                },
            ],
            max_tokens=96,
            temperature=0.85
        )
        raw = resp["choices"][0]["message"]["content"].strip()
        # Parse "QUOTE: ... | AUTHOR: ..."
        if "QUOTE:" in raw and "AUTHOR:" in raw:
            try:
                q_part, a_part = raw.split("|", 1)
                quote_text = q_part.replace("QUOTE:", "").strip().strip('"').strip("'")
                author_text = a_part.replace("AUTHOR:", "").strip().strip('"').strip("'")
                if 5 < len(quote_text) < 280 and 1 < len(author_text) < 80:
                    return {"quote": quote_text, "author": author_text, "source": "local_llm"}
            except Exception:
                pass
    except Exception:
        pass

    return {**fallback, "source": "fallback"}


@app.get("/api/llm/status")
def get_llm_status():
    global _download_status
    model_exists = os.path.exists(MODEL_PATH)
    return {
        "model_exists": model_exists,
        "model_path": MODEL_PATH,
        "download": _download_status,
        "running": _llama_instance is not None
    }

@app.post("/api/llm/download")
def start_llm_download():
    global _download_status
    if _download_status["status"] == "downloading":
        return {"message": "Download already in progress"}
    threading.Thread(target=_download_thread, daemon=True).start()
    return {"message": "Download started"}


# ═══════════════════════════════════════════════════════════════════════════════
# MOOD / SONG SUGGESTIONS
# ═══════════════════════════════════════════════════════════════════════════════

class MoodRequest(BaseModel):
    mood: str
    context: str = ""
    model: str = "qwen2.5-3b-instruct-q4_k_m.gguf"

@app.post("/api/mood/suggest")
def mood_suggest(body: MoodRequest):
    """Return structured JSON song suggestions based on mood."""
    import re as _re3, json as _j

    profile   = db.get_profile() or {}
    name      = (profile.get("name") or "").split(" ")[0]
    name_part = f"The listener's name is {name}. " if name else ""
    ctx_part  = f"Extra preferences: {body.context}. " if body.context.strip() else ""

    system = (
        "You are a music expert. Output ONLY a valid JSON array — no extra text, "
        "no markdown fences, nothing else.\n"
        'Format: [{"artist":"Artist Name","title":"Song Title"}]\n'
        "CRITICAL REQUIREMENTS:\n"
        "- Suggest exactly 8 songs.\n"
        "- Every song MUST be a real, well-known, existing track. NEVER make up artists, bands, or titles.\n"
        "- Keep the artist name and song title canonical, clean, and simple for search engines. Do NOT include featured artists in the 'artist' field (e.g. use 'Coldplay' instead of 'Coldplay feat. Beyoncé') and do NOT include extra version descriptions/remixes in the 'title' field unless essential.\n"
        "- Every song MUST match the listener's mood and strictly adhere to the preferred genres if specified. "
        "For example, if preferred genres lists 'Lo-fi', you must ONLY suggest actual lo-fi tracks. If no genre is specified, be diverse.\n"
        "- Double check that the song is actually by the artist suggested."
    )
    prompt = f"{name_part}{ctx_part}Mood: {body.mood}"

    try:
        llm = get_llama_model()
        if not llm:
            return {"songs": [], "error": "Model file not found. Please download it first."}

        resp = llm.create_chat_completion(
            messages=[
                {"role": "system", "content": system},
                {"role": "user",   "content": prompt},
            ],
            temperature=0.3,
            max_tokens=512
        )
        content = resp["choices"][0]["message"]["content"].strip()
        
        # Extract the JSON array from the LLM output (handles conversational preamble/postamble)
        json_match = _re3.search(r"(\[.*\])", content, _re3.DOTALL)
        if json_match:
            content = json_match.group(1)
        else:
            # Strip markdown fences if present
            content = _re3.sub(r"```[a-z]*\n?", "", content).strip("`").strip()
            
        songs   = _j.loads(content)
        if isinstance(songs, list):
            return {"songs": [{"artist": s.get("artist",""), "title": s.get("title","")} for s in songs[:8]]}
        return {"songs": [], "error": "Unexpected format from model"}
    except _j.JSONDecodeError:
        return {"songs": [], "error": "Model returned non-JSON. Try again or use a different model."}
    except Exception as e:
        return {"songs": [], "error": str(e)}


@app.get("/api/music/preview")
def music_preview(artist: str = "", title: str = ""):
    """Proxy iTunes search to return a 30-second preview URL + metadata."""
    try:
        import requests as _r
        q    = f"{artist} {title}".strip()
        resp = _r.get(
            "https://itunes.apple.com/search",
            params={"term": q, "media": "music", "entity": "song", "limit": 5},
            timeout=6,
        )
        results = resp.json().get("results", [])
        for t in results:
            if t.get("previewUrl"):
                art = t.get("artworkUrl100", "")
                art = art.replace("100x100bb", "300x300bb").replace("100x100", "300x300")
                return {
                    "found":       True,
                    "preview_url": t["previewUrl"],
                    "artwork_url": art,
                    "track_name":  t.get("trackName", title),
                    "artist_name": t.get("artistName", artist),
                    "genre":       t.get("primaryGenreName", ""),
                    "collection":  t.get("collectionName", ""),
                }
        return {"found": False}
    except Exception as e:
        return {"found": False, "error": str(e)}


@app.get("/api/music/search")
def music_search(q: str = ""):
    """Search iTunes music API for a custom query."""
    if not q.strip():
        return {"results": []}
    try:
        import requests as _r
        resp = _r.get(
            "https://itunes.apple.com/search",
            params={"term": q, "media": "music", "entity": "song", "limit": 15},
            timeout=6,
        )
        results = resp.json().get("results", [])
        songs = []
        for t in results:
            art = t.get("artworkUrl100", "")
            art = art.replace("100x100bb", "300x300bb").replace("100x100", "300x300")
            songs.append({
                "title": t.get("trackName", ""),
                "artist": t.get("artistName", ""),
                "track_name": t.get("trackName", ""),
                "artist_name": t.get("artistName", ""),
                "preview_url": t.get("previewUrl"),
                "artwork_url": art,
                "thumbnail": art,
                "genre": t.get("primaryGenreName", ""),
                "itunes_found": True,
                "yt_found": False,
                "loading": False
            })
        return {"results": songs}
    except Exception as e:
        return {"results": [], "error": str(e)}


@app.get("/api/music/youtube")
def youtube_search(artist: str = "", title: str = ""):
    """Use yt-dlp to find a YouTube song and extract a direct audio stream URL.
    No API key needed. No embedding — audio plays directly in the browser.
    """
    try:
        import yt_dlp
    except ImportError:
        return {"found": False, "error": "yt-dlp not installed. Run: pip install yt-dlp"}

    query = f"{artist} {title} official audio"
    ydl_opts = {
        "quiet": True,
        "no_warnings": True,
        "format": "bestaudio[ext=m4a]/bestaudio/best",
        "noplaylist": True,
        "extract_flat": False,
        "default_search": "ytsearch1",   # search YouTube, pick top result
        "skip_download": True,
    }
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(f"ytsearch1:{query}", download=False)
            if not info:
                return {"found": False}
            # ytsearch wraps result in a playlist-like dict
            entry = info.get("entries", [info])[0] if "entries" in info else info
            if not entry:
                return {"found": False}

            # Pick the best audio-only format URL
            audio_url = None
            for fmt in sorted(entry.get("formats", []), key=lambda f: f.get("abr") or 0, reverse=True):
                if fmt.get("acodec") != "none" and fmt.get("vcodec") in ("none", None, ""):
                    audio_url = fmt.get("url")
                    break
            if not audio_url:
                # fallback: use the direct url of the entry
                audio_url = entry.get("url")
            if not audio_url:
                return {"found": False}

            vid = entry.get("id", "")
            thumbnail = entry.get("thumbnail", "")
            # prefer medium thumbnail
            thumbs = entry.get("thumbnails", [])
            if thumbs:
                # pick one around 320px wide
                sized = [t for t in thumbs if (t.get("width") or 0) >= 300]
                thumbnail = (sized[0] if sized else thumbs[-1]).get("url", thumbnail)

            return {
                "found":      True,
                "video_id":   vid,
                "audio_url":  audio_url,
                "yt_title":   entry.get("title", ""),
                "channel":    entry.get("uploader", ""),
                "thumbnail":  thumbnail,
                "watch_url":  f"https://www.youtube.com/watch?v={vid}",
                "duration":   entry.get("duration"),
            }
    except Exception as e:
        return {"found": False, "error": str(e)}


@app.get("/api/open-url")
def open_external_url(url: str):
    """Open a URL in the system default browser (used from PyWebView context)."""
    allowed = ("https://www.youtube.com/", "https://music.apple.com/")
    if not any(url.startswith(a) for a in allowed):
        raise HTTPException(status_code=400, detail="URL not allowed")
    webbrowser.open(url)
    return {"ok": True}


# ═══════════════════════════════════════════════════════════════════════════════
# AI CHAT
# ═══════════════════════════════════════════════════════════════════════════════

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    model: str = "llama3.2"
    include_context: bool = True

@app.get("/api/chat/history")
def chat_history():
    rows = db.get_chat_history(limit=30)
    return [dict(r) for r in rows]

@app.delete("/api/chat/history")
def clear_chat():
    db.clear_chat_history()
    return {"ok": True}

@app.post("/api/chat/message")
def save_message(body: ChatMessage):
    db.save_chat_message(body.role, body.content)
    return {"ok": True}


# ═══════════════════════════════════════════════════════════════════════════════
# AI CHAT — STREAMING WITH SERVER-SIDE TOOL EXECUTION
# ═══════════════════════════════════════════════════════════════════════════════

_TOOLS_SPEC = """
You have access to the following TOOLS. When you want to use one, emit EXACTLY
this pattern — the opening tag, one JSON object, then the closing tag, all on one block:

<tool_call>{"tool": "TOOL_NAME", "args": {...}}</tool_call>

CRITICAL FORMAT RULES:
- ALWAYS use exactly the key "args" (with the letter s) — never "arg".
- ALWAYS close the tag with </tool_call> immediately after the JSON.
- Do NOT add any text between <tool_call> and </tool_call> other than the JSON.
- Do NOT emit the tool call as plain text or markdown — only inside the tags.

After each tool call you will receive a <tool_result> block. You may call
multiple tools in sequence. Then give your final natural-language reply.

Available tools:

add_task(title, description?, category?, priority?, due_date?)
  priority: Low|Medium|High|Urgent   due_date: YYYY-MM-DD

update_task_status(task_id, status)
  status: Todo|In Progress|Done

add_course(title, provider?, url?, category?, status?, notes?)
  status: Planned|In Progress|Completed|Dropped

add_project(name, description?, color?, start_date?, target_date?)

update_target(target_id, current_value)

log_work_hours(duration_minutes, description?, category?, date?)
  date: YYYY-MM-DD (default today)

query_data(sql)
  Tables: tasks, projects, work_sessions, targets, courses, resumes
"""
_SYSTEM_PROMPT = """You are an intelligent personal productivity assistant embedded in a desktop planner app. You have full knowledge of the user's professional profile, career history, skills, tasks, projects, courses, and goals shown in the context below. Use this to give personalised, relevant answers.

MANDATORY RULES — follow without exception:
0. CORE RULE — only call write tools (add_task, add_course, add_project, log_work_hours, update_*) when the user EXPLICITLY uses words like "add", "create", "log", or "record". Suggestive words like "suggest", "recommend", "what should I", "what courses" → respond in plain text ONLY, never call a write tool.
1. SUGGEST mode: when asked to suggest, recommend, or list items → output a numbered text list ONLY. Then end with "Let me know which ones you'd like me to add to your planner."
2. ADD mode: when explicitly asked to ADD specific items → call the tool IMMEDIATELY after each item. Do NOT list them as text first.
3. NEVER output raw SQL in your reply text. SQL only goes inside <tool_call> blocks.
4. NEVER just describe what you WOULD do — DO it with a tool call, then confirm in plain English.
5. After every tool call you MUST wait for the <tool_result>, then continue.

{tools}

Current planner snapshot:
{context}
"""

@app.get("/api/ollama/status")
def ollama_status():
    """Check Ollama service status and return list of installed models."""
    try:
        import requests as _requests
        resp = _requests.get("http://localhost:11434/api/tags", timeout=3)
        if resp.status_code == 200:
            models = [m["name"] for m in resp.json().get("models", [])]
            return {
                "running": True,
                "models": models
            }
    except Exception:
        pass

    # Fallback to embedded model status
    exists = os.path.exists(MODEL_PATH)
    return {
        "running": False,
        "models": [MODEL_FILENAME] if exists else []
    }

import re as _re2
import requests as _req

class ChatStreamRequest(BaseModel):
    messages: list[ChatMessage]
    model: str = "llama3.2"
    include_context: bool = True

def _run_tool_server(tool: str, args: dict) -> str:
    """Execute a tool call against the database and return a result string."""
    try:
        if tool == "add_task":
            title = args.get("title") or args.get("name") or args.get("task_title", "")
            if not title:
                return "Tool error: 'title' is required for add_task"
            db.add_task(title=title,
                        description=args.get("description", ""),
                        category=args.get("category", "General"),
                        priority=args.get("priority", "Medium"),
                        due_date=args.get("due_date"))
            return f"Task added: \"{title}\""

        elif tool == "update_task_status":
            task_id_val = args.get("task_id") or args.get("id") or args.get("task", "")
            status_val  = args.get("status", "")
            if not task_id_val or not status_val:
                return "Tool error: 'task_id' and 'status' are required for update_task_status"
            db.update_task_status(int(task_id_val), status_val)
            return f"Task {task_id_val} status → {status_val}"

        elif tool == "add_course":
            title = args.get("title") or args.get("name") or args.get("course_title") or args.get("course", "")
            if not title:
                return "Tool error: 'title' is required for add_course"
            db.add_course(title=title,
                          provider=args.get("provider", ""),
                          url=args.get("url", ""),
                          category=args.get("category", "Learning"),
                          status=args.get("status", "Planned"),
                          notes=args.get("notes", ""))
            return f"Course added: \"{title}\""

        elif tool == "add_project":
            proj_name = args.get("name") or args.get("title") or args.get("project_name", "")
            if not proj_name:
                return "Tool error: 'name' is required for add_project"
            db.add_project(name=proj_name,
                           description=args.get("description", ""),
                           color=args.get("color", "#3b82f6"),
                           start_date=args.get("start_date"),
                           target_date=args.get("target_date"))
            return f"Project added: \"{proj_name}\""

        elif tool == "update_target":
            target_id_val = args.get("target_id") or args.get("id", "")
            current_val   = args.get("current_value") or args.get("value") or args.get("progress")
            if not target_id_val or current_val is None:
                return "Tool error: 'target_id' and 'current_value' are required for update_target"
            db.update_target(int(target_id_val),
                             current_value=float(current_val))
            return f"Target {target_id_val} updated to {current_val}"

        elif tool == "log_work_hours":
            from datetime import datetime as _dt, timedelta as _td
            mins  = int(args["duration_minutes"])
            d_str = args.get("date", date.today().isoformat())
            desc  = args.get("description", "")
            cat   = args.get("category", "Work")
            start_dt = _dt.fromisoformat(f"{d_str}T09:00:00")
            end_dt   = start_dt + _td(minutes=mins)
            db.add_work_session(start_dt.isoformat(), end_dt.isoformat(),
                                mins, desc, None, cat, d_str)
            return f"Logged {mins} min of '{cat}' on {d_str}"

        elif tool == "query_data":
            sql = args.get("sql", "").strip()
            if not sql.upper().startswith("SELECT"):
                return "Only SELECT queries are allowed."
            cols, rows = db.execute_raw(sql)
            if not rows:
                return "No rows returned."
            header = " | ".join(cols)
            lines  = [header, "-" * min(len(header), 80)]
            for r in rows[:15]:
                lines.append(" | ".join(str(r.get(c, "")) for c in cols))
            if len(rows) > 15:
                lines.append(f"...({len(rows)} total, showing 15)")
            return "\n".join(lines)

        else:
            return f"Unknown tool: {tool}"
    except Exception as exc:
        return f"Tool error: {exc}"

@app.post("/api/chat/stream")
def chat_stream(body: ChatStreamRequest):
    """Stream AI response with server-side tool execution."""
    # Build context
    if body.include_context:
        ctx_resp = get_context()
        context  = ctx_resp["context"]
    else:
        context = "(context sharing off)"

    system_content = _SYSTEM_PROMPT.format(tools=_TOOLS_SPEC, context=context)
    messages = [{"role": "system", "content": system_content}]
    messages += [{"role": m.role, "content": m.content} for m in body.messages[-14:]]

    def stream():
        import json as _j
        conversation = list(messages)
        MAX_TOOL_ROUNDS = 8
        rendered_parts = []

        def _strip_tool_tags(text: str) -> str:
            # Remove properly closed tool_call blocks
            text = _re2.sub(r"<tool_call>.*?</tool_call>", "", text, flags=_re2.DOTALL)
            # Remove unclosed tool_call tags (model forgot the closing tag) — consume to end of string
            text = _re2.sub(r"<tool_call>.*\Z", "", text, flags=_re2.DOTALL)
            # Remove any remaining bare tool tags (tool_result etc.)
            text = _re2.sub(r"</?tool_\w+>", "", text)
            return text

        is_embedded = (body.model == MODEL_FILENAME) or (not body.model)
        if not is_embedded:
            try:
                import requests as _requests
                _requests.get("http://localhost:11434/api/tags", timeout=1)
            except Exception:
                is_embedded = True

        for _round in range(MAX_TOOL_ROUNDS):
            if is_embedded:
                try:
                    llm = get_llama_model()
                    if not llm:
                        msg = "\n⚠ Local AI model not found. Please download it in the Relax tab or Settings."
                        rendered_parts.append(msg)
                        yield msg
                        return
                    resp_stream = llm.create_chat_completion(
                        messages=conversation,
                        stream=True,
                        temperature=0.7,
                        max_tokens=1024
                    )
                except Exception as e:
                    msg = f"\n⚠ Embedded LLM error: {e}"
                    rendered_parts.append(msg)
                    yield msg
                    return
            else:
                # Call Ollama
                try:
                    resp = _req.post(
                        "http://localhost:11434/api/chat",
                        json={"model": body.model, "messages": conversation, "stream": True},
                        stream=True, timeout=120,
                    )
                    resp.raise_for_status()
                except _req.exceptions.ConnectionError:
                    msg = "\n⚠ Could not connect to Ollama. Run: ollama serve"
                    rendered_parts.append(msg)
                    yield msg
                    return
                except _req.exceptions.HTTPError as e:
                    status = getattr(getattr(e, "response", None), "status_code", None)
                    if status == 404:
                        msg = f"\n⚠ Model '{body.model}' not found. Run: ollama pull {body.model}"
                    else:
                        msg = f"\n⚠ Ollama error {status}"
                    rendered_parts.append(msg)
                    yield msg
                    return
                except Exception as e:
                    msg = f"\n⚠ Error: {e}"
                    rendered_parts.append(msg)
                    yield msg
                    return

            # Collect complete model response, then render a cleaned version.
            full_text = []
            if is_embedded:
                for chunk in resp_stream:
                    delta = chunk["choices"][0]["delta"]
                    if "content" in delta:
                        full_text.append(delta["content"])
            else:
                for line in resp.iter_lines():
                    if not line:
                        continue
                    try:
                        data  = _j.loads(line)
                        chunk = data.get("message", {}).get("content", "")
                        if chunk:
                            full_text.append(chunk)
                        if data.get("done"):
                            break
                    except Exception:
                        pass

            assistant_text = "".join(full_text)
            conversation.append({"role": "assistant", "content": assistant_text})

            visible_text = _strip_tool_tags(assistant_text).strip()
            if visible_text:
                if rendered_parts and not rendered_parts[-1].endswith("\n"):
                    visible_text = "\n" + visible_text
                rendered_parts.append(visible_text)
                yield visible_text

            # Check for tool calls — handle both properly closed and unclosed tags
            tool_calls = _re2.findall(r"<tool_call>(.*?)(?:</tool_call>|\Z)", assistant_text, _re2.DOTALL)
            # Filter out empty captures (e.g. from a stray <tool_call></tool_call>)
            tool_calls = [tc for tc in tool_calls if tc.strip()]
            if not tool_calls:
                # No tools — we're done
                # Persist to DB
                user_msg = next((m.content for m in reversed(body.messages) if m.role == "user"), None)
                if user_msg:
                    db.save_chat_message("user", user_msg)
                db.save_chat_message("assistant", "".join(rendered_parts).strip() or assistant_text)
                return

            # Execute each tool and feed results back
            for tc in tool_calls:
                try:
                    parsed = tc.strip()
                    if parsed.startswith("```"):
                        parsed = parsed.strip("`")
                        if parsed.lower().startswith("json"):
                            parsed = parsed[4:].strip()
                    call   = _j.loads(parsed)
                    tool   = call.get("tool", "")
                    # Normalise: some models emit "arg" (no s) instead of "args"
                    args   = call.get("args", call.get("arg", call.get("arguments", {})))
                    result = _run_tool_server(tool, args)
                except Exception as exc:
                    tool = "unknown"
                    result = f"Tool parse error: {exc}"

                tool_result_msg = f"<tool_result>{result}</tool_result>"
                human_tool = f"\n[Tool] {tool}: {result}\n"
                rendered_parts.append(human_tool)
                yield human_tool
                conversation.append({"role": "user", "content": tool_result_msg})

            # Loop to let the AI respond to tool results

        tail = "\n\n[Max tool rounds reached]"
        rendered_parts.append(tail)
        yield tail

        user_msg = next((m.content for m in reversed(body.messages) if m.role == "user"), None)
        if user_msg:
            db.save_chat_message("user", user_msg)
        db.save_chat_message("assistant", "".join(rendered_parts).strip())

    return StreamingResponse(stream(), media_type="text/plain")

@app.get("/api/chat/context")
def get_context():
    """Return the planner snapshot used to ground the AI."""
    today = date.today()
    lines = [f"Today: {today.strftime('%A, %B %d, %Y')}"]

    # Professional profile
    profile = db.get_profile()
    if profile and profile.get("name"):
        p = dict(profile)
        lines.append(f"\nUser Profile:")
        lines.append(f"  Name: {p.get('name','')}")
        if p.get('role'):        lines.append(f"  Role: {p['role']}")
        if p.get('company'):     lines.append(f"  Company: {p['company']}")
        if p.get('experience_years'): lines.append(f"  Experience: {p['experience_years']} years")

    # Skills
    skills_rows = db.get_skills()
    if skills_rows:
        cats: dict = {}
        for r in skills_rows:
            cats.setdefault(r["category"], []).append(r["skill"])
        lines.append("\nSkills:")
        for cat, skls in cats.items():
            lines.append(f"  {cat}: {', '.join(skls)}")

    tasks = db.get_tasks()
    if tasks:
        lines.append(f"\nTasks ({len(tasks)}):")
        for t in tasks[:20]:
            due = f", due {t['due_date']}" if t["due_date"] else ""
            lines.append(f"  [id={t['id']} {t['status']}] {t['title']} ({t['priority']}{due})")
    else:
        lines.append("\nTasks: NONE — planner is empty.")

    projects = db.get_projects()
    if projects:
        lines.append("\nProjects:")
        for p in projects[:8]:
            lines.append(f"  [id={p['id']}] {p['name']} - {p['status']}, {p['progress']}%")

    courses = db.get_courses()
    if courses:
        lines.append(f"\nCourses ({len(courses)}):")
        for c in courses[:10]:
            lines.append(f"  [id={c['id']} {c['status']}] {c['title']} ({c.get('provider','')})")

    weekly   = db.get_weekly_hours()
    week_min = sum(r["total_minutes"] for r in weekly)
    h, m     = divmod(week_min, 60)
    lines.append(f"\nWork hours this week: {h}h {m}m")

    targets = db.get_targets(year=today.year)
    if targets:
        lines.append(f"\nYear Targets ({today.year}):")
        for t in targets:
            pct = round(t["current_value"] / t["target_value"] * 100) if t["target_value"] > 0 else 0
            lines.append(f"  [id={t['id']}] {t['title']}: {t['current_value']}/{t['target_value']} {t.get('unit','')} ({pct}%)")

    return {"context": "\n".join(lines)}


# ═══════════════════════════════════════════════════════════════════════════════
# RESUMES
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/api/resumes")
def get_resumes():
    return [dict(r) for r in db.get_resumes()]

@app.delete("/api/resumes/{resume_id}")
def delete_resume(resume_id: int):
    db.delete_resume(resume_id)
    return {"ok": True}


# ═══════════════════════════════════════════════════════════════════════════════
# RESUME UPLOAD + AI ANALYSIS (streaming)
# ═══════════════════════════════════════════════════════════════════════════════

import re as _re
from fastapi import UploadFile, File
from fastapi.responses import StreamingResponse
import json as _json

SKILL_KEYWORDS = {
    "Programming Languages": [
        "Python", "Java", "JavaScript", "TypeScript", "C++", "C#", "Go", "Rust",
        "SQL", "HTML", "CSS", "Bash", "Shell", "Kotlin", "Swift", "Scala",
        "Ruby", "PHP", "MATLAB", "Perl", "Dart", "Haskell", "Lua", "Objective-C"
    ],
    "Frameworks & Libraries": [
        "React", "Angular", "Vue", "Django", "Flask", "FastAPI", "Spring",
        "Node.js", "Next.js", "Express", "TensorFlow", "PyTorch", "Keras",
        "scikit-learn", "Pandas", "NumPy", "Bootstrap", "Tailwind", "GraphQL",
        "Svelte", "Laravel", "Rails", "ASP.NET", "Hibernate", "jQuery",
        "Hugging Face", "LangChain", "OpenCV", "NLTK", "spaCy"
    ],
    "Databases": [
        "MySQL", "PostgreSQL", "SQLite", "Oracle", "MongoDB", "Redis",
        "Cassandra", "DynamoDB", "Elasticsearch", "Firebase", "BigQuery",
        "Snowflake", "Redshift", "Neo4j", "InfluxDB", "MariaDB", "CockroachDB"
    ],
    "Cloud & DevOps": [
        "AWS", "Azure", "GCP", "Google Cloud", "Docker", "Kubernetes",
        "Jenkins", "Terraform", "Ansible", "GitHub Actions", "Linux",
        "CI/CD", "Nginx", "Helm", "GitLab", "CircleCI", "Prometheus",
        "Grafana", "EKS", "ECS", "CloudFormation", "Pulumi", "ArgoCD"
    ],
    "Tools & Platforms": [
        "Git", "Jira", "Agile", "Scrum", "REST API", "Microservices",
        "Kafka", "Postman", "Swagger", "Figma", "Notion", "Confluence",
        "RabbitMQ", "gRPC", "OpenAPI", "Slack", "VS Code", "IntelliJ",
        "Jupyter", "Databricks", "Airflow", "dbt", "Tableau", "Power BI"
    ],
    "Data & AI": [
        "Machine Learning", "Deep Learning", "NLP", "Computer Vision",
        "Data Science", "ETL", "Spark", "Hadoop", "MLOps", "Generative AI",
        "Large Language Models", "LLM", "Data Engineering", "Data Analysis",
        "Statistical Modeling", "A/B Testing", "Feature Engineering",
        "Reinforcement Learning", "RAG", "Vector Database", "Embeddings"
    ],
}

ANALYSIS_PROMPTS = {
    "Skill Gap Analysis": "Analyse this resume and identify key skill gaps. What technologies and skills are missing for senior roles in this domain?",
    "Role Suggestions": "Based on this resume, suggest 5 job roles that are a great fit and 3 stretch roles to aim for, with reasoning.",
    "Course Recommendations": "Based on the skill gaps in this resume, recommend 8 specific online courses (with platforms) to take now.",
    "ATS Feedback": "Review this resume for ATS compatibility. Give specific, actionable formatting and keyword improvements.",
    "Career Roadmap": "Create a detailed 12-month career roadmap for this person including skills, certifications, and milestones.",
}

def _extract_text_from_bytes(filename: str, content: bytes) -> str:
    ext = filename.rsplit('.', 1)[-1].lower()
    if ext == 'pdf':
        try:
            import io
            from pdfminer.high_level import extract_text as pdf_extract
            return pdf_extract(io.BytesIO(content))
        except Exception:
            raw = content.decode('latin-1', errors='ignore')
            strings = _re.findall(r'\(([^)]{3,})\)', raw)
            return ' '.join(strings)[:15000]
    elif ext == 'docx':
        try:
            import io, docx
            doc = docx.Document(io.BytesIO(content))
            return '\n'.join(p.text for p in doc.paragraphs)
        except Exception:
            return '[Install python-docx to parse DOCX]'
    else:
        return content.decode('utf-8', errors='ignore')


def _keyword_skills(text: str) -> dict:
    result = {}
    for cat, kws in SKILL_KEYWORDS.items():
        found = []
        for kw in kws:
            # Word-boundary matching prevents 'C' matching 'CSS', 'Go' matching 'Google' etc.
            pattern = _re.escape(kw)
            if _re.search(r'\b' + pattern + r'\b', text, _re.IGNORECASE):
                found.append(kw)
        if found:
            result[cat] = found
    return result

@app.post("/api/resumes/upload", status_code=201)
async def upload_resume(file: UploadFile = File(...)):
    content_bytes = await file.read()
    text = _extract_text_from_bytes(file.filename, content_bytes)
    rid  = db.save_resume(file.filename, text)
    skills = _keyword_skills(text)
    if skills:
        db.save_skills(skills, source='resume')
    return {"id": rid, "filename": file.filename, "skills_found": sum(len(v) for v in skills.values())}

class AnalyzeRequest(BaseModel):
    resume_id: int
    prompt_type: str = "Skill Gap Analysis"

@app.post("/api/resumes/analyze")
def analyze_resume(body: AnalyzeRequest):
    content = db.get_resume_content(body.resume_id)
    if not content:
        raise HTTPException(404, "Resume not found")

    # Load career profile context if it exists
    profile = db.get_career_profile(body.resume_id)
    context_str = ""
    if profile:
        if profile.get("refined_context"):
            context_str = f"User's Refined Career Context (goals, preferences): {profile['refined_context']}\n\n"
        elif profile.get("extracted_context"):
            context_str = f"User's Resume Summary: {profile['extracted_context']}\n\n"

    prompt = ANALYSIS_PROMPTS.get(body.prompt_type, ANALYSIS_PROMPTS["Skill Gap Analysis"])
    full_prompt = f"{context_str}{prompt}\n\nResume:\n{content[:6000]}"

    def stream():
        full_text = []
        try:
            llm = get_llama_model()
            if not llm:
                yield "⚠ Error: Local AI model not found. Please download it first."
                return

            response = llm.create_chat_completion(
                messages=[
                    {"role": "system", "content": "You are an expert career coach and resume analyst."},
                    {"role": "user",   "content": full_prompt},
                ],
                stream=True,
                max_tokens=1024
            )
            for chunk in response:
                delta = chunk["choices"][0]["delta"]
                if "content" in delta:
                    content_chunk = delta["content"]
                    full_text.append(content_chunk)
                    yield content_chunk
            
            # Save the complete generated content to local cache at stream end
            final_content = "".join(full_text)
            if final_content:
                db.save_career_suggestion(body.resume_id, body.prompt_type, final_content)

        except Exception as e:
            yield f"\n⚠ Error: {e}"

    return StreamingResponse(stream(), media_type="text/plain")


@app.get("/api/resumes/{resume_id}/profile")
def get_resume_profile_endpoint(resume_id: int):
    profile = db.get_career_profile(resume_id)
    if not profile:
        return {"status": "none"}
    
    questions = []
    if profile.get("questions_json"):
        try:
            questions = _json.loads(profile["questions_json"])
        except Exception:
            pass
            
    answers = []
    if profile.get("answers_json"):
        try:
            answers = _json.loads(profile["answers_json"])
        except Exception:
            pass

    return {
        "status": "ready" if profile.get("refined_context") else "extracted",
        "summary": profile.get("extracted_context", ""),
        "refined_context": profile.get("refined_context", ""),
        "questions": questions,
        "answers": answers
    }


@app.post("/api/resumes/{resume_id}/init-profile")
def init_resume_profile_endpoint(resume_id: int):
    content = db.get_resume_content(resume_id)
    if not content:
        raise HTTPException(404, "Resume not found")
        
    llm = get_llama_model()
    if not llm:
        raise HTTPException(500, "Local AI model not found")
        
    prompt = (
        "You are an expert career coach. Analyze the following resume content and output a JSON object with exactly two keys:\n"
        "1. 'summary': A concise summary (3-4 sentences) of their career profile, including their key strengths and experience level.\n"
        "2. 'questions': An array of exactly 3 highly personalized, specific questions to help them define their target role, industry, or preferred career path (e.g. 'I see you worked with React, are you aiming for fullstack or frontend roles?').\n"
        "Output ONLY a valid JSON object. No markdown formatting, no code fences, no extra text.\n\n"
        f"Resume:\n{content[:6000]}"
    )
    
    try:
        response = llm.create_chat_completion(
            messages=[
                {"role": "system", "content": "You are a career assistant that outputs strict JSON."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=512,
            temperature=0.3
        )
        raw_output = response["choices"][0]["message"]["content"].strip()
        
        # Parse JSON robustly
        import re
        match = re.search(r'(\{.*\})', raw_output, re.DOTALL)
        if match:
            parsed = _json.loads(match.group(1))
        else:
            cleaned = re.sub(r'```[a-z]*\n?', '', raw_output).strip('`').strip()
            parsed = _json.loads(cleaned)
            
        summary = parsed.get("summary", "Resume uploaded successfully.")
        questions = parsed.get("questions", [
            "What is your target role or title for your next job?",
            "Are there any specific industries or company sizes you prefer?",
            "What key skills or technologies are you most excited to learn next?"
        ])
        
        db.save_career_profile(resume_id, summary, _json.dumps(questions))
        return {"summary": summary, "questions": questions}
    except Exception as e:
        fallback_summary = "Professional profile extracted from resume. Please answer a few questions to refine your career goals."
        fallback_questions = [
            "What is your target role or title for your next job?",
            "Are there any specific industries or company sizes you prefer?",
            "What key skills or technologies are you most excited to learn next?"
        ]
        db.save_career_profile(resume_id, fallback_summary, _json.dumps(fallback_questions))
        return {"summary": fallback_summary, "questions": fallback_questions}


class RefineRequest(BaseModel):
    answers: list[str]

@app.post("/api/resumes/{resume_id}/refine-profile")
def refine_resume_profile_endpoint(resume_id: int, body: RefineRequest):
    profile = db.get_career_profile(resume_id)
    if not profile:
        raise HTTPException(404, "Profile not initialized")
        
    extracted_context = profile.get("extracted_context", "")
    questions_json = profile.get("questions_json", "[]")
    try:
        questions = _json.loads(questions_json)
    except Exception:
        questions = []
        
    answers = body.answers
    
    # Construct Q&A text for AI prompt
    qa_pairs = []
    for q, a in zip(questions, answers):
        qa_pairs.append(f"Q: {q}\nA: {a}")
    qa_text = "\n\n".join(qa_pairs)
    
    llm = get_llama_model()
    if not llm:
        raise HTTPException(500, "Local AI model not found")
        
    prompt = (
        "You are an expert career coach. Here is the user's initial resume summary and their answers to some career goals questions.\n\n"
        f"Initial Resume Summary: {extracted_context}\n\n"
        "Questions and Answers:\n"
        f"{qa_text}\n\n"
        "Synthesize this information into a refined career profile context (2-3 paragraphs, around 150-200 words) that describes their current profile, their career objectives, target roles, and what they need to focus on. Make it encouraging and highly personalized. This will be the guiding context for their career roadmaps."
    )
    
    try:
        response = llm.create_chat_completion(
            messages=[
                {"role": "system", "content": "You are a professional career coach. Write a refined summary profile based on the user's resume and answers."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=512,
            temperature=0.5
        )
        refined_context = response["choices"][0]["message"]["content"].strip()
        db.update_career_profile_answers(resume_id, _json.dumps(answers), refined_context)
        return {"refined_context": refined_context}
    except Exception as e:
        raise HTTPException(500, f"Refinement failed: {e}")


@app.get("/api/resumes/{resume_id}/suggestions")
def get_cached_suggestion_endpoint(resume_id: int, type: str):
    suggestion = db.get_career_suggestion_by_type(resume_id, type)
    if suggestion:
        return {"content": suggestion["content"]}
    return {"content": ""}


# ═══════════════════════════════════════════════════════════════════════════════
# FEEDBACK — stored locally in USER_DIR/feedback.json
# (Email delivery handled externally via Google Form — see About page)
# ═══════════════════════════════════════════════════════════════════════════════

FEEDBACK_FILE = os.path.join(USER_DIR, "feedback.json")

class FeedbackRequest(BaseModel):
    type: str = "general"
    name: Optional[str] = None
    message: str

@app.post("/api/feedback")
def submit_feedback(body: FeedbackRequest):
    if not body.message.strip():
        raise HTTPException(400, "Message must not be empty")
    entry = {
        "id": int(datetime.utcnow().timestamp() * 1000),
        "type": body.type,
        "name": (body.name or "").strip() or None,
        "message": body.message.strip()[:2000],
        "created_at": datetime.utcnow().isoformat() + "Z",
    }
    try:
        existing = []
        if os.path.exists(FEEDBACK_FILE):
            with open(FEEDBACK_FILE, "r", encoding="utf-8") as f:
                existing = json.load(f)
        existing.append(entry)
        with open(FEEDBACK_FILE, "w", encoding="utf-8") as f:
            json.dump(existing, f, indent=2, ensure_ascii=False)
    except Exception as e:
        raise HTTPException(500, f"Could not save feedback: {e}")
    return {"ok": True, "id": entry["id"]}

@app.get("/api/feedback")
def get_feedback():
    if not os.path.exists(FEEDBACK_FILE):
        return []
    with open(FEEDBACK_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


# ═══════════════════════════════════════════════════════════════════════════════
# SPA FALLBACK — must be LAST so all /api/* routes are matched first
# ═══════════════════════════════════════════════════════════════════════════════

_SETUP_HTML = """<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Personal Planner — Setup Required</title>
<style>
  body { background:#06060f; color:white; font-family:'Segoe UI',sans-serif;
         display:flex; align-items:center; justify-content:center; height:100vh; margin:0; }
  .box { background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1);
         border-radius:20px; padding:48px 56px; max-width:580px; text-align:center; }
  h1  { color:#a78bfa; margin:0 0 16px; font-size:28px; }
  p   { color:#9ca3af; line-height:1.7; margin-bottom:10px; }
  code{ background:rgba(124,58,237,0.2); border:1px solid rgba(124,58,237,0.3);
        color:#c4b5fd; padding:3px 10px; border-radius:6px; font-size:14px; font-family:monospace; }
  .step{ background:rgba(255,255,255,0.03); border-radius:12px; padding:18px 22px;
         text-align:left; margin-top:18px; }
  .step strong { color:white; }
  .step p { margin:6px 0; font-size:14px; }
  .note { margin-top:28px; font-size:13px; color:#6b7280; }
</style></head>
<body><div class="box">
  <h1>⚡ Setup Required</h1>
  <p>The app UI has not been built yet. This only needs to be done once.</p>
  <div class="step">
    <p><strong>Step 1 &mdash;</strong> Install <a href="https://nodejs.org" style="color:#a78bfa">Node.js 18+</a> if you haven't already</p>
  </div>
  <div class="step">
    <p><strong>Step 2 &mdash;</strong> Double-click <code>install.bat</code> in the PersonalPlanner folder</p>
    <p style="color:#6b7280;font-size:13px">This installs all Python &amp; Node packages and builds the UI automatically.</p>
  </div>
  <div class="step">
    <p><strong>Step 3 &mdash;</strong> Run <code>run.bat</code> to start the app</p>
  </div>
  <p class="note">Close this window first, then run install.bat</p>
</div></body></html>"""

if os.path.exists(FRONTEND_DIST):
    @app.get("/")
    def serve_index():
        return FileResponse(os.path.join(FRONTEND_DIST, "index.html"))

    @app.get("/{full_path:path}")
    def serve_spa(full_path: str):
        """Catch-all: serve React app for any non-API route."""
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail=f"API endpoint not found: /{full_path}")
        file_path = os.path.join(FRONTEND_DIST, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(FRONTEND_DIST, "index.html"))

else:
    # dist/ not built yet — serve a helpful setup page for EVERY route
    @app.get("/")
    @app.get("/{full_path:path}")
    def setup_required(full_path: str = ""):
        if full_path.startswith("api/"):
            raise HTTPException(status_code=503, detail="App not set up yet — run install.bat first")
        return HTMLResponse(content=_SETUP_HTML)
