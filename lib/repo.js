// GitHub Contents API client. Uses the encrypted connection from lib/secure.js.
import * as secure from './secure.js';

async function conn() {
  const { repo, branch } = await secure.getConnection();
  const token = await secure.readToken();
  return { repo, branch: branch || 'main', token };
}
const api = (repo, path) => `https://api.github.com/repos/${repo}/contents/${encodeURI(path)}`;
const b64enc = (str) => btoa(unescape(encodeURIComponent(str)));
const b64dec = (b64) => decodeURIComponent(escape(atob((b64 || '').replace(/\n/g, ''))));

async function ghFetch(url, opts) {
  const { token } = await conn();
  return fetch(url, { cache: 'no-store', ...opts, headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', ...(opts && opts.headers) } });
}

export async function readJson(path) {
  const { repo, branch } = await conn();
  const res = await ghFetch(`${api(repo, path)}?ref=${encodeURIComponent(branch)}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`read ${path}: ${res.status}`);
  const j = await res.json();
  return { sha: j.sha, data: JSON.parse(b64dec(j.content)) };
}

export async function writeJson(path, data, sha, message) {
  const { repo, branch } = await conn();
  const body = { message: message || `Update ${path}`, content: b64enc(JSON.stringify(data, null, 2) + '\n'), branch, ...(sha ? { sha } : {}) };
  const res = await ghFetch(api(repo, path), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    const err = new Error(e.message || `write ${path}: ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return (await res.json()).content.sha;
}

export async function listDir(path) {
  const { repo, branch } = await conn();
  const res = await ghFetch(`${api(repo, path)}?ref=${encodeURIComponent(branch)}`);
  if (res.status === 404) return [];
  if (!res.ok) throw new Error(`list ${path}: ${res.status}`);
  return res.json();
}

// Validate the connection (repo reachable); used at setup.
export async function checkRepo() {
  const { repo } = await conn();
  const res = await ghFetch(`https://api.github.com/repos/${repo}`);
  return res.ok;
}
