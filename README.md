# Personal Planner & Progress Tracker

A fully local, offline-first Windows desktop app built with Python. Runs silently in the system tray and opens on demand. Manage tasks, track work hours, run personal projects, set year targets, log courses, analyse your resume — all powered by a local AI assistant via Ollama.

> **🔒 100% Private** — All your data stays on this machine. Nothing is ever sent online. The AI assistant runs locally via Ollama.

---

## Features

| Tab | Description |
|---|---|
| **Profile** | Set your name, role, company, experience; avatar hero card; skills auto-extracted from your resume |
| **Dashboard** | Personalised greeting, AI-generated motivational quote, stat cards, task pie chart, 7-day hours chart, year targets |
| **Tasks** | Add/edit/delete tasks; live search; priority, category, due date; one-click status cycling; overdue highlighting |
| **Work Hours** | Live stopwatch with pause/resume; manual session logging; 7-day bar chart; session history |
| **Projects** | Project cards with progress bars, colour labels, dates; slider progress update |
| **Year Targets** | Set goals with custom values and units (e.g. “Read 24 books”); horizontal progress chart |
| **Courses** | Track every course — status, provider, URL, rating, progress bar; status/category charts |
| **Career** | Upload resume (PDF/DOCX/TXT); AI-powered analysis; skill gap detection; auto-imports courses and tasks |
| **AI Assistant** | Chat with a local LLM that can read and write your planner data using tool-calling |

---

## Requirements

| Requirement | Version | Notes |
|---|---|---|
| Windows | 10 / 11 | 64-bit |
| Python | 3.11 or later | [python.org](https://www.python.org/downloads/) |
| Ollama | Latest | Optional — needed for AI features. [ollama.com](https://ollama.com) |

---

## Setup

### Step 1 — Install Python

1. Download Python 3.11+ from [python.org/downloads](https://www.python.org/downloads/)
2. Run the installer — **check “Add Python to PATH”** before clicking Install
3. Verify in a terminal:

```powershell
python --version
```

Expected output: `Python 3.11.x` or higher.

### Step 2 — Download the app

Place the `PersonalPlanner` folder anywhere on your machine. The folder structure should look like this:

```
PersonalPlanner/
├── main.py
├── database.py
├── requirements.txt
├── install.bat
├── run.bat
├── run_debug.bat
└── ui/
    ├── profile_tab.py
    ├── dashboard_tab.py
    ├── tasks_tab.py
    ├── work_hours_tab.py
    ├── projects_tab.py
    ├── targets_tab.py
    ├── courses_tab.py
    ├── career_tab.py
    └── ai_tab.py
```

### Step 3 — Install Python packages

Double-click **`install.bat`**, or open a terminal in the folder and run:

```powershell
pip install -r requirements.txt
```

This installs all required packages automatically.

### Step 4 — (Optional) Install Ollama for AI features

Ollama runs a local LLM on your machine. Without it the app works fully — only AI features are unavailable.

1. Download and install Ollama from [ollama.com](https://ollama.com)
2. Open a terminal and pull a model:

```powershell
ollama pull llama3.2
```

Ollama installs as a Windows service and starts automatically at login. The app detects it on `http://localhost:11434` with no configuration needed.

**Recommended models:**

| Model | Download size | Best for |
|---|---|---|
| `llama3.2` | ~2 GB | Speed + quality — **recommended default** |
| `mistral` | ~4 GB | Planning and structured analysis |
| `phi4` | ~9 GB | Complex reasoning |

### Step 5 — Run the app

Double-click **`run.bat`**.

The app starts silently in the background. Look for the calendar icon in the **Windows system tray** (bottom-right corner of the taskbar). Double-click it to open the planner window.

| File | What it does |
|---|---|
| `run.bat` | Starts silently in the background (no console window) |
| `run_debug.bat` | Starts with a console window visible — useful for troubleshooting |

### Step 6 — First launch

On first launch, a **Welcome setup dialog** appears asking for your name, date of birth, company, role, and years of experience. This populates the Profile tab and personalises the Dashboard greeting and AI suggestions.

You can skip this and fill it in later from the **Profile** tab.

### Step 7 — (Optional) Start on Windows login

1. Press `Win + R`, type `shell:startup`, press Enter
2. Copy a shortcut to `run.bat` into that folder

The app will now start automatically every time Windows starts.

---

## Privacy & Data Storage

All data is stored locally in a single SQLite database file:

```
PersonalPlanner/planner.db
```

- No account, login, or internet connection required
- No telemetry or analytics of any kind
- The AI assistant (Ollama) runs entirely on your machine—your resume text and chat messages never leave your computer
- The privacy badge in the sidebar is a permanent reminder of this

To fully reset the app, delete `planner.db` and restart.

---

## Profile Tab

Fill in your details once and the whole app personalises around you:

- **Hero card** — shows your initials avatar, full name, role, company, and experience. Updates live as you type.
- **Skills panel** — populated automatically when you upload a resume in the Career tab. No manual entry needed.
  - If Ollama is running, the model extracts skills intelligently
  - If offline, a built-in keyword scanner covers 150+ common tech skills across 6 categories

---

## Dashboard

- **Personalised greeting** — “Good morning, Jane! 👋” based on your name and time of day
- **Daily motivational quote** — fetched from Ollama on first visit, cached for the session. Falls back to a classic quote if Ollama is offline.
- **Stat cards** with coloured accents — Total Tasks, In Progress, Hours This Week, Active Projects
- **Task status pie chart** and **7-day work hours bar chart**
- **Year targets overview** with progress bars

---

## AI Assistant — Tool Calling

The AI can read and write your planner directly. Examples:

```
“Add task: Finish the Q2 report by Friday, high priority”
“I started the AWS Solutions Architect course on Udemy today”
“Log 90 minutes of deep work”
“Create a book reading tracker with title, author, and rating columns”
“What tasks are overdue?”
“Suggest 5 next tasks based on my projects and add them”
“Create a 6-month career roadmap and add the milestones as tasks”
```

### Available AI tools

| Tool | What it does |
|---|---|
| `add_task` | Create a new task with priority, due date, category |
| `update_task_status` | Mark a task Todo / In Progress / Done |
| `add_course` | Add a course to the learning tracker |
| `update_course_progress` | Set completion percentage on a course |
| `add_project` | Create a new project |
| `update_target` | Update progress on a year target |
| `log_work_hours` | Log a work session |
| `query_data` | Run a SELECT query on any planner table |
| `create_custom_table` | Dynamically create a brand-new tracker table |
| `insert_custom_row` | Add a row to any custom tracker |
| `query_custom` | Read rows from a custom tracker |

### Custom trackers

Tell the AI to create any tracker you need:

```
“Create a habit tracker with habit name, target days per week, and completed days”
“Create an expense tracker with date, amount, category, and description”
“Create a recipe ideas list with name, cuisine, and difficulty”
```

Created trackers appear in the AI sidebar for quick access.

---

## Career Tab — Resume Analysis

1. Click **Browse File** to upload your resume (PDF, DOCX, TXT, or Markdown)
2. Skills are **automatically extracted** and saved to your Profile tab
3. Choose an analysis type:
   - **Full Analysis** — strengths, skill gaps, roles, courses, ATS feedback, roadmap
   - **Skill Gaps** — gaps vs. current market demand with resources to close them
   - **Course Recommendations** — 8 specific courses with platform names
   - **Job Roles** — 10 matching roles + 5 stretch roles with gap analysis
   - **ATS Feedback** — numbered formatting and keyword improvements
   - **Career Roadmap** — 12-month plan broken into quarters
4. All analysis is tailored to your **Profile** (role, experience, company)
5. Click **Analyse** — response streams in real time
6. Use **“Save courses to tracker”** or **“Add upskill tasks”** to import suggestions directly

---

## Python Dependencies

| Package | Purpose |
|---|---|
| `customtkinter` | Modern dark-themed UI widgets |
| `matplotlib` | Charts and graphs |
| `Pillow` | Tray icon rendering |
| `pystray` | Windows system tray integration |
| `requests` | Ollama API communication |
| `pdfminer.six` | PDF text extraction for resume upload |
| `python-docx` | DOCX text extraction for resume upload |

All installed automatically by `install.bat`.

---

## Troubleshooting

**App doesn’t start**
- Run `run_debug.bat` to see error output in the console
- Make sure Python 3.11+ is installed and on PATH: `python --version`
- Re-run `install.bat` to ensure all packages are installed

**Tray icon doesn’t appear**
- Check Task Manager — the process is `pythonw.exe`
- Kill it and re-run `run.bat`

**AI features unavailable / “Ollama not running”**
- Open a terminal and run: `ollama serve`
- Or reinstall Ollama — it should auto-start as a Windows service
- Verify it’s running: open `http://localhost:11434` in a browser

**Daily quote doesn’t load**
- The quote requires Ollama with `llama3.2`. If offline, a fallback quote is shown automatically.

**Skills not appearing in Profile tab**
- Upload a resume in the Career tab first
- If Ollama is offline, the keyword scanner runs as a fallback
- Check that `pdfminer.six` is installed for PDF files: `pip install pdfminer.six`

**PDF resume shows garbled text**
- Text-based PDFs work best; scanned image PDFs are not supported
- Install `pdfminer.six`: `pip install pdfminer.six`

**Model responses are slow**
- Try a smaller model: `ollama pull llama3.2`
- Close other heavy applications to free RAM

**Database / data issues**
- The database is at `PersonalPlanner/planner.db`
- Delete it to start completely fresh (all data will be lost)
