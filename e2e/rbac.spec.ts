import path from 'path';
import { test, expect } from '@playwright/test';
import { goTo } from './helpers';

const adminState = path.join(__dirname, '.auth', 'admin.json');

test.describe('Staff RBAC', () => {
  test('staff menu hides admin screens and buying price', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByTestId('nav-cashier')).toBeVisible();
    await expect(page.getByTestId('nav-bookings')).toBeVisible();
    await expect(page.getByTestId('nav-rentals')).toBeVisible();

    await expect(page.getByTestId('nav-users')).toHaveCount(0);
    await expect(page.getByTestId('nav-financial-report')).toHaveCount(0);
    await expect(page.getByTestId('nav-analytics')).toHaveCount(0);
    await expect(page.getByTestId('nav-assets')).toHaveCount(0);
    await expect(page.getByTestId('nav-branches')).toHaveCount(0);
    await expect(page.getByTestId('nav-bulk-input-sync')).toHaveCount(0);
    await expect(page.getByTestId('nav-wa-reminders')).toHaveCount(0);
    await expect(page.getByTestId('nav-operations-handbook')).toHaveCount(0);

    await expect(page.getByText('Cash on Hand')).toHaveCount(0);
    await expect(page.getByText('Net profit')).toHaveCount(0);

    await page.goto('/dashboard/admin/financial-report');
    await expect(page).toHaveURL(/\/dashboard$/);

    await goTo(page, 'items');
    await expect(async () => {
      await page.getByLabel('Item actions').first().click();
      await page.getByRole('button', { name: 'Edit' }).click({ timeout: 2500 });
    }).toPass({ timeout: 12_000 });
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText('Buying Price')).toHaveCount(0);
  });
});

test.describe('Admin RBAC', () => {
  test.use({ storageState: adminState });

  test('admin can open the books and sees buying price', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByTestId('nav-financial-report')).toBeVisible();
    await expect(page.getByTestId('nav-users')).toBeVisible();
    await expect(page.getByText('Cash on Hand')).toBeVisible();

    await goTo(page, 'financial-report');
    await expect(page).toHaveURL(/\/dashboard\/admin\/financial-report/);
    await expect(page.getByText('Financial Report').first()).toBeVisible();

    await goTo(page, 'items');
    await expect(async () => {
      await page.getByLabel('Item actions').first().click();
      await page.getByRole('button', { name: 'Edit' }).click({ timeout: 2500 });
    }).toPass({ timeout: 12_000 });
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText('Buying Price')).toBeVisible();
  });
});
