import path from 'path';
import { test, expect } from '@playwright/test';
import { goTo } from './helpers';

test.describe.configure({ mode: 'serial', timeout: 90_000 });

const adminState = path.join(__dirname, '.auth', 'admin.json');

test.describe('Google Sheets mirror', () => {
  test.use({ storageState: adminState });

  test('E2E-41 / E2E-42 / E2E-43 sheets status, inbound sync, and export retry', async ({ page }) => {
    await goTo(page, 'bulk-input-sync');
    await expect(page.getByText('Item Data Sync')).toBeVisible();
    const configured = await page.getByText('Connected').count();
    if (!configured) {
      await expect(page.getByText('Not configured').first()).toBeVisible();
      test.info().annotations.push({
        type: 'skip-reason',
        description: 'Google Sheets is not configured on this environment',
      });
    } else {
      await page.getByRole('button', { name: /Sync items now|Sync all shops/ }).first().click();
      await expect(page.getByText('Sync complete')).toBeVisible({ timeout: 60_000 });
    }

    await goTo(page, 'financial-report');
    await expect(page.getByText('Monthly Google Sheets export')).toBeVisible();
    await page.getByRole('button', { name: 'Refresh status' }).click();
    const retry = page.getByRole('button', { name: 'Retry' });
    if (await retry.count()) {
      await retry.first().click();
    }
  });
});
