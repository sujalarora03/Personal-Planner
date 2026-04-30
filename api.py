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


@app.get("/api/update/check")
def check_update():
    """Check GitHub main branch for a newer version of the app."""
    try:
        from updater import check_for_update
        return check_for_update()
    except Exception as e:
        return {"available": False, "error": str(e)}


@app.post("/api/update/download")
def start_download(body: dict):
    """Start downloading the new installer in a background thread."""
    try:
        from updater import download_installer, get_download_state
        state = get_download_state()
        if state["status"] == "downloading":
            return {"ok": True, "status": "already_downloading"}
        if state["status"] == "ready":
            return {"ok": True, "status": "ready", "path": state["path"]}

        installer_url = body.get("installer_url", "")
        version       = body.get("version", "")
        if not installer_url or not version:
            raise HTTPException(status_code=400, detail="installer_url and version required")

        t = threading.Thread(target=download_installer, args=(installer_url, version), daemon=True)
        t.start()
        return {"ok": True, "status": "started"}
    except HTTPException:
        raise
    except Exception as e:
        return {"ok": False, "error": str(e)}


@app.get("/api/update/progress")
def download_progress():
    """Poll download progress."""
    try:
        from updater import get_download_state
        return get_download_state()
    except Exception as e:
        return {"status": "error", "error": str(e)}


@app.post("/api/update/install")
def install_update():
    """Run the downloaded installer silently and exit this process."""
    try:
        from updater import get_download_state, run_installer_and_exit
        state = get_download_state()
        if state["status"] != "ready" or not state["path"]:
            raise HTTPException(status_code=400, detail="Installer not ready yet")

        t = threading.Thread(target=run_installer_and_exit, args=(state["path"],), daemon=True)
        t.start()
        return {"ok": True, "message": "Installing update and restarting…"}
    except HTTPException:
        raise
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
def weekly_review(model: str = "llama3.2"):
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
        import requests as _r
        resp = _r.post("http://localhost:11434/api/chat", json={
            "model": model,
            "messages": [
                {"role": "system", "content": "Write a short, warm, encouraging weekly productivity review in 3-4 sentences. Be specific and actionable."},
                {"role": "user", "content": f"Weekly review{' for ' + name if name else ''}:\n{summary}"},
            ],
            "stream": False,
        }, timeout=30)
        if resp.status_code == 200:
            text = (resp.json().get('message', {}).get('content', '') or '').strip()
            if len(text) > 10:
                return {"review": text, "source": "ollama", "stats": stats}
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
    "You didn't come this far to only come this far.",
    "Make it happen. Shock everyone.",
    "Build the life you can't stop thinking about.",
    "Stop waiting for the right moment. Create it.",
    "Be the main character, not a side quest.",
    "One year from now you'll wish you started today.",
]

@app.get("/api/quote")
def get_daily_quote():
    fallback = random.choice(_FALLBACK_QUOTES)
    try:
        import requests as _requests

        tags = _requests.get("http://localhost:11434/api/tags", timeout=2)
        if tags.status_code != 200:
            return {"quote": fallback, "source": "fallback"}

        models = [m.get("name") for m in tags.json().get("models", []) if m.get("name")]
        if not models:
            return {"quote": fallback, "source": "fallback"}

        model = "llama3.2" if "llama3.2" in models else models[0]

        p = db.get_profile() or {}
        first_name = (p.get("name") or "").split(" ")[0]
        role = p.get("role") or ""
        context_bits = []
        if first_name:
            context_bits.append(f"The user's first name is {first_name}.")
        if role:
            context_bits.append(f"They work as {role}.")
        context = " ".join(context_bits)

        resp = _requests.post(
            "http://localhost:11434/api/chat",
            json={
                "model": model,
                "messages": [
                    {
                        "role": "system",
                        "content": (
                            "You generate ultra-short motivational one-liners. "
                            "Max 18 words. Output ONLY the quote text."
                        ),
                    },
                    {
                        "role": "user",
                        "content": f"Give me one motivational line for today. {context}",
                    },
                ],
                "stream": False,
            },
            timeout=8,
        )
        if resp.status_code != 200:
            return {"quote": fallback, "source": "fallback"}

        quote = (resp.json().get("message", {}).get("content", "") or "").strip().strip('"').strip("'")
        if 5 < len(quote) < 220:
            return {"quote": quote, "source": "ollama", "model": model}
    except Exception:
        pass

    return {"quote": fallback, "source": "fallback"}


@app.get("/api/ollama/status")
def ollama_status():
    """Quick check: is Ollama running and which models are installed?"""
    try:
        import requests as _requests
        tags = _requests.get("http://localhost:11434/api/tags", timeout=2)
        if tags.status_code != 200:
            return {"running": False, "models": []}
        models = [m.get("name") for m in tags.json().get("models", []) if m.get("name")]
        return {"running": True, "models": models}
    except Exception:
        return {"running": False, "models": []}


# ═══════════════════════════════════════════════════════════════════════════════
# MOOD / SONG SUGGESTIONS
# ═══════════════════════════════════════════════════════════════════════════════

class MoodRequest(BaseModel):
    mood: str
    context: str = ""
    model: str = "llama3.2"

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
        "no markdown fences, nothing else. "
        'Format: [{"artist":"Artist Name","title":"Song Title"}, ...] '
        "Suggest exactly 8 songs that match the mood. Be diverse across genres and eras."
    )
    prompt = f"{name_part}{ctx_part}Mood: {body.mood}"

    try:
        import requests as _r
        resp = _r.post(
            "http://localhost:11434/api/chat",
            json={
                "model":    body.model,
                "messages": [
                    {"role": "system", "content": system},
                    {"role": "user",   "content": prompt},
                ],
                "stream": False,
            },
            timeout=60,
        )
        resp.raise_for_status()
        content = resp.json().get("message", {}).get("content", "").strip()

        # Strip markdown fences and any leading/trailing prose
        content = _re3.sub(r"```[a-z]*\n?", "", content).strip("`").strip()
        # Extract just the JSON array in case the model added preamble/postamble
        match = _re3.search(r"\[.*\]", content, _re3.DOTALL)
        if match:
            content = match.group(0)

        songs = _j.loads(content)
        if not isinstance(songs, list):
            return {"songs": [], "error": "Unexpected format from model"}

        result = []
        for s in songs[:8]:
            if isinstance(s, dict):
                artist = s.get("artist") or s.get("Artist") or s.get("artist_name") or ""
                title  = s.get("title")  or s.get("Title")  or s.get("song_title")  or s.get("song") or ""
            elif isinstance(s, str):
                # Model returned "Artist - Song Title" as a plain string
                parts  = s.split(" - ", 1)
                artist = parts[0].strip() if len(parts) == 2 else ""
                title  = parts[1].strip() if len(parts) == 2 else s.strip()
            else:
                continue
            if title:
                result.append({"artist": str(artist), "title": str(title)})

        return {"songs": result}
    except _r.exceptions.ConnectionError:
        return {"songs": [], "error": "Ollama not running — start it with: ollama serve"}
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
  Run a read-only SELECT on the planner database.
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

        for _round in range(MAX_TOOL_ROUNDS):
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
    "Programming Languages": ["Python","Java","JavaScript","TypeScript","C++","C#","Go","Rust","SQL","HTML","CSS","Bash","Kotlin","Swift","Scala","R","PHP"],
    "Frameworks & Libraries": ["React","Angular","Vue","Django","Flask","FastAPI","Spring","Node.js","Next.js","TensorFlow","PyTorch","scikit-learn","Pandas","NumPy","Bootstrap","Tailwind","GraphQL"],
    "Databases": ["MySQL","PostgreSQL","SQLite","Oracle","MongoDB","Redis","Cassandra","DynamoDB","Elasticsearch","Firebase"],
    "Cloud & DevOps": ["AWS","Azure","GCP","Docker","Kubernetes","Jenkins","Terraform","Ansible","GitHub Actions","Linux","CI/CD","Nginx","Helm"],
    "Tools & Platforms": ["Git","Jira","Agile","Scrum","REST API","Microservices","Kafka","Postman","Swagger","Figma","Notion"],
    "Data & AI": ["Machine Learning","Deep Learning","NLP","Computer Vision","Data Science","ETL","Spark","Tableau","Power BI","LangChain","Generative AI","MLOps"],
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
    tl = text.lower()
    result = {}
    for cat, kws in SKILL_KEYWORDS.items():
        found = [kw for kw in kws if kw.lower() in tl]
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
    model: str = "llama3.2"

@app.post("/api/resumes/analyze")
def analyze_resume(body: AnalyzeRequest):
    content = db.get_resume_content(body.resume_id)
    if not content:
        raise HTTPException(404, "Resume not found")
    prompt = ANALYSIS_PROMPTS.get(body.prompt_type, ANALYSIS_PROMPTS["Skill Gap Analysis"])
    full_prompt = f"{prompt}\n\nResume:\n{content[:6000]}"

    def stream():
        try:
            import requests as _requests
            resp = _requests.post(
                "http://localhost:11434/api/chat",
                json={"model": body.model, "messages": [
                    {"role": "system", "content": "You are an expert career coach and resume analyst."},
                    {"role": "user",   "content": full_prompt},
                ], "stream": True},
                stream=True, timeout=120,
            )
            for line in resp.iter_lines():
                if not line:
                    continue
                try:
                    data  = _json.loads(line)
                    chunk = data.get("message", {}).get("content", "")
                    if chunk:
                        yield chunk
                    if data.get("done"):
                        break
                except Exception:
                    pass
        except Exception as e:
            yield f"\n⚠ Error: {e}"

    return StreamingResponse(stream(), media_type="text/plain")


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
