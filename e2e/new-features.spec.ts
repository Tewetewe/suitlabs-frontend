import path from 'path';
import { test, expect, type Page } from '@playwright/test';
import { createPosBooking, localISODate } from './helpers';

// The features added in October 2026: the H-1 Pickup checklist, Transaction
// Fees with the BCA/BNI Pots, and Pot Transfers. Each test clicks the buttons
// a person would click.

test.describe.configure({ timeout: 120_000 });

const adminState = path.join(__dirname, '.auth', 'admin.json');

// The H-1 list opens on tomorrow. createPosBooking moves a Booking to a later
// day when tomorrow has no free Item, so the list is opened on that day.
async function openPickupPrep(page: Page, pickupDate: string) {
  await page.goto('/dashboard/pickup-prep');
  await expect(page.getByRole('heading', { name: 'Pickup Prep (H-1)' })).toBeVisible();
  const date = page.getByTestId('pickup-prep-date');
  await expect(date).not.toHaveValue('');
  if ((await date.inputValue()) !== pickupDate) await date.fill(pickupDate);
}

test.describe('Pickup Prep (H-1)', () => {
  test('NF-01 the four checks make a Rental ready; damaged goes to maintenance and back', async ({ page }) => {
    const customer = await createPosBooking(page, {
      coverage: 'full',
      rentalDate: localISODate(1),
      returnDate: localISODate(2),
      payMethod: 'cash',
    });
    await openPickupPrep(page, customer.rentalDate);
    const card = page.getByTestId('pickup-prep-rental').filter({ hasText: customer.fullName });
    await expect(card).toBeVisible();
    await expect(card.getByText('Not started')).toBeVisible();

    // Tap all four quickly, as staff do; every tap must stick.
    for (const check of ['prep-found', 'prep-clean', 'prep-undamaged', 'prep-size_ok']) {
      await card.getByTestId(check).first().click();
    }
    for (const check of ['prep-found', 'prep-clean', 'prep-undamaged', 'prep-size_ok']) {
      await expect(card.getByTestId(check).first()).toBeChecked();
    }
    await expect(card.getByText('Ready')).toBeVisible();

    await card.getByTestId('prep-problem').first().selectOption('damaged');
    await expect(card.getByText('Problem', { exact: true })).toBeVisible();
    await expect(card.getByText('In maintenance')).toBeVisible();

    await card.getByTestId('prep-problem').first().selectOption('');
    await expect(card.getByText('In maintenance')).toHaveCount(0);
  });

  test('NF-02 scan: Found waits for a code, a code ticks Found, the camera opens', async ({ page }) => {
    const customer = await createPosBooking(page, {
      coverage: 'full',
      rentalDate: localISODate(1),
      returnDate: localISODate(2),
      payMethod: 'cash',
    });
    await openPickupPrep(page, customer.rentalDate);
    const card = page.getByTestId('pickup-prep-rental').filter({ hasText: customer.fullName });
    await expect(card).toBeVisible();
    const code = (await card.locator('span.font-mono').first().innerText()).trim();

    const found = page.getByTestId('pickup-prep-found');
    await expect(found).toBeDisabled();
    await page.getByTestId('pickup-prep-scan').fill(code);
    await expect(found).toBeEnabled();
    await found.click();
    await expect(card.getByTestId('prep-found').first()).toBeChecked();
    await expect(page.getByTestId('pickup-prep-scan')).toHaveValue('');

    await page.getByTestId('pickup-prep-camera').click();
    const scanner = page.getByRole('dialog').filter({ hasText: 'Scan barcode' });
    await expect(scanner).toBeVisible();
    await scanner.getByRole('button', { name: /close/i }).first().click();
    await expect(scanner).toHaveCount(0);
  });
});

test.describe('Cashier card fee and bank', () => {
  test('NF-03 a card Booking into BNI charges the 2% fee on the EDC', async ({ page }) => {
    await createPosBooking(page, { coverage: 'full', payMethod: 'cc', pot: 'bni' });
    const fee = page.getByTestId('pos-done-fee');
    await expect(fee).toContainText('Transaction fee');
    await expect(fee).toContainText('Charged by EDC');
  });
});

test.describe('Pot Transfers', () => {
  test('NF-04 staff records a cash deposit; bank to bank is admin only', async ({ page }) => {
    await page.goto('/dashboard/pot-transfers');
    await expect(page.getByRole('heading', { name: 'Pot Transfers' })).toBeVisible();
    const note = `E2E deposit ${Date.now()}`;
    await page.getByTestId('transfer-from').selectOption('cash');
    await page.getByTestId('transfer-to').selectOption('bca');
    await page.getByLabel('Amount').fill('50000');
    await page.getByLabel('Note').fill(note);
    await page.getByTestId('transfer-submit').click();
    await expect(page.getByTestId('transfer-row').filter({ hasText: note })).toBeVisible();

    await page.getByTestId('transfer-from').selectOption('bca');
    await page.getByTestId('transfer-to').selectOption('bni');
    await expect(page.getByText('Only Admin moves money between BCA and BNI.')).toBeVisible();
    await expect(page.getByTestId('transfer-submit')).toBeDisabled();
  });

  test.describe('as admin', () => {
    test.use({ storageState: adminState });

    test('NF-05 admin sees the balances, moves money between banks, and voids it', async ({ page }) => {
      await page.goto('/dashboard/pot-transfers');
      await expect(page.getByText('Bank BCA').first()).toBeVisible();
      await expect(page.getByText('Bank (unassigned)').first()).toBeVisible();
      const note = `E2E bank move ${Date.now()}`;
      await page.getByTestId('transfer-from').selectOption('bca');
      await page.getByTestId('transfer-to').selectOption('bni');
      await page.getByLabel('Amount').fill('10000');
      await page.getByLabel('Note').fill(note);
      await page.getByTestId('transfer-submit').click();
      const row = page.getByTestId('transfer-row').filter({ hasText: note });
      await expect(row).toBeVisible();

      page.once('dialog', (dialog) => void dialog.accept());
      await row.getByRole('button', { name: 'Void' }).click();
      await expect(row.getByText('Voided')).toBeVisible();
    });
  });
});

test.describe('Transaction Fees', () => {
  test.use({ storageState: adminState });

  test('NF-06 admin changes a rate, saves it, and adds a rule', async ({ page }) => {
    await page.goto('/dashboard/admin/transaction-fees');
    await expect(page.getByRole('heading', { name: 'Transaction Fees' })).toBeVisible();
    const rows = page.getByTestId('fee-rule-row');
    // The 7 seeded rules; earlier runs may have added more.
    await expect(rows.filter({ has: page.locator('input[value="QRIS"]') })).toBeVisible();
    expect(await rows.count()).toBeGreaterThanOrEqual(7);

    const bca = rows.filter({ has: page.locator('input[value="BCA EDC · Credit card"]') });
    const save = bca.getByRole('button', { name: 'Save' });
    await expect(save).toBeDisabled();
    await bca.getByLabel('Rate (%)').fill('1.8');
    await expect(bca.getByText('Rp 1.000.000 → Rp 18.000')).toBeVisible();
    await expect(save).toBeEnabled();
    await save.click();
    await expect(page.getByText('Fee rule saved').first()).toBeVisible();
    await bca.getByLabel('Rate (%)').fill('2');
    await bca.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Fee rule saved').first()).toBeVisible();

    const label = `E2E rule ${Date.now()}`;
    await page.getByPlaceholder('BNI EDC · Credit card').fill(label);
    await page.getByLabel('Rate (%)').last().fill('1.5');
    await page.getByRole('button', { name: 'Add' }).click();
    await expect(page.getByText('Fee rule added').first()).toBeVisible();
    const added = rows.filter({ has: page.locator(`input[value="${label}"]`) });
    await expect(added).toBeVisible();
    // A new rule must start inactive, so it charges no one until Admin turns it on.
    await expect(added.getByRole('switch')).toHaveAttribute('aria-checked', 'false');
  });
});
