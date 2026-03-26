/**
 * RelancePro Africa - Authentication E2E Tests
 * Tests for login, register, password reset, and session management
 */

import { test, expect, Page } from '@playwright/test';

test.describe('Authentication', () => {
  test.describe.configure({ mode: 'parallel' });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display login page', async ({ page }) => {
    await page.goto('/login');
    
    // Check login form elements
    await expect(page.locator('h1, h2')).toContainText(/connexion|login/i);
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should show validation errors for invalid inputs', async ({ page }) => {
    await page.goto('/login');
    
    // Try to submit empty form
    await page.click('button[type="submit"]');
    
    // Check for validation errors
    await expect(page.locator('text=/email.*required|obligatoire/i')).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');
    
    // Fill in invalid credentials
    await page.fill('input[name="email"]', 'invalid@example.com');
    await page.fill('input[name="password"]', 'WrongPassword123!');
    await page.click('button[type="submit"]');
    
    // Check for error message
    await expect(page.locator('[role="alert"], .error, .toast')).toBeVisible({ timeout: 10000 });
  });

  test('should login successfully with valid credentials', async ({ page }) => {
    await page.goto('/login');
    
    // Fill in valid credentials
    await page.fill('input[name="email"]', 'test@relancepro.africa');
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    
    // Should redirect to dashboard
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 30000 });
    
    // Should show user menu or logout button
    await expect(page.locator('[data-testid="user-menu"], [aria-label*="user"], [aria-label*="profil"]')).toBeVisible();
  });

  test('should redirect to login when accessing protected routes', async ({ page }) => {
    // Try to access protected route without authentication
    await page.goto('/dashboard');
    
    // Should redirect to login
    await expect(page).toHaveURL(/.*login/, { timeout: 10000 });
  });

  test('should logout successfully', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test@relancepro.africa');
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 30000 });
    
    // Click logout
    await page.click('[data-testid="user-menu"], [aria-label*="user"]');
    await page.click('text=/déconnexion|logout|sign out/i');
    
    // Should redirect to login or home
    await expect(page).toHaveURL(/.*(login|\/)/, { timeout: 10000 });
    
    // Try to access protected route
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/.*login/, { timeout: 10000 });
  });

  test('should remember user session', async ({ page, context }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test@relancepro.africa');
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 30000 });
    
    // Reload page
    await page.reload();
    
    // Should still be logged in
    await expect(page).toHaveURL(/.*dashboard/);
  });

  test('should display registration page', async ({ page }) => {
    await page.goto('/register');
    
    // Check registration form elements
    await expect(page.locator('input[name="name"]')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should validate password requirements on registration', async ({ page }) => {
    await page.goto('/register');
    
    // Fill in weak password
    await page.fill('input[name="name"]', 'Test User');
    await page.fill('input[name="email"]', 'newuser@example.com');
    await page.fill('input[name="password"]', 'weak');
    
    // Check for password requirements
    await expect(page.locator('text=/8.*characters|longueur/i')).toBeVisible();
  });

  test('should register new user successfully', async ({ page }) => {
    await page.goto('/register');
    
    const uniqueEmail = `test-${Date.now()}@example.com`;
    
    await page.fill('input[name="name"]', 'New Test User');
    await page.fill('input[name="email"]', uniqueEmail);
    await page.fill('input[name="password"]', 'SecurePassword123!');
    await page.fill('input[name="confirmPassword"]', 'SecurePassword123!');
    await page.click('button[type="submit"]');
    
    // Should redirect to dashboard or show success
    await expect(page).toHaveURL(/.*(dashboard|verify-email|onboarding)/, { timeout: 30000 });
  });

  test('should show "forgot password" link', async ({ page }) => {
    await page.goto('/login');
    
    // Click forgot password
    await page.click('text=/mot de passe oublié|forgot password/i');
    
    // Should navigate to reset page
    await expect(page).toHaveURL(/.*forgot-password|reset-password/);
  });

  test('should handle password reset request', async ({ page }) => {
    await page.goto('/login');
    await page.click('text=/mot de passe oublié|forgot password/i');
    
    // Enter email
    await page.fill('input[name="email"]', 'test@relancepro.africa');
    await page.click('button[type="submit"]');
    
    // Should show success message
    await expect(page.locator('text=/email.*sent|envoyé/i')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Two-Factor Authentication', () => {
  test.skip('should prompt for 2FA code when enabled', async ({ page }) => {
    // Login with 2FA enabled user
    await page.goto('/login');
    await page.fill('input[name="email"]', '2fa-user@relancepro.africa');
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    
    // Should show 2FA input
    await expect(page.locator('input[name="code"], input[placeholder*="code"]')).toBeVisible();
  });

  test.skip('should verify valid 2FA code', async ({ page }) => {
    // This test requires a valid TOTP code
    // Implementation depends on your 2FA setup
  });
});

test.describe('Session Management', () => {
  test('should show active sessions', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test@relancepro.africa');
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 30000 });
    
    // Navigate to settings
    await page.goto('/settings/security');
    
    // Should show sessions
    await expect(page.locator('text=/session|appareil|device/i')).toBeVisible();
  });
});
