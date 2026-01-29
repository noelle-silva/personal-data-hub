const STORAGE_KEY = 'pdh_auth_token';

export const getAuthToken = () => {
  if (typeof window === 'undefined') return null;
  try {
    const token = window.localStorage.getItem(STORAGE_KEY);
    return token && token.trim() ? token.trim() : null;
  } catch {
    return null;
  }
};

export const setAuthToken = (token) => {
  if (typeof window === 'undefined') return;
  try {
    const normalized = token && token.trim() ? token.trim() : '';
    if (!normalized) {
      window.localStorage.removeItem(STORAGE_KEY);
    } else {
      window.localStorage.setItem(STORAGE_KEY, normalized);
    }
    window.dispatchEvent(new CustomEvent('pdh-auth-token-changed'));
  } catch {
    // ignore
  }
};

export const clearAuthToken = () => setAuthToken('');

