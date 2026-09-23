const SELLER_SUBMISSIONS_KEY = 'morrow-seller-submissions';
const sellerForm = document.querySelector('#seller-form');

function loadSubmissions() {
  try {
    return JSON.parse(localStorage.getItem(SELLER_SUBMISSIONS_KEY)) || [];
  } catch {
    return [];
  }
}

sellerForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const submission = {
    id: `submission-${Date.now()}`,
    seller: document.querySelector('#seller-name').value.trim(),
    email: document.querySelector('#seller-email').value.trim(),
    name: document.querySelector('#seller-product').value.trim(),
    category: document.querySelector('#seller-category').value,
    price: Number(document.querySelector('#seller-price').value),
    image: document.querySelector('#seller-image').value.trim(),
    description: document.querySelector('#seller-description').value.trim(),
    material: document.querySelector('#seller-material').value.trim(),
    status: 'Pending review',
    submittedAt: new Date().toISOString(),
  };
  const submissions = loadSubmissions();
  submissions.unshift(submission);
  localStorage.setItem(SELLER_SUBMISSIONS_KEY, JSON.stringify(submissions));
  document.querySelector('#seller-message').textContent = 'Your piece has been sent for review.';
  sellerForm.reset();
});
