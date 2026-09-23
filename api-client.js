const MORROW_API_URL = 'http://127.0.0.1:3001';

async function apiRequest(path, options = {}) {
  const response = await fetch(`${MORROW_API_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {}),
    },
  });

  let payload = {};
  try {
    payload = await response.json();
  } catch {
    payload = { error: 'The server returned an invalid response.' };
  }

  if (!response.ok) {
    throw new Error(payload.error || 'The request could not be completed.');
  }

  return payload;
}

window.MorrowApi = { apiRequest };
