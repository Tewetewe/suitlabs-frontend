import path from 'path';
import { test, expect, type Browser, type Page } from '@playwright/test';
import {
  ANDROID_UA,
  IOS_UA,
  clickRowAction,
  closeDialog,
  createPosBooking,
  findRowAcrossPages,
  goTo,
  ID_CARD,
  installPrintHooks,
  openBookingInvoice,
  readPrintHooks,
  uniqueCustomer,
} from './helpers';

test.describe.configure({ mode: 'serial', timeout: 120_000 });

const staffState = path.join(__dirname, '.auth', 'staff.json');

async function pageWithUA(browser: Browser, userAgent: string) {
  const context = await browser.newContext({
    storageState: staffState,
    userAgent,
    viewport: { width: 1440, height: 900 },
  });
  await context.addInitScript((ua) => {
    Object.defineProperty(navigator, 'userAgent', {
      configurable: true,
      get: () => ua,
    });
  }, userAgent);
  await installPrintHooks(context);
  const page = await context.newPage();
  return { context, page };
}

test.describe('Print', () => {
  let customer = uniqueCustomer();

  test.beforeEach(async ({ context }) => {
    await installPrintHooks(context);
  });

  test('charge a booking used by the print scenarios', async ({ page }) => {
    customer = await createPosBooking(page, 'full');
  });

  test('E2E-26 desktop Print uses the browser dialog and does not open the drawer', async ({ page }) => {
    await openBookingInvoice(page, customer.fullName, 'Full invoice');
    const receipt = page.getByTestId('thermal-receipt');
    await expect(receipt).toContainText('SUITLABS BALI');
    await expect(receipt).toContainText(customer.fullName);
    await expect(receipt).toContainText('Type: FULL');
    await expect(receipt).toContainText('ITEMS:');
    await expect(receipt).toContainText('TOTAL:');
    await expect(page.getByTestId('print-invoice')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Download' })).toBeVisible();

    await page.getByTestId('print-invoice').click();
    await expect.poll(async () => (await readPrintHooks(page)).prints).toBeGreaterThan(0);
    const hooks = await readPrintHooks(page);
    expect(hooks.hrefs).toEqual([]);
    expect(hooks.title).toMatch(/Invoice/i);
    await expect(page.getByText('Cash drawer opened')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Booking Invoice' })).toBeVisible();
    await closeDialog(page);
  });

  test('E2E-26 Android Print hands the invoice to the Print Bridge', async ({ browser }) => {
    const { context, page } = await pageWithUA(browser, ANDROID_UA);
    try {
      await openBookingInvoice(page, customer.fullName, 'Full invoice');
      await page.getByTestId('print-invoice').click();
      await expect.poll(async () => (await readPrintHooks(page)).hrefs.length).toBeGreaterThan(0);
      const { hrefs, prints } = await readPrintHooks(page);
      expect(prints).toBe(0);
      expect(hrefs.join('\n')).toMatch(/com\.suitlabs\.printbridge/);
      expect(hrefs.join('\n')).toMatch(/suitlabs-print/);
      expect(hrefs.join('\n')).toMatch(/booking-invoice/);
      expect(hrefs.join('\n')).not.toMatch(/mate\.bluetoothprint/);
      await expect(page.getByRole('heading', { name: 'Booking Invoice' })).toBeVisible();
    } finally {
      await context.close();
    }
  });

  test('E2E-26 iOS Print opens Bluetooth Print and does not open the drawer', async ({ browser }) => {
    const { context, page } = await pageWithUA(browser, IOS_UA);
    try {
      await openBookingInvoice(page, customer.fullName, 'Full invoice');
      await page.getByTestId('print-invoice').click();
      await expect.poll(async () => (await readPrintHooks(page)).hrefs.length).toBeGreaterThan(0);
      const { hrefs, prints } = await readPrintHooks(page);
      expect(prints).toBe(0);
      expect(hrefs.join('\n')).toMatch(/^bprint:\/\//);
      expect(hrefs.join('\n')).toMatch(/booking-invoice/);
      expect(hrefs.join('\n')).not.toMatch(/printbridge/);
      await expect(page.getByText('Cash drawer opened')).toHaveCount(0);
    } finally {
      await context.close();
    }
  });

  test('rental invoice Print on desktop uses the browser dialog', async ({ page }) => {
    await goTo(page, 'rentals');
    const rental = await findRowAcrossPages(page, 'rental-row', customer.fullName);
    await expect(rental.getByText('pending')).toBeVisible();
    await rental.getByTestId('rental-pickup').click();
    await page.getByTestId('identity-card-upload').setInputFiles(ID_CARD);
    await page.getByTestId('confirm-pickup').click();
    await expect(rental.getByText('active')).toBeVisible();

    await clickRowAction(rental, 'Invoice');
    await expect(page.getByRole('heading', { name: 'Rental Invoice' })).toBeVisible();
    await expect(page.getByTestId('thermal-receipt')).toContainText('SUITLABS BALI');
    await expect(page.getByTestId('thermal-receipt')).toContainText(customer.fullName);

    await page.getByTestId('print-invoice').click();
    await expect.poll(async () => (await readPrintHooks(page)).prints).toBeGreaterThan(0);
    expect((await readPrintHooks(page)).hrefs).toEqual([]);
    await expect(page.getByText('Cash drawer opened')).toHaveCount(0);
    await closeDialog(page);
  });

  test('product labels never launch the Print Bridge', async ({ browser, page }) => {
    await goTo(page, 'items');
    const itemLink = page.locator('a[href^="/dashboard/items/"]').filter({ hasText: /./ }).first();
    await expect(itemLink).toBeVisible();
    await itemLink.click();
    await expect(page).toHaveURL(/\/dashboard\/items\/[^/?#]+/);

    if (await page.getByRole('button', { name: 'Generate barcode' }).count()) {
      await page.getByRole('button', { name: 'Generate barcode' }).click();
    }
    await expect(page.getByTestId('print-label')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Download' })).toBeVisible();

    await page.getByTestId('print-label').click();
    await expect.poll(async () => (await readPrintHooks(page)).prints).toBeGreaterThan(0);
    expect((await readPrintHooks(page)).hrefs).toEqual([]);

    const { context, page: android } = await pageWithUA(browser, ANDROID_UA);
    try {
      await android.goto(page.url());
      await expect(android.getByTestId('print-label')).toBeVisible();
      await android.getByTestId('print-label').click();
      await expect.poll(async () => (await readPrintHooks(android)).hrefs.length).toBeGreaterThan(0);
      const launched = (await readPrintHooks(android)).hrefs.join('\n');
      expect(launched).toMatch(/mate\.bluetoothprint/);
      expect(launched).toMatch(/product-label/);
      expect(launched).not.toMatch(/com\.suitlabs\.printbridge/);
    } finally {
      await context.close();
    }
  });
});
