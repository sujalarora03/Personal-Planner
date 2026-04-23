"""
AI Assistant tab — powered by Ollama (local LLM).

Features:
  * Full streaming chat with conversation memory
  * TOOL CALLING: the AI can read & write your planner data
    (add tasks, log courses, create custom tables, query anything)
  * Quick actions with live planner context
  * Dynamic table creation and management

Tool protocol: The AI emits JSON blocks wrapped in <tool_call>...</tool_call>.
The engine executes them and feeds results back automatically.
"""
import customtkinter as ctk
import threading
import json
import queue
import re
from datetime import date

try:
    import requests
    REQUESTS_AVAILABLE = True
except ImportError:
    REQUESTS_AVAILABLE = False

from ui.theme import CARD_BG, FIG_BG, AXES_BG
DEFAULT_URL = "http://localhost:11434"

TOOLS_SPEC = """
You have access to the following TOOLS. When you want to use one, emit EXACTLY
this pattern (no markdown fence, nothing else on the same line):

<tool_call>{"tool": "TOOL_NAME", "args": {...}}</tool_call>

After each tool call you will receive a <tool_result> block. You may call
multiple tools in sequence. Then give your final natural-language reply.

Available tools:

add_task(title, description?, category?, priority?, due_date?)
  priority: Low|Medium|High|Urgent. due_date: YYYY-MM-DD.

update_task_status(task_id, status)
  status: Todo|In Progress|Done

add_course(title, provider?, url?, category?, status?, notes?)
  status: Planned|In Progress|Completed|Dropped

update_course_progress(course_id, progress)
  progress: 0-100

add_project(name, description?, color?, start_date?, target_date?)

update_target(target_id, current_value)

log_work_hours(duration_minutes, description?, category?, date?)
  date: YYYY-MM-DD (default today)

query_data(sql)
  Run a read-only SELECT on the planner database.
  Tables: tasks, projects, work_sessions, targets, courses, resumes, custom_tables

create_custom_table(table_name, display_name, columns_json)
  columns_json: JSON array of {"name":str,"type":str,"default"?:str}
  Example: [{"name":"book_title","type":"TEXT"},{"name":"pages","type":"INTEGER","default":"0"}]

insert_custom_row(table_name, data_json)
  data_json: {"col": value, ...}

query_custom(table_name, limit?)
  SELECT * from a custom table (default limit 20).
"""

SYSTEM_PROMPT = """You are an intelligent personal productivity assistant embedded in a desktop planner app. You read and write the user's planner data using tools.

MANDATORY BEHAVIOUR — follow these rules without exception:
1. When the user asks to ADD, CREATE, or SUGGEST tasks/courses/projects → call the tool IMMEDIATELY. Do NOT list them as text first.
2. If the planner is empty or has no data → that is fine. Still use add_task / add_course to add items. Empty planner ≠ don't act.
3. NEVER output raw SQL in your reply text. SQL only goes inside <tool_call> blocks.
4. NEVER just describe what you WOULD do. DO it with a tool call, then confirm in plain English.
5. After every tool call you MUST wait for the <tool_result>, then continue.

EXACT EXAMPLE of correct multi-task addition:
<tool_call>{{"tool": "add_task", "args": {{"title": "Complete project proposal", "priority": "High"}}}}</tool_call>
<tool_call>{{"tool": "add_task", "args": {{"title": "Review team feedback", "priority": "Medium"}}}}</tool_call>
Done! I added 2 tasks for you.

{tools}

Current planner snapshot:
{context}
"""


class AITab:
    def __init__(self, parent, db):
        self.db   = db
        self.frame = ctk.CTkFrame(parent, fg_color="#111827", corner_radius=0)
        self.frame.grid_columnconfigure(0, weight=1)
        self.frame.grid_rowconfigure(1, weight=1)

        self._messages          = []
        self._chunk_queue       = queue.Queue()
        self._streaming         = False
        self._ollama_url        = DEFAULT_URL
        self._partial_buf       = ""
        self._cancel_requested  = False
        self._tool_writes       = []   # tracks write ops in the current turn
        self._show_tab_callback = None # set by MainWindow after build

        self._build_ui()

    def _build_ui(self):
        hdr = ctk.CTkFrame(self.frame, fg_color="transparent")
        hdr.grid(row=0, column=0, padx=24, pady=(18, 6), sticky="ew")
        hdr.grid_columnconfigure(1, weight=1)
        ctk.CTkLabel(hdr, text="AI Assistant",
                     font=("Segoe UI", 22, "bold"), text_color="white").grid(row=0, column=0, sticky="w")

        ctrl = ctk.CTkFrame(hdr, fg_color="transparent")
        ctrl.grid(row=0, column=1, sticky="e")

        self.status_dot = ctk.CTkLabel(ctrl, text="*", font=("Segoe UI", 16), text_color="#6b7280")
        self.status_dot.pack(side="left", padx=(0, 3))
        self.status_lbl = ctk.CTkLabel(ctrl, text="Checking...", font=("Segoe UI", 11), text_color="#6b7280")
        self.status_lbl.pack(side="left", padx=(0, 12))
        ctk.CTkLabel(ctrl, text="Model:", font=("Segoe UI", 11), text_color="#6b7280").pack(side="left", padx=(0, 4))
        self.model_combo = ctk.CTkComboBox(ctrl, values=["llama3.2"], width=175)
        self.model_combo.set("llama3.2")
        self.model_combo.pack(side="left", padx=(0, 6))
        ctk.CTkButton(ctrl, text="⟳ Refresh", width=80, height=30, corner_radius=6,
                      fg_color="#374151", hover_color="#4b5563",
                      font=("Segoe UI", 12), command=self._check_ollama).pack(side="left")

        body = ctk.CTkFrame(self.frame, fg_color="transparent")
        body.grid(row=1, column=0, sticky="nsew", padx=12, pady=4)
        body.grid_columnconfigure(0, weight=3)
        body.grid_columnconfigure(1, weight=1)
        body.grid_rowconfigure(0, weight=1)

        self._build_chat(body)
        self._build_sidebar(body)

    def _build_chat(self, parent):
        chat_card = ctk.CTkFrame(parent, fg_color=CARD_BG, corner_radius=12)
        chat_card.grid(row=0, column=0, sticky="nsew", padx=(0, 6))
        chat_card.grid_columnconfigure(0, weight=1)
        chat_card.grid_rowconfigure(0, weight=1)

        self.chat_box = ctk.CTkTextbox(chat_card, fg_color=AXES_BG, corner_radius=8,
                                       font=("Segoe UI", 12), state="disabled", wrap="word")
        self.chat_box.grid(row=0, column=0, sticky="nsew", padx=10, pady=(10, 4))

        tb = self.chat_box._textbox
        tb.tag_configure("user_name",  foreground="#60a5fa", font=("Segoe UI", 11, "bold"))
        tb.tag_configure("user_text",  foreground="#e2e8f0", font=("Segoe UI", 12))
        tb.tag_configure("ai_name",    foreground="#34d399", font=("Segoe UI", 11, "bold"))
        tb.tag_configure("ai_text",    foreground="#d1d5db", font=("Segoe UI", 12))
        tb.tag_configure("tool_tag",   foreground="#f59e0b", font=("Segoe UI", 11, "bold italic"))
        tb.tag_configure("result_tag", foreground="#a78bfa", font=("Segoe UI", 11, "italic"))
        tb.tag_configure("sys_text",   foreground="#6b7280", font=("Segoe UI", 11, "italic"))

        self.ctx_var = ctk.CTkCheckBox(chat_card, text="Include planner context",
                                       font=("Segoe UI", 11), text_color="#9ca3af")
        self.ctx_var.select()
        self.ctx_var.grid(row=1, column=0, sticky="w", padx=12, pady=(2, 4))

        input_row = ctk.CTkFrame(chat_card, fg_color="transparent")
        input_row.grid(row=2, column=0, sticky="ew", padx=10, pady=(0, 10))
        input_row.grid_columnconfigure(0, weight=1)

        self.input_ent = ctk.CTkEntry(input_row,
                                      placeholder_text="Ask anything, or say 'Add task: ...' / 'Log course: ...'",
                                      height=40, font=("Segoe UI", 12))
        self.input_ent.grid(row=0, column=0, sticky="ew", padx=(0, 8))
        self.input_ent.bind("<Return>", lambda e: self._send())

        self.send_btn = ctk.CTkButton(input_row, text="Send", width=88, height=40,
                                      fg_color="#1a73e8", hover_color="#1557b0",
                                      font=("Segoe UI", 12, "bold"), command=self._send)
        self.send_btn.grid(row=0, column=1)

        bottom_row = ctk.CTkFrame(chat_card, fg_color="transparent")
        bottom_row.grid(row=3, column=0, pady=(0, 4))
        ctk.CTkButton(bottom_row, text="Clear chat", width=100, height=26,
                      fg_color="transparent", hover_color="#374151",
                      text_color="#4b5563", font=("Segoe UI", 11),
                      command=self._clear_chat).pack(side="left", padx=6)
        self.cancel_btn = ctk.CTkButton(bottom_row, text="✕  Cancel", width=100, height=26,
                      fg_color="#7f1d1d", hover_color="#991b1b",
                      text_color="#fca5a5", font=("Segoe UI", 11),
                      command=self._cancel_stream, state="disabled")
        self.cancel_btn.pack(side="left", padx=6)

        # Action banner — shown after tool writes to let user jump to the right tab
        self._action_banner = ctk.CTkFrame(chat_card, fg_color="#0a2010",
                                           corner_radius=8, border_width=1,
                                           border_color="#14532d")
        # Not gridded until needed
        self._action_banner.grid_columnconfigure(0, weight=1)
        self._banner_label = ctk.CTkLabel(self._action_banner, text="",
                                          font=("Segoe UI", 11, "bold"),
                                          text_color="#4ade80", anchor="w")
        self._banner_label.grid(row=0, column=0, sticky="w", padx=12, pady=(8, 4))
        self._banner_btns = ctk.CTkFrame(self._action_banner, fg_color="transparent")
        self._banner_btns.grid(row=1, column=0, sticky="w", padx=8, pady=(0, 8))

    def _build_sidebar(self, parent):
        right = ctk.CTkScrollableFrame(parent, fg_color="transparent", corner_radius=0)
        right.grid(row=0, column=1, sticky="nsew", padx=(6, 0))
        right.grid_columnconfigure(0, weight=1)

        ctk.CTkLabel(right, text="Quick Actions",
                     font=("Segoe UI", 13, "bold"), text_color="white").grid(row=0, column=0, sticky="w", pady=(0, 8))

        quick_actions = [
            ("Analyze My Week",        self._qa_analyze_week),
            ("Suggest + Add Tasks",    self._qa_suggest_tasks),
            ("Review Year Goals",      self._qa_review_goals),
            ("Prioritize My Tasks",    self._qa_prioritize),
            ("Plan My Day",            self._qa_plan_day),
            ("Recommend Courses",      self._qa_recommend_courses),
            ("Career Roadmap",         self._qa_career_roadmap),
            ("Fix Overdue Tasks",      self._qa_overdue),
            ("Create Custom Tracker",  self._qa_create_tracker),
            ("Query My Data",          self._qa_query_data),
        ]
        for i, (label, cmd) in enumerate(quick_actions):
            ctk.CTkButton(right, text=label, anchor="w", height=40, corner_radius=8,
                          fg_color=CARD_BG, hover_color="#374151",
                          text_color="#d1d5db", font=("Segoe UI", 12),
                          command=cmd).grid(row=i + 1, column=0, sticky="ew", pady=3)

        ctk.CTkLabel(right, text="Your Custom Trackers",
                     font=("Segoe UI", 12, "bold"), text_color="#9ca3af").grid(
            row=len(quick_actions) + 2, column=0, sticky="w", pady=(16, 4))
        self.custom_tables_frame = ctk.CTkFrame(right, fg_color="transparent")
        self.custom_tables_frame.grid(row=len(quick_actions) + 3, column=0, sticky="ew")
        self.custom_tables_frame.grid_columnconfigure(0, weight=1)

        tips = ctk.CTkFrame(right, fg_color=CARD_BG, corner_radius=10)
        tips.grid(row=len(quick_actions) + 4, column=0, sticky="ew", pady=(14, 0))
        ctk.CTkLabel(tips, text="What the AI can do",
                     font=("Segoe UI", 11, "bold"), text_color="#9ca3af").pack(anchor="w", padx=12, pady=(10, 4))
        for t in [
            "Add tasks and courses automatically",
            "Log work hours on your behalf",
            "Update project and goal progress",
            "Create brand-new trackers (books,",
            "  habits, expenses, recipes, etc.)",
            "Query your data in plain English",
            "Career advice from your resume",
        ]:
            ctk.CTkLabel(tips, text=t, font=("Segoe UI", 10), text_color="#4b5563",
                         anchor="w", justify="left").pack(anchor="w", padx=12, pady=1)
        ctk.CTkFrame(tips, height=8, fg_color="transparent").pack()

        self._append_sys(
            "Hi! I am your AI assistant. I can read and write your planner.\n\n"
            "Try:\n"
            "  'Add task: Review Q2 report by Friday'\n"
            "  'I started the AWS course on Udemy today'\n"
            "  'Create a book reading tracker for me'\n"
            "  'What tasks are overdue?'\n"
            "  'Analyse my week and suggest what to focus on'"
        )

    def refresh(self):
        self._check_ollama()
        self._refresh_custom_tables()
        self._load_history_from_db()

    def _load_history_from_db(self):
        """Load persisted chat history into the UI on tab open (only once per session)."""
        if self._messages:   # already loaded / user has been chatting
            return
        rows = self.db.get_chat_history(limit=30)
        if not rows:
            return
        self._messages = [dict(r) for r in rows]
        self._append_sys("--- Previous conversation loaded ---")
        for msg in rows:
            if msg["role"] == "user":
                self._append_user(msg["content"])
            elif msg["role"] == "assistant":
                self._begin_ai_turn()
                self._append_chunk(msg["content"])
                self._end_ai_turn()

    def _refresh_custom_tables(self):
        for w in self.custom_tables_frame.winfo_children():
            w.destroy()
        tables = self.db.get_custom_tables()
        if not tables:
            ctk.CTkLabel(self.custom_tables_frame, text="None yet. Ask the AI to create one!",
                         font=("Segoe UI", 10), text_color="#374151").grid(row=0, column=0, sticky="w")
            return
        for i, t in enumerate(tables):
            ctk.CTkButton(self.custom_tables_frame,
                          text=t["display_name"], anchor="w", height=32, corner_radius=6,
                          fg_color="#374151", hover_color="#4b5563",
                          font=("Segoe UI", 11), text_color="#d1d5db",
                          command=lambda tn=t["table_name"], dn=t["display_name"]:
                              self._view_custom_table(tn, dn)).grid(
                row=i, column=0, sticky="ew", pady=2)

    def _view_custom_table(self, table_name, display_name):
        self._dispatch(f'Show me everything in my "{display_name}" tracker. Use query_data with SELECT * FROM {table_name} LIMIT 30.')

    def _check_ollama(self):
        self.status_dot.configure(text_color="#6b7280")
        self.status_lbl.configure(text="Checking...", text_color="#6b7280")
        threading.Thread(target=self._do_check, daemon=True).start()

    def _do_check(self):
        if not REQUESTS_AVAILABLE:
            self.frame.after(0, lambda: self._set_status(False, "requests not installed"))
            return
        try:
            r = requests.get(f"{self._ollama_url}/api/tags", timeout=3)
            if r.status_code == 200:
                models = [m["name"] for m in r.json().get("models", [])]
                self.frame.after(0, lambda m=models: self._set_status(True, "Connected", m))
            else:
                self.frame.after(0, lambda: self._set_status(False, "Ollama error"))
        except Exception:
            self.frame.after(0, lambda: self._set_status(False, "Ollama not running"))

    def _set_status(self, ok, text, models=None):
        color = "#34d399" if ok else "#ef4444"
        self.status_dot.configure(text_color=color)
        self.status_lbl.configure(text=text, text_color=color)
        if ok and models:
            self.model_combo.configure(values=models)
            if self.model_combo.get() not in models:
                self.model_combo.set(models[0])

    def _tb_insert(self, text, tag):
        tb = self.chat_box._textbox
        self.chat_box.configure(state="normal")
        tb.insert("end", text, tag)
        self.chat_box.configure(state="disabled")
        self.chat_box.see("end")

    def _append_sys(self, text):
        self._tb_insert(f"{text}\n\n", "sys_text")

    def _append_user(self, text):
        self._tb_insert("You\n", "user_name")
        self._tb_insert(f"{text}\n\n", "user_text")

    def _begin_ai_turn(self):
        self._tb_insert("AI Assistant\n", "ai_name")

    def _append_chunk(self, chunk):
        self._tb_insert(chunk, "ai_text")

    def _append_tool_action(self, text):
        self._tb_insert(f"\n  [Tool] {text}\n", "tool_tag")

    def _append_tool_result(self, text):
        short = text[:200] + ("..." if len(text) > 200 else "")
        self._tb_insert(f"  [Result] {short}\n", "result_tag")

    def _end_ai_turn(self):
        self._tb_insert("\n\n", "ai_text")

    def _clear_chat(self):
        self.chat_box.configure(state="normal")
        self.chat_box.delete("1.0", "end")
        self.chat_box.configure(state="disabled")
        self._messages.clear()
        self.db.clear_chat_history()
        self._hide_banner()
        self._append_sys("Chat cleared.")

    # ── Write-action banner ────────────────────────────────────────────────

    def set_nav_callback(self, callback):
        """Called by MainWindow so the banner can navigate to tabs."""
        self._show_tab_callback = callback

    def _hide_banner(self):
        self._action_banner.grid_remove()
        for w in self._banner_btns.winfo_children():
            w.destroy()

    def _show_write_banner(self):
        if not self._tool_writes:
            return

        # Count by type
        counts = {}
        for kind, name in self._tool_writes:
            counts[kind] = counts.get(kind, 0) + 1

        parts = []
        nav_targets = {}  # label -> tab_id

        if counts.get("task", 0):
            n = counts["task"]
            parts.append(f"✅ {n} task{'s' if n > 1 else ''} added")
            nav_targets["View Tasks →"] = "tasks"
        if counts.get("task_update", 0):
            parts.append(f"✅ {counts['task_update']} task(s) updated")
            nav_targets["View Tasks →"] = "tasks"
        if counts.get("course", 0):
            n = counts["course"]
            parts.append(f"📚 {n} course{'s' if n > 1 else ''} added")
            nav_targets["View Courses →"] = "courses"
        if counts.get("course_update", 0):
            parts.append(f"📚 {counts['course_update']} course(s) updated")
            nav_targets["View Courses →"] = "courses"
        if counts.get("project", 0):
            n = counts["project"]
            parts.append(f"🚀 {n} project{'s' if n > 1 else ''} created")
            nav_targets["View Projects →"] = "projects"
        if counts.get("work_hours", 0):
            parts.append(f"⏱ Work hours logged")
            nav_targets["View Work Hours →"] = "work_hours"
        if counts.get("target_update", 0):
            parts.append(f"🎯 {counts['target_update']} target(s) updated")
            nav_targets["View Targets →"] = "targets"

        if not parts:
            return

        self._banner_label.configure(text="  " + "   |   ".join(parts))

        for label, tab_id in nav_targets.items():
            ctk.CTkButton(
                self._banner_btns, text=label,
                height=28, corner_radius=6,
                fg_color="#14532d", hover_color="#166534",
                text_color="#4ade80", font=("Segoe UI", 11, "bold"),
                command=lambda t=tab_id: self._nav_to(t)
            ).pack(side="left", padx=4)

        # Show the banner (row=4 in chat_card)
        self._action_banner.grid(row=4, column=0, sticky="ew", padx=10, pady=(0, 10))

    def _nav_to(self, tab_id: str):
        if self._show_tab_callback:
            self._show_tab_callback(tab_id)

    def _cancel_stream(self):
        """Request streaming to stop after the next chunk."""
        self._cancel_requested = True
        self.cancel_btn.configure(state="disabled")

    def _send(self, prompt=None):
        if self._streaming:
            return
        text = (prompt or self.input_ent.get()).strip()
        if not text:
            return
        self.input_ent.delete(0, "end")
        self._dispatch(text)

    def _dispatch(self, user_text):
        context = self._build_context() if self.ctx_var.get() else "(context sharing off)"
        sys_content = SYSTEM_PROMPT.format(tools=TOOLS_SPEC, context=context)

        self._messages.append({"role": "user", "content": user_text})
        self._append_user(user_text)
        self._begin_ai_turn()

        self._streaming        = True
        self._partial_buf      = ""
        self._cancel_requested = False
        self._tool_writes      = []   # reset for this turn
        self._hide_banner()
        self.send_btn.configure(state="disabled", text="...")
        self.cancel_btn.configure(state="normal")

        messages = [{"role": "system", "content": sys_content}] + self._messages[-12:]
        model    = self.model_combo.get()

        threading.Thread(target=self._stream_response, args=(model, messages), daemon=True).start()
        self._poll_queue()

    def _stream_response(self, model, messages):
        if not REQUESTS_AVAILABLE:
            self._chunk_queue.put(("error", "requests not installed"))
            return
        try:
            resp = requests.post(
                f"{self._ollama_url}/api/chat",
                json={"model": model, "messages": messages, "stream": True},
                stream=True, timeout=120,
            )
            resp.raise_for_status()
            full = []
            for line in resp.iter_lines():
                if self._cancel_requested:
                    self._chunk_queue.put(("cancelled", ""))
                    return
                if not line:
                    continue
                try:
                    data  = json.loads(line)
                    chunk = data.get("message", {}).get("content", "")
                    if chunk:
                        full.append(chunk)
                        self._chunk_queue.put(("chunk", chunk))
                    if data.get("done"):
                        break
                except json.JSONDecodeError:
                    pass
            self._chunk_queue.put(("done", "".join(full)))
        except requests.exceptions.HTTPError as exc:
            status = getattr(getattr(exc, "response", None), "status_code", None)
            if status == 404:
                self._chunk_queue.put(("error",
                    f"Model '{model}' not found on Ollama.\n"
                    f"Run in terminal:  ollama pull {model}"))
            else:
                self._chunk_queue.put(("error", f"HTTP {status} error from Ollama."))
        except requests.exceptions.ConnectionError:
            self._chunk_queue.put(("error", "Could not connect to Ollama. Run: ollama serve"))
        except requests.exceptions.Timeout:
            self._chunk_queue.put(("error", "Request timed out - model may still be loading."))
        except Exception as exc:
            self._chunk_queue.put(("error", f"Unexpected error: {exc}"))

    def _poll_queue(self):
        try:
            while True:
                event, data = self._chunk_queue.get_nowait()
                if event == "chunk":
                    self._partial_buf += data
                    self._partial_buf = self._process_tool_calls(self._partial_buf)
                elif event == "done":
                    self._partial_buf = self._process_tool_calls(self._partial_buf, final=True)
                    self._messages.append({"role": "assistant", "content": data})
                    # Persist both user + assistant turns
                    if len(self._messages) >= 2:
                        last_user = next(
                            (m for m in reversed(self._messages[:-1]) if m["role"] == "user"), None
                        )
                        if last_user:
                            self.db.save_chat_message("user", last_user["content"])
                        self.db.save_chat_message("assistant", data)
                    # Cap in-memory history at 30 messages
                    if len(self._messages) > 30:
                        self._messages = self._messages[-30:]
                    self._end_ai_turn()
                    self._streaming = False
                    self.send_btn.configure(state="normal", text="Send")
                    self.cancel_btn.configure(state="disabled")
                    self._refresh_custom_tables()
                    self._show_write_banner()
                    return
                elif event == "cancelled":
                    self._append_chunk("\n[Cancelled]")
                    self._end_ai_turn()
                    self._streaming = False
                    self.send_btn.configure(state="normal", text="Send")
                    self.cancel_btn.configure(state="disabled")
                    return
                elif event == "error":
                    self._append_chunk(f"  {data}")
                    self._end_ai_turn()
                    self._streaming = False
                    self.send_btn.configure(state="normal", text="Send")
                    self.cancel_btn.configure(state="disabled")
                    return
        except Exception:
            pass
        if self._streaming:
            self.frame.after(40, self._poll_queue)

    def _process_tool_calls(self, buf, final=False):
        while True:
            start = buf.find("<tool_call>")
            if start == -1:
                if not final:
                    tail_check = max(0, len(buf) - 12)
                    safe = buf[:tail_check]
                    tail = buf[tail_check:]
                    if safe:
                        self._append_chunk(safe)
                    return tail
                else:
                    if buf:
                        self._append_chunk(buf)
                    return ""

            before = buf[:start]
            if before:
                self._append_chunk(before)
            buf = buf[start:]

            end = buf.find("</tool_call>")
            if end == -1:
                if final:
                    self._append_chunk(buf)
                    return ""
                return buf

            tag_content = buf[len("<tool_call>"):end].strip()
            buf = buf[end + len("</tool_call>"):]
            self._execute_tool_call(tag_content)

        return buf

    def _execute_tool_call(self, json_str):
        try:
            call = json.loads(json_str)
        except json.JSONDecodeError:
            self._append_tool_result(f"Invalid tool JSON: {json_str[:80]}")
            return

        tool = call.get("tool", "")
        args = call.get("args", {})
        arg_preview = ", ".join(f"{k}={repr(v)[:25]}" for k, v in list(args.items())[:3])
        self._append_tool_action(f"{tool}({arg_preview})")

        try:
            result = self._run_tool(tool, args)
        except Exception as exc:
            result = f"Error: {exc}"

        self._append_tool_result(result)
        self._messages.append({"role": "user", "content": f"<tool_result>{result}</tool_result>"})

    def _run_tool(self, tool, args):
        db = self.db

        if tool == "add_task":
            db.add_task(title=args["title"], description=args.get("description", ""),
                        category=args.get("category", "General"),
                        priority=args.get("priority", "Medium"),
                        due_date=args.get("due_date"))
            self._tool_writes.append(("task", args["title"]))
            return f"Task added: \"{args['title']}\""

        elif tool == "update_task_status":
            db.update_task_status(int(args["task_id"]), args["status"])
            self._tool_writes.append(("task_update", str(args["task_id"])))
            return f"Task {args['task_id']} -> {args['status']}"

        elif tool == "add_course":
            db.add_course(title=args["title"], provider=args.get("provider", ""),
                          url=args.get("url", ""), category=args.get("category", "Learning"),
                          status=args.get("status", "Planned"), notes=args.get("notes", ""))
            self._tool_writes.append(("course", args["title"]))
            return f"Course added: \"{args['title']}\""

        elif tool == "update_course_progress":
            db.update_course(int(args["course_id"]), progress=int(args["progress"]))
            self._tool_writes.append(("course_update", str(args["course_id"])))
            return f"Course {args['course_id']} progress -> {args['progress']}%"

        elif tool == "add_project":
            db.add_project(name=args["name"], description=args.get("description", ""),
                           color=args.get("color", "#3b82f6"),
                           start_date=args.get("start_date"),
                           target_date=args.get("target_date"))
            self._tool_writes.append(("project", args["name"]))
            return f"Project added: \"{args['name']}\""

        elif tool == "update_target":
            db.update_target(int(args["target_id"]), current_value=float(args["current_value"]))
            self._tool_writes.append(("target_update", str(args["target_id"])))
            return f"Target {args['target_id']} updated to {args['current_value']}"

        elif tool == "log_work_hours":
            mins  = int(args["duration_minutes"])
            d_str = args.get("date", date.today().isoformat())
            desc  = args.get("description", "")
            cat   = args.get("category", "Work")
            db.add_work_session(f"{d_str}T09:00:00", f"{d_str}T09:{mins:02d}:00",
                                mins, desc, None, cat, d_str)
            self._tool_writes.append(("work_hours", f"{mins}m"))
            return f"Logged {mins} min of '{cat}' on {d_str}"

        elif tool == "query_data":
            sql = args["sql"].strip()
            if not sql.upper().startswith("SELECT"):
                return "Only SELECT is allowed via query_data."
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

        elif tool == "create_custom_table":
            tname    = re.sub(r"[^a-z0-9_]", "_", args["table_name"].lower())
            dname    = args["display_name"]
            columns  = args["columns_json"] if isinstance(args["columns_json"], list) \
                       else json.loads(args["columns_json"])
            col_defs = ["id INTEGER PRIMARY KEY AUTOINCREMENT",
                        "created_at TEXT DEFAULT CURRENT_TIMESTAMP"]
            for col in columns:
                cname = re.sub(r"[^a-z0-9_]", "_", col["name"].lower())
                ctype = col.get("type", "TEXT").upper()
                if ctype not in ("TEXT", "INTEGER", "REAL", "BLOB"):
                    ctype = "TEXT"
                default = col.get("default")
                defstr  = f" DEFAULT '{default}'" if default is not None else ""
                col_defs.append(f"{cname} {ctype}{defstr}")
            ddl = f"CREATE TABLE IF NOT EXISTS {tname} ({', '.join(col_defs)})"
            db.execute_raw(ddl)
            db.register_custom_table(tname, dname, json.dumps(columns))
            return f"Custom table '{dname}' created with: " + ", ".join(c["name"] for c in columns)

        elif tool == "insert_custom_row":
            tname = re.sub(r"[^a-z0-9_]", "_", args["table_name"].lower())
            data  = args["data_json"] if isinstance(args["data_json"], dict) \
                    else json.loads(args["data_json"])
            cols  = list(data.keys())
            vals  = list(data.values())
            ph    = ", ".join("?" * len(cols))
            _, res = db.execute_raw(
                f"INSERT INTO {tname} ({', '.join(cols)}) VALUES ({ph})", vals)
            return f"Row inserted into {tname}: {res}"

        elif tool == "query_custom":
            tname = re.sub(r"[^a-z0-9_]", "_", args["table_name"].lower())
            limit = int(args.get("limit", 20))
            cols, rows = db.execute_raw(f"SELECT * FROM {tname} LIMIT {limit}")
            if not rows:
                return "Table is empty."
            header = " | ".join(cols)
            lines  = [header, "-" * min(len(header), 80)]
            for r in rows:
                lines.append(" | ".join(str(r.get(c, "")) for c in cols))
            return "\n".join(lines)

        else:
            return f"Unknown tool: {tool}"

    def _build_context(self):
        lines = [f"Today: {date.today().strftime('%A, %B %d, %Y')}"]
        has_data = False

        tasks = self.db.get_tasks()
        if tasks:
            has_data = True
            lines.append(f"\nTasks ({len(tasks)}):")
            for t in tasks[:20]:
                due = f", due {t['due_date']}" if t["due_date"] else ""
                lines.append(f"  [id={t['id']} {t['status']}] {t['title']} ({t['priority']}{due})")
        else:
            lines.append("\nTasks: NONE — planner is empty.")

        projects = self.db.get_projects()
        if projects:
            has_data = True
            lines.append("\nProjects:")
            for p in projects[:8]:
                lines.append(f"  [id={p['id']}] {p['name']} - {p['status']}, {p['progress']}%")
        else:
            lines.append("Projects: NONE")

        courses = self.db.get_courses()
        if courses:
            has_data = True
            lines.append(f"\nCourses ({len(courses)}):")
            for c in courses[:10]:
                lines.append(f"  [id={c['id']} {c['status']}] {c['title']} ({c['provider'] or 'no provider'})")
        else:
            lines.append("Courses: NONE")

        weekly   = self.db.get_weekly_hours()
        week_min = sum(r["total_minutes"] for r in weekly)
        h, m     = divmod(week_min, 60)
        lines.append(f"\nWork hours this week: {h}h {m}m")

        year    = date.today().year
        targets = self.db.get_targets(year=year)
        if targets:
            has_data = True
            lines.append(f"\nYear Targets ({year}):")
            for t in targets:
                pct = round(t["current_value"] / t["target_value"] * 100) \
                      if t["target_value"] > 0 else 0
                lines.append(f"  [id={t['id']}] {t['title']}: {pct}% ({t['current_value']}/{t['target_value']} {t['unit']})")

        custom = self.db.get_custom_tables()
        if custom:
            lines.append("Custom trackers: " + ", ".join(t["display_name"] for t in custom))

        if not has_data:
            lines.append(
                "\n⚠ PLANNER IS COMPLETELY EMPTY. When the user asks you to suggest "
                "or add tasks/courses/projects — use the tools to ADD them immediately. "
                "Do NOT just list them as text. An empty planner means you should fill it."
            )

        return "\n".join(lines)

    def _qa_analyze_week(self):
        self._send("Analyse my work hours and task progress for this week. What went well, what slipped, and what should I focus on next?")

    def _qa_suggest_tasks(self):
        self._send(
            "Use query_data to check my existing tasks and projects. "
            "Then use add_task to ADD 5 specific, actionable tasks right now. "
            "Call add_task once for EACH task — do not just list them as text. "
            "If the planner is empty, suggest practical personal productivity tasks and add them anyway."
        )

    def _qa_review_goals(self):
        self._send("Review my year targets. For ones that are behind, advise what actions to take.")

    def _qa_prioritize(self):
        self._send("Query my tasks with query_data, then give me a prioritised list for the next 3 days with reasoning.")

    def _qa_plan_day(self):
        self._send("Query my tasks and work hours, then create a practical schedule for today.")

    def _qa_recommend_courses(self):
        self._send(
            "Use query_data to check my profile and existing courses. "
            "Then use add_course to ADD 5 specific online courses immediately — "
            "call add_course once per course. Do not just list them as text."
        )

    def _qa_career_roadmap(self):
        self._send(
            "Create a 6-month career roadmap for me. "
            "Use add_task to ADD each monthly milestone as a real task right now — "
            "at least 6 tasks, one per month. Call add_task for each one individually."
        )

    def _qa_overdue(self):
        self._send("Use query_data to find my overdue tasks, then suggest a concrete plan for each one.")

    def _qa_create_tracker(self):
        self._send("I want a new custom tracker. Ask me what I want to track, then use create_custom_table to build it.")

    def _qa_query_data(self):
        self._send("Show me a summary of all my planner data using query_data.")
