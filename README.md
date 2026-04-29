# Personal Planner & Progress Tracker

A fully local, offline-first Windows desktop app. Manage tasks, track work hours, run personal projects, set year targets, log courses, build daily habits, and analyse your resume — all powered by a local AI assistant via Ollama.

> **100% Private · v0.5 BETA** — All your data stays on this machine. Nothing is ever sent online. The AI assistant runs locally via Ollama.

---

## Architecture

```
main.py  →  FastAPI (port 7432)  ↔  React + Vite frontend
                   |
              database.py (SQLite)
```

| Layer | Technology | Purpose |
|---|---|---|
| **Desktop shell** | PyWebView 6 | Native window wrapping the React app |
| **Backend** | FastAPI + Uvicorn | REST API on `http://127.0.0.1:7432` |
| **Frontend** | React 18 + Vite 8 | Glassmorphism UI with Framer Motion animations |
| **Styling** | Custom CSS | Dark theme, aurora background, neon glow |
| **Database** | SQLite via `database.py` | Local, file-based, zero configuration |
| **AI** | Ollama (local LLM) | Streaming chat + tool execution + resume analysis |
| **Tray** | pystray | System tray icon — close hides to tray |

---

## Features

### Core Pages

| Page | Route | Description |
|---|---|---|
| **Home** | `/` | Personalised greeting, motivational AI quote, stat cards, quick actions |
| **Profile** | `/profile` | Name, role, company, experience; skills auto-extracted from resume |
| **Dashboard** | `/dashboard` | 6 stat cards, 7-day & monthly bar charts, **Weekly AI Review** card, data export |
| **Today's Planner** | `/planner` | Unified day view — overdue tasks, due today, work sessions, habit check-ins |

### Productivity

| Page | Route | Description |
|---|---|---|
| **Tasks** | `/tasks` | Add/edit/archive/delete; priority, category, project link, due date; search & filter; **List + Kanban board view** with drag-and-drop |
| **Work Hours** | `/work-hours` | Log sessions (h + m split input); link to project; 7-day chart; session history |
| **Focus Timer** | `/focus` | Pomodoro timer (25m focus / 5m break / 15m long break); **auto-logs completed sessions** to Work Hours; project link |
| **Habits** | `/habits` | Daily habit check-in; fire-streak counter; icon + colour picker; today's completion rate |
| **Notes** | `/notes` | Card-based daily journal; filter by date or project; click-to-edit modal with auto-growing textarea |

### Planning & Growth

| Page | Route | Description |
|---|---|---|
| **Projects** | `/projects` | Project cards with colour labels, progress slider, status; **task count + mini progress bar per project** |
| **Year Targets** | `/targets` | Set goals with value/unit/colour; animated progress bars; **year navigation (past/future)** |
| **Courses** | `/courses` | Track courses — status, provider, URL, notes, progress; search & filter; full edit |
| **Career** | `/career` | Upload resume (PDF/DOCX/TXT); AI streaming analysis; skill extraction |

### AI & Relax

| Page | Route | Description |
|---|---|---|
| **AI Assistant** | `/ai` | Chat with a local LLM; reads **and writes** planner data (add tasks, log hours, update goals); suggest vs auto-add mode |
| **Relax** | `/relax` | Mood-based music recommendations via Ollama |

---

## Key Capabilities

- **Project ↔ Task linking** — Tasks and work sessions can be linked to a project; project cards show task completion progress
- **Kanban board** — Drag tasks between Todo / In Progress / Done columns
- **Pomodoro auto-logging** — Each completed 25-min focus session is automatically added to Work Hours
- **Habit streaks** — Daily check-in with consecutive-day fire-streak tracking
- **Weekly AI Review** — One-click AI-generated week summary on the Dashboard (falls back to plain stats if Ollama offline)
- **Overdue notifications** — System tray desktop notifications for overdue and due-today tasks (checked hourly)
- **Data export** — Export all data as a single JSON file from the Dashboard
- **Collapsible sidebar** — Saves state in localStorage; publishes width as CSS variable
- **Loading states** — Every page shows a spinner while data loads, no blank flashes

---

## Requirements

| Requirement | Version | Notes |
|---|---|---|
| Windows | 10 / 11 | 64-bit |
| Python | 3.11 or later | [python.org](https://www.python.org/downloads/) |
| Node.js | 18 or later | Only needed to rebuild the frontend — [nodejs.org](https://nodejs.org) |
| Ollama | Latest | Optional — needed for AI features. [ollama.com](https://ollama.com) |

---

## Setup

### Step 1 — Install Python

1. Download Python 3.11+ from [python.org/downloads](https://www.python.org/downloads/)
2. Run the installer — **check "Add Python to PATH"** before clicking Install
3. Verify:

```powershell
python --version
```

### Step 2 — Install Python packages

Double-click **`install.bat`**, or in a terminal inside the `PersonalPlanner` folder:

```powershell
pip install -r requirements.txt
```

### Step 3 — (Optional) Install Ollama for AI features

1. Download and install from [ollama.com](https://ollama.com)
2. Pull a model:

```powershell
ollama pull llama3.2
```

Ollama installs as a Windows service and starts automatically at login.

**Recommended models:**

| Model | Size | Best for |
|---|---|---|
| `llama3.2` | ~2 GB | Speed + quality — **recommended** |
| `mistral` | ~4 GB | Planning and structured analysis |
| `phi4` | ~9 GB | Complex reasoning |

### Step 4 — Run the app

Double-click **`run.bat`**.

The app launches FastAPI on port 7432 and opens the planner window. A tray icon appears in the system tray — closing the window hides it to tray; right-click → Quit to exit fully.

| File | What it does |
|---|---|
| `run.bat` | Starts silently (no console window) |
| `run_debug.bat` | Starts with a console — useful for troubleshooting |

### Step 5 — First launch

Open the **Profile** page and enter your name, role, company, and experience. This personalises the Home greeting and AI suggestions.

### Step 6 — (Optional) Start on Windows login

1. Press `Win + R`, type `shell:startup`, press Enter
2. Copy a shortcut to `run.bat` into that folder

---

## Project Structure

```
PersonalPlanner/
├── main.py              # Entry point — starts FastAPI + PyWebView + pystray
├── api.py               # FastAPI REST API (all endpoints)
├── database.py          # SQLite database layer
├── requirements.txt     # Python dependencies
├── install.bat          # Install dependencies
├── run.bat              # Launch (no console)
├── run_debug.bat        # Launch (with console)
└── frontend/            # React + Vite source
    ├── src/
    │   ├── App.jsx              # Router + layout
    │   ├── index.css            # Global glassmorphism styles
    │   ├── api/client.js        # All API calls
    │   ├── components/
    │   │   ├── Sidebar.jsx      # Collapsible navigation sidebar
    │   │   ├── AuroraBackground.jsx
    │   │   └── Modal.jsx
    │   └── pages/
    │       ├── Home.jsx         # Landing / greeting
    │       ├── Profile.jsx      # User profile
    │       ├── Dashboard.jsx    # Stats, charts, weekly review
    │       ├── Planner.jsx      # Today's unified planner view
    │       ├── Tasks.jsx        # Task list + Kanban board
    │       ├── WorkHours.jsx    # Work session logger + chart
    │       ├── Pomodoro.jsx     # Focus timer (auto-logs sessions)
    │       ├── Habits.jsx       # Daily habit tracker + streaks
    │       ├── Notes.jsx        # Daily / project notes journal
    │       ├── Projects.jsx     # Project cards + task counts
    │       ├── Targets.jsx      # Year targets with year navigation
    │       ├── Courses.jsx      # Course tracker
    │       ├── Career.jsx       # Resume upload + AI analysis
    │       ├── AI.jsx           # AI chat assistant
    │       └── Relax.jsx        # Mood-based music suggestions
    └── dist/            # Built frontend (served by FastAPI)
```

---

## Database

SQLite file at:
- **Dev**: `PersonalPlanner/planner.db`
- **Installed**: `%APPDATA%\PersonalPlanner\planner.db`

Tables: `tasks`, `projects`, `work_sessions`, `targets`, `courses`, `habits`, `habit_logs`, `notes`, `user_profile`, `user_skills`, `resumes`, `chat_history`

A JSON backup is automatically created on each startup.

---

## Rebuilding the Frontend

`frontend/dist/` is pre-built and ready to use. To modify the React source:

```powershell
cd frontend
npm install
npm run build
```

Node.js 18+ required.

---

## Privacy & Data Storage

- No account, login, or internet connection required
- No telemetry or analytics
- The AI (Ollama) runs entirely on your machine — resume text and chat messages never leave your computer
- The API listens on `127.0.0.1` only (not accessible from the network)
- **Export**: Dashboard → Export Data → downloads a complete JSON backup

To fully reset, delete `planner.db` and restart.

---

## AI Assistant

The AI connects directly to Ollama on `http://localhost:11434`. It can both **read and write** your planner data.

### Example prompts

```
"Add task: Finish the Q2 report by Friday, high priority"
"Log 90 minutes of deep work on the backend project"
"What tasks are overdue?"
"Suggest 5 next tasks based on my projects"
"Create a 6-month career roadmap"
"How many hours did I log this week?"
```

### Suggest vs Add mode

- Prompts with **"suggest" / "recommend"** → AI proposes ideas and asks for confirmation before writing
- Direct commands → AI calls the appropriate tool immediately

### Context toggle

Enable **"Send my planner data as context"** in the chat input to give the AI access to your tasks, goals, work hours, and profile for personalised answers.

---

## Career Tab — Resume Analysis

1. Click **Choose PDF / DOCX / TXT** to upload your resume
2. Skills are automatically extracted and saved to your Profile
3. Select an analysis type: **Skill Gap Analysis**, **Role Suggestions**, **Course Recommendations**, **ATS Feedback**, **Career Roadmap**
4. Select your Ollama model and click **Analyse Resume**
5. The response streams in real time


---

## Python Dependencies

| Package | Purpose |
|---|---|
| `fastapi` | REST API framework |
| `uvicorn` | ASGI server for FastAPI |
| `pywebview` | Native desktop window (WebView2 on Windows) |
| `python-multipart` | File upload support |
| `Pillow` | Tray icon rendering |
| `pystray` | Windows system tray |
| `requests` | Ollama API streaming |
| `pdfminer.six` | PDF text extraction |
| `python-docx` | DOCX text extraction |

---

## Troubleshooting

**App window doesn't open**
- Run `run_debug.bat` to see error output
- Ensure Python 3.11+ is on PATH: `python --version`
- Re-run `install.bat`

**White/blank window**
- The FastAPI server may not have started in time -- wait a moment and refresh
- Check `planner.log` for errors

**Tray icon doesn't appear**
- Check Task Manager for `pythonw.exe` or `python.exe`
- Kill the process and re-run `run.bat`

**AI features unavailable**
- Ensure Ollama is running: open `http://localhost:11434` in a browser
- Start it manually: `ollama serve`
- Pull the model: `ollama pull llama3.2`

**Skills not appearing after resume upload**
- Only PDF, DOCX, and TXT files are supported
- Scanned image PDFs are not supported (text-layer PDFs only)

**Port 7432 already in use**
- Another instance may be running -- check Task Manager and kill it
- Or change `PORT = 7432` in `main.py` and `api.py`

**Database issues**
- The database is at `PersonalPlanner/planner.db`
- Delete it to start fresh (all data will be lost)