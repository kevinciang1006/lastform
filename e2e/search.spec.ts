import { expect, test } from '@playwright/test';

test('search returns results for a seeded product name', async ({ page }) => {
  await page.goto('/search?q=derby');
  await expect(page.getByRole('link', { name: /Grain Derby 04/ })).toBeVisible();
  await expect(page.getByTestId('result-count')).toHaveText('4');
});

test('search works without JavaScript, because the form is a plain GET', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/search');
  await page.getByLabel('Search the catalogue').fill('chukka');
  await page.getByRole('button', { name: 'SEARCH' }).click();
  await expect(page).toHaveURL(/q=chukka/);
  await expect(page.getByRole('link', { name: /Chukka 06/ })).toBeVisible();
  await context.close();
});

test('search states plainly when nothing matches', async ({ page }) => {
  await page.goto('/search?q=zzzznothing');
  await expect(page.getByTestId('empty-state')).toBeVisible();
});

test('search shows a distinct idle state before any query', async ({ page }) => {
  await page.goto('/search');
  await expect(page.getByTestId('idle-state')).toBeVisible();
});
