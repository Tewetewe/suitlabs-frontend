import { test, expect } from '@playwright/test';
import {
  clickRowAction,
  createPosBooking,
  expectHiddenRowActions,
  findRowAcrossPages,
  goTo,
  localISODate,
  pickupNamedRental,
  searchBooking,
} from './helpers';

test.describe.configure({ timeout: 120_000 });

test.describe('Booking and rental lifecycle', () => {
  test('E2E-10 edit pending booking updates the pending rental', async ({ page }) => {
    const customer = await createPosBooking(page, 'dp');
    const booking = await searchBooking(page, customer.fullName);
    await clickRowAction(booking, 'Edit');
    await expect(page.getByRole('heading', { name: 'Edit Booking' })).toBeVisible();
    const note = `E2E note ${Date.now()}`;
    await page.getByLabel('Notes').fill(note);
    await page.getByLabel('Appointment date').fill(localISODate(16));
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByRole('heading', { name: 'Edit Booking' })).toHaveCount(0);
    await expect(booking).toContainText(note);
  });

  test('E2E-11 change dates on the rental after pickup', async ({ page }) => {
    const customer = await createPosBooking(page, 'full');
    const rental = await pickupNamedRental(page, customer.fullName);
    await clickRowAction(rental, 'Change dates');
    await expect(page.getByRole('heading', { name: 'Change dates' })).toBeVisible();
    await expect(page.getByLabel('Rental date')).toHaveValue(/.+/);
    await expect(page.getByLabel('Return date')).toHaveValue(/.+/);
    await page.getByRole('dialog').getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('heading', { name: 'Change dates' })).toHaveCount(0);
  });

  test('E2E-12 cancel booking while rental is pending', async ({ page }) => {
    const customer = await createPosBooking(page, 'dp');
    const booking = await searchBooking(page, customer.fullName);
    await clickRowAction(booking, 'Cancel booking');
    await page.getByRole('dialog').getByRole('button', { name: 'Cancel booking' }).click();
    await expect(page.getByText('Booking cancelled')).toBeVisible();
    await expect(booking).toContainText(/cancelled/i);

    await goTo(page, 'rentals');
    const rental = await findRowAcrossPages(page, 'rental-row', customer.fullName);
    await expect(rental.getByText('cancelled')).toBeVisible();
  });

  test('E2E-13 cancel booking after pickup is refused', async ({ page }) => {
    const customer = await createPosBooking(page, 'full');
    await pickupNamedRental(page, customer.fullName);
    const booking = await searchBooking(page, customer.fullName);
    await clickRowAction(booking, 'Cancel booking');
    await page.getByRole('dialog').getByRole('button', { name: 'Cancel booking' }).click();
    await expect(page.getByText(/Cancel or complete the Rental/i)).toBeVisible();
    await page.getByRole('button', { name: 'Keep booking' }).click();
  });

  test('E2E-14 cancel rental requires a written reason', async ({ page }) => {
    const customer = await createPosBooking(page, 'full');
    await goTo(page, 'rentals');
    const rental = await findRowAcrossPages(page, 'rental-row', customer.fullName);
    await clickRowAction(rental, 'Cancel rental');
    await expect(page.getByRole('heading', { name: 'Cancel rental' })).toBeVisible();
    await expect(page.getByRole('dialog').getByRole('button', { name: 'Cancel rental' })).toBeDisabled();
    await page.getByLabel('Reason').fill('Customer never confirmed the fitting.');
    await page.getByRole('dialog').getByRole('button', { name: 'Cancel rental' }).click();
    await expect(page.getByText('Rental cancelled')).toBeVisible();
    await expect(rental.getByText('cancelled')).toBeVisible();
  });

  test('E2E-15 fully paid booking hides Edit and Collect balance', async ({ page }) => {
    const customer = await createPosBooking(page, 'full');
    const booking = await searchBooking(page, customer.fullName);
    await expectHiddenRowActions(booking, ['Edit', 'Collect balance']);
  });

  test('E2E-21 never collected: cancel pending rental with a reason', async ({ page }) => {
    const customer = await createPosBooking(page, 'full');
    await goTo(page, 'rentals');
    const rental = await findRowAcrossPages(page, 'rental-row', customer.fullName);
    await expect(rental.getByText('pending')).toBeVisible();
    await clickRowAction(rental, 'Cancel rental');
    await page.getByLabel('Reason').fill('Customer never showed for pickup.');
    await page.getByRole('dialog').getByRole('button', { name: 'Cancel rental' }).click();
    await expect(rental.getByText('cancelled')).toBeVisible();
    await expect(rental.getByTestId('rental-pickup')).toHaveCount(0);
  });
});
