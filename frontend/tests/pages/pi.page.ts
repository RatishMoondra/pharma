/**
 * Page Object for Proforma Invoice (PI) Page
 * Handles PI list, creation, approval, and retrieval
 */

import { expect, Page, Locator } from '@playwright/test';

export class PIPage {
  readonly page: Page;
  
  // Navigation
  readonly piMenuItem: Locator;
  
  // List view
  readonly createButton: Locator;
  readonly searchInput: Locator;
  readonly piTable: Locator;
  
  // Create form
  readonly partnerVendorDropdown: Locator;
  readonly piDatePicker: Locator;
  readonly addItemButton: Locator;
  readonly medicineDropdown: Locator;
  readonly quantityInput: Locator;
  readonly unitPriceInput: Locator;
  readonly submitButton: Locator;
  readonly cancelButton: Locator;
  
  // Details/Approval
  readonly approveButton: Locator;
  readonly rejectButton: Locator;
  readonly remarksTextarea: Locator;
  readonly downloadPdfButton: Locator;

  constructor(page: Page) {
    this.page = page;
    
    // Navigation
    this.piMenuItem = page.getByRole('link', { name: /proforma invoice|pi/i });
    
    // List view
    this.createButton = page.getByRole('button', { name: /create|new pi/i });
    this.searchInput = page.getByPlaceholder(/search/i);
    this.piTable = page.getByRole('table');
    
    // Create form
    this.partnerVendorDropdown = page.getByLabel(/partner vendor/i);
    this.piDatePicker = page.getByLabel(/pi date/i);
    this.addItemButton = page.getByRole('button', { name: /add item/i });
    this.medicineDropdown = page.getByLabel(/medicine/i);
    this.quantityInput = page.getByLabel(/quantity/i);
    this.unitPriceInput = page.getByLabel(/unit price/i);
    this.submitButton = page.getByRole('button', { name: /submit|create/i });
    this.cancelButton = page.getByRole('button', { name: /cancel/i });
    
    // Details/Approval
    this.approveButton = page.getByRole('button', { name: /approve/i });
    this.rejectButton = page.getByRole('button', { name: /reject/i });
    this.remarksTextarea = page.getByLabel(/remarks/i);
    this.downloadPdfButton = page.getByRole('button', { name: /download|pdf/i });
  }

  /**
   * Navigate to PI page
   */
  async goto() {
    await this.page.goto('/pi');
    await expect(this.page).toHaveURL(/\/pi/);
  }

  /**
   * Click Create PI button
   */
  async clickCreate() {
    await this.createButton.click();
  }

  /**
   * Fill PI form with basic details
   */
  async fillPIForm(data: {
    partnerVendor: string;
    piDate?: string;
    items: Array<{
      medicine: string;
      quantity: number;
      unitPrice: number;
    }>;
  }) {
    // Select partner vendor
    await this.partnerVendorDropdown.click();
    await this.page.getByRole('option', { name: new RegExp(data.partnerVendor, 'i') }).click();
    
    // Set PI date (if provided)
    if (data.piDate) {
      await this.piDatePicker.fill(data.piDate);
    }
    
    // Add items
    for (const item of data.items) {
      await this.addItemButton.click();
      
      // Select medicine
      const medicineDropdown = this.page.getByLabel(/medicine/i).last();
      await medicineDropdown.click();
      await this.page.getByRole('option', { name: new RegExp(item.medicine, 'i') }).click();
      
      // Fill quantity
      const quantityInput = this.page.getByLabel(/quantity/i).last();
      await quantityInput.fill(item.quantity.toString());
      
      // Fill unit price
      const unitPriceInput = this.page.getByLabel(/unit price/i).last();
      await unitPriceInput.fill(item.unitPrice.toString());
    }
  }

  /**
   * Submit PI form
   */
  async submitForm() {
    await this.submitButton.click();
    
    // Wait for success message or redirect
    await this.page.waitForURL(/\/pi/, { waitUntil: 'networkidle' });
  }

  /**
   * Create a new PI (full flow)
   */
  async createPI(data: {
    partnerVendor: string;
    items: Array<{
      medicine: string;
      quantity: number;
      unitPrice: number;
    }>;
  }) {
    await this.clickCreate();
    await this.fillPIForm(data);
    await this.submitForm();
  }

  /**
   * Search for PI by number
   */
  async searchPI(piNumber: string) {
    await this.searchInput.fill(piNumber);
    await this.page.waitForTimeout(500); // Debounce
  }

  /**
   * Click on PI row to view details
   */
  async viewPI(piNumber: string) {
    await this.page.getByRole('row', { name: new RegExp(piNumber, 'i') }).click();
  }

  /**
   * Approve PI
   */
  async approvePI(remarks?: string) {
    await this.approveButton.click();
    
    if (remarks) {
      await this.remarksTextarea.fill(remarks);
    }
    
    // Confirm approval (if confirmation dialog exists)
    const confirmButton = this.page.getByRole('button', { name: /confirm|yes/i });
    if (await confirmButton.isVisible()) {
      await confirmButton.click();
    }
    
    // Wait for success message
    await expect(this.page.getByText(/approved successfully/i)).toBeVisible();
  }

  /**
   * Reject PI
   */
  async rejectPI(remarks: string) {
    await this.rejectButton.click();
    await this.remarksTextarea.fill(remarks);
    
    // Confirm rejection
    const confirmButton = this.page.getByRole('button', { name: /confirm|yes/i });
    if (await confirmButton.isVisible()) {
      await confirmButton.click();
    }
    
    // Wait for success message
    await expect(this.page.getByText(/rejected/i)).toBeVisible();
  }

  /**
   * Download PDF
   */
  async downloadPDF() {
    const [download] = await Promise.all([
      this.page.waitForEvent('download'),
      this.downloadPdfButton.click()
    ]);
    
    return download;
  }

  /**
   * Verify PI appears in list
   */
  async verifyPIInList(piNumber: string) {
    await expect(this.piTable.getByText(piNumber)).toBeVisible();
  }

  /**
   * Verify PI status
   */
  async verifyPIStatus(piNumber: string, status: string) {
    const row = this.page.getByRole('row', { name: new RegExp(piNumber, 'i') });
    await expect(row.getByText(new RegExp(status, 'i'))).toBeVisible();
  }

  /**
   * Verify HSN code auto-populated in PI item
   */
  async verifyHSNAutoPopulation(expectedHSN: string) {
    const hsnField = this.page.getByLabel(/hsn code/i);
    await expect(hsnField).toHaveValue(expectedHSN);
  }

  /**
   * Verify total calculation
   */
  async verifyTotalCalculation(expectedTotal: number) {
    const totalField = this.page.getByLabel(/total|amount/i);
    await expect(totalField).toHaveValue(expectedTotal.toString());
  }
}
