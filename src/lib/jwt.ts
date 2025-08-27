// JWT handling utilities
import { User } from './types';

export interface JWTPayload {
  id: string;
  email: string;
  nombre: string;
  rol: string;
  exp: number;
  iat: number;
}

export class JWTManager {
  private static readonly TOKEN_KEY = 'serves_platform_token';
  private static readonly USER_KEY = 'serves_platform_user';

  /**
   * Store JWT token in localStorage
   */
  static setToken(token: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.TOKEN_KEY, token);
    }
  }

  /**
   * Get JWT token from localStorage
   */
  static getToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(this.TOKEN_KEY);
    }
    return null;
  }

  /**
   * Remove JWT token from localStorage
   */
  static removeToken(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.TOKEN_KEY);
      localStorage.removeItem(this.USER_KEY);
    }
  }

  /**
   * Store user data in localStorage
   */
  static setUser(user: User): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    }
  }

  /**
   * Get user data from localStorage
   */
  static getUser(): User | null {
    if (typeof window !== 'undefined') {
      const userData = localStorage.getItem(this.USER_KEY);
      if (userData) {
        try {
          return JSON.parse(userData);
        } catch {
          return null;
        }
      }
    }
    return null;
  }

  /**
   * Decode JWT payload (client-side only for UI purposes)
   * Note: This is not for security validation, only for reading user info
   */
  static decodeToken(token: string): JWTPayload | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;

      const payload = JSON.parse(atob(parts[1]));
      return payload;
    } catch {
      return null;
    }
  }

  /**
   * Check if token is expired (client-side check)
   */
  static isTokenExpired(token: string): boolean {
    const payload = this.decodeToken(token);
    if (!payload) return true;

    const now = Math.floor(Date.now() / 1000);
    return payload.exp < now;
  }

  /**
   * Check if user is authenticated
   */
  static isAuthenticated(): boolean {
    const token = this.getToken();
    if (!token) return false;

    return !this.isTokenExpired(token);
  }

  /**
   * Clear all authentication data
   */
  static logout(): void {
    this.removeToken();
  }
}