import { expect, test } from '@playwright/test';

/**
 * A visitor Vercel geolocates to Indonesia. The middleware turns that into
 * `lf-currency=IDR`, which is a true statement about where they are — and no
 * statement at all about what anything costs. The catalogue is priced in USD
 * and nothing in this codebase converts between currencies, so every amount on
 * screen has to keep saying USD.
 */
test.use({ extraHTTPHeaders: { 'x-vercel-ip-country': 'ID' } });

/** Currency codes that appear immediately before a figure — i.e. `formatMoney`
 *  output, and not the prose that names a visitor's region. */
function pricedCurrencies(text: string): string[] {
  return [...new Set([...text.matchAll(/\b([A-Z]{3})\s[\d,]/g)].map((m) => m[1] as string))].sort();
}

async function addOnePair(page: import('@playwright/test').Page) {
  await page.goto('/products/grain-derby-04');
  await page.getByRole('button', { name: /^41 IN$/ }).click();
  await page.getByTestId('add-to-cart').click();
}

test('the drawer subtotal is priced in the same currency as its line items', async ({ page }) => {
  await addOnePair(page);

  const drawer = page.getByRole('dialog', { name: /cart/i });
  await expect(drawer).toBeVisible();
  expect(pricedCurrencies(await drawer.innerText())).toEqual(['USD']);
});

test('the cart page subtotal is priced in the same currency as its line items', async ({ page }) => {
  await addOnePair(page);
  await page.goto('/cart');

  const main = page.locator('#main-content');
  await expect(main.getByText('SUBTOTAL')).toBeVisible();
  expect(pricedCurrencies(await main.innerText())).toEqual(['USD']);
});

test('the confirmation summary is priced in the same currency as its line items', async ({ page }) => {
  await addOnePair(page);
  await page.goto('/checkout/confirmation');

  const main = page.locator('#main-content');
  await expect(main.getByText('SUBTOTAL')).toBeVisible();
  expect(pricedCurrencies(await main.innerText())).toEqual(['USD']);
});

/** The geo signal still has to reach the page, or the middleware and the
 *  `/engineering` note describing it would be documenting nothing. */
test('tells the visitor which currency their region uses without repricing anything', async ({ page }) => {
  await addOnePair(page);
  await page.goto('/cart');

  await expect(page.getByTestId('currency-note')).toContainText('IDR');
  await expect(page.getByTestId('currency-note')).toContainText('USD');
});

test('says nothing about region when the visitor is already in the catalogue currency', async ({ browser }) => {
  const context = await browser.newContext({ extraHTTPHeaders: { 'x-vercel-ip-country': 'US' } });
  const page = await context.newPage();
  await addOnePair(page);
  await page.goto('/cart');

  await expect(page.getByText('SUBTOTAL')).toBeVisible();
  await expect(page.getByTestId('currency-note')).toBeHidden();
  await context.close();
});
