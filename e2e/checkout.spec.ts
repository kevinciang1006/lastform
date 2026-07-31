import { expect, test } from '@playwright/test';

async function addOnePair(page: import('@playwright/test').Page) {
  await page.goto('/products/grain-derby-04');
  await page.getByRole('button', { name: /^41 IN$/ }).click();
  await page.getByTestId('add-to-cart').click();
}

test('the summary shows the order when the page is reached by clicking through', async ({ page }) => {
  await addOnePair(page);
  await page.goto('/cart');
  await page.getByRole('link', { name: 'CHECKOUT' }).click();

  await expect(page.getByText('GRAIN DERBY 04 — EU 41 × 1')).toBeVisible();
  await expect(page.getByText('SUBTOTAL')).toBeVisible();
});

/**
 * The summary snapshots the cart on mount. That snapshot has to be taken after
 * the persisted store has read localStorage, or a confirmation opened by full
 * page load — a pasted link, a new tab, a restored session — reports an empty
 * order for a cart that still has items in it.
 */
test('the summary shows the order when the page is loaded cold', async ({ page }) => {
  await addOnePair(page);
  await page.goto('/checkout/confirmation');

  await expect(page.getByText('GRAIN DERBY 04 — EU 41 × 1')).toBeVisible();
  await expect(page.getByText('NO ITEMS.')).toBeHidden();
});

test('placing the order empties the cart, and reloading does not resurrect it', async ({ page }) => {
  await addOnePair(page);
  await page.goto('/cart');
  await page.getByRole('link', { name: 'CHECKOUT' }).click();
  await expect(page.getByText('SUBTOTAL')).toBeVisible();

  await expect(page.getByTestId('cart-count')).toHaveText('[00]');

  await page.reload();
  await expect(page.getByText('NO ITEMS.')).toBeVisible();

  await page.goto('/cart');
  await expect(page.getByTestId('empty-state')).toBeVisible();
});
