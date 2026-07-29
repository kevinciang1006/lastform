import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { RenderBadge } from '@/components/chrome/RenderBadge';

const ISO = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/;
const HOUSE_STAMP = /\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} UTC/;

describe('RenderBadge', () => {
  it('states the strategy and window for the route it is given', () => {
    const html = renderToStaticMarkup(<RenderBadge routeKey="product" />);
    expect(html).toContain('ISR');
    expect(html).toContain('REVALIDATE 300S');
    expect(html).toContain('RENDERED');
  });

  it('states AT BUILD on a fully static route', () => {
    const html = renderToStaticMarkup(<RenderBadge routeKey="engineering" />);
    expect(html).toContain('SSG');
    expect(html).toContain('AT BUILD');
  });

  it('states NO-STORE on an uncached route', () => {
    const html = renderToStaticMarkup(<RenderBadge routeKey="search" />);
    expect(html).toContain('SSR');
    expect(html).toContain('NO-STORE');
  });

  // The timestamp is the component's entire reason to exist: without it there
  // is no way to see a page regenerate. It must be asserted, not assumed.
  it('renders a generation timestamp in both machine and house formats', () => {
    const html = renderToStaticMarkup(<RenderBadge routeKey="product" />);
    expect(html).toMatch(/<time datetime="/i);
    expect(html).toMatch(ISO);
    expect(html).toMatch(HOUSE_STAMP);
  });

  it('gives the time element a machine-readable value, never the "UTC" text form', () => {
    const html = renderToStaticMarkup(<RenderBadge routeKey="product" />);
    const attr = /datetime="([^"]+)"/i.exec(html)?.[1];
    expect(attr).toBeDefined();
    expect(attr).toMatch(ISO);
    expect(attr).not.toContain('UTC');
  });

  it('describes itself in prose for assistive technology, not as token soup', () => {
    const html = renderToStaticMarkup(<RenderBadge routeKey="product" />);
    const label = /aria-label="([^"]+)"/.exec(html)?.[1];
    expect(label).toBeDefined();
    expect(label).toContain('incremental static regeneration');
    expect(label).toContain('revalidates every 300 seconds');
    expect(label).not.toContain('·');
  });

  it('exposes the label on a role that permits an accessible name', () => {
    const html = renderToStaticMarkup(<RenderBadge routeKey="home" />);
    expect(html).toContain('role="group"');
  });

  // Freshness is a client-side determination; the server must not guess it.
  it('ships the FRESH chip hidden, carrying the data the client needs', () => {
    const html = renderToStaticMarkup(<RenderBadge routeKey="product" />);
    expect(html).toContain('data-lf-fresh');
    expect(html).toContain('hidden');
    expect(html).toContain('data-revalidate="300"');
    expect(html).toMatch(/data-generated-at="[^"]+"/);
  });

  it('leaves revalidate empty for a route with no window', () => {
    const html = renderToStaticMarkup(<RenderBadge routeKey="search" />);
    expect(html).toContain('data-revalidate=""');
  });
});
