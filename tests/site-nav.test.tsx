import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { SiteNav } from '@/components/chrome/SiteNav';

describe('SiteNav active state', () => {
  it('marks exactly the current section, never by colour alone', () => {
    const html = renderToStaticMarkup(<SiteNav currentHref="/collections/boots" />);
    const links = html.match(/<a [^>]*>[^<]*<\/a>/g) ?? [];

    expect(links.length).toBeGreaterThan(0);

    // aria-current is the non-colour signal this test exists to guard: the
    // underline/colour swap alone would satisfy a purely visual read but
    // fail a screen reader.
    const current = links.filter((link) => link.includes('aria-current="page"'));
    expect(current).toHaveLength(1);
    expect(current[0]).toContain('href="/collections/boots"');
    expect(current[0]).toContain('>BOOTS<');

    const others = links.filter((link) => !current.includes(link));
    expect(others.length).toBe(links.length - 1);
    for (const link of others) {
      expect(link).not.toContain('aria-current');
    }
  });

  it('marks no section current when the page matches none of them', () => {
    const html = renderToStaticMarkup(<SiteNav />);
    expect(html).not.toContain('aria-current');
  });
});
