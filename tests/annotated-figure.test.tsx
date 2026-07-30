import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AnnotatedFigure } from '@/components/product/AnnotatedFigure';
import type { Annotation, ImageRef } from '@/lib/content/schema';

const image: ImageRef = {
  url: '/fixtures/grain-derby-04-01.webp',
  lqip: null,
  width: 2000,
  height: 2600,
  alt: 'Grain Derby 04, lateral elevation',
};

const annotations: readonly Annotation[] = [
  { label: 'VAMP — HORSEHIDE', value: '1.6 MM', x: 0.24, y: 0.42 },
  { label: 'HEEL STACK', value: '24 MM', x: 0.76, y: 0.57 },
];

const html = renderToStaticMarkup(
  <AnnotatedFigure image={image} annotations={annotations} caption="FIG. 1 — DIMENSIONS AT SIZE 43, ±1 MM" />,
);

describe('AnnotatedFigure', () => {
  it('renders every annotation label and value', () => {
    expect(html).toContain('VAMP — HORSEHIDE');
    expect(html).toContain('1.6 MM');
    expect(html).toContain('HEEL STACK');
    expect(html).toContain('24 MM');
  });

  it('renders as a figure with its caption', () => {
    expect(html).toContain('<figure');
    expect(html).toContain('<figcaption');
    expect(html).toContain('FIG. 1');
  });

  it('hides the decorative leader lines from assistive technology', () => {
    expect(html).toMatch(/<svg[^>]*aria-hidden="true"/);
  });

  // This sits on the PDP, the route with the tightest JS budget in the project.
  it('ships no client component boundary', () => {
    expect(html).not.toContain('use client');
  });

  it('draws a line and an anchor dot per annotation', () => {
    expect(html.match(/<line/g)).toHaveLength(2);
    expect(html.match(/<circle/g)).toHaveLength(2);
  });

  // pathLength normalises each line to one unit so a single keyframe animates
  // lines of any real length identically.
  it('normalises the stroke so one keyframe fits every line length', () => {
    expect(html).toContain('pathLength="1"');
    expect(html).toContain('stroke-dasharray="1"');
    expect(html).toContain('stroke-dashoffset="1"');
  });

  it('runs the leader lines out to the correct side of the anchor', () => {
    // x=0.24 is left of centre, so its line ends at the left inset.
    expect(html).toMatch(/x1="24"[^>]*x2="4"/);
    // x=0.76 is right of centre, so its line ends at the right inset.
    expect(html).toMatch(/x1="76"[^>]*x2="96"/);
  });

  it('places each label on the same side its line runs to', () => {
    expect(html).toContain('left:4%');
    expect(html).toContain('right:4%');
  });

  it('staggers the animations rather than firing them together', () => {
    expect(html).toContain('lf-draw 0.55s 0ms');
    expect(html).toContain('lf-draw 0.55s 120ms');
  });

  it('degrades to a plain figure when a product has no callouts', () => {
    const bare = renderToStaticMarkup(<AnnotatedFigure image={image} annotations={[]} caption="FIG. 1" />);
    expect(bare).toContain('<figure');
    expect(bare).toContain('FIG. 1');
    expect(bare).not.toContain('<svg');
  });

  it('keeps the image in a fixed aspect ratio container', () => {
    expect(html).toContain('aspect-[2000/2600]');
  });

  it('is lazy unless asked to be the LCP image', () => {
    expect(html).toContain('loading="lazy"');
    const hero = renderToStaticMarkup(
      <AnnotatedFigure image={image} annotations={annotations} caption="FIG. 1" priority />,
    );
    expect(hero).not.toContain('loading="lazy"');
  });
});
