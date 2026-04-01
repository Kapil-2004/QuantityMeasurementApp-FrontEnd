/**
 * QuantiMeasure — Auth Pages Logic (Login + Signup)
 * Why Class-based? Using classes encapsulates the page state and 
 * provides a clean bootstrap mechanism for different entry points.
 */

'use strict';

/* ═══════════════════════════════════════════════
   SHARED UTILITIES
═══════════════════════════════════════════════ */

/** Toggle password visibility (callback pattern) */
function bindPasswordToggle(toggleBtn, inputEl) {
  if (!toggleBtn || !inputEl) return;
  toggleBtn.addEventListener('click', () => {
    const isHidden = inputEl.type === 'password';
    inputEl.type        = isHidden ? 'text' : 'password';
    toggleBtn.textContent = isHidden ? '🙈' : '👁️';
  });
}

/** Show inline alert */
function showAlert(alertEl, msgEl, message, type = 'error') {
  alertEl.className = `alert alert-${type} show`;
  if (msgEl) msgEl.textContent = message;
}
function hideAlert(alertEl) {
  alertEl.classList.remove('show');
}

/** Set button loading state */
function setLoading(btn, spinnerEl, textEl, loading = true) {
  btn.disabled = loading;
  spinnerEl?.classList.toggle('hidden', !loading);
  if (textEl) textEl.style.opacity = loading ? '0.4' : '1';
}

/** Validate a form field, adds red border on fail */
function validateField(input, condition, msg, errMap) {
  if (!condition) {
    input.style.borderColor = 'var(--clr-danger)';
    errMap[input.id] = msg;
    return false;
  }
  input.style.borderColor = '';
  return true;
}

/** Redirect after a delay using a Promise */
function delayedRedirect(url, ms = 1500) {
  return new Promise((resolve) => {
    setTimeout(() => {
      window.location.href = url;
      resolve();
    }, ms);
  });
}

/* ═══════════════════════════════════════════════
   GOOGLE AUTH HELPER
   (Shared by Login and Signup)
═══════════════════════════════════════════════ */
/* 
   GoogleAuthHelper: A specialized helper to manage the complex 
   Google Identity Services (GSI) lifecycle.
   Why? Isolating the GSI logic makes it reusable across both 
   login and signup screens without duplication.
*/
class GoogleAuthHelper {
  static init(btnElement, sourcePage) {
    if (!btnElement) return;
    this._initWithRetry(btnElement, sourcePage);
  }

  static _initWithRetry(btnElement, sourcePage, attempts = 0) {
    if (window.google) {
      this._doInit(btnElement, sourcePage);
    } else if (attempts < 10) {
      setTimeout(() => this._initWithRetry(btnElement, sourcePage, attempts + 1), 300);
    }
  }

  static _doInit(btnElement, sourcePage) {
    google.accounts.id.initialize({
      client_id: "407408718192.apps.googleusercontent.com",
      callback: (response) => this._handleResponse(response, sourcePage),
      auto_select: false,
      cancel_on_tap_outside: true
    });

    google.accounts.id.renderButton(btnElement, { 
      theme: "filled_black", 
      size: "large", 
      width: btnElement.offsetWidth > 100 ? btnElement.offsetWidth : 350,
      text: "signin_with",
      shape: "pill",
      logo_alignment: "left"
    });

    google.accounts.id.prompt();
  }

  /**
   * Handle the JWT credential returned by Google.
   * Why? We send this raw ID Token to our backend, which then
   * validates it against Google's servers to verify the user.
   */
  static async _handleResponse(response, sourcePage) {
    const idToken = response.credential;
    if (!idToken) return;

    sourcePage.setLoading(true);
    sourcePage.hideAlert();

    try {
      const { token, username: uname, expiration } = await AuthService.googleLogin(idToken);

      TokenStore.set(token);
      TokenStore.setUser({ username: uname, expiration });

      Toast.success(`Welcome, ${uname}! (Shared Sign-in)`);
      await delayedRedirect('dashboard.html', 900);

    } catch (err) {
      sourcePage.showAlert(err.message || 'Google authentication failed.');
      Toast.error('Google authentication failed.');
    } finally {
      sourcePage.setLoading(false);
    }
  }
}

/* ═══════════════════════════════════════════════
   LOGIN PAGE
═══════════════════════════════════════════════ */
class LoginPage {
  constructor() {
    this.form       = document.getElementById('login-form');
    this.userInput  = document.getElementById('login-username');
    this.passInput  = document.getElementById('login-password');
    this.togglePw   = document.getElementById('toggle-login-pw');
    this.btnLogin   = document.getElementById('btn-login');
    this.spinner    = document.getElementById('login-spinner');
    this.alertEl    = document.getElementById('login-alert');
    this.alertMsg   = document.getElementById('login-alert-msg');
    this.btnGoogle  = document.getElementById('btn-google-login');

    if (!this.form) return;  // Not on login page
    this._init();
  }

  _init() {
    // If already logged in → redirect
    if (TokenStore.isLoggedIn()) {
      window.location.href = 'dashboard.html';
      return;
    }

    // Bind password toggle
    bindPasswordToggle(this.togglePw, this.passInput);

    // Remember me: pre-fill username
    const remembered = localStorage.getItem('qm_remember');
    if (remembered) {
      this.userInput.value = remembered;
      document.getElementById('remember-me').checked = true;
    }

    // Clear border on input
    [this.userInput, this.passInput].forEach(el => {
      el.addEventListener('input', () => {
        el.style.borderColor = '';
        hideAlert(this.alertEl);
      });
    });

    // Form submit
    this.form.addEventListener('submit', (e) => {
      e.preventDefault();
      this._handleLogin();
    });

    // Shared Google logic
    GoogleAuthHelper.init(this.btnGoogle, this);
  }

  setLoading(loading) {
    setLoading(this.btnLogin, this.spinner, this.btnLogin?.querySelector('.btn-text'), loading);
  }

  showAlert(msg) {
    showAlert(this.alertEl, this.alertMsg, msg);
  }

  hideAlert() {
    hideAlert(this.alertEl);
  }

  async _handleLogin() {
    const username = this.userInput.value.trim();
    const password = this.passInput.value;
    const remember = document.getElementById('remember-me')?.checked;

    /**
     * Frontend-only Validation: 
     * Why? Checking basic criteria (length, etc.) in the browser 
     * saves server resources and provides instant feedback to the user.
     */
    const errors = {};
    let valid = true;
    valid = validateField(this.userInput, username.length >= 3,
      'Username must be at least 3 characters.', errors) && valid;
    valid = validateField(this.passInput, password.length >= 6,
      'Password must be at least 6 characters.', errors) && valid;

    if (!valid) {
      const firstErr = Object.values(errors)[0];
      showAlert(this.alertEl, this.alertMsg, firstErr);
      return;
    }

    setLoading(this.btnLogin, this.spinner, this.btnLogin.querySelector('.btn-text'), true);
    hideAlert(this.alertEl);

    try {
      // ES9 async/await + destructuring
      const { token, username: uname, expiration } = await AuthService.login(username, password);

      // Persist token, user
      TokenStore.set(token);
      TokenStore.setUser({ username: uname, expiration });

      // Handle remember me
      if (remember) {
        localStorage.setItem('qm_remember', username);
      } else {
        localStorage.removeItem('qm_remember');
      }

      Toast.success(`Welcome back, ${uname}! 🎉`);
      await delayedRedirect('dashboard.html', 900);

    } catch (err) {
      showAlert(this.alertEl, this.alertMsg, err.message || 'Login failed. Please try again.');
      this.passInput.value = '';
      this.passInput.focus();
    } finally {
      setLoading(this.btnLogin, this.spinner, this.btnLogin.querySelector('.btn-text'), false);
    }
  }
}

/* ═══════════════════════════════════════════════
   SIGNUP PAGE
═══════════════════════════════════════════════ */
class SignupPage {
  constructor() {
    this.form          = document.getElementById('signup-form');
    this.userInput     = document.getElementById('signup-username');
    this.passInput     = document.getElementById('signup-password');
    this.confirmInput  = document.getElementById('signup-confirm');
    this.togglePw      = document.getElementById('toggle-signup-pw');
    this.toggleConfirm = document.getElementById('toggle-confirm-pw');
    this.btnSignup     = document.getElementById('btn-signup');
    this.spinner       = document.getElementById('signup-spinner');
    this.alertEl       = document.getElementById('signup-alert');
    this.alertMsg      = document.getElementById('signup-alert-msg');
    this.successEl     = document.getElementById('signup-success');
    this.termsCheck    = document.getElementById('accept-terms');
    this.btnGoogle     = document.getElementById('btn-google-signup');

    // Strength bar elements
    this.strengthBars  = [
      document.getElementById('s1'),
      document.getElementById('s2'),
      document.getElementById('s3'),
      document.getElementById('s4'),
    ];
    this.strengthLabel = document.getElementById('strength-label');

    if (!this.form) return;  // Not on signup page
    this._init();
  }

  _init() {
    if (TokenStore.isLoggedIn()) {
      window.location.href = 'dashboard.html';
      return;
    }

    // Shared Google logic
    GoogleAuthHelper.init(this.btnGoogle, this);

    bindPasswordToggle(this.togglePw,      this.passInput);
    bindPasswordToggle(this.toggleConfirm, this.confirmInput);

    // Real-time password strength
    this.passInput?.addEventListener('input', () => {
      this._updateStrength(this.passInput.value);
      hideAlert(this.alertEl);
    });

    // Clear errors on input
    [this.userInput, this.passInput, this.confirmInput].forEach(el => {
      el?.addEventListener('input', () => {
        el.style.borderColor = '';
        hideAlert(this.alertEl);
      });
    });

    this.form.addEventListener('submit', (e) => {
      e.preventDefault();
      this._handleSignup();
    });
  }

  /** Password strength scoring (returns 0–4) */
  _scorePassword(pw) {
    let score = 0;
    if (pw.length >= 6)                          score++;
    if (pw.length >= 10)                         score++;
    if (/[A-Z]/.test(pw) && /[a-z]/.test(pw))   score++;
    if (/[0-9]/.test(pw) && /[^a-zA-Z0-9]/.test(pw)) score++;
    return score;
  }

  _updateStrength(pw) {
    const score  = this._scorePassword(pw);
    const levels = [
      { color: 'transparent', label: '' },
      { color: 'var(--clr-danger)',  label: 'Weak' },
      { color: 'var(--clr-warning)', label: 'Fair' },
      { color: '#60a5fa',            label: 'Good' },
      { color: 'var(--clr-success)', label: 'Strong 💪' },
    ];

    const level = pw.length === 0 ? levels[0] : levels[score] ?? levels[1];

    this.strengthBars.forEach((bar, i) => {
      if (!bar) return;
      bar.style.background = i < score ? level.color : 'var(--clr-border)';
    });

    if (this.strengthLabel) {
      this.strengthLabel.textContent = level.label;
      this.strengthLabel.style.color = level.color;
    }
  }

  async _handleSignup() {
    const username  = this.userInput?.value.trim()   ?? '';
    const password  = this.passInput?.value          ?? '';
    const confirm   = this.confirmInput?.value       ?? '';
    const accepted  = this.termsCheck?.checked       ?? false;

    // Validation chain
    const errors = {};
    let valid = true;

    valid = validateField(this.userInput, username.length >= 3,
      'Username must be at least 3 characters.', errors) && valid;

    valid = validateField(this.passInput, password.length >= 6,
      'Password must be at least 6 characters.', errors) && valid;

    valid = validateField(this.confirmInput, password === confirm,
      'Passwords do not match.', errors) && valid;

    if (!accepted) {
      valid = false;
      showAlert(this.alertEl, this.alertMsg, 'Please accept the Terms & Privacy to continue.');
      return;
    }

    if (!valid) {
      showAlert(this.alertEl, this.alertMsg, Object.values(errors)[0]);
      return;
    }

    setLoading(this.btnSignup, this.spinner, this.btnSignup.querySelector('.btn-text'), true);
    hideAlert(this.alertEl);

    try {
      const { token, username: uname } = await AuthService.register(username, password);

      TokenStore.set(token);
      TokenStore.setUser({ username: uname });

      // Show success, then redirect
      this.successEl?.classList.remove('hidden');
      this.successEl?.classList.add('show');
      this.form.classList.add('hidden');

      Toast.success('Account created successfully! 🎉');
      await delayedRedirect('dashboard.html', 1500);

    } catch (err) {
      showAlert(this.alertEl, this.alertMsg, err.message || 'Registration failed. Try a different username.');
    } finally {
      this.setLoading(false);
    }
  }

  setLoading(loading) {
    setLoading(this.btnSignup, this.spinner, this.btnSignup?.querySelector('.btn-text'), loading);
  }

  showAlert(msg) {
    showAlert(this.alertEl, this.alertMsg, msg);
  }

  hideAlert() {
    hideAlert(this.alertEl);
    this.successEl?.classList.add('hidden');
  }
}

/* ═══════════════════════════════════════════════
   BOOTSTRAP — determine which page we're on
═══════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('login-form'))  new LoginPage();
  if (document.getElementById('signup-form')) new SignupPage();
});
