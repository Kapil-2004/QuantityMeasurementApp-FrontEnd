/**
 * QuantiMeasure — API Service Layer
 * Uses Axios with request/response interceptors.
 * Covers: Classes, ES9 async/await, Promises, AJAX, Exception handling.
 */

'use strict';

/* ─────────────────────────────────────────────
   Constants: Centralized configuration for easier 
   updates (e.g., changing the API URL for production).
───────────────────────────────────────────── */
const API_BASE_URL = 'http://localhost:5000';
const TOKEN_KEY    = 'qm_token';
const USER_KEY     = 'qm_user';

/* ─────────────────────────────────────────────
   Axios instance: Configured once to ensure all requests 
   share the same base URL, headers, and timeout.
───────────────────────────────────────────── */
const http = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000
});

/* 
   Request interceptor: Automatically injects the JWT 
   into every request header if it exists. 
   This avoids manual token injection for every API call.
*/
http.interceptors.request.use(
  (config) => {
    const token = TokenStore.get();
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/* 
   Response interceptor: Provides a global "catch-all" 
   for 401 Unauthorized errors (e.g., expired tokens).
   It clears the local session and kicks the user to login.
*/
http.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      TokenStore.clear();
      // Redirect to login only if not already on an auth page
      if (!window.location.pathname.includes('index') &&
          !window.location.pathname.endsWith('/')) {
        window.location.href = 'index.html';
      }
    }
    return Promise.reject(error);
  }
);

/* ─────────────────────────────────────────────
   TokenStore: Abstracting browser storage (localStorage). 
   Why? If we ever switch to sessionStorage or cookies, 
   we only need to change this one class.
───────────────────────────────────────────── */
class TokenStore {
  static get()            { return localStorage.getItem(TOKEN_KEY); }
  static set(token)       { localStorage.setItem(TOKEN_KEY, token); }
  static clear()          { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(USER_KEY); }
  static isLoggedIn()     { return !!this.get(); }
  static setUser(user)    { localStorage.setItem(USER_KEY, JSON.stringify(user)); }
  static getUser()        {
    try { return JSON.parse(localStorage.getItem(USER_KEY)); }
    catch { return null; }
  }
}

/* ─────────────────────────────────────────────
   ApiError: A custom error class extending Error.
   Why? Allows us to catch API-specific errors and 
   easily access the HTTP status or data payload.
───────────────────────────────────────────── */
class ApiError extends Error {
  constructor(message, status, data = null) {
    super(message);
    this.name    = 'ApiError';
    this.status  = status;
    this.data    = data;
  }
}

/* ─────────────────────────────────────────────
   Helper: extract readable error message
───────────────────────────────────────────── */
function extractError(error) {
  if (error instanceof ApiError) return error.message;
  if (error.response) {
    const d = error.response.data;
    if (typeof d === 'string')   return d;
    if (d?.message)              return d.message;
    if (d?.title)                return d.title;
    if (d?.errors) {
      const msgs = Object.values(d.errors).flat();
      return msgs[0] || 'Validation error.';
    }
    return `Server error (${error.response.status})`;
  }
  if (error.code === 'ECONNABORTED') return 'Request timed out. Is the backend running?';
  if (!navigator.onLine)             return 'No internet connection.';
  return error.message || 'An unexpected error occurred.';
}

/* ─────────────────────────────────────────────
   AuthService — register, login, google
───────────────────────────────────────────── */
class AuthService {
  /**
   * Register new user
   * @param {string} username
   * @param {string} password
   * @returns {Promise<{token: string, username: string, expiration: string}>}
   */
  static async register(username, password) {
    try {
      const { data } = await http.post('/api/auth/register', { Username: username, Password: password });
      return data;
    } catch (error) {
      throw new ApiError(extractError(error), error.response?.status);
    }
  }

  /**
   * Login with username/password
   * @param {string} username
   * @param {string} password
   * @returns {Promise<{token: string, username: string, expiration: string}>}
   */
  static async login(username, password) {
    try {
      const { data } = await http.post('/api/auth/login', { Username: username, Password: password });
      return data;
    } catch (error) {
      throw new ApiError(extractError(error), error.response?.status);
    }
  }

  /**
   * Google OAuth login
   * @param {string} idToken
   * @returns {Promise<{token: string, username: string}>}
   */
  static async googleLogin(idToken) {
    try {
      const { data } = await http.post('/api/auth/google-login', { IdToken: idToken });
      return data;
    } catch (error) {
      throw new ApiError(extractError(error), error.response?.status);
    }
  }
}

/* ─────────────────────────────────────────────
   QuantityService — all measurement operations
───────────────────────────────────────────── */
class QuantityService {

  /**
   * Compare two quantities
   * @param {object} q1 {value, unit, measurementType}
   * @param {object} q2 {value, unit, measurementType}
   * @returns {Promise<{areEqual:boolean, message:string}>}
   */
  static async compare(q1, q2) {
    try {
      const { data } = await http.post('/api/quantities/compare', { Q1: q1, Q2: q2 });
      return data.data ?? data;
    } catch (error) {
      throw new ApiError(extractError(error), error.response?.status);
    }
  }

  /**
   * Convert a quantity to a different unit
   * @param {object} quantity {value, unit, measurementType}
   * @param {string} targetUnit
   * @returns {Promise<{result:number, unit:string, measurementType:string}>}
   */
  static async convert(quantity, targetUnit) {
    try {
      const { data } = await http.post('/api/quantities/convert', { Quantity: quantity, TargetUnit: targetUnit });
      return data.data ?? data;
    } catch (error) {
      throw new ApiError(extractError(error), error.response?.status);
    }
  }

  /**
   * Add two quantities
   * @param {object} q1
   * @param {object} q2
   * @returns {Promise<{result:number, unit:string, measurementType:string}>}
   */
  static async add(q1, q2) {
    try {
      const { data } = await http.post('/api/quantities/add', { Q1: q1, Q2: q2 });
      return data.data ?? data;
    } catch (error) {
      throw new ApiError(extractError(error), error.response?.status);
    }
  }

  /**
   * Subtract two quantities
   */
  static async subtract(q1, q2) {
    try {
      const { data } = await http.post('/api/quantities/subtract', { Q1: q1, Q2: q2 });
      return data.data ?? data;
    } catch (error) {
      throw new ApiError(extractError(error), error.response?.status);
    }
  }

  /**
   * Divide two quantities
   * @returns {Promise<{result:number}>}
   */
  static async divide(q1, q2) {
    try {
      const { data } = await http.post('/api/quantities/divide', { Q1: q1, Q2: q2 });
      return data.data ?? data;
    } catch (error) {
      throw new ApiError(extractError(error), error.response?.status);
    }
  }

  /**
   * Get full operation history
   * @returns {Promise<Array>}
   */
  static async getHistory() {
    try {
      const { data } = await http.get('/api/quantities/history');
      return data.data ?? data ?? [];
    } catch (error) {
      throw new ApiError(extractError(error), error.response?.status);
    }
  }

  /**
   * Get operation count
   * @returns {Promise<{totalOperations:number}>}
   */
  static async getCount() {
    try {
      const { data } = await http.get('/api/quantities/count');
      return data.data ?? data;
    } catch (error) {
      throw new ApiError(extractError(error), error.response?.status);
    }
  }

  /**
   * Health check
   * @returns {Promise<{status:string, timestamp:string}>}
   */
  static async health() {
    try {
      const { data } = await http.get('/api/quantities/health');
      return data;
    } catch (error) {
      throw new ApiError(extractError(error), error.response?.status);
    }
  }
}

/* ─────────────────────────────────────────────
   Toast Notification Utility
───────────────────────────────────────────── */
class Toast {
  static _container = null;

  static _getContainer() {
    if (!this._container) {
      this._container = document.getElementById('toast-container');
    }
    return this._container;
  }

  static show(message, type = 'info', duration = 3500) {
    const icons = { success: '✅', error: '❌', info: 'ℹ️' };
    const container = this._getContainer();
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span>${icons[type] ?? 'ℹ️'}</span><span>${message}</span>`;
    container.appendChild(toast);

    // Auto remove
    setTimeout(() => {
      toast.classList.add('removing');
      toast.addEventListener('animationend', () => toast.remove(), { once: true });
    }, duration);
  }

  static success(msg, d) { this.show(msg, 'success', d); }
  static error(msg, d)   { this.show(msg, 'error',   d); }
  static info(msg, d)    { this.show(msg, 'info',    d); }
}

/* ─────────────────────────────────────────────
   Expose globals (used by auth.js & dashboard.js)
───────────────────────────────────────────── */
window.TokenStore      = TokenStore;
window.AuthService     = AuthService;
window.QuantityService = QuantityService;
window.Toast           = Toast;
window.ApiError        = ApiError;
