import { TestAttempt } from './types';

const envApiBase = (import.meta as any).env?.VITE_API_URL?.trim();
const API_BASE_CACHE_KEY = 'artedu_api_base_cache';
const API_REQUEST_TIMEOUT_MS = 10000;

function normalizeApiBase(value: string) {
  return value.replace(/\/+$/, '');
}

function buildApiCandidates() {
  const candidates = new Set<string>();

  if (envApiBase) {
    candidates.add(normalizeApiBase(envApiBase));
  }
  if (typeof window === 'undefined') {
    if (candidates.size === 0) {
      candidates.add('/api');
    }
    return Array.from(candidates);
  }

  const currentOrigin = window.location.origin;
  const currentUrl = new URL(currentOrigin);
  const isLocalhost = ['localhost', '127.0.0.1'].includes(currentUrl.hostname);

  // Local Vite dev serverda /api proxysiz 404 qaytaradi, shuning uchun uni
  // localhost rejimida kandidat sifatida qo'shmaymiz.
  if (!isLocalhost) {
    candidates.add(`${currentOrigin}/api`);
  }

  if (isLocalhost) {
    candidates.add(`http://${currentUrl.hostname}:8000/api`);
    candidates.add(`http://127.0.0.1:8000/api`);
    candidates.add(`http://localhost:8000/api`);
  }

  const cached = localStorage.getItem(API_BASE_CACHE_KEY);
  if (cached) {
    candidates.add(normalizeApiBase(cached));
  }

  return Array.from(candidates).map(normalizeApiBase);
}

let apiBaseCandidates = buildApiCandidates();
let activeApiBase = apiBaseCandidates[0];

function setActiveApiBase(nextBase: string) {
  activeApiBase = normalizeApiBase(nextBase);
  if (typeof window !== 'undefined') {
    localStorage.setItem(API_BASE_CACHE_KEY, activeApiBase);
  }
}

function clearInvalidCachedApiBase() {
  if (typeof window === 'undefined') {
    return;
  }
  const cached = localStorage.getItem(API_BASE_CACHE_KEY);
  if (!cached) {
    return;
  }

  const normalized = normalizeApiBase(cached);
  if (normalized === `${window.location.origin}/api`) {
    localStorage.removeItem(API_BASE_CACHE_KEY);
    apiBaseCandidates = buildApiCandidates();
    activeApiBase = apiBaseCandidates[0];
  }
}

clearInvalidCachedApiBase();

function createApiError(status: number, body: any, fallback: string, path?: string) {
  const message = getErrorMessage(body, fallback);
  if (status === 400 || status === 401 || status === 403) {
    return new Error(message || 'Login yoki parol xato!');
  }
  if (status === 404) {
    const routeLabel = path ? ` (${path})` : '';
    return new Error(message || `So'ralgan endpoint topilmadi${routeLabel}. Backend route sozlamalarini tekshiring.`);
  }
  if (status >= 500) {
    return new Error("Serverda ichki xatolik yuz berdi. Backend loglarini tekshiring.");
  }
  return new Error(message);
}

function logApi(message: string, meta: Record<string, unknown>) {
  console.info(`[api] ${message}`, meta);
}

const ACCESS_TOKEN_KEY = 'artedu_access_token';
const REFRESH_TOKEN_KEY = 'artedu_refresh_token';

export const authStorage = {
  getAccess: () => sessionStorage.getItem(ACCESS_TOKEN_KEY),
  getRefresh: () => sessionStorage.getItem(REFRESH_TOKEN_KEY),
  setTokens: (access: string, refresh: string) => {
    sessionStorage.setItem(ACCESS_TOKEN_KEY, access);
    sessionStorage.setItem(REFRESH_TOKEN_KEY, refresh);
  },
  clear: () => {
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    sessionStorage.removeItem(REFRESH_TOKEN_KEY);
  },
};

function getErrorMessage(body: any, fallback: string) {
  return body?.detail || body?.non_field_errors?.[0] || fallback;
}

function isTokenError(status: number, body: any) {
  const message = String(getErrorMessage(body, '') || '').toLowerCase();
  return status === 401 || message.includes('token not valid') || message.includes('given token not valid');
}

async function refreshAccessToken() {
  const refresh = authStorage.getRefresh();
  if (!refresh) {
    throw new Error("Sessiya tugagan. Qayta login qiling.");
  }

  const res = await fetch(`${activeApiBase}/auth/token/refresh/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh }),
  });

  let body: any = null;
  try {
    body = await res.json();
  } catch (_) {}

  if (!res.ok || !body?.access) {
    authStorage.clear();
    throw new Error("Sessiya tugagan. Qayta login qiling.");
  }

  authStorage.setTokens(body.access, refresh);
  return body.access as string;
}

async function request(path: string, options: RequestInit = {}, auth = true, retry = true, baseIndex = 0): Promise<any> {
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const headers: Record<string, string> = {
    ...((isFormData ? {} : { 'Content-Type': 'application/json' }) as Record<string, string>),
    ...(options.headers as Record<string, string> || {}),
  };

  if (auth) {
    const token = authStorage.getAccess();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const base = apiBaseCandidates[baseIndex] || activeApiBase;
  const url = `${base}${path}`;
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timeoutId = controller
    ? window.setTimeout(() => controller.abort(), API_REQUEST_TIMEOUT_MS)
    : null;
  let res: Response;
  try {
    logApi('request', { method: options.method || 'GET', url, auth, baseIndex });
    res = await fetch(url, { ...options, headers, signal: controller?.signal });
  } catch (error: any) {
    if (timeoutId !== null) {
      window.clearTimeout(timeoutId);
    }
    const message = String(error?.message || '').toLowerCase();
    const isAbort = error?.name === 'AbortError';
    const isNetworkFailure = isAbort || message.includes('failed to fetch') || message.includes('network') || message.includes('load failed');
    logApi('network_error', { method: options.method || 'GET', url, error: error?.message || String(error), baseIndex, isAbort });
    if (isNetworkFailure && baseIndex < apiBaseCandidates.length - 1) {
      return request(path, options, auth, retry, baseIndex + 1);
    }
    throw new Error("Server bilan aloqa yo'q. Backend ishlayotganini tekshiring.");
  }
  if (timeoutId !== null) {
    window.clearTimeout(timeoutId);
  }

  let body: any = null;
  if (res.status !== 204) {
    try {
      body = await res.json();
    } catch (_) {}
  }
  logApi('response', { method: options.method || 'GET', url, status: res.status, ok: res.ok, body });

  if (res.status !== 404) {
    setActiveApiBase(base);
  }

  if (res.status === 404 && baseIndex < apiBaseCandidates.length - 1) {
    return request(path, options, auth, retry, baseIndex + 1);
  }

  if (auth && retry && isTokenError(res.status, body)) {
    const newAccess = await refreshAccessToken();
    return request(path, {
      ...options,
      headers: {
        ...(options.headers as Record<string, string> || {}),
        Authorization: `Bearer ${newAccess}`,
      },
    }, auth, false, baseIndex);
  }

  if (!res.ok) {
    throw createApiError(res.status, body, `HTTP ${res.status}`, path);
  }

  if (res.status === 204) return null;
  return body;
}

export async function login(username: string, password: string) {
  const data = await request('/auth/login/', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  }, false);
  authStorage.setTokens(data.access, data.refresh);
  return data;
}

export async function register(payload: { username: string; password: string; fullName: string; workplace?: string }) {
  return request('/auth/register/', {
    method: 'POST',
    body: JSON.stringify(payload),
  }, false);
}

export async function getMe() {
  return request('/auth/me/');
}

export async function getSnapshot() {
  return request('/snapshot/');
}

export async function getSiteSettings() {
  return request('/site-settings/', {}, false);
}

export async function createUser(payload: any) {
  return request('/users/', { method: 'POST', body: JSON.stringify(payload) });
}

export async function updateUser(id: string | number, payload: any) {
  return request(`/users/${id}/`, { method: 'PUT', body: JSON.stringify(payload) });
}

export async function deleteUser(id: string | number) {
  return request(`/users/${id}/`, { method: 'DELETE' });
}

export async function createGroup(payload: any) {
  return request('/groups/', { method: 'POST', body: JSON.stringify(payload) });
}

export async function updateGroup(id: string | number, payload: any) {
  return request(`/groups/${id}/`, { method: 'PUT', body: JSON.stringify(payload) });
}

export async function deleteGroup(id: string | number) {
  return request(`/groups/${id}/`, { method: 'DELETE' });
}

export async function createSubject(payload: any, isDemo = false) {
  return request(`/subjects/?is_demo=${isDemo}`, { method: 'POST', body: JSON.stringify(payload) });
}

export async function updateSubject(id: string | number, payload: any) {
  return request(`/subjects/${id}/`, { method: 'PUT', body: JSON.stringify(payload) });
}

export async function deleteSubject(id: string | number) {
  return request(`/subjects/${id}/`, { method: 'DELETE' });
}

export async function createModule(payload: any, isDemo = false) {
  return request(`/modules/?is_demo=${isDemo}`, { method: 'POST', body: JSON.stringify(payload) });
}

export async function updateModule(id: string | number, payload: any) {
  return request(`/modules/${id}/`, { method: 'PUT', body: JSON.stringify(payload) });
}

export async function deleteModule(id: string | number) {
  return request(`/modules/${id}/`, { method: 'DELETE' });
}

export async function createQuestion(payload: any) {
  return request('/questions/', { method: 'POST', body: JSON.stringify(payload) });
}

export async function updateQuestion(id: string | number, payload: any) {
  return request(`/questions/${id}/`, { method: 'PUT', body: JSON.stringify(payload) });
}

export async function deleteQuestion(id: string | number) {
  return request(`/questions/${id}/`, { method: 'DELETE' });
}

export async function deleteResult(id: string | number) {
  return request(`/results/${id}/`, { method: 'DELETE' });
}

export async function updateResult(id: string | number, payload: any) {
  return request(`/results/${id}/`, { method: 'PATCH', body: JSON.stringify(payload) });
}

export async function createResultArchiveFolder(payload: { name: string }) {
  return request('/result-archive-folders/', { method: 'POST', body: JSON.stringify(payload) });
}

export async function deleteResultArchiveFolder(id: string | number) {
  return request(`/result-archive-folders/${id}/`, { method: 'DELETE' });
}

export async function updateSiteSettings(formData: FormData) {
  return request('/site-settings-admin/1/', { method: 'PATCH', body: formData });
}

export async function importUsers(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  return request('/imports/users/', { method: 'POST', body: formData });
}

export async function importQuestions(file: File, subjectId: string | number) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('subjectId', String(subjectId));
  return request('/imports/questions/', { method: 'POST', body: formData });
}

export async function startTestSession(moduleId: string | number): Promise<TestAttempt> {
  return request('/tests/start/', {
    method: 'POST',
    body: JSON.stringify({ moduleId }),
  });
}

export async function getActiveTestAttempts(): Promise<{ attempts: TestAttempt[] }> {
  return request('/tests/attempts/active/');
}

export async function saveTestProgress(payload: {
  attemptId: string | number;
  answers: Record<string, number>;
  currentQuestionIndex: number;
  timeRemaining: number;
}): Promise<TestAttempt> {
  return request('/tests/progress/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function submitTest(payload: {
  attemptId?: string | number;
  moduleId?: string | number;
  answers: Record<string, number>;
  currentQuestionIndex?: number;
  timeTaken?: number;
  timeRemaining?: number;
}) {
  return request('/tests/submit/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
