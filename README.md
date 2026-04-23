# Personal Planner & Progress Tracker

A fully local, offline-first Windows desktop app. Manage tasks, track work hours, run personal projects, set year targets, log courses, analyse your resume -- all powered by a local AI assistant via Ollama.

> **100% Private -- v0.5 BETA** -- All your data stays on this machine. Nothing is ever sent online. The AI assistant runs locally via Ollama.

---

## Architecture

```
main.py  ->  FastAPI (port 7432)  <->  React + Vite frontend
                   |
              database.py (SQLite)
```

| Layer | Technology | Purpose |
|---|---|---|
| **Desktop shell** | PyWebView 6 | Native window wrapping the React app |
| **Backend** | FastAPI + Uvicorn | REST API on `http://127.0.0.1:7432` |
| **Frontend** | React 18 + Vite 8 | Glassmorphism UI with Framer Motion animations |
| **Styling** | Tailwind CSS v4 + custom CSS | Dark theme, aurora background, neon glow |
| **Database** | SQLite via `database.py` | Local, file-based, zero configuration |
| **AI** | Ollama (local LLM) | Streaming chat + resume analysis |
| **Tray** | pystray | System tray icon -- close hides to tray |

---

## Features

| Page | Description |
|---|---|
| **Home** | Personalised greeting, motivational quote, stat cards, quick-action buttons |
| **Profile** | Name, role, company, experience; skills auto-extracted from uploaded resume |
| **Dashboard** | 6 stat cards, 7-day and monthly work hours bar charts |
| **Tasks** | Add/edit/archive/delete tasks; priority, category, due date; status cycling; search & filter |
| **Work Hours** | Log sessions with duration, category, description; 7-day bar chart; session history |
| **Projects** | Project cards with progress bars and colour labels; slider to update progress |
| **Year Targets** | Set goals with custom values and units; animated progress bars; inline update |
| **Courses** | Track courses -- status, provider, URL, progress; status filter tabs |
| **Career** | Upload resume (PDF/DOCX/TXT); AI-powered streaming analysis; skill gap detection |
| **AI Assistant** | Chat with a local LLM that can read and write your planner data |

---

## Requirements

| Requirement | Version | Notes |
|---|---|---|
| Windows | 10 / 11 | 64-bit |
| Python | 3.11 or later | [python.org](https://www.python.org/downloads/) |
| Node.js | 18 or later | Only needed to rebuild the frontend -- [nodejs.org](https://nodejs.org) |
| Ollama | Latest | Optional -- needed for AI features. [ollama.com](https://ollama.com) |

---

## Setup

### Step 1 -- Install Python

1. Download Python 3.11+ from [python.org/downloads](https://www.python.org/downloads/)
2. Run the installer -- **check "Add Python to PATH"** before clicking Install
3. Verify:

```powershell
python --version
```

### Step 2 -- Install Python packages

Double-click **`install.bat`**, or in a terminal inside the `PersonalPlanner` folder:

```powershell
pip install -r requirements.txt
```

### Step 3 -- (Optional) Install Ollama for AI features

1. Download and install from [ollama.com](https://ollama.com)
2. Pull a model:

```powershell
ollama pull llama3.2
```

Ollama installs as a Windows service and starts automatically at login.

**Recommended models:**

| Model | Size | Best for |
|---|---|---|
| `llama3.2` | ~2 GB | Speed + quality -- **recommended** |
| `mistral` | ~4 GB | Planning and structured analysis |
| `phi4` | ~9 GB | Complex reasoning |

### Step 4 -- Run the app

Double-click **`run.bat`**.

The app launches FastAPI on port 7432 and opens the planner window. A tray icon appears in the bottom-right corner -- closing the window hides it to tray; right-click to quit fully.

| File | What it does |
|---|---|
| `run.bat` | Starts silently (no console window) |
| `run_debug.bat` | Starts with a console -- useful for troubleshooting |

### Step 5 -- First launch

Open the **Profile** page and enter your name, role, company, and experience. This personalises the Home greeting and AI suggestions.

### Step 6 -- (Optional) Start on Windows login

1. Press `Win + R`, type `shell:startup`, press Enter
2. Copy a shortcut to `run.bat` into that folder

---

## Project Structure

```
PersonalPlanner/
+-- main.py              # Entry point -- starts FastAPI + PyWebView + pystray
+-- api.py               # FastAPI REST API (all endpoints)
+-- database.py          # SQLite database layer
+-- requirements.txt     # Python dependencies
+-- install.bat          # Install dependencies
+-- run.bat              # Launch (no console)
+-- run_debug.bat        # Launch (with console)
+-- frontend/            # React + Vite source
|   +-- src/
|   |   +-- App.jsx              # Router + layout
|   |   +-- index.css            # Global glassmorphism styles
|   |   +-- api/client.js        # All API calls
|   |   +-- components/
|   |   |   +-- Sidebar.jsx
|   |   |   +-- AuroraBackground.jsx
|   |   |   +-- Modal.jsx
|   |   +-- pages/
|   |       +-- Home.jsx, Profile.jsx, Dashboard.jsx, Tasks.jsx
|   |       +-- WorkHours.jsx, Projects.jsx, Targets.jsx
|   |       +-- Courses.jsx, Career.jsx, AI.jsx
|   +-- dist/            # Built frontend (served by FastAPI)
+-- ui/                  # Legacy CustomTkinter UI (kept for reference)
```

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

```
PersonalPlanner/planner.db   <- SQLite database
PersonalPlanner/planner.log  <- Warning-level logs only
```

- No account, login, or internet connection required
- No telemetry or analytics
- The AI (Ollama) runs entirely on your machine -- resume text and chat messages never leave your computer
- The API listens on `127.0.0.1` only (not accessible from the network)

To fully reset, delete `planner.db` and restart.

---

## AI Assistant

The AI connects directly to Ollama on `http://localhost:11434`. Examples:

```
"Add task: Finish the Q2 report by Friday, high priority"
"Log 90 minutes of deep work"
"What tasks are overdue?"
"Suggest 5 next tasks based on my projects and add them"
"Create a 6-month career roadmap"
```

Quick-action buttons in the AI sidebar handle common queries in one click.

---

## Career Tab -- Resume Analysis

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