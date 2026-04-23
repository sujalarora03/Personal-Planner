"""
Career Tab — upload your resume (PDF / TXT / DOCX), send it to the local
Ollama model, and receive:
  • Skill gap analysis
  • Role suggestions
  • Course recommendations
  • ATS / formatting feedback
  • Career roadmap
"""
import customtkinter as ctk
import threading
import json
import os
import queue
from datetime import datetime
import tkinter.filedialog as fd
from ui.utils import confirm_delete

try:
    import requests
    _REQUESTS = True
except ImportError:
    _REQUESTS = False

try:
    import pdfminer.high_level as pdfminer
    _PDF = True
except ImportError:
    _PDF = False

try:
    import docx as _docx_mod
    _DOCX = True
except ImportError:
    _DOCX = False

CARD_BG  = "#1f2937"  # kept for legacy — imported from theme
AXES_BG  = "#111827"
from ui.theme import CARD_BG, FIG_BG, AXES_BG  # noqa: F811

# ── Keyword-based skill extraction (offline fallback) ─────────────────────────
# Keys are display names; matching is case-insensitive against resume text.
SKILL_KEYWORDS: dict[str, list[str]] = {
    "Programming Languages": [
        "Python", "Java", "JavaScript", "TypeScript", "C++", "C#", "Ruby",
        "Go", "Rust", "Swift", "Kotlin", "Scala", "MATLAB", "PHP", "Perl",
        "Bash", "Shell", "PowerShell", "SQL", "HTML", "CSS", "Sass", "Dart",
        "Lua", "Haskell", "Elixir", "R",
    ],
    "Frameworks & Libraries": [
        "React", "Angular", "Vue.js", "Django", "Flask", "FastAPI", "Spring",
        "Express", "Node.js", "Next.js", "Nuxt", "Laravel", "Rails", "ASP.NET",
        ".NET", "TensorFlow", "PyTorch", "scikit-learn", "Pandas", "NumPy",
        "Keras", "OpenCV", "Bootstrap", "Tailwind", "jQuery", "D3.js",
        "GraphQL", "Hibernate", "Pytest", "Jest", "Selenium", "Playwright",
    ],
    "Databases": [
        "MySQL", "PostgreSQL", "SQLite", "Oracle", "SQL Server", "MongoDB",
        "Redis", "Cassandra", "DynamoDB", "Elasticsearch", "Neo4j", "Firebase",
        "Supabase", "MariaDB", "CouchDB", "InfluxDB",
    ],
    "Cloud & DevOps": [
        "AWS", "Azure", "GCP", "Google Cloud", "Docker", "Kubernetes",
        "Jenkins", "GitLab", "GitHub Actions", "Terraform", "Ansible",
        "Helm", "Prometheus", "Grafana", "Nginx", "Apache", "Linux",
        "Unix", "Heroku", "Vercel", "Netlify", "CircleCI", "ArgoCD",
        "Pulumi", "Vault", "Consul",
    ],
    "Tools & Platforms": [
        "Git", "Jira", "Confluence", "Agile", "Scrum", "Kanban",
        "CI/CD", "REST API", "Microservices", "Kafka", "RabbitMQ",
        "Celery", "Postman", "Swagger", "OpenAPI", "Figma", "Notion",
    ],
    "Data & AI": [
        "Machine Learning", "Deep Learning", "NLP", "Computer Vision",
        "Data Science", "Data Engineering", "ETL", "Spark", "Hadoop",
        "Tableau", "Power BI", "Looker", "dbt", "Airflow", "MLOps",
        "LangChain", "Hugging Face", "Generative AI", "RAG",
        "Statistics", "Data Visualization",
    ],
}

ANALYSIS_PROMPTS = {
    "Full Analysis":
        "Perform a thorough analysis of this resume. Cover: (1) key strengths, "
        "(2) skill gaps for today's market, (3) 5 suitable job roles, "
        "(4) 5 specific online courses to upskill, (5) ATS/formatting feedback, "
        "(6) a 6-month career improvement roadmap. Be specific and actionable.",

    "Skill Gaps":
        "Identify the top skill gaps in this resume compared to current industry demand. "
        "For each gap, suggest a concrete resource (course, book, project) to close it.",

    "Course Recommendations":
        "Based solely on this resume, recommend 8 specific online courses (with platform names) "
        "that would most improve this person's career prospects. Include both technical and soft skills.",

    "Job Roles":
        "List 10 job roles this resume is a strong match for, and 5 stretch roles worth aspiring to. "
        "For each stretch role explain exactly what is missing.",

    "ATS Feedback":
        "Review this resume purely for ATS compatibility and formatting best practices. "
        "Give specific, numbered improvements.",

    "Career Roadmap":
        "Create a detailed 12-month career development roadmap for this person based on their resume. "
        "Break it into quarters with concrete milestones.",
}


class CareerTab:
    def __init__(self, parent, db):
        self.db   = db
        self.frame = ctk.CTkFrame(parent, fg_color="#111827", corner_radius=0)
        self.frame.grid_columnconfigure(0, weight=1)
        self.frame.grid_rowconfigure(1, weight=1)

        self._active_resume_id: int | None = None
        self._chunk_q: queue.Queue         = queue.Queue()
        self._streaming                    = False

        self._build_ui()

    # ── Layout ─────────────────────────────────────────────────────────────

    def _build_ui(self):
        # Header
        hdr = ctk.CTkFrame(self.frame, fg_color="transparent")
        hdr.grid(row=0, column=0, padx=24, pady=(18, 6), sticky="ew")
        hdr.grid_columnconfigure(1, weight=1)
        ctk.CTkLabel(hdr, text="Career Assistant",
                     font=("Segoe UI", 22, "bold"), text_color="white").grid(row=0, column=0, sticky="w")

        ctrl = ctk.CTkFrame(hdr, fg_color="transparent")
        ctrl.grid(row=0, column=1, sticky="e")
        ctk.CTkLabel(ctrl, text="Model:", font=("Segoe UI", 11),
                     text_color="#6b7280").pack(side="left", padx=(0, 4))
        self.model_combo = ctk.CTkComboBox(ctrl, values=["llama3.2"], width=175)
        self.model_combo.set("llama3.2")
        self.model_combo.pack(side="left", padx=(0, 8))
        ctk.CTkButton(ctrl, text="⟳ Models", width=80, height=28,
                      fg_color="#374151", hover_color="#4b5563",
                      command=self._fetch_models).pack(side="left")

        # Body
        body = ctk.CTkFrame(self.frame, fg_color="transparent")
        body.grid(row=1, column=0, sticky="nsew", padx=12, pady=4)
        body.grid_columnconfigure(0, weight=1)
        body.grid_columnconfigure(1, weight=2)
        body.grid_rowconfigure(0, weight=1)

        self._build_left(body)
        self._build_right(body)

    # ── Left: resume list + upload ─────────────────────────────────────────

    def _build_left(self, parent):
        left = ctk.CTkFrame(parent, fg_color="transparent")
        left.grid(row=0, column=0, sticky="nsew", padx=(0, 6))
        left.grid_columnconfigure(0, weight=1)
        left.grid_rowconfigure(1, weight=1)

        # Upload card
        up = ctk.CTkFrame(left, fg_color=CARD_BG, corner_radius=12)
        up.grid(row=0, column=0, sticky="ew", pady=(0, 8))
        up.grid_columnconfigure(0, weight=1)

        ctk.CTkLabel(up, text="📄  Upload Resume",
                     font=("Segoe UI", 13, "bold"), text_color="white").grid(
            row=0, column=0, sticky="w", padx=14, pady=(12, 6)
        )
        ctk.CTkLabel(up,
                     text="Supports PDF · TXT · DOCX · MD\n(text is extracted and stored locally)",
                     font=("Segoe UI", 10), text_color="#6b7280", justify="left").grid(
            row=1, column=0, sticky="w", padx=14
        )
        ctk.CTkButton(up, text="📂  Browse File", height=36,
                      fg_color="#1a73e8", hover_color="#1557b0",
                      font=("Segoe UI", 12, "bold"),
                      command=self._browse_file).grid(
            row=2, column=0, padx=14, pady=10, sticky="ew"
        )
        self.upload_lbl = ctk.CTkLabel(up, text="", font=("Segoe UI", 10),
                                       text_color="#34d399")
        self.upload_lbl.grid(row=3, column=0, padx=14, pady=(0, 10))

        # Resume list
        list_card = ctk.CTkFrame(left, fg_color=CARD_BG, corner_radius=12)
        list_card.grid(row=1, column=0, sticky="nsew")
        list_card.grid_columnconfigure(0, weight=1)
        list_card.grid_rowconfigure(1, weight=1)

        ctk.CTkLabel(list_card, text="🗂  Saved Resumes",
                     font=("Segoe UI", 13, "bold"), text_color="white").grid(
            row=0, column=0, sticky="w", padx=14, pady=(12, 6)
        )
        self.resume_scroll = ctk.CTkScrollableFrame(list_card, fg_color="transparent",
                                                    corner_radius=0)
        self.resume_scroll.grid(row=1, column=0, sticky="nsew", padx=8, pady=(0, 10))
        self.resume_scroll.grid_columnconfigure(0, weight=1)

    # ── Right: analysis pane ───────────────────────────────────────────────

    def _build_right(self, parent):
        right = ctk.CTkFrame(parent, fg_color="transparent")
        right.grid(row=0, column=1, sticky="nsew", padx=(6, 0))
        right.grid_columnconfigure(0, weight=1)
        right.grid_rowconfigure(1, weight=1)

        # Analysis controls
        ctrl_card = ctk.CTkFrame(right, fg_color=CARD_BG, corner_radius=12)
        ctrl_card.grid(row=0, column=0, sticky="ew", pady=(0, 8))
        ctrl_card.grid_columnconfigure(0, weight=1)

        inner = ctk.CTkFrame(ctrl_card, fg_color="transparent")
        inner.pack(fill="x", padx=14, pady=12)
        inner.grid_columnconfigure(0, weight=1)

        ctk.CTkLabel(inner, text="Analysis Type",
                     font=("Segoe UI", 11), text_color="#9ca3af").grid(row=0, column=0, sticky="w")

        combo_row = ctk.CTkFrame(inner, fg_color="transparent")
        combo_row.grid(row=1, column=0, sticky="ew", pady=(4, 0))
        combo_row.grid_columnconfigure(0, weight=1)

        self.analysis_combo = ctk.CTkComboBox(combo_row,
                                              values=list(ANALYSIS_PROMPTS.keys()),
                                              width=260)
        self.analysis_combo.set("Full Analysis")
        self.analysis_combo.grid(row=0, column=0, sticky="ew", padx=(0, 8))

        self.analyse_btn = ctk.CTkButton(combo_row, text="🔍  Analyse", width=110, height=36,
                                         fg_color="#1a73e8", hover_color="#1557b0",
                                         font=("Segoe UI", 12, "bold"),
                                         command=self._run_analysis)
        self.analyse_btn.grid(row=0, column=1)

        ctk.CTkLabel(inner, text="Custom question about your resume:",
                     font=("Segoe UI", 11), text_color="#9ca3af").grid(
            row=2, column=0, sticky="w", pady=(10, 2)
        )
        cq_row = ctk.CTkFrame(inner, fg_color="transparent")
        cq_row.grid(row=3, column=0, sticky="ew")
        cq_row.grid_columnconfigure(0, weight=1)

        self.custom_q = ctk.CTkEntry(cq_row,
                                     placeholder_text="e.g. Am I ready for a senior role?")
        self.custom_q.grid(row=0, column=0, sticky="ew", padx=(0, 8))
        self.custom_q.bind("<Return>", lambda e: self._run_custom_q())
        ctk.CTkButton(cq_row, text="Ask", width=60, height=34,
                      fg_color="#374151", hover_color="#4b5563",
                      command=self._run_custom_q).grid(row=0, column=1)

        # Output textbox
        out_card = ctk.CTkFrame(right, fg_color=CARD_BG, corner_radius=12)
        out_card.grid(row=1, column=0, sticky="nsew")
        out_card.grid_columnconfigure(0, weight=1)
        out_card.grid_rowconfigure(1, weight=1)

        hdr_row = ctk.CTkFrame(out_card, fg_color="transparent")
        hdr_row.grid(row=0, column=0, sticky="ew", padx=14, pady=(12, 4))
        hdr_row.grid_columnconfigure(0, weight=1)
        self.out_title = ctk.CTkLabel(hdr_row, text="Analysis Output",
                                      font=("Segoe UI", 13, "bold"), text_color="white")
        self.out_title.grid(row=0, column=0, sticky="w")

        ctk.CTkButton(hdr_row, text="🗑 Clear", width=64, height=26,
                      fg_color="transparent", hover_color="#374151",
                      text_color="#4b5563", font=("Segoe UI", 10),
                      command=self._clear_output).grid(row=0, column=1, sticky="e")

        self.out_box = ctk.CTkTextbox(out_card, fg_color=AXES_BG, corner_radius=8,
                                      font=("Segoe UI", 12), state="disabled", wrap="word")
        self.out_box.grid(row=1, column=0, sticky="nsew", padx=10, pady=(0, 10))

        # Suggestion pill buttons (course / task import)
        self.pill_frame = ctk.CTkFrame(out_card, fg_color="transparent")
        self.pill_frame.grid(row=2, column=0, sticky="ew", padx=10, pady=(0, 10))

    # ── Refresh ────────────────────────────────────────────────────────────

    def refresh(self):
        self._fetch_models()
        self._refresh_resume_list()

    def _refresh_resume_list(self):
        for w in self.resume_scroll.winfo_children():
            w.destroy()

        resumes = self.db.get_resumes()
        if not resumes:
            ctk.CTkLabel(self.resume_scroll, text="No resumes uploaded yet.",
                         font=("Segoe UI", 11), text_color="#374151").pack(pady=20)
            return

        for r in resumes:
            is_active = (r["id"] == self._active_resume_id)
            card = ctk.CTkFrame(self.resume_scroll,
                                fg_color="#1a73e8" if is_active else "#374151",
                                corner_radius=8)
            card.pack(fill="x", pady=3)
            card.grid_columnconfigure(0, weight=1)

            ctk.CTkLabel(card, text=r["filename"],
                         font=("Segoe UI", 11, "bold"),
                         text_color="white" if is_active else "#d1d5db",
                         anchor="w").grid(row=0, column=0, sticky="w", padx=10, pady=(8, 2))

            ctk.CTkLabel(card,
                         text=f"Uploaded: {r['uploaded_at'][:16]}",
                         font=("Segoe UI", 9), text_color="#9ca3af").grid(
                row=1, column=0, sticky="w", padx=10, pady=(0, 2)
            )

            actions = ctk.CTkFrame(card, fg_color="transparent")
            actions.grid(row=2, column=0, sticky="w", padx=8, pady=(0, 8))

            ctk.CTkButton(actions, text="✓ Select" if not is_active else "● Active",
                          width=80, height=26, corner_radius=6,
                          fg_color="#16a34a" if not is_active else "#0d7a3a",
                          hover_color="#15803d", font=("Segoe UI", 10),
                          command=lambda rid=r["id"]: self._select_resume(rid)).pack(side="left", padx=3)

            ctk.CTkButton(actions, text="🗑", width=32, height=26, corner_radius=6,
                          fg_color="#7f1d1d", hover_color="#991b1b",
                          command=lambda rid=r["id"]: self._delete_resume(rid)).pack(side="left", padx=3)

    # ── Actions ────────────────────────────────────────────────────────────

    def _select_resume(self, resume_id):
        self._active_resume_id = resume_id
        self._refresh_resume_list()

    def _delete_resume(self, resume_id):
        name = ""
        for r in self.db.get_resumes():
            if r["id"] == resume_id:
                name = r["filename"]
                break
        confirm_delete(
            self.frame, name or "this resume",
            lambda: self._do_delete_resume(resume_id)
        )

    def _do_delete_resume(self, resume_id):
        self.db.delete_resume(resume_id)
        if self._active_resume_id == resume_id:
            self._active_resume_id = None
        self._refresh_resume_list()

    def _browse_file(self):
        path = fd.askopenfilename(
            title="Select Resume",
            filetypes=[("Resume files", "*.pdf *.txt *.docx *.md"),
                       ("All files", "*.*")]
        )
        if not path:
            return
        filename = os.path.basename(path)
        content  = self._extract_text(path)
        if not content:
            self.upload_lbl.configure(text="⚠ Could not extract text.", text_color="#ef4444")
            return
        rid = self.db.save_resume(filename, content)
        self._active_resume_id = rid
        self._refresh_resume_list()

        # Immediate keyword-based extraction (no AI needed, runs fast)
        quick_skills = self._extract_via_keywords(content)
        if quick_skills:
            self.db.save_skills(quick_skills, source="resume")
            total = sum(len(v) for v in quick_skills.values())
            self.upload_lbl.configure(
                text=f"✓ {filename} — {total} skills detected",
                text_color="#34d399"
            )
        else:
            self.upload_lbl.configure(text=f"✓ Uploaded: {filename}", text_color="#34d399")

        # Then try AI extraction in background for richer results
        threading.Thread(
            target=self._extract_and_save_skills,
            args=(content,),
            daemon=True
        ).start()

    def _extract_text(self, path: str) -> str:
        ext = os.path.splitext(path)[1].lower()
        try:
            if ext == ".pdf":
                if _PDF:
                    import io
                    from pdfminer.high_level import extract_text
                    return extract_text(path)
                else:
                    return self._pdf_fallback(path)
            elif ext == ".docx":
                if _DOCX:
                    import docx
                    doc = docx.Document(path)
                    return "\n".join(p.text for p in doc.paragraphs)
                else:
                    return "[Install python-docx to parse DOCX files]"
            else:
                with open(path, "r", encoding="utf-8", errors="ignore") as f:
                    return f.read()
        except Exception as e:
            return f"Error reading file: {e}"

    def _pdf_fallback(self, path: str) -> str:
        """Very basic PDF byte-string extraction when pdfminer is unavailable."""
        try:
            with open(path, "rb") as f:
                raw = f.read().decode("latin-1", errors="ignore")
            import re
            strings = re.findall(r'\(([^)]{3,})\)', raw)
            return " ".join(strings)[:15000]
        except Exception:
            return "[Could not extract PDF — install pdfminer.six for full support]"

    # ── Skill extraction ───────────────────────────────────────────────────

    def _extract_and_save_skills(self, content: str):
        """Try AI extraction first; fall back to keyword matching. Only saves if skills found."""
        skills = self._extract_via_ai(content)
        if not skills:
            # AI either failed or returned empty — keyword skills already saved, don't overwrite
            return
        self.db.save_skills(skills, source="resume")

    def _extract_via_ai(self, content: str) -> dict | None:
        """Ask Ollama to return a JSON skill map. Returns None on any failure."""
        if not _REQUESTS:
            return None
        try:
            prompt = (
                "Extract all skills from the resume below into a JSON object. "
                "Use exactly these keys: "
                "\"Programming Languages\", \"Frameworks & Libraries\", "
                "\"Databases\", \"Cloud & DevOps\", \"Tools & Platforms\", \"Data & AI\". "
                "Each key maps to an array of skill strings. "
                "Return ONLY valid JSON — no explanation, no markdown fences.\n\n"
                f"Resume (first 6 000 chars):\n{content[:6000]}"
            )
            resp = requests.post(
                "http://localhost:11434/api/chat",
                json={
                    "model": self.model_combo.get(),
                    "messages": [
                        {"role": "system",
                         "content": "You are a resume parser. Output only valid JSON."},
                        {"role": "user", "content": prompt},
                    ],
                    "stream": False,
                },
                timeout=30,
            )
            if resp.status_code != 200:
                return None
            raw = resp.json().get("message", {}).get("content", "")
            import re as _re
            m = _re.search(r'\{.*\}', raw, _re.DOTALL)
            if not m:
                return None
            import json as _json
            parsed = _json.loads(m.group())
            # Validate it's a dict of lists with at least one non-empty list
            if isinstance(parsed, dict):
                filtered = {k: v for k, v in parsed.items() if isinstance(v, list) and v}
                if filtered:
                    return filtered
        except Exception:
            pass
        return None

    def _extract_via_keywords(self, content: str) -> dict:
        """Case-insensitive keyword scan against SKILL_KEYWORDS."""
        import re as _re
        text_lower = content.lower()
        result = {}
        for category, keywords in SKILL_KEYWORDS.items():
            found = []
            for kw in keywords:
                kw_lower = kw.lower()
                # Word-boundary match for short names (≤ 3 chars) to avoid false positives
                if len(kw_lower) <= 3:
                    if _re.search(r'\b' + _re.escape(kw_lower) + r'\b', text_lower):
                        found.append(kw)
                else:
                    if kw_lower in text_lower:
                        found.append(kw)
            if found:
                result[category] = found
        return result

    # ── Models ─────────────────────────────────────────────────────────────

    def _fetch_models(self):
        if not _REQUESTS:
            return
        threading.Thread(target=self._do_fetch_models, daemon=True).start()

    def _do_fetch_models(self):
        try:
            r = requests.get("http://localhost:11434/api/tags", timeout=3)
            if r.status_code == 200:
                models = [m["name"] for m in r.json().get("models", [])]
                self.frame.after(0, lambda m=models: self.model_combo.configure(values=m))
        except Exception:
            pass

    # ── Analysis ───────────────────────────────────────────────────────────

    def _run_analysis(self):
        if self._streaming:
            return
        if not self._active_resume_id:
            self._write_output("⚠  Please select (or upload) a resume first.")
            return
        prompt = ANALYSIS_PROMPTS[self.analysis_combo.get()]
        self.out_title.configure(text=f"Analysis: {self.analysis_combo.get()}")
        self._stream(prompt)

    def _run_custom_q(self):
        if self._streaming:
            return
        q = self.custom_q.get().strip()
        if not q:
            return
        if not self._active_resume_id:
            self._write_output("⚠  Please select a resume first.")
            return
        self.out_title.configure(text=f"Q: {q[:60]}")
        self._stream(q)

    def _stream(self, user_prompt: str):
        content = self.db.get_resume_content(self._active_resume_id)
        if not content:
            self._write_output("⚠  Could not load resume content.")
            return

        truncated = content[:12000]

        # Build profile context block
        profile = self.db.get_profile()
        profile_block = ""
        if profile and profile.get("name"):
            lines = [f"Name: {profile['name']}"]
            if profile.get("role"):
                lines.append(f"Current Role: {profile['role']}")
            if profile.get("company"):
                lines.append(f"Company: {profile['company']}")
            if profile.get("experience_years"):
                lines.append(f"Years of Experience: {profile['experience_years']}")
            if profile.get("birthdate"):
                try:
                    from datetime import date, datetime
                    bd  = datetime.strptime(profile["birthdate"], "%Y-%m-%d").date()
                    age = date.today().year - bd.year - (
                        (date.today().month, date.today().day) < (bd.month, bd.day)
                    )
                    lines.append(f"Age: {age}")
                except Exception:
                    pass
            profile_block = "User Profile:\n" + "\n".join(lines) + "\n\n"

        # Include known skills
        skills = self.db.get_skills()
        skills_block = ""
        if skills:
            cats: dict = {}
            for s in skills:
                cats.setdefault(s["category"], []).append(s["skill"])
            skill_lines = [
                f"  {cat}: {', '.join(lst)}" for cat, lst in cats.items()
            ]
            skills_block = "Known Skills (from resume scan):\n" + "\n".join(skill_lines) + "\n\n"

        full_prompt = (
            f"{profile_block}"
            f"{skills_block}"
            f"Resume:\n\n---\n{truncated}\n---\n\n"
            f"Task: {user_prompt}"
        )
        system_msg = (
            "You are an expert career coach and resume analyst. "
            "Tailor all advice to the user's current role, experience level, and known skills. "
            "Be specific, practical, and relevant to where they are in their career right now."
        )
        messages = [
            {"role": "system", "content": system_msg},
            {"role": "user",   "content": full_prompt},
        ]
        model = self.model_combo.get()

        self._clear_output()
        self._streaming = True
        self.analyse_btn.configure(state="disabled", text="Analysing…")

        threading.Thread(target=self._do_stream, args=(model, messages), daemon=True).start()
        self._poll_output()

    def _do_stream(self, model, messages):
        if not _REQUESTS:
            self._chunk_q.put(("error", "requests not installed"))
            return
        try:
            resp = requests.post(
                "http://localhost:11434/api/chat",
                json={"model": model, "messages": messages, "stream": True},
                stream=True, timeout=180,
            )
            resp.raise_for_status()
            full = []
            for line in resp.iter_lines():
                if line:
                    try:
                        data  = json.loads(line)
                        chunk = data.get("message", {}).get("content", "")
                        if chunk:
                            full.append(chunk)
                            self._chunk_q.put(("chunk", chunk))
                        if data.get("done"):
                            break
                    except json.JSONDecodeError:
                        pass
            complete = "".join(full)
            self.db.update_resume_analysis(self._active_resume_id, complete)
            self._chunk_q.put(("done", complete))
        except requests.exceptions.HTTPError as exc:
            status = getattr(getattr(exc, "response", None), "status_code", None)
            if status == 404:
                self._chunk_q.put(("error",
                    f"Model '{model}' not found on Ollama.\n"
                    f"Run in terminal:  ollama pull {model}"))
            else:
                self._chunk_q.put(("error", f"HTTP {status} error from Ollama."))
        except requests.exceptions.ConnectionError:
            self._chunk_q.put(("error", "Ollama is not running. Start it with: ollama serve"))
        except requests.exceptions.Timeout:
            self._chunk_q.put(("error", "Request timed out — model may still be loading."))
        except Exception as exc:
            self._chunk_q.put(("error", f"Unexpected error: {exc}"))

    def _poll_output(self):
        try:
            while True:
                event, data = self._chunk_q.get_nowait()
                if event == "chunk":
                    self._append_output(data)
                elif event in ("done", "error"):
                    if event == "error":
                        self._append_output(f"\n\n⚠ {data}")
                    self._streaming = False
                    self.analyse_btn.configure(state="normal", text="🔍  Analyse")
                    self._show_import_pills()
                    return
        except Exception:
            pass
        if self._streaming:
            self.frame.after(40, self._poll_output)

    # ── Output helpers ─────────────────────────────────────────────────────

    def _write_output(self, text: str):
        self.out_box.configure(state="normal")
        self.out_box.delete("1.0", "end")
        self.out_box.insert("end", text)
        self.out_box.configure(state="disabled")

    def _append_output(self, text: str):
        self.out_box.configure(state="normal")
        self.out_box.insert("end", text)
        self.out_box.configure(state="disabled")
        self.out_box.see("end")

    def _clear_output(self):
        self.out_box.configure(state="normal")
        self.out_box.delete("1.0", "end")
        self.out_box.configure(state="disabled")
        for w in self.pill_frame.winfo_children():
            w.destroy()

    def _show_import_pills(self):
        for w in self.pill_frame.winfo_children():
            w.destroy()
        ctk.CTkLabel(self.pill_frame, text="Quick actions:",
                     font=("Segoe UI", 10), text_color="#6b7280").pack(side="left", padx=(0, 6))
        ctk.CTkButton(self.pill_frame,
                      text="📚 Save courses to tracker",
                      width=180, height=28, corner_radius=6,
                      fg_color="#374151", hover_color="#4b5563",
                      font=("Segoe UI", 10),
                      command=self._import_courses_from_analysis).pack(side="left", padx=3)
        ctk.CTkButton(self.pill_frame,
                      text="✅ Add upskill tasks",
                      width=150, height=28, corner_radius=6,
                      fg_color="#374151", hover_color="#4b5563",
                      font=("Segoe UI", 10),
                      command=self._import_tasks_from_analysis).pack(side="left", padx=3)

    def _import_courses_from_analysis(self):
        """Parse the output box for course-like lines and add them to the courses table."""
        text = self.out_box._textbox.get("1.0", "end")
        import re
        # Match numbered / bulleted lines that look like course names
        lines = re.findall(r'(?:^|\n)[•\-\*\d]+[.)]\s*(.+)', text)
        added = 0
        for line in lines[:10]:
            line = line.strip()
            if len(line) > 8 and len(line) < 200:
                self.db.add_course(title=line, category="Career", status="Planned")
                added += 1
        for w in self.pill_frame.winfo_children():
            w.destroy()
        msg = f"✓ Added {added} courses to tracker." if added else "No course lines detected."
        ctk.CTkLabel(self.pill_frame, text=msg, font=("Segoe UI", 10),
                     text_color="#34d399" if added else "#6b7280").pack(side="left")

    def _import_tasks_from_analysis(self):
        text = self.out_box._textbox.get("1.0", "end")
        import re
        lines = re.findall(r'(?:^|\n)[•\-\*\d]+[.)]\s*(.+)', text)
        added = 0
        for line in lines[:8]:
            line = line.strip()
            if len(line) > 8 and len(line) < 200:
                self.db.add_task(title=line, category="Career",
                                 priority="Medium", description="From resume analysis")
                added += 1
        for w in self.pill_frame.winfo_children():
            w.destroy()
        msg = f"✓ Added {added} tasks." if added else "No actionable lines detected."
        ctk.CTkLabel(self.pill_frame, text=msg, font=("Segoe UI", 10),
                     text_color="#34d399" if added else "#6b7280").pack(side="left")
