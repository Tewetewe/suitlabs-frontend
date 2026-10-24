import { test, expect, type Locator, type Page } from '@playwright/test';
import { addDaysISO, clickRowAction, findRowAcrossPages, goTo, localISODate, uniqueCustomer } from './helpers';

// A Suit with a default pair of trousers in the local catalogue.
const SUIT = process.env.E2E_PAIRED_SUIT || 'BSU-SM001';
const TROUSERS = process.env.E2E_PAIRED_TROUSERS || 'BLKTR-SM001';

test.describe.configure({ timeout: 150_000 });

function trousersLines(dialog: Locator) {
  return dialog.locator('input[placeholder="Search trousers"]');
}

function itemLines(dialog: Locator) {
  return dialog.locator('input[placeholder="Search items"]');
}

/** Removes the trousers line, then gives the form time to add it back if it would. */
async function removeTrousersAndWait(page: Page, dialog: Locator) {
  await expect(trousersLines(dialog)).toHaveCount(1);
  const line = dialog.locator('div.rounded-xl').filter({ has: trousersLines(dialog) }).last();
  await line.getByRole('button', { name: 'Remove' }).click();
  await expect(trousersLines(dialog)).toHaveCount(0);
  await page.waitForTimeout(3000);
  await expect(trousersLines(dialog)).toHaveCount(0);
}

async function openNewBooking(page: Page, eventDay: string) {
  const customer = uniqueCustomer();
  await goTo(page, 'bookings');
  const dialog = page.getByRole('dialog').filter({ hasText: 'New Booking' }).first();
  await expect(async () => {
    if (!(await dialog.isVisible())) await page.getByRole('button', { name: 'New Booking' }).first().click();
    await expect(dialog).toBeVisible({ timeout: 2500 });
  }).toPass({ timeout: 20_000 });

  await dialog.getByRole('button', { name: 'New' }).click();
  const customerDialog = page.getByRole('dialog').last();
  await customerDialog.getByLabel('First name').fill(customer.firstName);
  await customerDialog.getByLabel('Last name (optional)').fill(customer.lastName);
  await customerDialog.getByRole('textbox', { name: 'Phone' }).fill(customer.phone);
  await customerDialog.getByRole('button', { name: 'Save' }).click();
  await expect(dialog.getByRole('combobox').first()).toHaveValue(new RegExp(customer.firstName));

  await dialog.getByTestId('booking-event-date').fill(eventDay);
  return { dialog, customer };
}

async function pickSuit(page: Page, dialog: Locator) {
  const picker = itemLines(dialog).first();
  await picker.click();
  await picker.fill(SUIT);
  await page.getByRole('option', { name: new RegExp(SUIT) }).first().click();
  // The form adds the default trousers once.
  await expect(trousersLines(dialog)).toHaveCount(1);
  await expect(trousersLines(dialog).first()).toHaveValue(new RegExp(TROUSERS));
}

async function openEdit(page: Page, name: string) {
  await goTo(page, 'bookings');
  const row = await findRowAcrossPages(page, 'booking-row', name);
  await clickRowAction(row, 'Edit');
  const dialog = page.getByRole('dialog').filter({ hasText: 'Edit Booking' }).first();
  await expect(dialog).toBeVisible();
  // Let the form load its Items before counting the lines.
  await page.waitForTimeout(3000);
  return dialog;
}

test('Add Booking keeps a Suit without its trousers', async ({ page }) => {
  const { dialog, customer } = await openNewBooking(page, addDaysISO(localISODate(), 90));
  await pickSuit(page, dialog);
  await removeTrousersAndWait(page, dialog);

  // Another change to the form must not bring the trousers back.
  await dialog.getByTestId('booking-length-4h').click();
  await page.waitForTimeout(2000);
  await expect(trousersLines(dialog)).toHaveCount(0);

  await dialog.getByRole('button', { name: 'Create' }).click();
  await expect(dialog).toHaveCount(0, { timeout: 30_000 });

  const edit = await openEdit(page, customer.fullName);
  await expect(itemLines(edit)).toHaveCount(1);
  await expect(trousersLines(edit)).toHaveCount(0);
});

test('Edit Booking removes the trousers of a saved Suit', async ({ page }) => {
  const { dialog, customer } = await openNewBooking(page, addDaysISO(localISODate(), 95));
  await pickSuit(page, dialog);
  await dialog.getByRole('button', { name: 'Create' }).click();
  await expect(dialog).toHaveCount(0, { timeout: 30_000 });

  const edit = await openEdit(page, customer.fullName);
  await removeTrousersAndWait(page, edit);
  await edit.getByRole('button', { name: 'Save' }).click();
  await expect(edit).toHaveCount(0, { timeout: 30_000 });

  const again = await openEdit(page, customer.fullName);
  await expect(itemLines(again)).toHaveCount(1);
  await expect(trousersLines(again)).toHaveCount(0);
});
