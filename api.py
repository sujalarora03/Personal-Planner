"""
FastAPI backend — local REST API for Personal Planner.
Runs on http://localhost:7432 (chosen to avoid common port conflicts).
All data goes through the existing Database class unchanged.
"""
import os
import sys
import threading
import json
from datetime import date
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from database import Database

app = FastAPI(title="Personal Planner API", version="0.5")
db  = Database()
db.init_db()

# ── CORS (PyWebView uses file:// or localhost origin) ─────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Serve built React frontend ─────────────────────────────────────────────────
FRONTEND_DIST = os.path.join(os.path.dirname(os.path.abspath(__file__)), "frontend", "dist")

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

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    priority: Optional[str] = None
    due_date: Optional[str] = None
    status: Optional[str] = None

@app.get("/api/tasks")
def get_tasks(status: Optional[str] = None, category: Optional[str] = None,
              include_archived: bool = False):
    rows = db.get_tasks(status=status, category=category, include_archived=include_archived)
    return [dict(r) for r in rows]

@app.post("/api/tasks", status_code=201)
def create_task(body: TaskCreate):
    db.add_task(title=body.title, description=body.description,
                category=body.category, priority=body.priority,
                due_date=body.due_date)
    return {"ok": True}

@app.patch("/api/tasks/{task_id}")
def update_task(task_id: int, body: TaskUpdate):
    if body.status:
        db.update_task_status(task_id, body.status)
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
    db.add_work_session(
        start_time=f"{d}T09:00:00",
        end_time=f"{d}T09:{body.duration_minutes:02d}:00",
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
    target_value: Optional[float] = None

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
    db.update_target(target_id, current_value=body.current_value,
                     title=body.title, target_value=body.target_value)
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
    db.update_course(course_id, status=body.status, progress=body.progress,
                     notes=body.notes, rating=body.rating)
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

@app.get("/api/profile")
def get_profile():
    p = db.get_profile()
    return dict(p) if p else {}

@app.post("/api/profile")
def save_profile(body: ProfileUpdate):
    db.save_profile(name=body.name, birthdate=body.birthdate,
                    company=body.company, role=body.role,
                    experience_years=body.experience_years)
    return {"ok": True}

@app.get("/api/skills")
def get_skills():
    rows = db.get_skills()
    cats: dict = {}
    for r in rows:
        cats.setdefault(r["category"], []).append(r["skill"])
    return cats


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

@app.get("/api/chat/context")
def get_context():
    """Return the planner snapshot used to ground the AI."""
    today = date.today()
    lines = [f"Today: {today.strftime('%A, %B %d, %Y')}"]

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
            lines.append(f"  [id={c['id']} {c['status']}] {c['title']}")

    weekly   = db.get_weekly_hours()
    week_min = sum(r["total_minutes"] for r in weekly)
    h, m     = divmod(week_min, 60)
    lines.append(f"\nWork hours this week: {h}h {m}m")

    targets = db.get_targets(year=today.year)
    if targets:
        lines.append(f"\nYear Targets ({today.year}):")
        for t in targets:
            pct = round(t["current_value"] / t["target_value"] * 100) if t["target_value"] > 0 else 0
            lines.append(f"  [id={t['id']}] {t['title']}: {pct}%")

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

if os.path.exists(FRONTEND_DIST):
    @app.get("/")
    def serve_index():
        return FileResponse(os.path.join(FRONTEND_DIST, "index.html"))

    @app.get("/{full_path:path}")
    def serve_spa(full_path: str):
        """Catch-all: serve React app for any non-API route."""
        # Never intercept /api/ paths — return 404 so the error is clear
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail=f"API endpoint not found: /{full_path}")
        file_path = os.path.join(FRONTEND_DIST, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(FRONTEND_DIST, "index.html"))
