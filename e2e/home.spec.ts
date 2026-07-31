import { expect, test } from '@playwright/test';

test('homepage renders and the render badge reports ISR', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

  const badge = page.getByRole('group', { name: /Rendered using/ });
  await expect(badge).toContainText('ISR');
  await expect(badge).toContainText('REVALIDATE 3600S');
});

test('the badge describes itself in prose for assistive technology', async ({ page }) => {
  await page.goto('/');
  const label = await page.getByRole('group', { name: /Rendered using/ }).getAttribute('aria-label');
  expect(label).toContain('incremental static regeneration');
  expect(label).not.toContain('·');
});

test('the annotated hero draws its dimension callouts', async ({ page }) => {
  await page.goto('/');
  // Five leader lines, from the design's five verbatim callouts.
  await expect(page.locator('figure svg line')).toHaveCount(5);
  await expect(page.getByText('STICK LENGTH')).toBeVisible();
});

test('the footer keeps its contentinfo landmark', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('contentinfo')).toBeVisible();
});
