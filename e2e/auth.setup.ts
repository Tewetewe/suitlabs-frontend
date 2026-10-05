import { test as setup, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { ADMIN, STAFF } from './credentials';
import { login } from './helpers';

const authDir = path.join(__dirname, '.auth');

setup.setTimeout(180_000);

setup('authenticate staff and admin', async ({ browser }) => {
  fs.mkdirSync(authDir, { recursive: true });

  const staffContext = await browser.newContext();
  const staffPage = await staffContext.newPage();
  await login(staffPage, STAFF.email, STAFF.password);
  await expect(staffPage.getByText(/Welcome back/i)).toBeVisible();
  await staffPage.evaluate(() => localStorage.setItem('suitlabs-cashier-layout', 'counter'));
  await staffContext.storageState({ path: path.join(authDir, 'staff.json') });
  await staffContext.close();

  const adminContext = await browser.newContext();
  const adminPage = await adminContext.newPage();
  await login(adminPage, ADMIN.email, ADMIN.password);
  await expect(adminPage.getByText(/Welcome back/i)).toBeVisible();
  await adminPage.evaluate(() => localStorage.setItem('suitlabs-cashier-layout', 'counter'));
  await adminContext.storageState({ path: path.join(authDir, 'admin.json') });
  await adminContext.close();
});
