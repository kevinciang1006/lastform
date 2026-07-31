import { expect, test } from '@playwright/test';

test('filtering by size updates the URL and the result count', async ({ page }) => {
  await page.goto('/collections/boots');

  const count = page.getByTestId('result-count');
  await expect(count).toHaveText('6');

  // click, not check: the box reflects the URL rather than local state, so it
  // only flips once the server has re-rendered from the new search params.
  await page.getByRole('checkbox', { name: '42', exact: true }).click();

  await expect(page).toHaveURL(/size=42/);
  await expect(page.getByRole('checkbox', { name: '42', exact: true })).toBeChecked();
  // Two boots have size 42 out of stock, and an out-of-stock size does not count
  // as available.
  await expect(count).not.toHaveText('6');
});

test('a filtered URL reproduces server-side, which is the point of URL state', async ({ page }) => {
  await page.goto('/collections/boots?size=42');
  await expect(page.getByRole('checkbox', { name: '42', exact: true })).toBeChecked();
  const filtered = await page.getByTestId('result-count').textContent();

  await page.reload();
  await expect(page.getByTestId('result-count')).toHaveText(filtered ?? '');
});

test('an impossible filter combination offers a route back', async ({ page }) => {
  await page.goto('/collections/boots?price=0-400&colour=Chalk');
  await expect(page.getByTestId('empty-state')).toBeVisible();
  await expect(page.getByRole('link', { name: /CLEAR FILTERS/ })).toBeVisible();
});
