import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8');

const REQUIRED_TOKENS = [
  '--color-ink: #14181B',
  '--color-chalk: #E9E9E4',
  '--color-slate: #5A6167',
  '--color-cobalt: #1B3BD9',
  '--color-ochre: #C4842B',
  '--color-fog: #D6D7D1',
  '--font-display:',
  '--font-body:',
  '--font-mono:',
  '--text-spec:',
  '--text-meta:',
  '--text-value:',
  '--text-body:',
  '--text-h3:',
  '--text-h2:',
  '--text-h1:',
  '--text-hero:',
  '--tracking-mono: 0.16em',
  '--tracking-display: -0.035em',
  '--leading-body: 1.65',
  '--radius-dot:',
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
