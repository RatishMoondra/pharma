/**
 * Playwright Authentication Helper
 * Handles login, logout, and authentication state management
 */

import { expect, Page } from '@playwright/test';

export class AuthHelper {
  constructor(private page: Page) {}

  /**
   * Login with username and password
   */
  async login(username: string, password: string) {
    await this.page.goto('/login');
    
    // Fill login form
    await this.page.getByLabel(/username/i).fill(username);
    await this.page.getByLabel(/password/i).fill(password);
    
    // Submit form
    await this.page.getByRole('button', { name: /login|sign in/i }).click();
    
    // Wait for successful navigation (dashboard or home page)
    await this.page.waitForURL(/\/(dashboard|home|pi)/);
    
    // Verify user is logged in (check for logout button or user profile)
    await expect(this.page.getByRole('button', { name: /logout/i })).toBeVisible();
  }

  /**
   * Login as admin user
   */
  async loginAsAdmin() {
    await this.login('admin', 'admin123');
  }

  /**
   * Login as procurement officer
   */
  async loginAsProcurement() {
    await this.login('procurement', 'procurement123');
  }

  /**
   * Login as warehouse manager
   */
  async loginAsWarehouse() {
    await this.login('warehouse', 'warehouse123');
  }

  /**
   * Logout current user
   */
  async logout() {
    await this.page.getByRole('button', { name: /logout/i }).click();
    
    // Wait for redirect to login page
    await this.page.waitForURL(/\/login/);
  }

  /**
   * Check if user is currently logged in
   */
  async isLoggedIn(): Promise<boolean> {
    const logoutButton = this.page.getByRole('button', { name: /logout/i });
    return await logoutButton.isVisible().catch(() => false);
  }

  /**
   * Get authentication token from localStorage
   */
  async getAuthToken(): Promise<string | null> {
    return await this.page.evaluate(() => localStorage.getItem('token'));
  }

  /**
   * Set authentication token in localStorage (bypass login)
   */
  async setAuthToken(token: string) {
    await this.page.evaluate((token) => {
      localStorage.setItem('token', token);
    }, token);
  }

  /**
   * Clear authentication state
   */
  async clearAuth() {
    await this.page.evaluate(() => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    });
  }
}

/**
 * Setup authentication for tests (global setup)
 */
export async function setupAuth(page: Page, role: 'admin' | 'procurement' | 'warehouse' = 'admin') {
  const auth = new AuthHelper(page);
  
  switch (role) {
    case 'admin':
      await auth.loginAsAdmin();
      break;
    case 'procurement':
      await auth.loginAsProcurement();
      break;
    case 'warehouse':
      await auth.loginAsWarehouse();
      break;
  }
  
  return auth;
}
