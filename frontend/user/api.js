/* ══════════════════════════════════════════
   api.js — Shared API Helper for Frontend
   • Auto-detects backend URL
   • JWT auth headers
   • Detailed error messages
   • Connection status logging
══════════════════════════════════════════ */

// Always use relative URL — works on localhost and any deployed domain
const API_BASE = '/api';

console.log(`[API] Base URL: ${API_BASE}`);

function getToken() { return localStorage.getItem('habitTracker_token'); }
function setToken(t) { localStorage.setItem('habitTracker_token', t); }
function clearToken() { localStorage.removeItem('habitTracker_token'); }

async function api(endpoint, options = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = 'Bearer ' + token;

  const url = API_BASE + endpoint;
  console.log(`[API] ${options.method || 'GET'} ${url}`);

  try {
    const res = await fetch(url, { ...options, headers: { ...headers, ...options.headers } });
    const data = await res.json();

    console.log(`[API] Response ${res.status}:`, data.message || 'OK');

    if (!res.ok) {
      if (res.status === 401) { clearToken(); }
      const errMsg = data.message || 'Request failed';
      if (typeof showToast === 'function') showToast(errMsg, 'error');
      throw new Error(errMsg);
    }
    return data;
  } catch (e) {
    if (e.name === 'TypeError' && e.message === 'Failed to fetch') {
      const msg = 'Backend server is not running. Start it with: node server.js (in backend folder)';
      console.error(`[API] ❌ ${msg}`);
      if (typeof showToast === 'function') showToast(msg, 'error');
      throw new Error(msg);
    }
    throw e;
  }
}
