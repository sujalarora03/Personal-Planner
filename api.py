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
from datetime import date
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
        # Strip markdown fences if present
        content = _re3.sub(r"```[a-z]*\n?", "", content).strip("`").strip()
        songs   = _j.loads(content)
        if isinstance(songs, list):
            return {"songs": [{"artist": s.get("artist",""), "title": s.get("title","")} for s in songs[:8]]}
        return {"songs": [], "error": "Unexpected format from model"}
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
this pattern (nothing else on the same line):

<tool_call>{"tool": "TOOL_NAME", "args": {...}}</tool_call>

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
0. CORE RULE — only call write tools (add_task, add_course, add_project, log_work_hours, update_*) when the user EXPLICITLY asks to add, create, log, or record something. For casual conversation or questions — respond in plain text ONLY.
1. When explicitly asked to ADD items → call the tool IMMEDIATELY. Do NOT list them as text first.
2. NEVER output raw SQL in your reply text. SQL only goes inside <tool_call> blocks.
3. NEVER just describe what you WOULD do — DO it with a tool call, then confirm in plain English.
4. After every tool call you MUST wait for the <tool_result>, then continue.

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
            db.add_task(title=args["title"],
                        description=args.get("description", ""),
                        category=args.get("category", "General"),
                        priority=args.get("priority", "Medium"),
                        due_date=args.get("due_date"))
            return f"Task added: \"{args['title']}\""

        elif tool == "update_task_status":
            db.update_task_status(int(args["task_id"]), args["status"])
            return f"Task {args['task_id']} status → {args['status']}"

        elif tool == "add_course":
            db.add_course(title=args["title"],
                          provider=args.get("provider", ""),
                          url=args.get("url", ""),
                          category=args.get("category", "Learning"),
                          status=args.get("status", "Planned"),
                          notes=args.get("notes", ""))
            return f"Course added: \"{args['title']}\""

        elif tool == "add_project":
            db.add_project(name=args["name"],
                           description=args.get("description", ""),
                           color=args.get("color", "#3b82f6"),
                           start_date=args.get("start_date"),
                           target_date=args.get("target_date"))
            return f"Project added: \"{args['name']}\""

        elif tool == "update_target":
            db.update_target(int(args["target_id"]),
                             current_value=float(args["current_value"]))
            return f"Target {args['target_id']} updated to {args['current_value']}"

        elif tool == "log_work_hours":
            mins  = int(args["duration_minutes"])
            d_str = args.get("date", date.today().isoformat())
            desc  = args.get("description", "")
            cat   = args.get("category", "Work")
            db.add_work_session(f"{d_str}T09:00:00", f"{d_str}T09:{mins:02d}:00",
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
            # Hide raw tool markup from users while preserving natural language text.
            text = _re2.sub(r"<tool_call>.*?</tool_call>", "", text, flags=_re2.DOTALL)
            text = _re2.sub(r"<tool_[^>]+>.*?</tool_[^>]+>", "", text, flags=_re2.DOTALL)
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

            # Check for tool calls in the response
            tool_calls = _re2.findall(r"<tool_call>(.*?)</tool_call>", assistant_text, _re2.DOTALL)
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
                    args   = call.get("args", {})
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
