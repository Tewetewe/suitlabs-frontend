import { expect, test } from '@playwright/test';

const agreement = {
  token: 'agreement-e2e-token',
  language: 'en',
  customer_name: 'E2E Customer',
  company_name: 'SuitLabs',
  branch_name: 'Jimbaran',
  rental_date: '2026-08-20T00:00:00Z',
  return_date: '2026-08-23T00:00:00Z',
  booking_amount: 300000,
  deposit_amount: 60000,
  deposit_percent: 20,
  items: [
    { item_id: 'item-1', name: 'Formal Suit', quantity: 1, replacement_fee: 250000 },
    { item_id: 'item-2', name: '', quantity: 2, replacement_fee: 100000 },
  ],
  accepted: false,
  accepted_at: null,
  deposit_clause: 'The deposit is held during the rental period.',
  replacement_clause: 'Replacement fees apply to lost items.',
  release_clause: 'The remaining deposit is released after return.',
};

test.describe('Public deposit agreement', () => {
  test('renders incomplete item data and updates after acceptance', async ({ page }) => {
    let accepted = false;

    await page.route('**/api/v1/public/deposit-agreements/agreement-e2e-token*', async (route) => {
      if (route.request().method() === 'POST' && route.request().url().endsWith('/accept')) {
        accepted = true;
        await route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { ...agreement, accepted: true, accepted_at: '2026-08-20T12:00:00Z' },
          }),
        });
        return;
      }
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: agreement }),
      });
    });

    await page.goto('/agreement/agreement-e2e-token');

    await expect(page.getByRole('heading', { name: 'Security Deposit Agreement' })).toBeVisible();
    await expect(page.getByText('E2E Customer')).toBeVisible();
    await expect(page.getByText('Formal Suit')).toBeVisible();
    await expect(page.getByText('Item ×2')).toBeVisible();
    await expect(page.getByRole('button', { name: 'I have read and accept' })).toBeVisible();

    await page.getByRole('button', { name: 'I have read and accept' }).click();

    await expect.poll(() => accepted).toBe(true);
    await expect(page.getByText('Accepted. You can proceed to pickup at the shop.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'I have read and accept' })).toHaveCount(0);
  });
});