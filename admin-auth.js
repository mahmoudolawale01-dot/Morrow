const ADMIN_ACCOUNT_KEY = 'morrow-admin-account';
const ADMIN_SESSION_KEY = 'morrow-admin-session';

const authPanel = document.querySelector('#admin-auth');
const authForm = document.querySelector('#admin-auth-form');
const authIntro = document.querySelector('#admin-auth-intro');
const authMessage = document.querySelector('#admin-auth-message');
const authSubmit = document.querySelector('#admin-auth-submit');
const usernameInput = document.querySelector('#admin-username');
const passwordInput = document.querySelector('#admin-password');
const confirmInput = document.querySelector('#admin-confirm-password');
const confirmLabel = document.querySelector('#admin-confirm-label');
const protectedElements = document.querySelectorAll('.admin-protected');

function readAccount() {
  try {
    return JSON.parse(localStorage.getItem(ADMIN_ACCOUNT_KEY));
  } catch {
    return null;
  }
}

async function hashPassword(password) {
  const bytes = new TextEncoder().encode(password);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function setAuthenticated(authenticated) {
  authPanel.hidden = authenticated;
  protectedElements.forEach((element) => { element.hidden = !authenticated; });
  document.dispatchEvent(new CustomEvent('morrow-admin-auth-change', { detail: { authenticated } }));
}

function showMessage(message) {
  authMessage.textContent = message;
}

function setMode() {
  const hasAccount = Boolean(readAccount());
  authIntro.textContent = 'Sign in with the admin account to manage the catalog.';
  confirmInput.hidden = true;
  confirmLabel.hidden = true;
  passwordInput.autocomplete = 'current-password';
  confirmInput.required = false;
  authSubmit.innerHTML = hasAccount ? 'Sign in <span>→</span>' : 'Sign in <span>→</span>';
}

async function syncServerAdminAuth() {
  if (!window.MorrowApi) return false;

  try {
    const response = await window.MorrowApi.apiRequest('/api/auth/me');
    if (response.user && response.user.role === 'admin') {
      localStorage.setItem(ADMIN_ACCOUNT_KEY, JSON.stringify({ username: response.user.email }));
      sessionStorage.setItem(ADMIN_SESSION_KEY, 'authenticated');
      setAuthenticated(true);
      return true;
    }
  } catch {
    // Fall back to the form for manual admin sign-in.
  }

  return false;
}

authForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const email = usernameInput.value.trim().toLowerCase();
  const password = passwordInput.value;

  if (!email || !password) {
    showMessage('Enter the admin email and password.');
    return;
  }

  if (password.length < 8) {
    showMessage('Use at least 8 characters for the admin password.');
    return;
  }

  authSubmit.disabled = true;

  try {
    const response = await window.MorrowApi.apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (!response.user || response.user.role !== 'admin') {
      throw new Error('This account does not have admin access.');
    }

    localStorage.setItem(ADMIN_ACCOUNT_KEY, JSON.stringify({ username: response.user.email }));
    sessionStorage.setItem(ADMIN_SESSION_KEY, 'authenticated');
    setAuthenticated(true);
  } catch (error) {
    showMessage(error.message || 'The admin email or password is incorrect.');
    authSubmit.disabled = false;
  }
});

document.querySelector('#admin-logout').addEventListener('click', () => {
  sessionStorage.removeItem(ADMIN_SESSION_KEY);
  authForm.reset();
  authSubmit.disabled = false;
  showMessage('');
  setMode();
  setAuthenticated(false);
  if (window.MorrowApi) {
    window.MorrowApi.apiRequest('/api/auth/logout', { method: 'POST' }).catch(() => {});
  }
});

setMode();
(async () => {
  const authenticated = await syncServerAdminAuth();
  if (!authenticated) {
    setAuthenticated(sessionStorage.getItem(ADMIN_SESSION_KEY) === 'authenticated' && Boolean(readAccount()));
  }
})();