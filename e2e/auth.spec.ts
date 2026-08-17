import { test, expect } from '@playwright/test';
import { STAFF } from './credentials';

test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Auth', () => {
  test('staff can sign in and reach the dashboard', async ({ page }) => {
    await page.goto('/auth/login');
    await page.getByLabel('Email address').fill(STAFF.email);
    await page.getByLabel('Password').fill(STAFF.password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByText(/Welcome back/i)).toBeVisible();
    await expect(page.getByText('Jimbaran')).toBeVisible();
  });

  test('rejected credentials stay on the login screen', async ({ page }) => {
    await page.goto('/auth/login');
    await page.getByLabel('Email address').fill('nobody@suitlabs.com');
    await page.getByLabel('Password').fill('wrong-password');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByText(/invalid credentials/i)).toBeVisible();
    await expect(page).toHaveURL(/\/auth\/login/);
  });
});
