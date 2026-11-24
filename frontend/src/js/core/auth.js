import { authApi, tokenStore } from './api.js';

let current; // undefined = not fetched yet, null = guest
let pending;

/** Current user (cached for the page's lifetime), or null for guests. */
export function getUser() {
  if (current !== undefined) return Promise.resolve(current);
  if (!tokenStore.get()) return Promise.resolve((current = null));
  pending ??= authApi.me()
    .then(({ user }) => (current = user ?? null))
    .catch(() => { tokenStore.clear(); return (current = null); });
  return pending;
}

export function setUser(user) { current = user; }

export async function login(email, password) {
  const res = await authApi.login({ email, password });
  if (res?.token) tokenStore.set(res.token);
  current = res?.user ?? null;
  return res;
}

export async function register(payload) {
  const res = await authApi.register(payload);
  if (res?.token) { tokenStore.set(res.token); current = res.user ?? null; }
  return res;
}

export function logout() {
  tokenStore.clear();
  current = null;
  window.location.href = '/';
}

export const isAdmin = (user) => user?.role === 'ADMIN';

/** Gate a page: redirects guests to /login?next=… and returns the user. */
export async function requireAuth({ admin = false } = {}) {
  const user = await getUser();
  if (!user) {
    const next = encodeURIComponent(location.pathname + location.search);
    location.replace(`/login?next=${next}`);
    return new Promise(() => {}); // stop the page script while navigating
  }
  if (admin && !isAdmin(user)) {
    location.replace('/');
    return new Promise(() => {});
  }
  document.body.classList.remove('is-gated');
  return user;
}

export const initials = (u) => `${(u?.prenom || '')[0] || ''}${(u?.nom || '')[0] || ''}`.toUpperCase() || '·';

/** The user's wilaya as an ID string. The API returns `wilaya_id` (number) and `wilaya` (the name). */
export const userWilayaId = (u) => {
  if (u?.wilaya_id != null && u.wilaya_id !== '') return String(u.wilaya_id);
  return /^\d+$/.test(String(u?.wilaya ?? '')) ? String(u.wilaya) : '';
};
