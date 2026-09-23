const signupForm = document.querySelector('.signup-form');

if (signupForm) {
  signupForm.addEventListener('submit', (event) => {
    event.preventDefault();
    signupForm.querySelector('.form-message').textContent = 'You are on the list. Welcome to Morrow.';
    signupForm.querySelector('input').value = '';
  });
}
