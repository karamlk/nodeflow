const STORAGE_KEY = 'nf_auth';
const API_BASE = (import.meta.env && import.meta.env.VITE_API_BASE) || '/api';

function loadAuth() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { token: '', model: null };
    const parsed = JSON.parse(raw);
    return { token: parsed.token || '', model: parsed.model || null };
  } catch {
    return { token: '', model: null };
  }
}

function saveAuth(token, model) {
  if (!token) {
    localStorage.removeItem(STORAGE_KEY);
  } else {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, model }));
  }
}

class AuthStore {
  constructor() {
    const { token, model } = loadAuth();
    this._token = token;
    this._model = model;
    this._listeners = new Set();
  }

  get token() {
    return this._token;
  }

  get model() {
    return this._model;
  }

  get isValid() {
    return !!this._token && !!this._model;
  }

  save(token, model) {
    this._token = token || '';
    this._model = model || null;
    saveAuth(this._token, this._model);
    this._emit();
  }

  clear() {
    this._token = '';
    this._model = null;
    saveAuth('', null);
    this._emit();
  }

  onChange(cb) {
    this._listeners.add(cb);
    return () => {
      this._listeners.delete(cb);
    };
  }

  _emit() {
    for (const cb of this._listeners) {
      try {
        cb(this._token, this._model);
      } catch {
        /* swallow */
      }
    }
  }
}

const authStore = new AuthStore();

async function request(path, { method = 'GET', body, query } = {}) {
  let url = `${API_BASE}${path}`;
  if (query) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null) params.set(k, String(v));
    }
    const qs = params.toString();
    if (qs) url += `?${qs}`;
  }

  const headers = { 'Content-Type': 'application/json' };
  if (authStore.token) headers.Authorization = `Bearer ${authStore.token}`;

  const res = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return null;

  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }
  }

  if (!res.ok) {
    const message = (data && data.message) || `Request failed (${res.status})`;
    const err = new Error(message);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

class Collection {
  constructor(name) {
    this.name = name;
  }

  async getFullList(opts = {}) {
    const data = await request(`/collections/${this.name}/records`, {
      query: { sort: opts.sort, filter: opts.filter, perPage: opts.perPage || 500 },
    });
    return (data && data.items) || [];
  }

  async getOne(id) {
    return request(`/collections/${this.name}/records/${encodeURIComponent(id)}`);
  }

  async create(body) {
    if (this.name === 'users') {
      return request(`/collections/users/records`, { method: 'POST', body });
    }
    return request(`/collections/${this.name}/records`, { method: 'POST', body });
  }

  async update(id, body) {
    return request(`/collections/${this.name}/records/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body,
    });
  }

  async delete(id) {
    await request(`/collections/${this.name}/records/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    return true;
  }

  async authWithPassword(identity, password) {
    const data = await request(`/collections/${this.name}/auth-with-password`, {
      method: 'POST',
      body: { identity, password },
    });
    if (data && data.token && data.record) {
      authStore.save(data.token, data.record);
    }
    return data;
  }

  async authRefresh() {
    const data = await request(`/collections/${this.name}/auth-refresh`);
    if (data && data.token && data.record) {
      authStore.save(data.token, data.record);
    }
    return data;
  }
}

const pb = {
  authStore,
  collection(name) {
    return new Collection(name);
  },
};

export default pb;
