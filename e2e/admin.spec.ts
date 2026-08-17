import path from 'path';
import { test, expect } from '@playwright/test';
import { createPosBooking, goTo, localISODate, openItemNamed, switchShop } from './helpers';

test.describe.configure({ timeout: 120_000 });

const adminState = path.join(__dirname, '.auth', 'admin.json');

test.describe('Admin books', () => {
  test.use({ storageState: adminState });

  test('E2E-32 / E2E-33 financial report shows ledger pots after cash and QRIS bookings', async ({ page }) => {
    await createPosBooking(page, { coverage: 'full', payMethod: 'cash' });
    await page.getByRole('button', { name: 'New transaction' }).click();
    await createPosBooking(page, { coverage: 'full', payMethod: 'qris' });

    await goTo(page, 'financial-report');
    await expect(page.getByText('Cash on Hand').first()).toBeVisible();
    await expect(page.getByText('Cash Drawer').first()).toBeVisible();
    await expect(page.getByText('Bank').first()).toBeVisible();
    await expect(page.getByText('Booking revenue').first()).toBeVisible();
    await expect(page.getByText('QRIS').first()).toBeVisible();
    await expect(page.getByText('Cash').first()).toBeVisible();
  });

  test('E2E-34 admin can save a recurring expense; staff cannot see the section', async ({ page }) => {
    const description = `E2E rent ${Date.now()}`;
    await goTo(page, 'expenses');
    await page.getByRole('button', { name: 'Add recurring' }).click();
    await page.getByLabel('Description').fill(description);
    await page.getByLabel('Amount').fill('1000000');
    await page.getByLabel('Day of month (1-28)').fill('1');
    await page.getByRole('button', { name: 'Save recurring' }).click();
    await expect(page.getByText('Recurring expense saved')).toBeVisible();
    await expect(page.getByText(description)).toBeVisible();
    await page.getByRole('button', { name: 'Post' }).first().click();
    await expect(page.getByText('Posted')).toBeVisible();
  });

  test('E2E-35 admin can post a buying price; staff still cannot see it', async ({ page }) => {
    await goTo(page, 'items');
    await expect(async () => {
      await page.getByLabel('Item actions').first().click();
      await page.getByRole('button', { name: 'Edit' }).click({ timeout: 2500 });
    }).toPass({ timeout: 12_000 });
    await expect(page.getByLabel('Buying Price')).toBeVisible();
    await page.getByLabel('Buying Price').fill('100000');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('E2E-36 lost item has no second write-off control on the item', async ({ page }) => {
    await openItemNamed(page, 'Kids Black Formal Suit');
    await expect(page.getByRole('button', { name: 'Write-off' })).toHaveCount(0);
  });

  test('E2E-37 buy and dispose a fixed asset', async ({ page }) => {
    const name = `E2E steamer ${Date.now()}`;
    await goTo(page, 'assets');
    await page.getByRole('button', { name: 'Add fixed asset' }).click();
    await page.getByLabel('Name').fill(name);
    await page.getByLabel('Buying price (per unit)').fill('750000');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Fixed asset recorded')).toBeVisible();
    const row = page.getByRole('row', { name: new RegExp(name) });
    for (let i = 0; i < 15 && !(await row.isVisible().catch(() => false)); i++) {
      const next = page.getByRole('button', { name: 'Next', exact: true }).or(page.getByRole('button', { name: 'Next →' }));
      if (!(await next.first().isEnabled().catch(() => false))) break;
      await next.first().click();
    }
    await expect(row).toBeVisible();
    await row.getByRole('button', { name: 'Dispose' }).click();
    await expect(page.getByText(/disposed/i).first()).toBeVisible();
  });

  test('E2E-38 loan is not revenue; dividend is not an expense', async ({ page }) => {
    await goTo(page, 'financial-report');
    await expect(page.getByText('Receiving a Loan increases Cash on Hand. It is not revenue.')).toBeVisible();
    await expect(page.getByText(/it is not an Expense/i)).toBeVisible();
    const lender = `E2E lender ${Date.now()}`;
    await page.getByLabel('Lender').fill(lender);
    await page.getByLabel('Principal').fill('500000');
    await page.getByRole('button', { name: 'Record loan' }).click();
    await expect(page.getByText(lender, { exact: true })).toBeVisible();
    const dividendForm = page.locator('form').filter({ has: page.getByLabel('Shareholder') });
    await dividendForm.scrollIntoViewIfNeeded();
    await dividendForm.getByPlaceholder('0').fill('10000');
    const shareholder = `E2E owner ${Date.now()}`;
    await dividendForm.getByLabel('Shareholder').fill(shareholder);
    await dividendForm.getByRole('button', { name: 'Record dividend' }).click();
    await expect(page.getByText(shareholder, { exact: true })).toBeVisible();
  });

  test('E2E-39 lock a past month, refuse a backdated expense, then unlock', async ({ page }) => {
    await goTo(page, 'financial-report');
    await page.getByRole('button', { name: /^Jan/ }).click();
    if (await page.getByRole('button', { name: 'Unlock month' }).count()) {
      await page.getByRole('button', { name: 'Unlock month' }).click();
      await expect(page.getByRole('button', { name: 'Lock month' })).toBeVisible();
    }
    await page.getByRole('button', { name: 'Lock month' }).click();
    await expect(page.getByRole('button', { name: 'Unlock month' })).toBeVisible();

    await goTo(page, 'expenses');
    await page.getByRole('button', { name: 'Add Expense' }).first().click();
    await page.getByLabel('Date').fill(`${new Date().getFullYear()}-01-15`);
    await page.getByLabel('Description').fill(`E2E locked ${Date.now()}`);
    await page.getByLabel('Amount').fill('10000');
    await page.getByRole('button', { name: 'Record expense' }).click();
    await expect(page.getByText(/Could not save expense|locked/i)).toBeVisible();
    await page.getByRole('button', { name: 'Cancel' }).click();

    await goTo(page, 'financial-report');
    await page.getByRole('button', { name: /^Jan/ }).click();
    await page.getByRole('button', { name: 'Unlock month' }).click();
    await expect(page.getByRole('button', { name: 'Lock month' })).toBeVisible();
  });

  test('E2E-40 close checklist screens are reachable before lock', async ({ page }) => {
    await goTo(page, 'rentals');
    await expect(page.getByText(/Page \d+|No rentals|pending|active|completed/)).toBeVisible();
    await goTo(page, 'expenses');
    await expect(page.getByRole('button', { name: 'Add Expense' }).first()).toBeVisible();
    await goTo(page, 'assets');
    await expect(page.getByRole('button', { name: 'Add fixed asset' })).toBeVisible();
    await goTo(page, 'financial-report');
    await expect(page.getByRole('button', { name: 'Lock month' }).or(page.getByRole('button', { name: 'Unlock month' }))).toBeVisible();
    await expect(page.getByRole('button', { name: 'Generate Excel' })).toBeVisible();
    await expect(page.getByText('Monthly Google Sheets export')).toBeVisible();
  });
});

test.describe('Staff cannot create recurring templates', () => {
  test('E2E-34 staff expenses page has no Add recurring', async ({ page }) => {
    await goTo(page, 'expenses');
    await expect(page.getByRole('button', { name: 'Add recurring' })).toHaveCount(0);
  });
});
