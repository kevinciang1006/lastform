import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const ROUTES = [
  '/',
  '/collections/boots',
  '/products/grain-derby-04',
  '/search?q=derby',
  '/engineering',
  '/cart',
  '/journal/a-last-is-not-a-shoe',
];

for (const route of ROUTES) {
  test(`${route} has no accessibility violations`, async ({ page }) => {
    await page.goto(route);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });
}

test('the cart drawer is accessible once open', async ({ page }) => {
  await page.goto('/products/grain-derby-04');
  await page.getByRole('button', { name: /^41 IN$/ }).click();
  await page.getByTestId('add-to-cart').click();
  await expect(page.getByRole('dialog', { name: /cart/i })).toBeVisible();

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(results.violations).toEqual([]);
});
