import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { RenderBadge } from '@/components/chrome/RenderBadge';

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

  it('carries an accessible label so it is not read as loose numbers', () => {
    const html = renderToStaticMarkup(<RenderBadge routeKey="home" />);
    expect(html).toContain('aria-label');
  });
});
