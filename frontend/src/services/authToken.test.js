import { clearAuthToken, getAuthToken, setAuthToken } from './authToken';

describe('authToken', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  test('setAuthToken trims and stores', () => {
    setAuthToken('  abc  ');
    expect(window.localStorage.getItem('pdh_auth_token')).toBe('abc');
    expect(getAuthToken()).toBe('abc');
  });

  test('clearAuthToken removes', () => {
    setAuthToken('abc');
    clearAuthToken();
    expect(window.localStorage.getItem('pdh_auth_token')).toBeNull();
    expect(getAuthToken()).toBeNull();
  });

  test('setAuthToken dispatches event', () => {
    const handler = jest.fn();
    window.addEventListener('pdh-auth-token-changed', handler);
    setAuthToken('abc');
    expect(handler).toHaveBeenCalled();
    window.removeEventListener('pdh-auth-token-changed', handler);
  });
});

