// Centralised API client — all calls go to FastAPI on :7432
const BASE = '/api'

async function req(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  }
  if (body !== undefined) opts.body = JSON.stringify(body)
  const res = await fetch(BASE + path, opts)
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}`)
  return res.json()
}

export const api = {
  // Tasks
  getTasks:    (params = {}) => req('GET', '/tasks?' + new URLSearchParams(params)),
  createTask:  (body) => req('POST', '/tasks', body),
  updateTask:  (id, body) => req('PATCH', `/tasks/${id}`, body),
  archiveTask: (id) => req('PATCH', `/tasks/${id}/archive`),
  deleteTask:  (id) => req('DELETE', `/tasks/${id}`),
  taskStats:   () => req('GET', '/tasks/stats'),

  // Projects
  getProjects:   () => req('GET', '/projects'),
  createProject: (body) => req('POST', '/projects', body),
  updateProject: (id, body) => req('PATCH', `/projects/${id}`, body),
  deleteProject: (id) => req('DELETE', `/projects/${id}`),

  // Work Hours
  getWorkHours:     (limit = 50) => req('GET', `/work-hours?limit=${limit}`),
  getWeekly:        () => req('GET', '/work-hours/weekly'),
  getMonthly:       () => req('GET', '/work-hours/monthly'),
  logWork:          (body) => req('POST', '/work-hours', body),
  deleteWorkSession:(id) => req('DELETE', `/work-hours/${id}`),

  // Targets
  getTargets:   (year) => req('GET', `/targets${year ? `?year=${year}` : ''}`),
  createTarget: (body) => req('POST', '/targets', body),
  updateTarget: (id, body) => req('PATCH', `/targets/${id}`, body),
  deleteTarget: (id) => req('DELETE', `/targets/${id}`),

  // Courses
  getCourses:   (status) => req('GET', `/courses${status ? `?status=${status}` : ''}`),
  createCourse: (body) => req('POST', '/courses', body),
  updateCourse: (id, body) => req('PATCH', `/courses/${id}`, body),
  deleteCourse: (id) => req('DELETE', `/courses/${id}`),

  // Profile & Skills
  getProfile:  () => req('GET', '/profile'),
  saveProfile: (body) => req('POST', '/profile', body),
  getSkills:   () => req('GET', '/skills'),

  // Dashboard
  getDashboard: () => req('GET', '/dashboard'),

  // Home quote
  getDailyQuote:  () => req('GET', '/quote'),
  ollamaStatus:   () => req('GET', '/ollama/status'),

  // AI / Chat
  getChatHistory: () => req('GET', '/chat/history'),
  clearChat:      () => req('DELETE', '/chat/history'),
  saveMessage:    (role, content) => req('POST', '/chat/message', { role, content }),
  getContext:     () => req('GET', '/chat/context'),

  // Resumes
  getResumes:   () => req('GET', '/resumes'),
  deleteResume: (id) => req('DELETE', `/resumes/${id}`),

  // App updates
  checkUpdate: () => req('GET', '/update/check'),
}
