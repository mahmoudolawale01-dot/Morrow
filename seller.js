const authPanel = document.querySelector('#seller-auth-panel');
const dashboardPanel = document.querySelector('#seller-dashboard');
const sellerForm = document.querySelector('#seller-form');
const authForm = document.querySelector('#seller-auth-form');
const authTabs = document.querySelectorAll('.seller-auth-tab');
const authMessage = document.querySelector('#seller-auth-message');
const sellerMessage = document.querySelector('#seller-message');
const submissionsContainer = document.querySelector('#seller-submissions');
const sellerWelcome = document.querySelector('#seller-welcome');

function setSellerMode(mode) {
  const isSignup = mode === 'signup';
  authTabs.forEach((tab) => {
    const active = tab.dataset.sellerMode === mode;
    tab.classList.toggle('active', active);
    tab.setAttribute('aria-selected', String(active));
  });

  const nameField = document.querySelector('.seller-name-field');
  const nameInput = document.querySelector('#seller-auth-name');
  const phoneField = document.querySelector('.seller-phone-field');
  const phoneInput = document.querySelector('#seller-auth-phone');
  const addressField = document.querySelector('.seller-address-field');
  const addressInput = document.querySelector('#seller-auth-address');
  if (nameField && nameInput) {
    nameField.hidden = !isSignup;
    nameInput.required = isSignup;
  }
  if (phoneField && phoneInput && addressField && addressInput) {
    phoneField.hidden = !isSignup;
    phoneInput.required = isSignup;
    addressField.hidden = !isSignup;
    addressInput.required = isSignup;
  }

  const submitButton = authForm.querySelector('button[type="submit"]');
  if (submitButton) {
    submitButton.innerHTML = isSignup ? 'Create seller account <span>↗</span>' : 'Log in <span>↗</span>';
  }

  authMessage.textContent = '';
}

function renderSubmissions(submissions) {
  if (!submissions.length) {
    submissionsContainer.innerHTML = '<p class="empty-state">No submissions yet. Add your first piece to begin the review process.</p>';
    return;
  }

  submissionsContainer.innerHTML = submissions.map((submission) => `
    <article class="submission-item">
      <div class="submission-media"><img src="${submission.image || 'https://images.unsplash.com/photo-1517705008128-361805f42e86?auto=format&fit=crop&w=800&q=85'}" alt="${submission.name}" /></div>
      <div class="submission-copy">
        <div><strong>${submission.name}</strong><span>${submission.seller} · ${submission.category} · $${Number(submission.price || 0)}</span></div>
        <span class="status-pill">${submission.status}</span>
      </div>
    </article>
  `).join('');
}

async function refreshSellerSubmissions() {
  try {
    const response = await window.MorrowApi.apiRequest('/api/seller/submissions');
    renderSubmissions(Array.isArray(response.submissions) ? response.submissions : []);
  } catch (error) {
    submissionsContainer.innerHTML = `<p class="empty-state">${error.message || 'Unable to load your submissions right now.'}</p>`;
  }
}

async function getCurrentSellerUser() {
  if (!window.MorrowApi) {
    return null;
  }

  try {
    const response = await window.MorrowApi.apiRequest('/api/auth/me');
    if (!response.user) return null;
    return ['seller', 'admin'].includes(response.user.role) ? response.user : null;
  } catch {
    return null;
  }
}

function showSellerDashboard(user) {
  const name = user?.name || user?.email || 'Seller';
  sellerWelcome.textContent = `Welcome back, ${name}.`;
  authPanel.hidden = true;
  dashboardPanel.hidden = false;
  document.querySelector('#seller-name').value = name;
  document.querySelector('#seller-email').value = user?.email || '';
}

function showSellerAuth() {
  authPanel.hidden = false;
  dashboardPanel.hidden = true;
}

authTabs.forEach((tab) => {
  tab.addEventListener('click', () => setSellerMode(tab.dataset.sellerMode));
});

authForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const isSignup = authForm.querySelector('.seller-name-field')?.hidden === false;
  const email = document.querySelector('#seller-auth-email').value.trim().toLowerCase();
  const password = document.querySelector('#seller-auth-password').value;
  const name = document.querySelector('#seller-auth-name').value.trim();
  const phone = document.querySelector('#seller-auth-phone').value.trim();
  const address = document.querySelector('#seller-auth-address').value.trim();

  if (!email || !password || (isSignup && (!name || !phone || !address))) {
    authMessage.textContent = 'Enter your name, email, phone number, address, and password to create a seller account.';
    return;
  }

  try {
    const endpoint = isSignup ? '/api/auth/register' : '/api/auth/login';
    const payload = isSignup ? { name, email, phone, address, password, role: 'vendor' } : { email, password };
    const response = await window.MorrowApi.apiRequest(endpoint, {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (!response.user || !['seller', 'admin'].includes(response.user.role)) {
      throw new Error('This account does not have seller access.');
    }

    showSellerDashboard(response.user);
    await refreshSellerSubmissions();
  } catch (error) {
    authMessage.textContent = error.message || 'Unable to continue with that seller account.';
  }
});

sellerForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const payload = {
    seller: document.querySelector('#seller-name').value.trim(),
    email: document.querySelector('#seller-email').value.trim(),
    name: document.querySelector('#seller-product').value.trim(),
    category: document.querySelector('#seller-category').value,
    price: Number(document.querySelector('#seller-price').value),
    image: document.querySelector('#seller-image').value.trim(),
    description: document.querySelector('#seller-description').value.trim(),
    material: document.querySelector('#seller-material').value.trim(),
  };

  try {
    await window.MorrowApi.apiRequest('/api/seller/submissions', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    sellerMessage.textContent = 'Your piece has been sent for review.';
    sellerForm.reset();
    document.querySelector('#seller-name').value = payload.seller;
    document.querySelector('#seller-email').value = payload.email;
    await refreshSellerSubmissions();
  } catch (error) {
    sellerMessage.textContent = error.message || 'Unable to submit your item right now.';
  }
});

document.querySelector('#seller-signout').addEventListener('click', async () => {
  try {
    await window.MorrowApi.apiRequest('/api/auth/logout', { method: 'POST' });
  } catch {
    // Ignore logout failures and leave the seller page in a safe state.
  }

  authForm.reset();
  sellerForm.reset();
  sellerMessage.textContent = '';
  showSellerAuth();
});

setSellerMode(new URLSearchParams(window.location.search).get('mode') === 'signup' ? 'signup' : 'login');

(async () => {
  const sellerUser = await getCurrentSellerUser();
  if (sellerUser) {
    showSellerDashboard(sellerUser);
    await refreshSellerSubmissions();
    return;
  }

  showSellerAuth();
})();
