import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(join(__dirname, '../app/globals.css'), 'utf8');

const REQUIRED_TOKENS = [
  '--color-ink: #14181B',
  '--color-chalk: #E9E9E4',
  '--color-slate: #5A6167',
  '--color-cobalt: #1B3BD9',
  '--color-ochre: #C4842B',
  '--color-fog: #D6D7D1',
  // Values, not just names: a token whose name survives while its value is
  // silently changed is the drift this contract exists to catch.
  '--font-display: var(--font-archivo)',
  '--font-body: var(--font-inter-tight)',
  '--font-mono: var(--font-plex-mono)',
  '--text-spec: 0.5625rem',
  '--text-meta: 0.625rem',
  '--text-value: 0.8125rem',
  '--text-body: 0.9375rem',
  '--text-h3: 1.625rem',
  '--text-h2: 2.625rem',
  '--text-h1: 3.5rem',
  '--text-hero: 4rem',
  '--tracking-mono: 0.16em',
  '--tracking-meta: 0.14em',
  '--tracking-wide: 0.18em',
  '--tracking-eyebrow: 0.2em',
  '--tracking-value: 0.04em',
  '--tracking-display: -0.035em',
  '--leading-body: 1.65',
  '--radius-dot: 9999px',
];

describe('design tokens', () => {
  it('declares every token from the design handoff sheet', () => {
    const normalised = css.replace(/[ \t]+/g, ' ');
    for (const token of REQUIRED_TOKENS) {
      expect(normalised, `missing token: ${token}`).toContain(token);
    }
  });

  it('respects prefers-reduced-motion', () => {
    expect(css).toContain('prefers-reduced-motion: reduce');
  });
});
