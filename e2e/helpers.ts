import { expect, type Locator, type Page } from '@playwright/test';

export const ID_CARD = {
  name: 'id-card.png',
  mimeType: 'image/png',
  buffer: Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64',
  ),
};

export function localISODate(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addDaysISO(isoDate: string, days: number) {
  const d = new Date(`${isoDate}T00:00:00`);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function uniqueCustomer() {
  const stamp = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  return {
    firstName: 'E2e',
    lastName: stamp,
    fullName: `E2e ${stamp}`,
    phone: `081${Date.now().toString().slice(-9)}`,
    email: `e2e.${stamp}@suitlabs.test`,
  };
}

export async function login(page: Page, email: string, password: string) {
  await page.goto('/auth/login', { waitUntil: 'domcontentloaded' });
  const emailField = page.getByLabel('Email address');
  const passwordField = page.getByLabel('Password');
  await expect(emailField).toBeVisible();
  await page.waitForFunction(
    () => {
      const form = document.querySelector('form');
      if (!form) return false;
      return Object.keys(form).some((key) => key.startsWith('__react'));
    },
    { timeout: 8_000 },
  ).catch(() => undefined);
  await emailField.fill(email);
  await passwordField.fill(password);
  await expect(emailField).toHaveValue(email);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 45_000 });
}

const ROUTES: Record<string, string> = {
  cashier: '/dashboard/cashier',
  dashboard: '/dashboard',
  bookings: '/dashboard/bookings',
  rentals: '/dashboard/rentals',
  expenses: '/dashboard/expenses',
  sales: '/dashboard/sales',
  items: '/dashboard/items',
  customers: '/dashboard/customers',
  users: '/dashboard/users',
  assets: '/dashboard/admin/assets',
  'bulk-input-sync': '/dashboard/admin/bulk-input-sync',
  'financial-report': '/dashboard/admin/financial-report',
};

export async function goTo(page: Page, nav: string) {
  const href = ROUTES[nav];
  if (!href) throw new Error(`Unknown screen: ${nav}`);
  await expect(async () => {
    await page.goto(href, { waitUntil: 'domcontentloaded', timeout: 45_000 });
    await expect(page).toHaveURL(new RegExp(href.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }).toPass({ timeout: 90_000 });
  if (nav === 'cashier') await ensureCounter(page);
}

export async function ensureCounter(page: Page) {
  const counter = page.getByRole('button', { name: 'Counter' });
  if (await counter.isVisible()) {
    await counter.click();
  }
}

export async function openCashier(page: Page) {
  await page.goto('/dashboard/cashier');
  await ensureCounter(page);
  await expect(page.getByTestId('pos-mode-rental')).toBeVisible();
}

export async function rowNamed(page: Page, testId: string, name: string) {
  const row = page.getByTestId(testId).filter({ hasText: name }).first();
  await expect(row).toBeVisible();
  return row;
}

export async function createInventoryItem(page: Page, name?: string) {
  const stamp = Date.now().toString(36);
  const itemName = name || `E2E Item ${stamp}`;
  await goTo(page, 'items');
  const dialog = page.getByRole('dialog');
  await expect(async () => {
    if (!(await dialog.getByLabel('Code *').isVisible().catch(() => false))) {
      await page.getByRole('button', { name: 'Add Item' }).first().click({ timeout: 3000 });
    }
    await expect(dialog.getByLabel('Code *')).toBeVisible({ timeout: 4000 });
  }).toPass({ timeout: 20_000 });
  await dialog.getByLabel('Code *').fill(`E2E-${stamp}`);
  await dialog.getByLabel('Name *').fill(itemName);
  await chooseSelect(page, 'Type *', 1);
  const brand = dialog.getByPlaceholder('Search or type a brand');
  await brand.click();
  await brand.fill('SuitLabs');
  await page.keyboard.press('Enter');
  const color = dialog.getByPlaceholder('Search or type a color');
  await color.click();
  await color.fill('Black');
  await page.keyboard.press('Enter');
  await dialog.getByLabel('Quantity *').fill('1');
  await dialog.getByLabel('Standard Price (3-day) *').fill('10000');
  await dialog.getByLabel('One Day Price *').fill('5000');
  await dialog.getByLabel('Four Hour Price *').fill('3000');
  await dialog.getByRole('button', { name: 'Add item' }).click();
  await expect(page.getByText('Item Created Successfully!')).toBeVisible({ timeout: 45_000 });
  await expect(page.getByRole('heading', { name: 'Add item' })).toHaveCount(0);
  return itemName;
}

export async function fillSearch(page: Page, placeholder: string, value: string) {
  const search = page.getByPlaceholder(placeholder);
  await expect(search).toBeVisible();
  await search.fill(value);
  await page.waitForTimeout(700);
}

export async function chooseSelect(page: Page, label: string, option: string | number) {
  const combo = page.getByRole('combobox', { name: label });
  await expect(async () => {
    await combo.click({ timeout: 2500 });
    const opt =
      typeof option === 'number'
        ? page.getByRole('option').nth(option)
        : page.getByRole('option', { name: option, exact: true });
    await expect(opt).toBeVisible({ timeout: 2500 });
    await opt.click({ timeout: 2500 });
  }).toPass({ timeout: 20_000 });
}

export async function openItemNamed(page: Page, itemName: string) {
  await goTo(page, 'items');
  const status = page.getByRole('combobox', { name: 'Status' });
  if (await status.count()) {
    const current = await status.inputValue().catch(() => '');
    if (current && !/all status/i.test(current)) {
      await chooseSelect(page, 'Status', 'All Status');
    }
  }
  await fillSearch(page, 'Search items...', itemName);
  const link = page.locator('a[href^="/dashboard/items/"]').filter({ hasText: itemName }).first();
  if (!(await link.isVisible().catch(() => false))) {
    await fillSearch(page, 'Search items...', '');
    if (await status.count()) await chooseSelect(page, 'Status', 'All Status');
    await fillSearch(page, 'Search items...', itemName);
  }
  await expect(link).toBeVisible();
  await link.click();
}

export async function findRowAcrossPages(page: Page, testId: string, name: string) {
  const row = page.getByTestId(testId).filter({ hasText: name }).first();
  const search = page.getByPlaceholder(/Search/);

  for (let attempt = 0; attempt < 4; attempt++) {
    if (await search.count()) {
      await search.fill(name);
      await page.waitForTimeout(700);
    }
    for (let i = 0; i < 25; i++) {
      if (await row.isVisible().catch(() => false)) return row;
      const prevCount = await page.getByTestId(testId).count();
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(500);
      const nextCount = await page.getByTestId(testId).count();
      const loadingMore = await page.getByText('Loading more…').isVisible().catch(() => false);
      if (nextCount === prevCount && !loadingMore) break;
    }
    await page.reload();
    await expect(page.getByPlaceholder(/Search/).or(page.getByText(/No \w+ found/)).first()).toBeVisible();
  }
  await expect(row, `Could not find ${testId} for ${name}`).toBeVisible();
  return row;
}

export async function clickRowAction(row: Locator, name: string) {
  const page = row.page();
  let href: string | null = null;
  await expect(async () => {
    const menu = page.getByRole('menu');
    if (!(await menu.isVisible().catch(() => false))) {
      await row.getByLabel(/actions/i).click();
    }
    const action = menu.getByRole('menuitem', { name });
    await expect(action).toBeVisible({ timeout: 2500 });
    href = await action.getAttribute('href');
    if (!href) await action.click({ timeout: 2500 });
  }).toPass({ timeout: 15_000 });
  if (href) {
    await page.goto(href, { waitUntil: 'domcontentloaded' });
  }
}

export async function expectHiddenRowActions(row: Locator, names: string[]) {
  const page = row.page();
  await row.getByLabel(/actions/i).click();
  const menu = page.getByRole('menu');
  await expect(menu).toBeVisible();
  for (const name of names) {
    await expect(menu.getByRole('menuitem', { name })).toHaveCount(0);
  }
  await page.keyboard.press('Escape');
  await expect(menu).toHaveCount(0);
}

export async function setPosDate(page: Page, testId: 'pos-rental-date' | 'pos-return-date', value: string) {
  await expect(async () => {
    await page.getByTestId(testId).evaluate((el, v) => {
      const input = el as HTMLInputElement & { _valueTracker?: { setValue: (next: string) => void } };
      const last = input.value;
      const proto = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
      proto?.set?.call(input, v);
      input._valueTracker?.setValue(last);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }, value);
    await expect(page.getByTestId(testId)).toHaveValue(value, { timeout: 2_000 });
  }).toPass({ timeout: 15_000 });
}

export async function fillPosDates(page: Page, start: string, end: string) {
  await setPosDate(page, 'pos-rental-date', start);
  await setPosDate(page, 'pos-return-date', end);
  await expect(page.locator('.animate-skeleton')).toHaveCount(0, { timeout: 20_000 });
  await expect(
    page.getByTestId('pos-item').or(page.getByText('No items match')).first(),
  ).toBeVisible();
}

export async function posTileNamed(page: Page, itemName: string) {
  const search = page.getByPlaceholder('Find suit, size, color, code…');
  await search.fill(itemName);
  await page.waitForTimeout(500);
  const tile = page.getByTestId('pos-item').filter({ hasText: itemName }).first();
  await expect(tile).toBeVisible();
  return tile;
}

/** First catalogue tile with a non-zero price, or null if the page is all Rp 0. */
export async function pricedPosTile(page: Page) {
  const priced = page.getByTestId('pos-item').filter({ hasNot: page.getByText('Rp 0', { exact: true }) });
  if (await priced.count()) return priced.first();
  return null;
}

export async function closeDialog(page: Page) {
  const dialog = page.getByRole('dialog');
  await expect(dialog.first()).toBeVisible();
  await expect(async () => {
    if (!(await dialog.count())) return;
    const closeBtn = dialog.getByRole('button', { name: 'Close' }).first();
    if (await closeBtn.count()) {
      await closeBtn.click({ timeout: 2000 });
    } else {
      await page.keyboard.press('Escape');
    }
    await expect(dialog).toHaveCount(0, { timeout: 2500 });
  }).toPass({ timeout: 15_000 });
}

export async function dismissIssuedInvoice(page: Page, title: 'Booking Invoice' | 'Sale Invoice' = 'Booking Invoice') {
  await expect(page.getByRole('heading', { name: title })).toBeVisible({ timeout: 20_000 });
  await closeDialog(page);
}

export type PosBookingOpts = {
  coverage?: 'dp' | 'full';
  itemName?: string;
  rentalDate?: string;
  returnDate?: string;
  payMethod?: 'cash' | 'qris' | 'transfer';
  discount?: string;
};

export async function createPosBooking(
  page: Page,
  coverageOrOpts: 'dp' | 'full' | PosBookingOpts = 'full',
) {
  const opts: PosBookingOpts =
    typeof coverageOrOpts === 'string' ? { coverage: coverageOrOpts } : coverageOrOpts;
  const coverage = opts.coverage ?? 'full';
  const customer = uniqueCustomer();
  const spanDays =
    opts.rentalDate && opts.returnDate
      ? Math.max(
          0,
          Math.round(
            (new Date(`${opts.returnDate}T00:00:00`).getTime() - new Date(`${opts.rentalDate}T00:00:00`).getTime()) /
              86_400_000,
          ),
        )
      : 1;
  let rentalDate = opts.rentalDate || '';
  let returnDate = opts.returnDate || '';
  if (!opts.rentalDate) {
    const startOffset = 21 + Math.floor(Math.random() * 60);
    rentalDate = localISODate(startOffset);
    returnDate = localISODate(startOffset + 1);
  } else {
    rentalDate = opts.rentalDate;
    returnDate = opts.returnDate || opts.rentalDate;
  }

  await openCashier(page);
  await fillPosDates(page, rentalDate, returnDate);
  if (!(await page.getByTestId('pos-item').count())) {
    for (let extra = 1; extra <= 12; extra++) {
      rentalDate = localISODate(extra);
      returnDate = localISODate(extra + spanDays);
      await fillPosDates(page, rentalDate, returnDate);
      if (await page.getByTestId('pos-item').count()) break;
    }
  }

  let tile = opts.itemName
    ? await posTileNamed(page, opts.itemName)
    : await pricedPosTile(page);
  if (!tile) {
    const created = await createInventoryItem(page);
    await openCashier(page);
    await fillPosDates(page, rentalDate, returnDate);
    tile = await posTileNamed(page, created);
  }
  await expect(tile).toBeVisible();
  const bookedName = (await tile.locator('div.font-semibold').innerText()).trim();
  await tile.click();
  await page.getByTestId('pos-new-customer').click();
  await page.getByLabel('First name').fill(customer.firstName);
  await page.getByLabel('Last name').fill(customer.lastName);
  await page.getByLabel('Phone').fill(customer.phone);
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByTestId('pos-customer')).toContainText(customer.fullName);
  if (opts.discount) {
    await page.getByLabel('Discount').fill(opts.discount);
  }
  if (coverage === 'full') {
    await page.getByTestId('pos-pay-full').click();
  } else {
    await page.getByTestId('pos-pay-dp').click();
    await page.getByRole('button', { name: '50%' }).click();
  }
  if (opts.payMethod === 'qris') await page.getByTestId('pos-pay-qris').click();
  else if (opts.payMethod === 'transfer') await page.getByTestId('pos-pay-transfer').click();
  else if (opts.payMethod === 'cash') await page.getByTestId('pos-pay-cash').click();
  await page.getByTestId('pos-charge').click();
  await dismissIssuedInvoice(page, 'Booking Invoice');
  await expect(page.getByTestId('pos-done').getByText('Booking charged')).toBeVisible();
  return { ...customer, rentalDate, returnDate, itemName: bookedName };
}

export async function searchBooking(page: Page, customerName: string) {
  await goTo(page, 'bookings');
  await page.getByPlaceholder('Search bookings...').fill(customerName);
  await page.waitForTimeout(700);
  return rowNamed(page, 'booking-row', customerName);
}

export async function pickupNamedRental(page: Page, customerName: string) {
  await goTo(page, 'rentals');
  const rental = await findRowAcrossPages(page, 'rental-row', customerName);
  await expect(async () => {
    await rental.getByTestId('rental-pickup').click({ timeout: 2500 });
  }).toPass({ timeout: 20_000 });
  await page.getByTestId('identity-card-upload').setInputFiles(ID_CARD);
  await page.getByTestId('confirm-pickup').click();
  await expect(rental.getByText('active')).toBeVisible();
  return rental;
}

export async function switchShop(page: Page, shop: 'Jimbaran' | 'Nusa Dua' | 'All branches') {
  const switcher = page.locator('#branch-switcher');
  if (!(await switcher.isVisible().catch(() => false))) {
    await expect(async () => {
      await page.goto('/dashboard', { waitUntil: 'domcontentloaded', timeout: 45_000 });
      await expect(switcher).toBeVisible({ timeout: 15_000 });
    }).toPass({ timeout: 90_000 });
  }
  await expect(switcher).toBeVisible();
  await switcher.click();
  await switcher.fill(shop);
  await page.getByRole('option', { name: shop, exact: true }).click();
  await expect(page.locator('#branch-switcher')).toHaveValue(new RegExp(shop.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

export async function openBookingInvoice(page: Page, customerName: string, kind: 'DP invoice' | 'Full invoice') {
  await goTo(page, 'bookings');
  await page.getByPlaceholder('Search bookings...').fill(customerName);
  await page.waitForTimeout(700);
  const booking = await rowNamed(page, 'booking-row', customerName);
  await clickRowAction(booking, kind);
  await expect(page.getByRole('heading', { name: 'Booking Invoice' })).toBeVisible();
  return booking;
}

export const ANDROID_UA =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36';
export const IOS_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

type PrintHooks = {
  hrefs: string[];
  prints: number;
  title: string;
};

export async function installPrintHooks(context: { addInitScript: (script: () => void) => Promise<void> }) {
  await context.addInitScript(() => {
    const topWin = () =>
      window.top as Window & {
        __e2ePrintHrefs?: string[];
        __e2ePrintCalls?: number;
        __e2ePrintTitle?: string;
      };

    const store = topWin();
    store.__e2ePrintHrefs = store.__e2ePrintHrefs || [];
    store.__e2ePrintCalls = store.__e2ePrintCalls || 0;
    store.__e2ePrintTitle = store.__e2ePrintTitle || '';

    const isPrintScheme = (url: string) =>
      /^(intent:|bprint:|suitlabs-print:|my\.bluetoothprint)/i.test(url);

    const captureHref = (value: string | URL) => {
      const url = String(value);
      if (isPrintScheme(url)) {
        topWin().__e2ePrintHrefs!.push(url);
        return true;
      }
      return false;
    };

    const hrefDesc = Object.getOwnPropertyDescriptor(Location.prototype, 'href');
    if (hrefDesc?.set && hrefDesc.get) {
      Object.defineProperty(Location.prototype, 'href', {
        configurable: true,
        get() {
          return hrefDesc.get!.call(this);
        },
        set(value: string) {
          if (captureHref(value)) return;
          hrefDesc.set!.call(this, value);
        },
      });
    }

    const nativeAssign = Location.prototype.assign;
    Location.prototype.assign = function (url: string | URL) {
      if (captureHref(url)) return;
      return nativeAssign.call(this, url);
    };

    const nativeReplace = Location.prototype.replace;
    Location.prototype.replace = function (url: string | URL) {
      if (captureHref(url)) return;
      return nativeReplace.call(this, url);
    };

    const patchPrint = (win: Window | null) => {
      if (!win) return;
      try {
        win.print = function () {
          const root = topWin();
          root.__e2ePrintCalls = (root.__e2ePrintCalls || 0) + 1;
          root.__e2ePrintTitle = this.document?.title || '';
        };
      } catch {
        // Cross-origin frames cannot be patched and are not used for receipts.
      }
    };

    patchPrint(window);

    const hookIframe = (iframe: HTMLIFrameElement) => {
      patchPrint(iframe.contentWindow);
      iframe.addEventListener('load', () => patchPrint(iframe.contentWindow));
    };

    const nativeCreateElement = Document.prototype.createElement;
    Document.prototype.createElement = function (tagName: string, options?: ElementCreationOptions) {
      const el = nativeCreateElement.call(this, tagName, options);
      if (String(tagName).toLowerCase() === 'iframe') {
        hookIframe(el as HTMLIFrameElement);
      }
      return el;
    };

    const observe = () => {
      if (!document.documentElement) return;
      new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          for (const node of mutation.addedNodes) {
            if (node instanceof HTMLIFrameElement) hookIframe(node);
          }
        }
      }).observe(document.documentElement, { childList: true, subtree: true });
    };
    if (document.documentElement) observe();
    else document.addEventListener('DOMContentLoaded', observe, { once: true });
  });
}

export async function readPrintHooks(page: Page): Promise<PrintHooks> {
  return page.evaluate(() => {
    const w = window as Window & {
      __e2ePrintHrefs?: string[];
      __e2ePrintCalls?: number;
      __e2ePrintTitle?: string;
    };
    return {
      hrefs: w.__e2ePrintHrefs || [],
      prints: w.__e2ePrintCalls || 0,
      title: w.__e2ePrintTitle || '',
    };
  });
}
