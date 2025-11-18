/**
 * E2E Test: PI Workflow
 * Tests: PI creation, approval, EOPA generation
 */

import { test, expect } from '@playwright/test';
import { AuthHelper } from '../helpers/auth.helper';
import { PIPage } from '../pages/pi.page';

test.describe('PI Workflow', () => {
  let auth: AuthHelper;
  let piPage: PIPage;

  test.beforeEach(async ({ page }) => {
    auth = new AuthHelper(page);
    piPage = new PIPage(page);
    
    // Login as admin
    await auth.loginAsAdmin();
  });

  test.afterEach(async ({ page }) => {
    await auth.logout();
  });

  test('should create a new PI successfully', async ({ page }) => {
    // Navigate to PI page
    await piPage.goto();
    
    // Create PI
    await piPage.createPI({
      partnerVendor: 'Global Pharma',
      items: [
        {
          medicine: 'Paracetamol',
          quantity: 1000,
          unitPrice: 50.00
        }
      ]
    });
    
    // Verify PI appears in list
    await expect(page.getByText(/PI\/\d{2}-\d{2}\/\d{4}/)).toBeVisible();
    
    // Verify success message
    await expect(page.getByText(/created successfully/i)).toBeVisible();
  });

  test('should auto-populate HSN code from medicine master', async ({ page }) => {
    await piPage.goto();
    await piPage.clickCreate();
    
    // Fill basic details
    await piPage.fillPIForm({
      partnerVendor: 'Global Pharma',
      items: [
        {
          medicine: 'Paracetamol',
          quantity: 500,
          unitPrice: 50.00
        }
      ]
    });
    
    // Verify HSN code auto-populated
    await piPage.verifyHSNAutoPopulation('30049099');
  });

  test('should calculate total price correctly', async ({ page }) => {
    await piPage.goto();
    await piPage.clickCreate();
    
    // Fill form with multiple items
    await piPage.fillPIForm({
      partnerVendor: 'Global Pharma',
      items: [
        {
          medicine: 'Paracetamol',
          quantity: 1000,
          unitPrice: 50.00
        },
        {
          medicine: 'Amoxicillin',
          quantity: 500,
          unitPrice: 100.00
        }
      ]
    });
    
    // Expected total: (1000 * 50) + (500 * 100) = 50000 + 50000 = 100000
    await piPage.verifyTotalCalculation(100000);
  });

  test('should approve PI and generate EOPA', async ({ page }) => {
    // First, create a PI
    await piPage.goto();
    await piPage.createPI({
      partnerVendor: 'Global Pharma',
      items: [
        {
          medicine: 'Paracetamol',
          quantity: 1000,
          unitPrice: 50.00
        }
      ]
    });
    
    // Get PI number from the list
    const piNumber = await page.locator('table tbody tr:first-child td:first-child').textContent();
    
    // View PI details
    await piPage.viewPI(piNumber!);
    
    // Approve PI
    await piPage.approvePI('Price acceptable');
    
    // Verify status changed to APPROVED
    await piPage.goto();
    await piPage.verifyPIStatus(piNumber!, 'APPROVED');
    
    // Navigate to EOPA page to verify EOPA created
    await page.goto('/eopa');
    
    // Verify EOPA exists for this PI
    await expect(page.getByText(new RegExp(piNumber!, 'i'))).toBeVisible();
  });

  test('should reject PI with remarks', async ({ page }) => {
    // Create PI
    await piPage.goto();
    await piPage.createPI({
      partnerVendor: 'Global Pharma',
      items: [
        {
          medicine: 'Paracetamol',
          quantity: 1000,
          unitPrice: 50.00
        }
      ]
    });
    
    // Get PI number
    const piNumber = await page.locator('table tbody tr:first-child td:first-child').textContent();
    
    // View PI details
    await piPage.viewPI(piNumber!);
    
    // Reject PI
    await piPage.rejectPI('Invalid quantity requested');
    
    // Verify status changed to REJECTED
    await piPage.goto();
    await piPage.verifyPIStatus(piNumber!, 'REJECTED');
  });

  test('should download PI PDF', async ({ page }) => {
    // Create PI
    await piPage.goto();
    await piPage.createPI({
      partnerVendor: 'Global Pharma',
      items: [
        {
          medicine: 'Paracetamol',
          quantity: 1000,
          unitPrice: 50.00
        }
      ]
    });
    
    // Get PI number
    const piNumber = await page.locator('table tbody tr:first-child td:first-child').textContent();
    
    // View PI details
    await piPage.viewPI(piNumber!);
    
    // Download PDF
    const download = await piPage.downloadPDF();
    
    // Verify download
    expect(download.suggestedFilename()).toMatch(/PI.*\.pdf/i);
  });

  test('should validate required fields', async ({ page }) => {
    await piPage.goto();
    await piPage.clickCreate();
    
    // Try to submit without filling fields
    await piPage.submitButton.click();
    
    // Verify validation errors
    await expect(page.getByText(/partner vendor is required/i)).toBeVisible();
    await expect(page.getByText(/at least one item is required/i)).toBeVisible();
  });

  test('should handle invalid vendor selection', async ({ page }) => {
    await piPage.goto();
    
    // Try to create PI with non-existent vendor (via API bypass)
    const response = await page.request.post('/api/pi/', {
      headers: {
        'Authorization': `Bearer ${await auth.getAuthToken()}`
      },
      data: {
        partner_vendor_id: 99999, // Invalid ID
        pi_date: new Date().toISOString(),
        items: [
          {
            medicine_id: 1,
            quantity: 1000,
            unit_price: 50.00
          }
        ]
      }
    });
    
    expect(response.status()).toBe(404);
    const body = await response.json();
    expect(body.error_code).toBe('ERR_NOT_FOUND');
  });
});

test.describe('PI Multi-User Workflow', () => {
  test('should restrict delete for non-admin users', async ({ page }) => {
    const auth = new AuthHelper(page);
    const piPage = new PIPage(page);
    
    // Login as procurement officer
    await auth.loginAsProcurement();
    
    // Navigate to PI page
    await piPage.goto();
    
    // Try to find delete button (should not exist for procurement role)
    const deleteButton = page.getByRole('button', { name: /delete/i });
    await expect(deleteButton).not.toBeVisible();
  });
});
