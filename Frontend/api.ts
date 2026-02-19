const API_BASE = (import.meta as any).env?.VITE_API_URL || 'http://127.0.0.1:8000/api';

const ACCESS_TOKEN_KEY = 'artedu_access_token';
const REFRESH_TOKEN_KEY = 'artedu_refresh_token';

export const authStorage = {
  getAccess: () => localStorage.getItem(ACCESS_TOKEN_KEY),
  getRefresh: () => localStorage.getItem(REFRESH_TOKEN_KEY),
  setTokens: (access: string, refresh: string) => {
    localStorage.setItem(ACCESS_TOKEN_KEY, access);
    localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
  },
  clear: () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },
};

async function request(path: string, options: RequestInit = {}, auth = true) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (auth) {
    const token = authStorage.getAccess();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      message = body.detail || body.non_field_errors?.[0] || JSON.stringify(body);
    } catch (_) {}
    throw new Error(message);
  }

  if (res.status === 204) return null;
  return res.json();
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

export async function syncSnapshot(snapshot: any) {
  return request('/snapshot/sync/', {
    method: 'POST',
    body: JSON.stringify(snapshot),
  });
}

export async function submitTest(payload: { moduleId: string | number; answers: Record<string, number>; timeTaken?: number }) {
  return request('/tests/submit/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
