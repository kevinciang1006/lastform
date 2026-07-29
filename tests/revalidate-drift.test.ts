// vitest.config.ts sets environment: 'jsdom' globally. Under jsdom, Vite treats
// `new URL(relative, import.meta.url)` as a browser asset import and rewrites it
// to an http://localhost origin, which silently breaks existsSync below (every
// case reads as missing, so this file cannot tell "skipped" from "should pass").
// Forcing node here sidesteps that rewrite; this file needs no DOM anyway.
// @vitest-environment node
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ROUTES } from '@/lib/rendering';

const CASES = [
  { file: 'app/page.tsx', key: 'home' },
  { file: 'app/collections/[slug]/page.tsx', key: 'collection' },
  { file: 'app/products/[slug]/page.tsx', key: 'product' },
] as const;

describe('revalidate literals match the manifest', () => {
  for (const { file, key } of CASES) {
    const path = new URL(`../${file}`, import.meta.url);

    // skipIf, not a swallowed try/catch: a route that does not exist yet must
    // report as skipped, never as passing. Tasks 17 and 18 activate these.
    it.skipIf(!existsSync(path))(`${file} matches ROUTES.${key}`, () => {
      const expected = ROUTES[key].revalidate;
      expect(typeof expected, `ROUTES.${key} must carry a numeric window`).toBe('number');
      expect(readFileSync(path, 'utf8')).toContain(`export const revalidate = ${expected}`);
    });
  }
});
