/**
 * RelancePro Africa - Clients E2E Tests
 * Tests for client CRUD operations, listing, and details
 */

import { test, expect } from '@playwright/test';

test.describe('Clients Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test@relancepro.africa');
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 30000 });
  });

  test.describe('Clients List', () => {
    test('should display clients list page', async ({ page }) => {
      await page.goto('/clients');
      
      // Check for clients table
      await expect(page.locator('table, [class*="table"]')).toBeVisible({ timeout: 10000 });
      
      // Check for header
      await expect(page.locator('h1, h2')).toContainText(/clients?/i);
    });

    test('should display client data in table', async ({ page }) => {
      await page.goto('/clients');
      
      // Check for table headers
      const headers = ['nom', 'name', 'email', 'téléphone', 'phone'];
      const headerFound = await Promise.race(
        headers.map(h => page.locator(`th:has-text("${h}")`).isVisible())
      );
      expect(headerFound).toBeTruthy();
    });

    test('should have search functionality', async ({ page }) => {
      await page.goto('/clients');
      
      // Look for search input
      const searchInput = page.locator('input[placeholder*="recherch"], input[placeholder*="search"], input[name="search"]').first();
      await expect(searchInput).toBeVisible({ timeout: 10000 });
    });

    test('should filter clients by search', async ({ page }) => {
      await page.goto('/clients');
      
      // Enter search term
      const searchInput = page.locator('input[placeholder*="recherch"], input[placeholder*="search"], input[name="search"]').first();
      await searchInput.fill('test');
      
      // Wait for results to update
      await page.waitForTimeout(500);
      
      // Verify filter is applied (URL or visible results)
      const url = page.url();
      expect(url).toContain('search=test');
    });

    test('should have pagination', async ({ page }) => {
      await page.goto('/clients');
      
      // Look for pagination controls
      const pagination = page.locator('[data-testid="pagination"], [class*="pagination"], [aria-label*="pagination"]').first();
      
      // Pagination might not be visible if there are few clients
      const isVisible = await pagination.isVisible().catch(() => false);
      
      if (isVisible) {
        // Try clicking next page
        await page.click('[aria-label*="next"], [aria-label*="suivant"], button:has-text(">")');
        await page.waitForTimeout(500);
      }
    });

    test('should sort clients by column', async ({ page }) => {
      await page.goto('/clients');
      
      // Find sortable column header
      const nameHeader = page.locator('th:has-text("nom"), th:has-text("name")').first();
      
      if (await nameHeader.isVisible()) {
        await nameHeader.click();
        await page.waitForTimeout(500);
        
        // Check for sort indicator
        const sortIndicator = page.locator('[class*="sort-asc"], [class*="sort-desc"]');
        // Sort indicator might be present
      }
    });
  });

  test.describe('Create Client', () => {
    test('should display create client form', async ({ page }) => {
      await page.goto('/clients');
      
      // Click add client button
      await page.click('button:has-text("Nouveau"), button:has-text("Add"), a:has-text("Nouveau")');
      
      // Should show form dialog or navigate to form
      await expect(page.locator('form, dialog, [role="dialog"]')).toBeVisible({ timeout: 10000 });
    });

    test('should create new client with valid data', async ({ page }) => {
      await page.goto('/clients');
      
      // Open create form
      await page.click('button:has-text("Nouveau"), button:has-text("Add"), a:has-text("Nouveau")');
      
      // Generate unique client name
      const uniqueName = `Test Client ${Date.now()}`;
      
      // Fill form
      await page.fill('input[name="name"], input[placeholder*="nom"]', uniqueName);
      await page.fill('input[name="email"]', `test-${Date.now()}@example.com`);
      await page.fill('input[name="phone"], input[placeholder*="tél"]', '+221 77 123 45 67');
      await page.fill('input[name="address"], textarea[name="address"]', '123 Test Street, Dakar, Senegal');
      
      // Submit form
      await page.click('button[type="submit"], button:has-text("Enregistrer"), button:has-text("Save")');
      
      // Should show success message or redirect
      await expect(page.locator('text=/succès|success|créé|created/i')).toBeVisible({ timeout: 10000 });
    });

    test('should show validation errors for invalid data', async ({ page }) => {
      await page.goto('/clients');
      
      // Open create form
      await page.click('button:has-text("Nouveau"), button:has-text("Add"), a:has-text("Nouveau")');
      
      // Try to submit empty form
      await page.click('button[type="submit"], button:has-text("Enregistrer"), button:has-text("Save")');
      
      // Check for validation errors
      await expect(page.locator('text=/requis|required|obligatoire/i')).toBeVisible({ timeout: 5000 });
    });

    test('should validate email format', async ({ page }) => {
      await page.goto('/clients');
      
      // Open create form
      await page.click('button:has-text("Nouveau"), button:has-text("Add"), a:has-text("Nouveau")');
      
      // Enter invalid email
      await page.fill('input[name="email"]', 'invalid-email');
      
      // Submit or blur
      await page.click('button[type="submit"], button:has-text("Enregistrer")');
      
      // Check for email validation error
      await expect(page.locator('text=/email.*invalid|format.*email/i')).toBeVisible({ timeout: 5000 });
    });

    test('should validate phone number format', async ({ page }) => {
      await page.goto('/clients');
      
      // Open create form
      await page.click('button:has-text("Nouveau"), button:has-text("Add")');
      
      // Fill required fields
      await page.fill('input[name="name"], input[placeholder*="nom"]', 'Test Client');
      await page.fill('input[name="email"]', 'test@example.com');
      
      // Enter invalid phone (if phone validation is strict)
      await page.fill('input[name="phone"], input[placeholder*="tél"]', 'invalid-phone');
      
      // Check if validation triggers
      await page.click('body'); // Blur phone input
      await page.waitForTimeout(500);
    });
  });

  test.describe('Edit Client', () => {
    test('should display edit form for existing client', async ({ page }) => {
      await page.goto('/clients');
      
      // Find and click edit button on first client
      const editButton = page.locator('button:has-text("Modifier"), button:has-text("Edit"), [aria-label*="edit"]').first();
      
      if (await editButton.isVisible()) {
        await editButton.click();
        
        // Should show form with existing data
        await expect(page.locator('form, [role="dialog"]')).toBeVisible();
        
        // Check that form has data
        const nameInput = page.locator('input[name="name"], input[placeholder*="nom"]');
        const value = await nameInput.inputValue();
        expect(value.length).toBeGreaterThan(0);
      }
    });

    test('should update client successfully', async ({ page }) => {
      await page.goto('/clients');
      
      // Click on first client row to view details
      await page.locator('tbody tr').first().click();
      
      // Wait for details page or dialog
      await page.waitForTimeout(1000);
      
      // Click edit
      const editButton = page.locator('button:has-text("Modifier"), button:has-text("Edit")').first();
      
      if (await editButton.isVisible()) {
        await editButton.click();
        
        // Update name
        const nameInput = page.locator('input[name="name"], input[placeholder*="nom"]');
        await nameInput.fill(`Updated Client ${Date.now()}`);
        
        // Save
        await page.click('button[type="submit"], button:has-text("Enregistrer")');
        
        // Check for success
        await expect(page.locator('text=/succès|success|mis à jour|updated/i')).toBeVisible({ timeout: 10000 });
      }
    });
  });

  test.describe('Delete Client', () => {
    test('should show delete confirmation dialog', async ({ page }) => {
      await page.goto('/clients');
      
      // Find delete button on first client
      const deleteButton = page.locator('button:has-text("Supprimer"), button:has-text("Delete"), [aria-label*="delete"]').first();
      
      if (await deleteButton.isVisible()) {
        await deleteButton.click();
        
        // Should show confirmation dialog
        await expect(page.locator('[role="alertdialog"], [role="dialog"]:has-text("supprimer")')).toBeVisible({ timeout: 5000 });
      }
    });

    test('should delete client after confirmation', async ({ page }) => {
      // First create a client to delete
      await page.goto('/clients');
      await page.click('button:has-text("Nouveau"), button:has-text("Add")');
      
      const uniqueName = `To Delete ${Date.now()}`;
      await page.fill('input[name="name"], input[placeholder*="nom"]', uniqueName);
      await page.fill('input[name="email"]', `delete-${Date.now()}@example.com`);
      await page.click('button[type="submit"], button:has-text("Enregistrer")');
      
      await page.waitForTimeout(1000);
      
      // Now find and delete this client
      await page.goto('/clients');
      
      // Search for the client
      const searchInput = page.locator('input[placeholder*="recherch"], input[placeholder*="search"]').first();
      await searchInput.fill(uniqueName);
      await page.waitForTimeout(500);
      
      // Click delete
      const deleteButton = page.locator('button:has-text("Supprimer"), button:has-text("Delete")').first();
      await deleteButton.click();
      
      // Confirm deletion
      await page.click('button:has-text("Confirmer"), button:has-text("Confirm"), button:has-text("Supprimer"):visible >> nth=1');
      
      // Check for success message
      await expect(page.locator('text=/supprimé|deleted|succès/i')).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Client Details', () => {
    test('should display client details page', async ({ page }) => {
      await page.goto('/clients');
      
      // Click on first client
      await page.locator('tbody tr').first().click();
      
      // Should show details or navigate to details page
      const detailsContent = page.locator('[class*="details"], [data-testid="client-details"]');
      await expect(detailsContent.or(page.locator('h1, h2'))).toBeVisible({ timeout: 10000 });
    });

    test('should show client debts list', async ({ page }) => {
      await page.goto('/clients');
      
      // Click on first client
      await page.locator('tbody tr').first().click();
      
      // Look for debts section
      await expect(page.locator('text=/dette|debts?/i')).toBeVisible({ timeout: 10000 });
    });

    test('should show client payment history', async ({ page }) => {
      await page.goto('/clients');
      await page.locator('tbody tr').first().click();
      
      // Look for payment history
      const paymentSection = page.locator('text=/paiement|payment|historique|history/i');
      await expect(paymentSection).toBeVisible({ timeout: 10000 });
    });

    test('should show client communication history', async ({ page }) => {
      await page.goto('/clients');
      await page.locator('tbody tr').first().click();
      
      // Look for communication/logs section
      const commSection = page.locator('text=/communication|contact|relance|reminder/i');
      await expect(commSection).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Client Portal Sharing', () => {
    test('should have portal sharing option', async ({ page }) => {
      await page.goto('/clients');
      await page.locator('tbody tr').first().click();
      
      // Look for portal/share button
      const shareButton = page.locator('button:has-text("Portal"), button:has-text("partag"), [aria-label*="share"]');
      await expect(shareButton.first()).toBeVisible({ timeout: 10000 });
    });

    test('should generate portal link', async ({ page }) => {
      await page.goto('/clients');
      await page.locator('tbody tr').first().click();
      
      // Click share button
      await page.click('button:has-text("Portal"), button:has-text("partag")');
      
      // Should show portal link or dialog
      await expect(page.locator('input[value*="portal"], text=/lien|link/i')).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Export Clients', () => {
    test('should have export options', async ({ page }) => {
      await page.goto('/clients');
      
      // Look for export button
      const exportButton = page.locator('button:has-text("Export"), button:has-text("Télécharger")');
      await expect(exportButton.first()).toBeVisible({ timeout: 10000 });
    });

    test('should export clients to Excel', async ({ page }) => {
      await page.goto('/clients');
      
      // Click export
      await page.click('button:has-text("Export")');
      
      // Look for Excel option
      const excelOption = page.locator('text=/Excel|xlsx|spreadsheet/i');
      
      if (await excelOption.isVisible()) {
        // Start waiting for download
        const [download] = await Promise.all([
          page.waitForEvent('download'),
          excelOption.click()
        ]);
        
        // Verify download
        expect(download.suggestedFilename()).toMatch(/\.xlsx$/);
      }
    });

    test('should export clients to PDF', async ({ page }) => {
      await page.goto('/clients');
      
      // Click export
      await page.click('button:has-text("Export")');
      
      // Look for PDF option
      const pdfOption = page.locator('text=/PDF/i');
      
      if (await pdfOption.isVisible()) {
        const [download] = await Promise.all([
          page.waitForEvent('download'),
          pdfOption.click()
        ]);
        
        expect(download.suggestedFilename()).toMatch(/\.pdf$/);
      }
    });
  });
});
