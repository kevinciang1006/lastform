import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ProductGrid } from '@/components/product/ProductGrid';
import { ProductTile } from '@/components/product/ProductTile';
import { SpecStrip } from '@/components/product/SpecStrip';
import { SpecTable } from '@/components/product/SpecTable';
import { StockLegend } from '@/components/product/StockLegend';
import { PriceTag } from '@/components/product/PriceTag';
import { LOW_STOCK_THRESHOLD, type ProductCard } from '@/lib/content/schema';

const card = (over: Partial<ProductCard> = {}): ProductCard => ({
  id: 'p1',
  sku: 'LF-D04-OXB',
  title: 'Grain Derby 04',
  slug: 'grain-derby-04',
  price: 465,
  currency: 'USD',
  colour: 'Oxblood',
  material: 'Horsehide',
  lastShape: 'LF-07',
  dropMm: 6,
  weightGrams: 612,
  featured: true,
  image: { url: '/fixtures/grain-derby-04-01.webp', lqip: null, width: 2000, height: 2600, alt: 'Grain Derby 04, lateral' },
  variants: [{ size: 43, stock: 6 }],
  ...over,
});

describe('SpecStrip', () => {
  const html = renderToStaticMarkup(<SpecStrip last="LF-07" dropMm={6} upperMm={1.6} weightGrams={612} />);

  it('shows the four labels the design specifies, in order', () => {
    const order = ['LAST', 'DROP', 'UPPER', 'WEIGHT'].map((label) => html.indexOf(label));
    expect(order.every((i) => i >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  it('renders values in the mono house format', () => {
    expect(html).toContain('LF-07');
    expect(html).toContain('6 MM');
    expect(html).toContain('1.6 MM');
    expect(html).toContain('612 G');
  });

  it('marks it up as a description list so the pairing survives a screen reader', () => {
    expect(html).toContain('<dl');
    expect(html).toContain('<dt');
    expect(html).toContain('<dd');
  });

  it('rules between cells but not after the last one', () => {
    expect(html.match(/border-r border-fog/g)).toHaveLength(3);
  });
});

describe('PriceTag', () => {
  it('formats in the house style and renders the note when given', () => {
    const html = renderToStaticMarkup(<PriceTag amount={465} currency="USD" size="lg" note="INCL. RESOLE 1" />);
    expect(html).toContain('USD 465.00');
    expect(html).toContain('INCL. RESOLE 1');
  });

  it('omits the note element entirely when there is none', () => {
    expect(renderToStaticMarkup(<PriceTag amount={465} currency="USD" />)).not.toContain('text-slate');
  });
});

describe('ProductTile', () => {
  const html = renderToStaticMarkup(<ProductTile product={card()} />);

  it('links to the product and shows its mono spec meta line', () => {
    expect(html).toContain('href="/products/grain-derby-04"');
    expect(html).toContain('LF-07 · 6 MM · 612 G');
    expect(html).toContain('USD 465.00');
  });

  it('gives the image a fixed aspect ratio so the grid cannot reflow', () => {
    expect(html).toContain('aspect-[2000/2600]');
  });

  it('always sets sizes, since an unsized image downloads at full width', () => {
    expect(html).toMatch(/sizes="[^"]+"/);
  });

  // Passing placeholder="blur" without a blurDataURL is a runtime error, and
  // fixture-mode images have no LQIP.
  it('omits the blur placeholder when the image has no lqip', () => {
    expect(html).not.toContain('blur');
  });

  it('uses the blur placeholder when the image has one', () => {
    const withLqip = renderToStaticMarkup(
      <ProductTile product={card({ image: { ...card().image, lqip: 'data:image/png;base64,AA' } })} />,
    );
    expect(withLqip).toContain('data:image/png;base64,AA');
  });

  it('is lazy by default and eager only when asked', () => {
    expect(html).toContain('loading="lazy"');
    expect(renderToStaticMarkup(<ProductTile product={card()} priority />)).not.toContain('loading="lazy"');
  });
});

describe('ProductGrid', () => {
  const products = [card({ slug: 'a' }), card({ slug: 'b' }), card({ slug: 'c' })];

  it('renders a list item per product', () => {
    const html = renderToStaticMarkup(<ProductGrid products={products} />);
    expect(html.match(/<li>/g)).toHaveLength(3);
  });

  // Marking every tile priority tells the browser nothing and costs the real
  // LCP image its head start.
  it('marks only the requested number of tiles as priority', () => {
    const html = renderToStaticMarkup(<ProductGrid products={products} priorityCount={1} />);
    expect(html.match(/loading="lazy"/g)).toHaveLength(2);
  });

  it('renders nothing but an empty list when there are no products', () => {
    const html = renderToStaticMarkup(<ProductGrid products={[]} />);
    expect(html).not.toContain('<li>');
  });
});

describe('SpecTable', () => {
  const rows = [
    { label: 'UPPER', value: 'HORSEHIDE 1.6' },
    { label: 'LINING', value: 'VEG CALF 0.8' },
  ];

  it('renders a heading and one row per entry', () => {
    const html = renderToStaticMarkup(<SpecTable heading="MATERIALS" rows={rows} />);
    expect(html).toContain('MATERIALS');
    expect(html).toContain('HORSEHIDE 1.6');
    expect(html).toContain('VEG CALF 0.8');
  });

  it('rules between rows but not after the last', () => {
    const html = renderToStaticMarkup(<SpecTable heading="MATERIALS" rows={rows} />);
    expect(html.match(/border-b border-fog/g)).toHaveLength(1);
  });

  it('tints construction values cobalt and materials ink, per the design', () => {
    expect(renderToStaticMarkup(<SpecTable heading="CONSTRUCTION" rows={rows} tone="cobalt" />)).toContain('text-cobalt');
    expect(renderToStaticMarkup(<SpecTable heading="MATERIALS" rows={rows} />)).toContain('text-ink');
  });

  // An unset optional array is normal editorial content, not an error.
  it('renders nothing at all when there are no rows', () => {
    expect(renderToStaticMarkup(<SpecTable heading="MATERIALS" rows={[]} />)).toBe('');
  });
});

describe('StockLegend', () => {
  it('states all three codes in words, so colour is never the only signal', () => {
    const html = renderToStaticMarkup(<StockLegend />);
    expect(html).toContain('IN STOCK');
    expect(html).toContain('OUT OF STOCK');
    expect(html).toContain('FEWER THAN');
  });

  it('takes the low-stock number from the code rather than restating it', () => {
    expect(renderToStaticMarkup(<StockLegend />)).toContain(`FEWER THAN ${LOW_STOCK_THRESHOLD} PAIRS`);
  });
});
