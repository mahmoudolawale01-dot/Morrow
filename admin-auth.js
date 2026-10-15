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
  authIntro.textContent = hasAccount ? 'Sign in to manage the catalog.' : 'Create an admin password for this browser to continue.';
  confirmInput.hidden = hasAccount;
  confirmLabel.hidden = hasAccount;
  passwordInput.autocomplete = hasAccount ? 'current-password' : 'new-password';
  confirmInput.required = !hasAccount;
  authSubmit.innerHTML = hasAccount ? 'Sign in <span>→</span>' : 'Create admin account <span>→</span>';
}

authForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const username = usernameInput.value.trim();
  const password = passwordInput.value;
  const account = readAccount();

  if (password.length < 8) {
    showMessage('Use at least 8 characters for the admin password.');
    return;
  }

  authSubmit.disabled = true;
  const passwordHash = await hashPassword(password);

  if (!account) {
    if (password !== confirmInput.value) {
      showMessage('The passwords do not match.');
      authSubmit.disabled = false;
      return;
    }
    localStorage.setItem(ADMIN_ACCOUNT_KEY, JSON.stringify({ username, passwordHash }));
    sessionStorage.setItem(ADMIN_SESSION_KEY, 'authenticated');
    setAuthenticated(true);
    return;
  }

  if (username !== account.username || passwordHash !== account.passwordHash) {
    showMessage('The username or password is incorrect.');
    authSubmit.disabled = false;
    return;
  }

  sessionStorage.setItem(ADMIN_SESSION_KEY, 'authenticated');
  setAuthenticated(true);
});

document.querySelector('#admin-logout').addEventListener('click', () => {
  sessionStorage.removeItem(ADMIN_SESSION_KEY);
  authForm.reset();
  authSubmit.disabled = false;
  showMessage('');
  setMode();
  setAuthenticated(false);
});

setMode();
setAuthenticated(sessionStorage.getItem(ADMIN_SESSION_KEY) === 'authenticated' && Boolean(readAccount()));