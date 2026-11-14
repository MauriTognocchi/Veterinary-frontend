import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class TokenStorageService {
  private readonly ACCESS_TOKEN_KEY = 'accessToken';
  private readonly REFRESH_TOKEN_KEY = 'refreshToken';

  private isStorageAvailable(): boolean {
    try {
      if (typeof sessionStorage === 'undefined') {
        return false;
      }
      const testKey = '__token_storage_test__';
      sessionStorage.setItem(testKey, 'test');
      sessionStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  getAccessToken(): string | null {
    if (!this.isStorageAvailable()) {
      return null;
    }
    try {
      return sessionStorage.getItem(this.ACCESS_TOKEN_KEY);
    } catch {
      return null;
    }
  }

  getRefreshToken(): string | null {
    if (!this.isStorageAvailable()) {
      return null;
    }
    try {
      return sessionStorage.getItem(this.REFRESH_TOKEN_KEY);
    } catch {
      return null;
    }
  }

  setTokens(accessToken: string, refreshToken: string): void {
    if (!this.isStorageAvailable()) {
      return;
    }
    try {
      sessionStorage.setItem(this.ACCESS_TOKEN_KEY, accessToken);
      sessionStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken);
    } catch {
      // Ignore storage errors
    }
  }

  clearTokens(): void {
    if (!this.isStorageAvailable()) {
      return;
    }
    try {
      sessionStorage.removeItem(this.ACCESS_TOKEN_KEY);
      sessionStorage.removeItem(this.REFRESH_TOKEN_KEY);
    } catch {
      // Ignore storage errors
    }
  }
}
