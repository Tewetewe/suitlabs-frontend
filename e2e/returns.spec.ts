import { test, expect } from '@playwright/test';
import {
  clickRowAction,
  closeDialog,
  createInventoryItem,
  createPosBooking,
  findRowAcrossPages,
  goTo,
  addDaysISO,
  localISODate,
  openItemNamed,
  pickupNamedRental,
} from './helpers';

test.describe.configure({ timeout: 120_000 });

test.describe('Return exceptions', () => {
  test('E2E-16 late return fee on a backdated complete', async ({ page }) => {
    const customer = await createPosBooking(page, {
      coverage: 'full',
      rentalDate: localISODate(0),
      returnDate: localISODate(1),
    });
    const rental = await pickupNamedRental(page, customer.fullName);
    await rental.getByTestId('rental-complete').click();
    await expect(page.getByRole('heading', { name: 'Complete rental' })).toBeVisible();
    await page.getByLabel('Actual return date').fill(addDaysISO(customer.returnDate, 2));
    await page.getByLabel('Damage notes').click();
    await page.getByTestId('confirm-complete').click();
    await expect(page.getByRole('heading', { name: 'Rental Invoice' })).toBeVisible();
    await expect(page.getByTestId('thermal-receipt')).toContainText(customer.fullName);
    await closeDialog(page);
  });

  test('E2E-17 damage charge appears on the rental invoice', async ({ page }) => {
    const customer = await createPosBooking(page, 'full');
    const rental = await pickupNamedRental(page, customer.fullName);
    await rental.getByTestId('rental-complete').click();
    await page.getByLabel('Damage notes').fill('Cuff stain');
    await page.getByLabel('Damage charge').fill('50000');
    await page.getByTestId('confirm-complete').click();
    await expect(page.getByRole('heading', { name: 'Rental Invoice' })).toBeVisible();
    await expect(page.getByTestId('thermal-receipt')).toContainText(customer.fullName);
    await closeDialog(page);
  });

  test('E2E-18 lost item replacement sale marks the item lost', async ({ page }) => {
    const itemName = await createInventoryItem(page);
    const customer = await createPosBooking(page, { coverage: 'full', itemName });
    const rental = await pickupNamedRental(page, customer.fullName);
    await clickRowAction(rental, 'Lost / add-ons');
    await expect(page).toHaveURL(/rental_id=/);
    await expect(page.getByRole('heading', { name: 'Lost items' })).toBeVisible();
    await page
      .locator('h3', { hasText: 'Lost items' })
      .locator('xpath=..')
      .locator('input[type="checkbox"]')
      .evaluate((el) => (el as HTMLInputElement).click());
    await page.getByLabel('Replacement fee').fill('150000');
    await expect(page.getByText('Add a retail item or mark a lost item.')).toHaveCount(0);
    await page.getByRole('button', { name: 'Complete Sale' }).click();
    await expect(page.getByText('Sale recorded')).toBeVisible();

    await openItemNamed(page, itemName);
    await expect(page.getByText('lost', { exact: false }).first()).toBeVisible();
  });

  test('E2E-19 add-on sale at return then complete', async ({ page }) => {
    const customer = await createPosBooking(page, 'full');
    const rental = await pickupNamedRental(page, customer.fullName);
    await clickRowAction(rental, 'Lost / add-ons');
    await expect(page.getByRole('heading', { name: 'Sellable items' })).toBeVisible();
    const inStock = page
      .locator('div.flex.items-center.justify-between')
      .filter({ hasText: /stock [1-9]/ })
      .filter({ has: page.getByRole('button', { name: 'Add' }) });
    if (await inStock.count()) {
      await inStock.first().getByRole('button', { name: 'Add' }).click();
      await page.getByRole('button', { name: 'Complete Sale' }).click();
      await expect(page.getByText('Sale recorded')).toBeVisible();
    }

    await goTo(page, 'rentals');
    const active = await findRowAcrossPages(page, 'rental-row', customer.fullName);
    await active.getByTestId('rental-complete').click();
    await page.getByTestId('confirm-complete').click();
    await closeDialog(page);
    await expect(active.getByText('completed')).toBeVisible();
  });

  test('E2E-20 send rented item to maintenance then restore', async ({ page }) => {
    const itemName = await createInventoryItem(page);
    const customer = await createPosBooking(page, { coverage: 'full', itemName });
    const rental = await pickupNamedRental(page, customer.fullName);
    await rental.getByTestId('rental-complete').click();
    await page.locator('#send-maintenance').check({ force: true });
    await page.getByTestId('confirm-complete').click();
    await closeDialog(page);

    await openItemNamed(page, itemName);
    await expect(page.getByText('maintenance', { exact: false }).first()).toBeVisible();
    await page.getByRole('button', { name: 'Return to available' }).click();
    await expect(page.getByText('Back on the rack')).toBeVisible();
  });
});
