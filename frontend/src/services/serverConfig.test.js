import { normalizeServerUrl } from './serverConfig';

describe('serverConfig.normalizeServerUrl', () => {
  test('empty -> empty', () => {
    expect(normalizeServerUrl('')).toBe('');
    expect(normalizeServerUrl('   ')).toBe('');
  });

  test('host:port -> http://host:port', () => {
    expect(normalizeServerUrl('127.0.0.1:8444')).toBe('http://127.0.0.1:8444');
    expect(normalizeServerUrl('localhost:8444')).toBe('http://localhost:8444');
  });

  test('port shorthand -> localhost', () => {
    expect(normalizeServerUrl(':8444')).toBe('http://127.0.0.1:8444');
    expect(normalizeServerUrl('8444')).toBe('http://127.0.0.1:8444');
  });

  test('keeps scheme and strips trailing slash', () => {
    expect(normalizeServerUrl('http://localhost:8444/')).toBe('http://localhost:8444');
    expect(normalizeServerUrl('https://example.com/')).toBe('https://example.com');
  });

  test('invalid -> empty', () => {
    expect(normalizeServerUrl('not a url')).toBe('');
    expect(normalizeServerUrl('http://')).toBe('');
  });
});

