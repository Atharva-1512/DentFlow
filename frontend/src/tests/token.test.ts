import { describe, it, expect, beforeEach } from 'vitest';
import { getAccessToken, getRefreshToken, setTokens, clearTokens } from '../utils/token';

describe('Token Utilities', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should store and retrieve access and refresh tokens', () => {
    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();

    setTokens('access-token-123', 'refresh-token-456');

    expect(getAccessToken()).toBe('access-token-123');
    expect(getRefreshToken()).toBe('refresh-token-456');
  });

  it('should clear tokens correctly', () => {
    setTokens('access-token-123', 'refresh-token-456');
    clearTokens();

    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
  });
});
