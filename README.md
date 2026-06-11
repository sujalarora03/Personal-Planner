# 🗓️ Personal Planner & Progress Tracker

> **100% Private · v0.8.0 BETA** — All your data stays on your machine. No accounts. No telemetry. AI runs locally, fully offline.

A feature-rich Windows desktop app for managing your entire personal productivity stack — tasks, work hours, habits, projects, year targets, courses, career, focus sessions, and a local AI assistant — all wrapped in a premium glassmorphism UI.

---

## ✨ What's New in v0.8.0

- **Embedded local AI** — No more Ollama required. The app now ships with a bundled `llama-cpp-python` inference engine using **Qwen-2.5-3B-Instruct** (quantized GGUF), downloaded on first use directly inside the app
- **Premium glassmorphism UI** — Apple visionOS-style frosted glass cards, 4 animated floating orbs (indigo, violet, cyan, rose), cursor-parallax glow, scroll-reveal animations, and a subtle grid mesh overlay
- **Revamped Relax tab** — Direct music search (iTunes API) + YouTube audio streaming; tabbed navigation between moods, search, and ambient sounds
- **New 3D logo** — Custom-generated futuristic metallic calendar logo, used as the app icon and in the sidebar
- **Shimmer buttons** — Gradient sweep hover effect across all primary buttons
- **JetBrains Mono** for numbers/code, **Inter** for all UI text

---

## 🏗️ Architecture

```
main.py  →  FastAPI (port 7432)  ↔  React + Vite frontend
                   |                        |
              database.py              index.css
              (SQLite)            (Glassmorphism design system)
                   |
         llama-cpp-python (local LLM)
         Qwen-2.5-3B-Instruct.Q4_K_M.gguf
```

| Layer | Technology | Purpose |
|---|---|---|
| **Desktop shell** | PyWebView 6 | Native window wrapping the React SPA |
| **Backend** | FastAPI + Uvicorn | REST API on `http://127.0.0.1:7432` |
| **Frontend** | React 18 + Vite | Glassmorphism UI with scroll-reveal animations |
| **Styling** | Vanilla CSS | Dark theme, animated orbs, frosted glass cards |
| **Database** | SQLite via `database.py` | Local, file-based, zero configuration |
| **AI Engine** | llama-cpp-python | Embedded local inference — no Ollama needed |
| **AI Model** | Qwen-2.5-3B-Instruct (Q4_K_M) | ~2 GB GGUF, downloaded on first use |
| **Tray** | pystray | System tray icon — close hides to tray |

---

## 🚀 Install

### Option A — Installer (Recommended for most users)

1. Go to [**Releases**](https://github.com/sujalarora03/Personal-Planner/releases) and download `PersonalPlannerSetup_vX.X.X.exe`
2. Run it — Windows may show a SmartScreen prompt; click **More info → Run anyway**
3. The app installs to your user folder — **no admin rights required**
4. Launch from the Start Menu or Desktop shortcut
5. On first launch, open the **AI** tab → click **Download AI Model** to enable AI features (~2 GB download, one-time)

### Option B — From source (developers)

**Requirements:** Python 3.11+, Node.js 18+

```powershell
# 1. Clone
git clone https://github.com/sujalarora03/Personal-Planner.git
cd Personal-Planner

# 2. Install Python dependencies
pip install -r requirements.txt

# 3. Run
python main.py
```

> The frontend is pre-built in `frontend/dist/`. If you want to modify the React source, run `cd frontend && npm install && npm run build` first.

---

## 🔄 Updates

The app checks for updates automatically on startup. When a new version is available:
- A notification appears in **Settings**
- Click **Install Update** to download and apply it silently
- The app restarts into the new version

You can also trigger a manual check via **Settings → Check for Updates**.

---

## 📋 Features

### Core Pages

| Page | Description |
|---|---|
| **Home** | Personalised greeting, daily motivational AI quote, live stat cards, quick-action shortcuts |
| **Profile** | Name, role, company, experience level; skills auto-extracted from your uploaded resume |
| **Dashboard** | 6 stat cards, 7-day & monthly bar charts, **Weekly AI Review**, data export to JSON |
| **Today's Planner** | Unified day view — overdue tasks, due today, active work sessions, habit check-ins |

### Productivity

| Page | Description |
|---|---|
| **Tasks** | Add / edit / archive / delete; priority, category, project link, due date; search & filter; **List + Kanban board** with drag-and-drop |
| **Work Hours** | Log sessions (h + m split input), link to project, 7-day chart, session history |
| **Focus Timer** | Pomodoro (25m / 5m / 15m); **auto-logs each completed session** to Work Hours; project link |
| **Habits** | Daily check-in, fire-streak counter, icon + colour picker, today's completion rate |
| **Notes** | Card-based daily journal; filter by date or project; click-to-edit modal with auto-growing textarea |

### Planning & Growth

| Page | Description |
|---|---|
| **Projects** | Project cards with colour labels, progress slider, status badges; task count + mini progress bar |
| **Year Targets** | Set goals with value / unit / colour; animated progress bars; year navigation (past & future) |
| **Courses** | Track courses — status, provider, URL, notes, progress %; search & filter; full edit |
| **Career** | Upload resume (PDF / DOCX / TXT); AI streaming analysis; automatic skill extraction |

### AI & Relax

| Page | Description |
|---|---|
| **AI Assistant** | Chat with local LLM; reads **and writes** your planner data (add tasks, log hours, update goals); suggest vs auto-add mode; planner context toggle |
| **Relax** | **Search & stream any song** (iTunes + YouTube audio); mood-based recommendations; ambient sound player |

---

## 🤖 AI Features

The AI engine runs entirely on your machine via `llama-cpp-python`. No data is ever sent to the internet.

### First-Time Setup

1. Open the **AI** tab
2. Click **Download AI Model** — downloads `Qwen-2.5-3B-Instruct-Q4_K_M.gguf` (~2 GB) from Hugging Face
3. Once downloaded, the model loads automatically

### Example Prompts

```
"Add task: Finish the Q2 report by Friday, high priority"
"Log 90 minutes of deep work on the backend project"
"What tasks are overdue?"
"Suggest 5 next tasks based on my projects"
"Create a 6-month career roadmap"
"How many hours did I log this week?"
"Give me a weekly review"
```

### Suggest vs Auto-add Mode

- Prompts with **"suggest" / "recommend"** → AI proposes ideas and waits for confirmation before writing
- Direct commands → AI calls the appropriate tool immediately

### Context Toggle

Enable **"Send my planner data as context"** in the chat input to give the AI access to your tasks, goals, work hours, and profile for personalised answers.

---

## 🎵 Relax Tab

The Relax tab helps you unwind and maintain focus:

- **Search** — Type any song/artist in the search bar; results load from iTunes and stream audio via YouTube
- **Mood Playlists** — AI curates a playlist based on your selected mood (calm, focused, energetic, etc.)
- **Ambient Sounds** — Built-in ambient sound player (rain, lo-fi, white noise)

---

## 📁 Project Structure

```
Personal-Planner/
├── main.py                  # Entry point — FastAPI + PyWebView + pystray
├── api.py                   # FastAPI REST API (all endpoints + local LLM)
├── database.py              # SQLite database layer
├── updater.py               # Auto-update checker & installer
├── version.py               # App version (bumped on each release)
├── requirements.txt         # Python dependencies
├── PersonalPlanner.spec     # PyInstaller bundle config
├── installer.iss            # Inno Setup installer script
├── build_installer.bat      # Full build pipeline (PyInstaller → Inno Setup)
├── app_logo.png             # App logo (used as tray icon + sidebar)
└── frontend/                # React + Vite source
    ├── src/
    │   ├── App.jsx                  # Router + layout
    │   ├── index.css                # Global glassmorphism design system
    │   ├── api/client.js            # All API calls
    │   ├── components/
    │   │   ├── Sidebar.jsx          # Collapsible nav sidebar with logo
    │   │   ├── ScrollReveal.jsx     # IntersectionObserver scroll animations
    │   │   ├── AuroraBackground.jsx # Animated orb background
    │   │   └── Modal.jsx
    │   └── pages/
    │       ├── Home.jsx             # Landing / greeting + AI quote
    │       ├── Profile.jsx          # User profile
    │       ├── Dashboard.jsx        # Stats, charts, weekly AI review
    │       ├── Planner.jsx          # Today's unified planner
    │       ├── Tasks.jsx            # Task list + Kanban board
    │       ├── WorkHours.jsx        # Work session logger + chart
    │       ├── Pomodoro.jsx         # Focus timer (auto-logs sessions)
    │       ├── Habits.jsx           # Daily habit tracker + streaks
    │       ├── Notes.jsx            # Daily / project notes journal
    │       ├── Projects.jsx         # Project cards + task counts
    │       ├── Targets.jsx          # Year targets with year navigation
    │       ├── Courses.jsx          # Course tracker
    │       ├── Career.jsx           # Resume upload + AI analysis
    │       ├── AI.jsx               # AI chat assistant
    │       ├── Relax.jsx            # Music search + mood playlists
    │       ├── Settings.jsx         # App settings + update checker
    │       └── Updates.jsx          # Update download & install
    └── dist/                # Pre-built frontend (served by FastAPI)
```

---

## 🗃️ Database

SQLite file location:

| Mode | Path |
|---|---|
| Installed app | `%APPDATA%\PersonalPlanner\planner.db` |
| Dev / source run | `Personal-Planner/planner.db` |

**Tables:** `tasks`, `projects`, `work_sessions`, `targets`, `courses`, `habits`, `habit_logs`, `notes`, `user_profile`, `user_skills`, `resumes`, `chat_history`

A JSON backup is automatically created on each startup. Manual export available via **Dashboard → Export Data**.

---

## 🔒 Privacy & Data

- No account, login, or internet connection required to use the app
- No telemetry or analytics of any kind
- AI model runs entirely on your machine — chat messages, resume text, and planner data never leave your computer
- The API listens on `127.0.0.1` only (not accessible from the network)
- Internet is only used for: downloading the AI model (one-time, ~2 GB), checking for app updates (version number only), and streaming music in the Relax tab

---

## 🐍 Python Dependencies

| Package | Purpose |
|---|---|
| `fastapi` | REST API framework |
| `uvicorn` | ASGI server for FastAPI |
| `pywebview` | Native desktop window (WebView2 on Windows) |
| `python-multipart` | File upload support |
| `Pillow` | Tray icon rendering |
| `pystray` | Windows system tray |
| `requests` | HTTP client (update checks, API calls) |
| `pdfminer.six` | PDF text extraction |
| `python-docx` | DOCX text extraction |
| `yt-dlp` | YouTube audio URL resolution for Relax tab |
| `llama-cpp-python` | Embedded local LLM inference engine |

---

## 🔧 Troubleshooting

**App window doesn't open**
- Ensure Python 3.11+ is installed and on PATH: `python --version`
- Check `planner.log` in the app folder for errors

**White / blank window**
- The FastAPI server may not have started yet — wait a moment and the window will load
- Check that port 7432 is free: `netstat -an | findstr 7432`

**AI model not loading**
- Open the AI tab and click **Download AI Model** if not yet downloaded
- Ensure you have ~2 GB free disk space in `%APPDATA%\PersonalPlanner\models\`

**Music not playing in Relax**
- Requires an internet connection for streaming
- `yt-dlp` must be installed (`pip install yt-dlp`)

**Tray icon doesn't appear**
- Check Task Manager for `PersonalPlanner.exe` or `python.exe`
- Kill the process and relaunch

**Port 7432 already in use**
- Another instance may be running — the app will focus the existing window automatically
- If it doesn't, open Task Manager and end the `PersonalPlanner.exe` process

**Skills not appearing after resume upload**
- Only PDF, DOCX, and TXT files are supported
- Scanned image PDFs are not supported (text-layer PDFs only)

**Database issues / want a fresh start**
- Delete `%APPDATA%\PersonalPlanner\planner.db` and restart the app

---

## 🛠️ Building the Installer (Developers)

Requirements: Python 3.11+, Node.js 18+, [Inno Setup 6](https://jrsoftware.org/isinfo.php)

```powershell
# Full build: PyInstaller bundle → Inno Setup installer
build_installer.bat
```

The output installer will be at `Output/PersonalPlannerSetup_vX.X.X.exe`.

CI/CD automatically builds and publishes a new release on every `v*` tag push via GitHub Actions.

---

## 📄 License

MIT — see [LICENSE](LICENSE) for details.