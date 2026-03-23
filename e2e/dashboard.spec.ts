/**
 * RelancePro Africa - Dashboard E2E Tests
 * Tests for dashboard components, KPIs, charts, and navigation
 */

import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test@relancepro.africa');
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 30000 });
  });

  test.describe('Dashboard Overview', () => {
    test('should display dashboard after login', async ({ page }) => {
      await expect(page).toHaveURL(/.*dashboard/);
      
      // Check main dashboard elements
      await expect(page.locator('h1, h2')).toContainText(/tableau de bord|dashboard/i);
    });

    test('should display KPI cards', async ({ page }) => {
      await page.goto('/dashboard');
      
      // Check for KPI cards
      const kpiCards = page.locator('[data-testid="kpi-card"], .kpi-card, [class*="stat"]').first();
      await expect(kpiCards).toBeVisible({ timeout: 10000 });
      
      // Check for specific KPIs
      await expect(page.locator('text=/clients?/i')).toBeVisible();
      await expect(page.locator('text=/dettes?|debts/i')).toBeVisible();
      await expect(page.locator('text=/recouvr/i')).toBeVisible();
    });

    test('should display revenue chart', async ({ page }) => {
      await page.goto('/dashboard');
      
      // Look for chart container
      const chart = page.locator('[data-testid="revenue-chart"], [class*="chart"]').first();
      await expect(chart).toBeVisible({ timeout: 10000 });
    });

    test('should display recent activities', async ({ page }) => {
      await page.goto('/dashboard');
      
      // Look for activity feed or recent items
      const activities = page.locator('[data-testid="activities"], [class*="activity"], [class*="recent"]').first();
      await expect(activities).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Date Range Filtering', () => {
    test('should have date range picker', async ({ page }) => {
      await page.goto('/dashboard');
      
      // Look for date picker
      const datePicker = page.locator('[data-testid="date-range-picker"], button:has-text("date"), [class*="date-picker"]').first();
      await expect(datePicker).toBeVisible({ timeout: 10000 });
    });

    test('should filter data by date range', async ({ page }) => {
      await page.goto('/dashboard');
      
      // Open date picker
      await page.click('[data-testid="date-range-picker"], button:has-text("date")');
      
      // Select last 7 days
      await page.click('text=/7 jours|7 days|last week/i');
      
      // Wait for data to refresh
      await page.waitForTimeout(1000);
      
      // Verify filter is applied
      await expect(page.locator('text=/7 jours|7 days/i')).toBeVisible();
    });

    test('should allow custom date range', async ({ page }) => {
      await page.goto('/dashboard');
      
      // Open date picker
      await page.click('[data-testid="date-range-picker"], button:has-text("date")');
      
      // Look for custom range option
      await page.click('text=/personnalisé|custom/i');
      
      // Check for date inputs
      await expect(page.locator('input[type="date"], [class*="calendar"]')).toBeVisible();
    });
  });

  test.describe('Charts and Visualizations', () => {
    test('should display debt status chart', async ({ page }) => {
      await page.goto('/dashboard');
      
      // Look for debt chart
      const chart = page.locator('[data-testid="debt-chart"], [class*="chart"]:near(:text("dettes"))').first();
      await expect(chart).toBeVisible({ timeout: 10000 });
    });

    test('should display recovery rate chart', async ({ page }) => {
      await page.goto('/dashboard');
      
      // Look for recovery chart
      const chart = page.locator('[data-testid="recovery-chart"], [class*="chart"]:near(:text("recouvr"))').first();
      await expect(chart).toBeVisible({ timeout: 10000 });
    });

    test('should be interactive (hover tooltips)', async ({ page }) => {
      await page.goto('/dashboard');
      
      // Find a chart element
      const chartBar = page.locator('[class*="recharts-bar-rectangle"], [class*="chart-bar"]').first();
      
      if (await chartBar.isVisible()) {
        // Hover over it
        await chartBar.hover();
        
        // Look for tooltip
        await expect(page.locator('[class*="tooltip"], [class*="recharts-tooltip"]')).toBeVisible();
      }
    });
  });

  test.describe('Quick Actions', () => {
    test('should have quick action buttons', async ({ page }) => {
      await page.goto('/dashboard');
      
      // Look for quick action buttons
      await expect(page.locator('button:has-text("Nouveau"), button:has-text("New"), a:has-text("+")')).toBeVisible({ timeout: 10000 });
    });

    test('should navigate to add client from dashboard', async ({ page }) => {
      await page.goto('/dashboard');
      
      // Click add client button
      await page.click('button:has-text("client"), a:has-text("client"):has-text("+")');
      
      // Should navigate to client form
      await expect(page).toHaveURL(/.*clients.*new|.*clients.*create/);
    });

    test('should navigate to add debt from dashboard', async ({ page }) => {
      await page.goto('/dashboard');
      
      // Click add debt button
      await page.click('button:has-text("dette"), a:has-text("dette"):has-text("+")');
      
      // Should navigate to debt form
      await expect(page).toHaveURL(/.*debts.*new|.*debts.*create/);
    });
  });

  test.describe('Top Debtors Table', () => {
    test('should display top debtors', async ({ page }) => {
      await page.goto('/dashboard');
      
      // Look for top debtors section
      const table = page.locator('[data-testid="top-debtors"], [class*="table"]:near(:text("debtor|débiteur"))').first();
      await expect(table).toBeVisible({ timeout: 10000 });
    });

    test('should navigate to client details from table', async ({ page }) => {
      await page.goto('/dashboard');
      
      // Find and click a debtor row
      const debtorRow = page.locator('[data-testid="debtor-row"], tbody tr').first();
      
      if (await debtorRow.isVisible()) {
        await debtorRow.click();
        
        // Should navigate to client details
        await expect(page).toHaveURL(/.*clients\/.+/);
      }
    });
  });

  test.describe('Notifications on Dashboard', () => {
    test('should show notification badge', async ({ page }) => {
      await page.goto('/dashboard');
      
      // Look for notification bell
      const bell = page.locator('[data-testid="notifications"], [aria-label*="notification"]').first();
      await expect(bell).toBeVisible({ timeout: 10000 });
    });

    test('should open notifications panel', async ({ page }) => {
      await page.goto('/dashboard');
      
      // Click notification bell
      await page.click('[data-testid="notifications"], [aria-label*="notification"]');
      
      // Check for notifications dropdown
      await expect(page.locator('[role="dialog"], [class*="dropdown"], [class*="popover"]')).toBeVisible();
    });
  });

  test.describe('Dashboard Responsiveness', () => {
    test('should display correctly on mobile', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      await page.goto('/dashboard');
      
      // Check that dashboard renders
      await expect(page.locator('h1, h2')).toBeVisible();
      
      // Check that mobile menu is accessible
      const menu = page.locator('[data-testid="mobile-menu"], [aria-label*="menu"]').first();
      await expect(menu).toBeVisible();
    });

    test('should display correctly on tablet', async ({ page }) => {
      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });
      
      await page.goto('/dashboard');
      
      // Check that dashboard renders
      await expect(page.locator('h1, h2')).toBeVisible();
    });
  });
});

test.describe('Dashboard Analytics', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test@relancepro.africa');
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 30000 });
  });

  test('should display analytics page', async ({ page }) => {
    await page.goto('/analytics');
    
    // Check for analytics content
    await expect(page.locator('h1, h2')).toContainText(/analytique|analytics/i);
  });

  test('should have chart filters', async ({ page }) => {
    await page.goto('/analytics');
    
    // Look for filter options
    await expect(page.locator('select, [role="combobox"]').first()).toBeVisible();
  });
});
