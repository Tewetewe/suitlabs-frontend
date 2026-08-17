import { test, expect } from '@playwright/test';
import {
  clickRowAction,
  closeDialog,
  createPosBooking,
  dismissIssuedInvoice,
  expectHiddenRowActions,
  findRowAcrossPages,
  goTo,
  localISODate,
  openCashier,
  pickupNamedRental,
  rowNamed,
} from './helpers';

test.describe.configure({ timeout: 120_000 });

test.describe('Floor flows', () => {
  test('E2E-01 DP booking → pickup → collect balance → complete', async ({ page }) => {
    const customer = await createPosBooking(page, {
      coverage: 'dp',
      rentalDate: localISODate(0),
      returnDate: localISODate(1),
      payMethod: 'cash',
    });
    await expect(page.getByTestId('pos-done-subtitle')).toContainText('Pickup is on Rentals');

    await pickupNamedRental(page, customer.fullName);

    await goTo(page, 'bookings');
    await page.getByPlaceholder('Search bookings...').fill(customer.fullName);
    const booking = await rowNamed(page, 'booking-row', customer.fullName);
    await page.waitForTimeout(700);

    await clickRowAction(booking, 'Collect balance');
    await page.getByRole('button', { name: 'Take payment' }).click();
    await expect(page.getByRole('heading', { name: 'Record full payment' })).toHaveCount(0);
    await dismissIssuedInvoice(page, 'Booking Invoice');
    await expect(booking).toContainText('Paid');

    await clickRowAction(booking, 'Full invoice');
    await closeDialog(page);
    await expectHiddenRowActions(booking, ['Edit', 'Collect balance']);

    await goTo(page, 'rentals');
    const activeRental = await findRowAcrossPages(page, 'rental-row', customer.fullName);
    await activeRental.getByTestId('rental-complete').click();
    await page.getByTestId('confirm-complete').click();
    await expect(page.getByRole('button', { name: 'Close' })).toBeVisible();
    await closeDialog(page);
    await expect(activeRental.getByText('completed')).toBeVisible();
  });

  test('E2E-02 pay in full at booking, then pick up and complete', async ({ page }) => {
    const customer = await createPosBooking(page, {
      coverage: 'full',
      rentalDate: localISODate(0),
      returnDate: localISODate(1),
      payMethod: 'transfer',
    });
    const rental = await pickupNamedRental(page, customer.fullName);
    await rental.getByTestId('rental-complete').click();
    await page.getByTestId('confirm-complete').click();
    await closeDialog(page);
    await expect(rental.getByText('completed')).toBeVisible();
  });

  test('E2E-06 / E2E-08 / E2E-09 POS sale mode, ticket clear, customer required', async ({ page }) => {
    await openCashier(page);
    await page.getByTestId('pos-rental-date').fill(localISODate(18));
    await page.getByTestId('pos-return-date').fill(localISODate(19));
    await expect(page.getByTestId('pos-item').first()).toBeVisible();
    await page.getByTestId('pos-item').first().click();

    await page.getByTestId('pos-mode-sale').click();
    await expect(page.getByTestId('pos-rental-date')).toHaveCount(0);
    await expect(page.getByTestId('pos-pay-dp')).toHaveCount(0);
    await expect(page.getByTestId('pos-charge')).toHaveText('Complete sale');
    await expect(page.getByText('Tap a catalogue item to add it')).toBeVisible();

    await page.getByTestId('pos-mode-rental').click();
    await page.getByTestId('pos-rental-date').fill(localISODate(18));
    await page.getByTestId('pos-return-date').fill(localISODate(19));
    await expect(page.getByTestId('pos-item').first()).toBeVisible();
    await page.getByTestId('pos-item').first().click();
    await page.getByTestId('pos-charge').click();
    await expect(page.getByText('Customer required')).toBeVisible();
  });

  test('E2E-22 record and void an expense', async ({ page }) => {
    const description = `E2E supplies ${Date.now()}`;
    await goTo(page, 'expenses');
    await page.getByRole('button', { name: 'Add Expense' }).first().click();
    await page.getByLabel('Description').fill(description);
    await page.getByLabel('Amount').fill('25000');
    await page.getByRole('button', { name: 'Record expense' }).click();
    await expect(page.getByText(description)).toBeVisible();

    const row = page.getByRole('row', { name: new RegExp(description) });
    await expect(row.getByText('recorded')).toBeVisible();
    await row.getByRole('button', { name: 'Void' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Void' }).click();
    await expect(row).toHaveCount(0);
    await page.getByRole('combobox').nth(3).click();
    await page.getByRole('option', { name: 'Voided' }).click();
    await expect(page.getByRole('row', { name: new RegExp(description) })).toContainText(/voided/i);
  });
});
