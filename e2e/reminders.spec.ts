import path from 'path';
import { expect, test } from '@playwright/test';

const adminState = path.join(__dirname, '.auth', 'admin.json');

test.describe('WhatsApp reminders', () => {
  test.use({ storageState: adminState });

  test('shows configuration state and refreshes after a manual send', async ({ page }) => {
    let sendCount = 0;
    const reminder = {
      id: 'reminder-1',
      rental_id: 'rental-1',
      customer_id: 'customer-1',
      branch_id: 'branch-1',
      reminder_type: 'pickup',
      reminder_date: '2026-08-20',
      phone: '628123456789',
      language: 'en',
      message: 'Your pickup is today.',
      status: 'sent',
      trigger: 'manual',
      created_at: '2026-08-20T10:00:00Z',
      updated_at: '2026-08-20T10:00:00Z',
      sent_at: '2026-08-20T10:00:01Z',
    };

    await page.route('**/api/v1/admin/wa-reminders/status', async (route) => {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { configured: true, timezone: 'Asia/Makassar', send_delay_sec: 10, company_name: 'SuitLabs' },
        }),
      });
    });
    await page.route('**/api/v1/admin/wa-reminders', async (route) => {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { reminders: sendCount ? [reminder] : [] } }),
      });
    });
    await page.route('**/api/v1/admin/wa-reminders/send', async (route) => {
      sendCount += 1;
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { reminder_date: '2026-08-20', trigger: 'manual', pickup_sent: 1, return_sent: 0, skipped: 0, failed: 0 },
        }),
      });
    });

    await page.goto('/dashboard/admin/wa-reminders');

    await expect(page.getByText('Connected')).toBeVisible();
    const sendButton = page.getByTestId('wa-reminders-send');
    await expect(sendButton).toBeEnabled();
    await sendButton.click();

    await expect.poll(() => sendCount).toBe(1);
    await expect(page.getByText('Reminders finished')).toBeVisible();
    await expect(page.getByText('Your pickup is today.')).toBeVisible();
  });

  test('disables sending when Wablas is not configured', async ({ page }) => {
    await page.route('**/api/v1/admin/wa-reminders/status', async (route) => {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { configured: false, timezone: 'Asia/Makassar', send_delay_sec: 10, company_name: 'SuitLabs' },
        }),
      });
    });
    await page.route('**/api/v1/admin/wa-reminders', async (route) => {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { reminders: [] } }),
      });
    });

    await page.goto('/dashboard/admin/wa-reminders');

    await expect(page.getByText('Not configured')).toBeVisible();
    await expect(page.getByTestId('wa-reminders-send')).toBeDisabled();
  });
});