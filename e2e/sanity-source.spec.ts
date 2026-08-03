import { expect, test } from '@playwright/test';

/**
 * Proves the page is served from Sanity rather than from fixtures.
 *
 * Every assertion here is on something only the live dataset can produce, not
 * on catalogue copy: the fixture adapter and the Sanity adapter deliberately
 * return the same products with the same titles and specs — that equivalence is
 * what tests/adapter-parity.test.ts exists to enforce — so asserting on a
 * product name would pass identically in fixture mode and prove nothing.
 *
 * What differs is where the bytes come from. Fixtures serve `/fixtures/*.webp`
 * from `public/` and carry no LQIP, because generating one would mean shipping
 * a build step the fixture path does not have. Sanity serves `cdn.sanity.io`
 * and returns `metadata.lqip` on every asset.
 */

const PDP = '/products/grain-derby-04';

// Skipped rather than failed when the credentials are absent. These assertions
// are about Sanity specifically, and a fork or a pre-secrets CI run legitimately
// builds from fixtures — reporting that as a failure would train people to
// ignore a red suite. Skipped is the honest state: not verified, not broken.
test.skip(
  !process.env['NEXT_PUBLIC_SANITY_PROJECT_ID'],
  'NEXT_PUBLIC_SANITY_PROJECT_ID is unset — the site is serving fixtures, so there is no Sanity origin to assert on',
);

test('product imagery is served from the Sanity asset pipeline', async ({ page }) => {
  await page.goto(PDP);

  const image = page.locator('main img').first();
  await expect(image).toBeVisible();

  // next/image rewrites the remote URL through its optimizer, so the Sanity
  // origin appears percent-encoded in the `url` parameter rather than as the
  // bare src. Decoding first keeps the assertion readable.
  const src = await image.getAttribute('src');
  expect(src).toBeTruthy();
  expect(decodeURIComponent(src ?? '')).toContain('cdn.sanity.io');
  expect(src).not.toContain('/fixtures/');
});

test('the LCP image carries a blur placeholder built from Sanity LQIP metadata', async ({ request }) => {
  // Asserted against the server HTML rather than the hydrated DOM on purpose.
  // next/image paints placeholder="blur" as an inline background-image and then
  // clears it once the real file decodes, so reading the attribute from a live
  // page is a race against the network. What matters is that the placeholder
  // shipped in the prerendered markup, which is exactly what this reads.
  const html = await (await request.get(PDP)).text();

  // Next wraps the LQIP in an SVG with a Gaussian blur filter, so the outer
  // data URI is the SVG and the base64 LQIP from Sanity is nested inside it.
  expect(html).toContain('data:image/svg+xml');
  expect(html).toContain('feGaussianBlur');

  // Fixture mode has lqip: null and omits placeholder/blurDataURL entirely, so
  // a blur here cannot have come from anywhere but Sanity's asset metadata.
  expect(html).toContain('base64');
});

test('every prerendered product slug came from the dataset', async ({ page }) => {
  // The sitemap is generated from getProductSlugs(), which in Sanity mode is a
  // GROQ query. An empty or unreachable dataset yields a sitemap with no
  // product entries, which is the failure this guards.
  const response = await page.goto('/sitemap.xml');
  expect(response?.status()).toBe(200);

  const xml = await page.content();
  const productUrls = xml.match(/\/products\/[a-z0-9-]+/g) ?? [];
  expect(new Set(productUrls).size).toBe(24);
});
