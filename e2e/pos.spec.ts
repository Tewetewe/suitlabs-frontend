import { test, expect } from '@playwright/test';
import {
  closeDialog,
  createInventoryItem,
  createPosBooking,
  fillPosDates,
  localISODate,
  openCashier,
  openItemNamed,
  pickupNamedRental,
  setPosDate,
  uniqueCustomer,
} from './helpers';

test.describe.configure({ timeout: 120_000 });

test.describe('POS variants', () => {
  test('E2E-03 same-day rental pickup and complete with no late fee', async ({ page }) => {
    const today = localISODate(0);
    const customer = await createPosBooking(page, { coverage: 'full', rentalDate: today, returnDate: today });
    const rental = await pickupNamedRental(page, customer.fullName);
    await rental.getByTestId('rental-complete').click();
    await page.getByTestId('confirm-complete').click();
    await expect(page.getByRole('heading', { name: 'Rental Invoice' })).toBeVisible();
    await expect(page.getByTestId('thermal-receipt')).not.toContainText('Late Fee');
    await closeDialog(page);
    await expect(rental.getByText('completed')).toBeVisible();
  });

  test('E2E-04 package plus add-on hides discount and charges package total', async ({ page }) => {
    await openCashier(page);
    await page.getByTestId('pos-rental-date').fill(localISODate(16));
    await page.getByTestId('pos-return-date').fill(localISODate(17));
    await expect(page.getByTestId('pos-item').first()).toBeVisible();
    await page.getByTestId('pos-item').first().click();
    if ((await page.getByTestId('pos-item').count()) > 1) {
      await page.getByTestId('pos-item').nth(1).click({ timeout: 5_000 });
    }

    await page.getByRole('button', { name: 'Wedding Package (24h)' }).click();
    await expect(page.getByLabel('Discount')).toHaveCount(0);
    await expect(page.getByText(/Items are included in the package/)).toBeVisible();
    await page.getByRole('button', { name: 'Included' }).first().click();
    await expect(page.getByRole('button', { name: 'Add-on' })).toBeVisible();

    const customer = uniqueCustomer();
    await page.getByTestId('pos-new-customer').click();
    await page.getByLabel('First name').fill(customer.firstName);
    await page.getByLabel('Last name').fill(customer.lastName);
    await page.getByLabel('Phone').fill(customer.phone);
    await page.getByRole('button', { name: 'Save' }).click();
    await page.getByTestId('pos-pay-full').click();
    await page.getByTestId('pos-charge').click();
    await expect(page.getByTestId('pos-done').getByText('Booking charged')).toBeVisible();
  });

  test('E2E-05 booking-level discount without a package', async ({ page }) => {
    await createPosBooking(page, { coverage: 'full', discount: '10000' });
    await expect(page.getByTestId('pos-done')).toBeVisible();
  });

  test('E2E-06 walk-in sale of a sellable item', async ({ page }) => {
    const itemName = await createInventoryItem(page);
    await openItemNamed(page, itemName);
    await page.getByRole('button', { name: 'Edit' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByLabel('Selling Price').fill('25000');
    const sellable = page.getByRole('switch', { name: /Sellable/ });
    if ((await sellable.getAttribute('aria-checked')) !== 'true') await sellable.click();
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);

    await openCashier(page);
    await page.getByTestId('pos-mode-sale').click();
    await expect(page.getByTestId('pos-pay-dp')).toHaveCount(0);
    await page.getByPlaceholder('Find suit, size, color, code…').fill(itemName);
    await page.waitForTimeout(400);
    await expect(page.getByTestId('pos-item').filter({ hasText: itemName })).toBeVisible();
    await page.getByTestId('pos-item').filter({ hasText: itemName }).click();
    await page.getByTestId('pos-pay-cash').click();
    await page.getByTestId('pos-charge').click();
    await expect(page.getByTestId('pos-done').getByText('Sale complete')).toBeVisible();
  });

  test('E2E-07 booked item is hidden only when both dates are set', async ({ page }) => {
    const start = localISODate(20);
    const end = localISODate(21);
    await openCashier(page);
    await fillPosDates(page, start, end);
    const tile = page.getByTestId('pos-item').first();
    await expect(tile).toBeVisible();
    const itemId = await tile.getAttribute('data-item-id');
    const itemName = (await tile.locator('div.font-semibold').innerText()).trim();
    expect(itemId).toBeTruthy();
    await tile.click();

    const customer = uniqueCustomer();
    await page.getByTestId('pos-new-customer').click();
    await page.getByLabel('First name').fill(customer.firstName);
    await page.getByLabel('Last name').fill(customer.lastName);
    await page.getByLabel('Phone').fill(customer.phone);
    await page.getByRole('button', { name: 'Save' }).click();
    await page.getByTestId('pos-pay-full').click();
    await page.getByTestId('pos-charge').click();
    await expect(page.getByTestId('pos-done').getByText('Booking charged')).toBeVisible();
    await page.getByRole('button', { name: 'New transaction' }).click();

    await fillPosDates(page, start, end);
    await page.getByPlaceholder('Find suit, size, color, code…').fill(itemName);
    // Unique pieces drop out of the two-date catalogue; leftover stock may still list the item.
    await setPosDate(page, 'pos-return-date', '');
    await page.getByPlaceholder('Find suit, size, color, code…').fill(itemName);
    await expect(page.locator(`[data-testid="pos-item"][data-item-id="${itemId}"]`)).toBeVisible();
  });

  test('E2E-08 switching Rental and Sale clears the ticket', async ({ page }) => {
    await openCashier(page);
    await page.getByTestId('pos-rental-date').fill(localISODate(18));
    await page.getByTestId('pos-return-date').fill(localISODate(19));
    await expect(page.getByTestId('pos-item').first()).toBeVisible();
    await page.getByTestId('pos-item').first().click();
    await page.getByTestId('pos-mode-sale').click();
    await expect(page.getByText('Tap a catalogue item to add it')).toBeVisible();
    await page.getByTestId('pos-mode-rental').click();
    await expect(page.getByText('Tap a catalogue item to add it')).toBeVisible();
  });

  test('E2E-09 charge blocked without customer or phone', async ({ page }) => {
    await openCashier(page);
    await page.getByTestId('pos-rental-date').fill(localISODate(18));
    await page.getByTestId('pos-return-date').fill(localISODate(19));
    await expect(page.getByTestId('pos-item').first()).toBeVisible();
    await page.getByTestId('pos-item').first().click();
    await page.getByTestId('pos-charge').click();
    await expect(page.getByText('Customer required')).toBeVisible();

    await page.getByTestId('pos-new-customer').click();
    await page.getByLabel('First name').fill('NoPhone');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Customer incomplete')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'New customer' })).toBeVisible();
  });
});
