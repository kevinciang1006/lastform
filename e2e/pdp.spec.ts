import { expect, test } from '@playwright/test';

const PDP = '/products/grain-derby-04';

test('selecting an available size adds to cart and announces it', async ({ page }) => {
  await page.goto(PDP);

  await expect(page.getByTestId('add-to-cart')).toBeDisabled();

  await page.getByRole('button', { name: /^41 IN$/ }).click();
  await expect(page.getByTestId('add-to-cart')).toBeEnabled();
  await page.getByTestId('add-to-cart').click();

  await expect(page.getByRole('dialog', { name: /cart/i })).toBeVisible();
  await expect(page.getByTestId('cart-count')).toHaveText('[01]');
  await expect(page.getByRole('status')).toContainText(/added to cart/i);
});

test('Escape closes the drawer and returns focus to whatever opened it', async ({ page }) => {
  await page.goto(PDP);
  await page.getByRole('button', { name: /^41 IN$/ }).click();
  await page.getByTestId('add-to-cart').click();

  const drawer = page.getByRole('dialog', { name: /cart/i });
  await expect(drawer).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(drawer).toBeHidden();
  // Opened by adding to cart, so focus belongs back on that button — not
  // wherever the drawer happens to sit in the document.
  await expect(page.getByTestId('add-to-cart')).toBeFocused();
});

test('opening from the header returns focus to the cart button', async ({ page }) => {
  await page.goto(PDP);
  await page.getByTestId('cart-button').click();
  await expect(page.getByRole('dialog', { name: /cart/i })).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(page.getByTestId('cart-button')).toBeFocused();
});

test('an out-of-stock size cannot be added', async ({ page }) => {
  await page.goto(PDP);

  const soldOut = page.getByRole('button', { name: /^42 OUT$/ });
  await expect(soldOut).toHaveAttribute('aria-disabled', 'true');
  // Never colour alone: the state is spelled out and struck through.
  await expect(soldOut).toContainText('OUT');

  await soldOut.click({ force: true });
  await expect(page.getByTestId('add-to-cart')).toBeDisabled();
});

test('the size grid is complete in the server HTML before any JavaScript runs', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(PDP);
  // Twelve sizes rendered from the ISR snapshot, not fetched on the client.
  await expect(page.getByRole('group', { name: 'Size' }).getByRole('button')).toHaveCount(12);
  await context.close();
});

test('the stock endpoint is never cached', async ({ request }) => {
  const response = await request.get('/api/stock?slug=grain-derby-04');
  expect(response.status()).toBe(200);
  expect(response.headers()['cache-control']).toContain('no-store');
});

test('the quantity stepper and remove control work from the drawer', async ({ page }) => {
  await page.goto(PDP);
  await page.getByRole('button', { name: /^41 IN$/ }).click();
  await page.getByTestId('add-to-cart').click();

  const drawer = page.getByRole('dialog', { name: /cart/i });
  await drawer.getByRole('button', { name: /Increase quantity/ }).click();
  await expect(page.getByTestId('cart-count')).toHaveText('[02]');

  await drawer.getByRole('button', { name: 'REMOVE' }).click();
  await expect(page.getByTestId('cart-count')).toHaveText('[00]');
});
