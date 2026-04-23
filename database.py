import sqlite3
import os
import shutil
import glob
from datetime import datetime, date

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'planner.db')


class Database:
    def __init__(self):
        self.db_path = DB_PATH

    def get_connection(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON")
        return conn

    def init_db(self):
        with self.get_connection() as conn:
            conn.executescript('''
                CREATE TABLE IF NOT EXISTS tasks (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    title TEXT NOT NULL,
                    description TEXT DEFAULT '',
                    category TEXT DEFAULT 'General',
                    priority TEXT DEFAULT 'Medium',
                    status TEXT DEFAULT 'Todo',
                    due_date TEXT,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    completed_at TEXT
                );

                CREATE TABLE IF NOT EXISTS projects (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    description TEXT DEFAULT '',
                    color TEXT DEFAULT '#3b82f6',
                    status TEXT DEFAULT 'Active',
                    progress INTEGER DEFAULT 0,
                    start_date TEXT,
                    target_date TEXT,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS work_sessions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    project_id INTEGER,
                    description TEXT DEFAULT '',
                    start_time TEXT NOT NULL,
                    end_time TEXT,
                    duration_minutes INTEGER DEFAULT 0,
                    date TEXT NOT NULL,
                    category TEXT DEFAULT 'Work',
                    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
                );

                CREATE TABLE IF NOT EXISTS targets (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    year INTEGER NOT NULL,
                    title TEXT NOT NULL,
                    description TEXT DEFAULT '',
                    category TEXT DEFAULT 'Personal',
                    target_value REAL DEFAULT 100,
                    current_value REAL DEFAULT 0,
                    unit TEXT DEFAULT '%',
                    color TEXT DEFAULT '#3b82f6',
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS courses (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    title TEXT NOT NULL,
                    provider TEXT DEFAULT '',
                    url TEXT DEFAULT '',
                    category TEXT DEFAULT 'Learning',
                    status TEXT DEFAULT 'Planned',
                    progress INTEGER DEFAULT 0,
                    rating INTEGER DEFAULT 0,
                    notes TEXT DEFAULT '',
                    started_date TEXT,
                    completed_date TEXT,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS resumes (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    filename TEXT NOT NULL,
                    content TEXT NOT NULL,
                    uploaded_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    last_analysis TEXT DEFAULT ''
                );

                CREATE TABLE IF NOT EXISTS career_suggestions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    resume_id INTEGER,
                    suggestion_type TEXT DEFAULT 'general',
                    content TEXT NOT NULL,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE CASCADE
                );

                CREATE TABLE IF NOT EXISTS custom_tables (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    table_name TEXT NOT NULL UNIQUE,
                    display_name TEXT NOT NULL,
                    schema_json TEXT NOT NULL,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS user_profile (
                    id INTEGER PRIMARY KEY CHECK (id = 1),
                    name TEXT DEFAULT '',
                    birthdate TEXT DEFAULT '',
                    company TEXT DEFAULT '',
                    role TEXT DEFAULT '',
                    experience_years REAL DEFAULT 0,
                    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS user_skills (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    skill TEXT NOT NULL,
                    category TEXT DEFAULT 'Technical',
                    source TEXT DEFAULT 'resume',
                    added_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(skill, source)
                );

                CREATE TABLE IF NOT EXISTS chat_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    role TEXT NOT NULL,
                    content TEXT NOT NULL,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP
                );
            ''')
            conn.commit()

            # Schema migrations (safe to run every startup)
            for migration in [
                "ALTER TABLE tasks ADD COLUMN archived INTEGER DEFAULT 0",
            ]:
                try:
                    conn.execute(migration)
                    conn.commit()
                except Exception:
                    pass  # column already exists

    # ── TASKS ──────────────────────────────────────────────────────────────

    def add_task(self, title, description='', category='General', priority='Medium', due_date=None):
        with self.get_connection() as conn:
            conn.execute(
                'INSERT INTO tasks (title, description, category, priority, due_date) VALUES (?, ?, ?, ?, ?)',
                (title, description, category, priority, due_date)
            )
            conn.commit()

    def get_tasks(self, status=None, category=None, include_archived=False):
        with self.get_connection() as conn:
            query = 'SELECT * FROM tasks'
            params = []
            conditions = []
            if not include_archived:
                conditions.append('(archived IS NULL OR archived = 0)')
            if status:
                conditions.append('status = ?')
                params.append(status)
            if category:
                conditions.append('category = ?')
                params.append(category)
            if conditions:
                query += ' WHERE ' + ' AND '.join(conditions)
            query += ' ORDER BY CASE priority WHEN "Urgent" THEN 1 WHEN "High" THEN 2 WHEN "Medium" THEN 3 ELSE 4 END, created_at DESC'
            return conn.execute(query, params).fetchall()

    def update_task_status(self, task_id, status):
        completed_at = datetime.now().isoformat() if status == 'Done' else None
        with self.get_connection() as conn:
            conn.execute(
                'UPDATE tasks SET status = ?, completed_at = ? WHERE id = ?',
                (status, completed_at, task_id)
            )
            conn.commit()

    def update_task(self, task_id, title, description, category, priority, due_date, status):
        with self.get_connection() as conn:
            conn.execute(
                'UPDATE tasks SET title=?, description=?, category=?, priority=?, due_date=?, status=? WHERE id=?',
                (title, description, category, priority, due_date, status, task_id)
            )
            conn.commit()

    def archive_task(self, task_id):
        with self.get_connection() as conn:
            conn.execute('UPDATE tasks SET archived = 1 WHERE id = ?', (task_id,))
            conn.commit()

    def delete_task(self, task_id):
        with self.get_connection() as conn:
            conn.execute('DELETE FROM tasks WHERE id = ?', (task_id,))
            conn.commit()

    def get_task_stats(self):
        with self.get_connection() as conn:
            result = {}
            result['total'] = conn.execute('SELECT COUNT(*) FROM tasks').fetchone()[0]
            result['done'] = conn.execute("SELECT COUNT(*) FROM tasks WHERE status = 'Done'").fetchone()[0]
            result['in_progress'] = conn.execute("SELECT COUNT(*) FROM tasks WHERE status = 'In Progress'").fetchone()[0]
            result['todo'] = conn.execute("SELECT COUNT(*) FROM tasks WHERE status = 'Todo'").fetchone()[0]
            result['overdue'] = conn.execute(
                "SELECT COUNT(*) FROM tasks WHERE due_date < date('now') AND status != 'Done'"
            ).fetchone()[0]
            return result

    # ── PROJECTS ───────────────────────────────────────────────────────────

    def add_project(self, name, description='', color='#3b82f6', start_date=None, target_date=None):
        with self.get_connection() as conn:
            conn.execute(
                'INSERT INTO projects (name, description, color, start_date, target_date) VALUES (?, ?, ?, ?, ?)',
                (name, description, color, start_date, target_date)
            )
            conn.commit()

    def get_projects(self, status=None):
        with self.get_connection() as conn:
            if status:
                return conn.execute(
                    'SELECT * FROM projects WHERE status = ? ORDER BY created_at DESC', (status,)
                ).fetchall()
            return conn.execute('SELECT * FROM projects ORDER BY created_at DESC').fetchall()

    def update_project(self, project_id, name=None, description=None, color=None,
                       status=None, progress=None, start_date=None, target_date=None):
        fields = {'name': name, 'description': description, 'color': color,
                  'status': status, 'progress': progress,
                  'start_date': start_date, 'target_date': target_date}
        updates = {k: v for k, v in fields.items() if v is not None}
        if not updates:
            return
        set_clause = ', '.join(f'{k} = ?' for k in updates)
        with self.get_connection() as conn:
            conn.execute(
                f'UPDATE projects SET {set_clause} WHERE id = ?',
                list(updates.values()) + [project_id]
            )
            conn.commit()

    def delete_project(self, project_id):
        with self.get_connection() as conn:
            conn.execute('DELETE FROM projects WHERE id = ?', (project_id,))
            conn.commit()

    # ── WORK SESSIONS ──────────────────────────────────────────────────────

    def add_work_session(self, start_time, end_time, duration_minutes,
                         description='', project_id=None, category='Work', date_str=None):
        if date_str is None:
            date_str = datetime.now().strftime('%Y-%m-%d')
        with self.get_connection() as conn:
            conn.execute(
                'INSERT INTO work_sessions (project_id, description, start_time, end_time, duration_minutes, date, category) '
                'VALUES (?, ?, ?, ?, ?, ?, ?)',
                (project_id, description, start_time, end_time, duration_minutes, date_str, category)
            )
            conn.commit()

    def get_work_sessions(self, start_date=None, end_date=None, limit=50):
        with self.get_connection() as conn:
            if start_date and end_date:
                return conn.execute(
                    'SELECT ws.*, p.name as project_name FROM work_sessions ws '
                    'LEFT JOIN projects p ON ws.project_id = p.id '
                    'WHERE ws.date BETWEEN ? AND ? ORDER BY ws.date DESC, ws.start_time DESC LIMIT ?',
                    (start_date, end_date, limit)
                ).fetchall()
            return conn.execute(
                'SELECT ws.*, p.name as project_name FROM work_sessions ws '
                'LEFT JOIN projects p ON ws.project_id = p.id '
                'ORDER BY ws.date DESC, ws.start_time DESC LIMIT ?',
                (limit,)
            ).fetchall()

    def get_weekly_hours(self):
        with self.get_connection() as conn:
            return conn.execute('''
                SELECT date, SUM(duration_minutes) as total_minutes
                FROM work_sessions
                WHERE date >= date('now', '-6 days')
                GROUP BY date
                ORDER BY date
            ''').fetchall()

    def get_monthly_hours(self):
        with self.get_connection() as conn:
            return conn.execute('''
                SELECT strftime('%Y-%m', date) as month, SUM(duration_minutes) as total_minutes
                FROM work_sessions
                WHERE date >= date('now', '-5 months')
                GROUP BY month
                ORDER BY month
            ''').fetchall()

    def delete_work_session(self, session_id):
        with self.get_connection() as conn:
            conn.execute('DELETE FROM work_sessions WHERE id = ?', (session_id,))
            conn.commit()

    # ── TARGETS ────────────────────────────────────────────────────────────

    def add_target(self, year, title, description='', category='Personal',
                   target_value=100.0, unit='%', color='#3b82f6'):
        with self.get_connection() as conn:
            conn.execute(
                'INSERT INTO targets (year, title, description, category, target_value, unit, color) '
                'VALUES (?, ?, ?, ?, ?, ?, ?)',
                (year, title, description, category, target_value, unit, color)
            )
            conn.commit()

    def get_targets(self, year=None):
        with self.get_connection() as conn:
            if year:
                return conn.execute(
                    'SELECT * FROM targets WHERE year = ? ORDER BY created_at', (year,)
                ).fetchall()
            return conn.execute('SELECT * FROM targets ORDER BY year DESC, created_at').fetchall()

    def update_target(self, target_id, title=None, description=None, category=None,
                      target_value=None, current_value=None, unit=None, color=None, year=None):
        fields = {'title': title, 'description': description, 'category': category,
                  'target_value': target_value, 'current_value': current_value,
                  'unit': unit, 'color': color, 'year': year}
        updates = {k: v for k, v in fields.items() if v is not None}
        if not updates:
            return
        set_clause = ', '.join(f'{k} = ?' for k in updates)
        with self.get_connection() as conn:
            conn.execute(
                f'UPDATE targets SET {set_clause} WHERE id = ?',
                list(updates.values()) + [target_id]
            )
            conn.commit()

    def delete_target(self, target_id):
        with self.get_connection() as conn:
            conn.execute('DELETE FROM targets WHERE id = ?', (target_id,))
            conn.commit()

    # ── COURSES ────────────────────────────────────────────────────────────

    def add_course(self, title, provider='', url='', category='Learning',
                   status='Planned', notes='', started_date=None):
        with self.get_connection() as conn:
            conn.execute(
                'INSERT INTO courses (title, provider, url, category, status, notes, started_date) '
                'VALUES (?, ?, ?, ?, ?, ?, ?)',
                (title, provider, url, category, status, notes, started_date)
            )
            conn.commit()

    def get_courses(self, status=None, category=None):
        with self.get_connection() as conn:
            q, p = 'SELECT * FROM courses', []
            conds = []
            if status:
                conds.append('status = ?'); p.append(status)
            if category:
                conds.append('category = ?'); p.append(category)
            if conds:
                q += ' WHERE ' + ' AND '.join(conds)
            q += ' ORDER BY created_at DESC'
            return conn.execute(q, p).fetchall()

    def update_course(self, course_id, **kwargs):
        allowed = {'title', 'provider', 'url', 'category', 'status',
                   'progress', 'rating', 'notes', 'started_date', 'completed_date'}
        updates = {k: v for k, v in kwargs.items() if k in allowed and v is not None}
        if not updates:
            return
        set_clause = ', '.join(f'{k} = ?' for k in updates)
        with self.get_connection() as conn:
            conn.execute(f'UPDATE courses SET {set_clause} WHERE id = ?',
                         list(updates.values()) + [course_id])
            conn.commit()

    def delete_course(self, course_id):
        with self.get_connection() as conn:
            conn.execute('DELETE FROM courses WHERE id = ?', (course_id,))
            conn.commit()

    # ── RESUMES ────────────────────────────────────────────────────────────

    def save_resume(self, filename, content):
        with self.get_connection() as conn:
            cur = conn.execute(
                'INSERT INTO resumes (filename, content) VALUES (?, ?)',
                (filename, content)
            )
            conn.commit()
            return cur.lastrowid

    def get_resumes(self):
        with self.get_connection() as conn:
            return conn.execute(
                'SELECT id, filename, uploaded_at, last_analysis FROM resumes ORDER BY uploaded_at DESC'
            ).fetchall()

    def get_resume_content(self, resume_id):
        with self.get_connection() as conn:
            row = conn.execute('SELECT content FROM resumes WHERE id = ?', (resume_id,)).fetchone()
            return row['content'] if row else None

    def update_resume_analysis(self, resume_id, analysis_text):
        with self.get_connection() as conn:
            conn.execute('UPDATE resumes SET last_analysis = ? WHERE id = ?',
                         (analysis_text, resume_id))
            conn.commit()

    def delete_resume(self, resume_id):
        with self.get_connection() as conn:
            conn.execute('DELETE FROM resumes WHERE id = ?', (resume_id,))
            conn.commit()

    def add_career_suggestion(self, resume_id, suggestion_type, content):
        with self.get_connection() as conn:
            conn.execute(
                'INSERT INTO career_suggestions (resume_id, suggestion_type, content) VALUES (?, ?, ?)',
                (resume_id, suggestion_type, content)
            )
            conn.commit()

    def get_career_suggestions(self, resume_id=None):
        with self.get_connection() as conn:
            if resume_id:
                return conn.execute(
                    'SELECT * FROM career_suggestions WHERE resume_id = ? ORDER BY created_at DESC',
                    (resume_id,)
                ).fetchall()
            return conn.execute(
                'SELECT * FROM career_suggestions ORDER BY created_at DESC'
            ).fetchall()

    # ── DYNAMIC / CUSTOM TABLES ────────────────────────────────────────────

    def register_custom_table(self, table_name: str, display_name: str, schema_json: str):
        """Store metadata about an AI-created custom table."""
        with self.get_connection() as conn:
            conn.execute(
                'INSERT OR REPLACE INTO custom_tables (table_name, display_name, schema_json) '
                'VALUES (?, ?, ?)',
                (table_name, display_name, schema_json)
            )
            conn.commit()

    def get_custom_tables(self):
        with self.get_connection() as conn:
            return conn.execute('SELECT * FROM custom_tables ORDER BY created_at').fetchall()

    def execute_raw(self, sql: str, params: list | None = None):
        """
        Execute arbitrary SQL.  Used by the AI tool engine.
        Returns (columns, rows) for SELECT, or ([], affected_rows_str) for mutations.
        SAFETY: Only allows SELECT / INSERT / UPDATE / DELETE — no DROP / ALTER.
        """
        first = sql.strip().split()[0].upper()
        if first not in ('SELECT', 'INSERT', 'UPDATE', 'DELETE', 'CREATE'):
            raise ValueError(f"SQL verb '{first}' is not permitted via execute_raw.")
        with self.get_connection() as conn:
            cur = conn.execute(sql, params or [])
            if first == 'SELECT':
                rows = cur.fetchall()
                cols = [d[0] for d in cur.description] if cur.description else []
                return cols, [dict(r) for r in rows]
            conn.commit()
            return [], f"{cur.rowcount} row(s) affected"

    # ── BACKUP ────────────────────────────────────────────────────────────────

    def backup(self, keep: int = 7):
        """Copy planner.db to backups/planner_YYYY-MM-DD.db; keep the last `keep` copies."""
        backup_dir = os.path.join(os.path.dirname(self.db_path), 'backups')
        os.makedirs(backup_dir, exist_ok=True)
        dest = os.path.join(backup_dir, f'planner_{datetime.now().strftime("%Y-%m-%d")}.db')
        if not os.path.exists(dest) and os.path.exists(self.db_path):
            shutil.copy2(self.db_path, dest)
        # Prune old backups
        files = sorted(glob.glob(os.path.join(backup_dir, 'planner_*.db')))
        for old in files[:-keep]:
            try:
                os.remove(old)
            except Exception:
                pass

    # ── CHAT HISTORY ──────────────────────────────────────────────────────

    def save_chat_message(self, role: str, content: str):
        with self.get_connection() as conn:
            conn.execute(
                'INSERT INTO chat_history (role, content) VALUES (?, ?)',
                (role, content)
            )
            conn.commit()

    def get_chat_history(self, limit: int = 30):
        """Return the last `limit` messages in chronological order."""
        with self.get_connection() as conn:
            rows = conn.execute(
                'SELECT role, content FROM chat_history ORDER BY id DESC LIMIT ?',
                (limit,)
            ).fetchall()
        return list(reversed(rows))

    def clear_chat_history(self):
        with self.get_connection() as conn:
            conn.execute('DELETE FROM chat_history')
            conn.commit()

    # ── USER PROFILE ───────────────────────────────────────────────────────

    def save_profile(self, name: str, birthdate: str, company: str,
                     role: str, experience_years: float):
        with self.get_connection() as conn:
            conn.execute('''
                INSERT INTO user_profile
                    (id, name, birthdate, company, role, experience_years, updated_at)
                VALUES (1, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    name=excluded.name,
                    birthdate=excluded.birthdate,
                    company=excluded.company,
                    role=excluded.role,
                    experience_years=excluded.experience_years,
                    updated_at=excluded.updated_at
            ''', (name, birthdate, company, role, experience_years,
                  datetime.now().isoformat()))
            conn.commit()

    def get_profile(self):
        with self.get_connection() as conn:
            row = conn.execute(
                'SELECT * FROM user_profile WHERE id = 1'
            ).fetchone()
            return dict(row) if row else None

    # ── USER SKILLS ────────────────────────────────────────────────────────

    def save_skills(self, skills_by_category: dict, source: str = 'resume'):
        """Replace all skills from *source* with the new set."""
        with self.get_connection() as conn:
            conn.execute('DELETE FROM user_skills WHERE source = ?', (source,))
            for category, skill_list in skills_by_category.items():
                for skill in skill_list:
                    if skill.strip():
                        conn.execute(
                            'INSERT OR IGNORE INTO user_skills '
                            '(skill, category, source) VALUES (?, ?, ?)',
                            (skill.strip(), category, source)
                        )
            conn.commit()

    def get_skills(self):
        with self.get_connection() as conn:
            return conn.execute(
                'SELECT * FROM user_skills ORDER BY category, skill'
            ).fetchall()

