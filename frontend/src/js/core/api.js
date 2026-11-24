/* REST client for the MedLink backend (same endpoints as before, fetch instead of axios). */

// Demo / portfolio mode (VITE_MOCK=1): a fictional API running in the browser answers /api/*, no server involved.
export const IS_MOCK = import.meta.env.VITE_MOCK === '1';
export const API_URL = IS_MOCK ? '' : (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');
const demo = IS_MOCK ? await import('../../../mock/browser.js') : null;
/** fetch() for API calls: the real network, or the in-browser demo API. */
const apiFetch = (url, init) => (demo ? demo.demoFetch(String(url), init) : fetch(url, init));
export const resetDemoData = () => demo?.resetDemo();
const TOKEN_KEY = 'medlink_token';

export const tokenStore = {
  get: () => { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } },
  set: (t) => { try { localStorage.setItem(TOKEN_KEY, t); } catch { /* storage blocked */ } },
  clear: () => { try { localStorage.removeItem(TOKEN_KEY); } catch { /* storage blocked */ } },
};

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

/** Server message if there is one, otherwise the fallback. */
export const errorMessage = (err, fallback) => err?.data?.message || fallback;

async function request(method, path, { params, body } = {}) {
  const url = new URL(API_URL + path, location.origin);
  if (params) Object.entries(params).forEach(([k, v]) => v != null && v !== '' && url.searchParams.set(k, v));

  const headers = {};
  const token = tokenStore.get();
  if (token) headers.Authorization = `Bearer ${token}`;

  let payload;
  if (body instanceof FormData) payload = body; // browser sets multipart boundary
  else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  let res;
  try {
    res = await apiFetch(url, { method, headers, body: payload });
  } catch (e) {
    throw new ApiError('Network error', 0, null);
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401) tokenStore.clear();
    throw new ApiError(data?.message || res.statusText, res.status, data);
  }
  return data;
}

const get = (p, params) => request('GET', p, { params });
const post = (p, body) => request('POST', p, { body });
const put = (p, body) => request('PUT', p, { body });
const patch = (p, body) => request('PATCH', p, { body });
const del = (p) => request('DELETE', p);

export const authApi = {
  register: (data) => post('/api/auth/register', data),
  login: (data) => post('/api/auth/login', data),
  forgotPassword: (data) => post('/api/auth/forgot-password', data),
  resetPassword: (data) => post('/api/auth/reset-password', data),
  verifyEmail: (token) => get('/api/auth/verify-email', { token }),
  resendVerification: (data) => post('/api/auth/resend-verification', data),
  me: () => get('/api/auth/me'),
  updateProfile: (formData) => patch('/api/auth/update-profile', formData),
};

export const annonceApi = {
  list: (params) => get('/api/annonces', params),
  getById: (id) => get(`/api/annonces/${encodeURIComponent(id)}`),
  myAnnonces: () => get('/api/annonces/user/my-annonces'),
  create: (formData) => post('/api/annonces', formData),
  update: (id, data) => put(`/api/annonces/${encodeURIComponent(id)}`, data),
  remove: (id) => del(`/api/annonces/${encodeURIComponent(id)}`),
};

export const catalogApi = {
  categories: () => get('/api/catalog/categories'),
  medicaments: (params) => get('/api/catalog/medicaments', params),
  wilayas: () => get('/api/catalog/wilayas'),
  summary: () => get('/api/catalog/summary'),
};

export const adminApi = {
  stats: () => get('/api/admin/stats'),
  pending: () => get('/api/admin/pending'),
  users: () => get('/api/admin/users'),
  moderateAnnonce: (id, statut) => patch(`/api/admin/moderate/${id}`, { statut }),
  suspendUser: (id, suspend) => patch(`/api/admin/users/${id}/suspend`, { suspend }),
  deleteUser: (id) => del(`/api/admin/users/${id}`),
  setPrescriptionRequired: (medicamentId, required) =>
    patch(`/api/admin/medicaments/${medicamentId}`, { prescription_required: required }),
};

/* Prescriptions: private. Files are only served to their owner and admins, with the auth token,
   so they are fetched as a Blob (a plain <a href> would not carry the token). */
export const ordonnanceApi = {
  upload: (file) => {
    const fd = new FormData();
    fd.append('ordonnance', file);
    return post('/api/ordonnances/upload', fd);
  },
  get: (id) => get(`/api/ordonnances/${encodeURIComponent(id)}`),
  fileBlob: async (id) => {
    const headers = {};
    const token = tokenStore.get();
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await apiFetch(new URL(`${API_URL}/api/ordonnances/${encodeURIComponent(id)}/file`, location.origin), { headers });
    if (!res.ok) throw new ApiError(res.status === 404 ? 'Ordonnance introuvable.' : res.statusText, res.status, null);
    return res.blob();
  },
};

/** Absolute URL for backend-hosted assets ("/uploads/..."). */
export const assetUrl = (path) => {
  if (!path) return null;
  if (/^(https?:|data:|blob:)/i.test(path)) return path;
  return `${API_URL}${path.startsWith('/') ? '' : '/'}${path}`;
};
