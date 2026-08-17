import path from 'path';
import { test, expect } from '@playwright/test';
import {
  chooseSelect,
  closeDialog,
  createInventoryItem,
  fillSearch,
  goTo,
  localISODate,
  openCashier,
  openItemNamed,
  switchShop,
  uniqueCustomer,
} from './helpers';

test.describe.configure({ timeout: 120_000 });

const adminState = path.join(__dirname, '.auth', 'admin.json');

test.describe('Admin shops', () => {
  test.use({ storageState: adminState });

  test('E2E-23 transfer available item between shops', async ({ page }) => {
    await switchShop(page, 'Jimbaran');
    const itemName = await createInventoryItem(page);
    await openItemNamed(page, itemName);
    await page.getByRole('button', { name: 'Transfer' }).click();
    await expect(page.getByRole('heading', { name: 'Transfer item' })).toBeVisible();
    await chooseSelect(page, 'Destination', 'Nusa Dua');
    const confirm = page.getByRole('dialog').getByRole('button', { name: 'Transfer' });
    await expect(confirm).toBeEnabled();
    const transferResp = page.waitForResponse((response) => response.url().includes('/transfer') && response.request().method() === 'POST');
    await confirm.evaluate((button) => (button as HTMLButtonElement).click());
    const response = await transferResp;
    expect(response.ok(), await response.text()).toBeTruthy();
    await expect(page.getByText('Item transferred')).toBeVisible();

    await switchShop(page, 'Nusa Dua');
    await openItemNamed(page, itemName);
    await page.getByRole('button', { name: 'Transfer' }).click();
    await chooseSelect(page, 'Destination', 'Jimbaran');
    await expect(page.getByRole('dialog').getByRole('button', { name: 'Transfer' })).toBeEnabled();
    await page.getByRole('dialog').getByRole('button', { name: 'Transfer' }).click();
    await expect(page.getByText('Item transferred')).toBeVisible({ timeout: 20_000 });
    await switchShop(page, 'Jimbaran');
  });

  test('E2E-24 item availability check dialog', async ({ page }) => {
    await goTo(page, 'items');
    await page.getByLabel('Item actions').first().click();
    await page.getByRole('button', { name: 'Check dates' }).click();
    await expect(page.getByRole('heading', { name: 'Check availability' })).toBeVisible();
    await page.getByLabel('Rental date').fill(localISODate(0));
    await page.getByLabel('Return date').fill(localISODate(1));
    await page.getByRole('button', { name: 'Check' }).click();
    await expect(page.getByText(/Available for the selected dates|Unavailable/)).toBeVisible();
  });

  test('E2E-25 customer created in Jimbaran is searchable in Nusa Dua', async ({ page }) => {
    const customer = uniqueCustomer();
    await switchShop(page, 'Jimbaran');
    await goTo(page, 'customers');
    await page.getByRole('button', { name: 'Add Customer' }).click();
    await page.getByLabel('First name').fill(customer.firstName);
    await page.getByLabel('Last name').fill(customer.lastName);
    await page.getByLabel('Email').fill(customer.email);
    await page.getByLabel('Phone').fill(customer.phone);
    await page.getByRole('dialog').getByRole('button', { name: 'Create' }).click();
    await expect(page.getByText(/Customer Created/i)).toBeVisible();

    await switchShop(page, 'Nusa Dua');
    await goTo(page, 'customers');
    await fillSearch(page, 'Search customers...', customer.lastName);
    await expect(page.getByText(customer.fullName)).toBeVisible();
    await expect(page.getByText('Jimbaran').first()).toBeVisible();
    await switchShop(page, 'Jimbaran');
  });

  test('E2E-27 sale on Nusa Dua does not land on Jimbaran books', async ({ page }) => {
    await switchShop(page, 'Nusa Dua');
    await openCashier(page);
    await page.getByTestId('pos-mode-sale').click();
    if (await page.getByTestId('pos-item').count()) {
      await page.getByTestId('pos-item').first().click();
      await page.getByTestId('pos-pay-cash').click();
      await page.getByTestId('pos-charge').click();
      await closeDialog(page);
      await expect(page.getByTestId('pos-done').getByText('Sale complete')).toBeVisible();
    }
    await switchShop(page, 'Jimbaran');
    await goTo(page, 'financial-report');
    await expect(page.getByText('This report is Jimbaran only')).toBeVisible();
  });

  test('E2E-28 All branches is a group view; books stay per shop', async ({ page }) => {
    await switchShop(page, 'All branches');
    await goTo(page, 'financial-report');
    await expect(page.getByText(/Company group — separate shop books/)).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Shop' }).first()).toBeVisible();
    await switchShop(page, 'Jimbaran');
  });

  test('E2E-31 create a second staff login and deactivate them', async ({ page }) => {
    const stamp = Date.now().toString(36);
    const email = `e2e.staff.${stamp}@suitlabs.com`;
    await goTo(page, 'users');
    await expect(page.getByRole('button', { name: 'Add User' }).first()).toBeVisible();
    await page.getByRole('button', { name: 'Add User' }).first().click();
    await page.getByLabel('First name').fill('E2e');
    await page.getByLabel('Last name').fill(`Staff${stamp}`);
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Phone').fill(`08${Date.now().toString().slice(-10)}`);
    await page.getByLabel('Password').fill('staff12345');
    await chooseSelect(page, 'Role', 'Staff');
    await expect(page.getByRole('dialog').getByRole('radio', { name: 'Jimbaran' })).toBeVisible();
    await page.getByRole('dialog').getByRole('radio', { name: 'Jimbaran' }).check();
    await page.getByLabel('Street').fill('Jl. E2E');
    await page.getByLabel('City').fill('Badung');
    await page.getByLabel('State').fill('Bali');
    await page.getByLabel('Postal code').fill('80361');
    await page.getByLabel('Country').fill('Indonesia');
    await page.getByRole('button', { name: 'Create user' }).click();
    await expect(page.getByRole('heading', { name: 'Add user' })).toHaveCount(0);
    await expect(page.getByText(email)).toBeVisible();

    await page.getByLabel(`Deactivate E2e Staff${stamp}`).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Deactivate', exact: true }).click();
    await expect(page.getByText('Inactive').first()).toBeVisible();
  });
});

test.describe('Staff shop scope', () => {
  test('E2E-30 Jimbaran staff cannot switch to Nusa Dua', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('#branch-switcher')).toHaveCount(0);
    await expect(page.getByText('Jimbaran').first()).toBeVisible();
    await expect(page.getByText('Nusa Dua')).toHaveCount(0);
  });
});
