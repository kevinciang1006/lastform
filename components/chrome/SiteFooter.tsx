import Link from 'next/link';
import { RenderBadge } from '@/components/chrome/RenderBadge';
import type { RouteKey } from '@/lib/rendering';

interface FooterLink {
  readonly label: string;
  readonly href: string;
}

interface FooterColumnData {
  readonly heading: string;
  readonly links: readonly FooterLink[];
}

// Hardcoded until Task 16 replaces this with siteSettings from the CMS. Most
// destinations don't exist yet either, so they point at "#" like the design
// export does; Engineering is the one route this plan actually builds.
const FOOTER_COLUMNS: readonly FooterColumnData[] = [
  {
    heading: 'CATALOGUE',
    links: [
      { label: 'ALL MODELS', href: '#' },
      { label: 'LAST INDEX', href: '#' },
      { label: 'SIZE CONVERSION', href: '#' },
    ],
  },
  {
    heading: 'WORKSHOP',
    links: [
      { label: 'RESOLE PROGRAM', href: '#' },
      { label: 'MATERIALS', href: '#' },
      { label: 'ENGINEERING', href: '/engineering' },
    ],
  },
  {
    heading: 'ACCOUNT',
    links: [
      { label: 'ORDERS', href: '#' },
      { label: 'RETURNS — 60 DAY', href: '#' },
    ],
  },
];

function FooterColumn({ column }: { readonly column: FooterColumnData }) {
  return (
    <div className="flex flex-col gap-[11px] font-mono text-meta tracking-[0.14em]">
      <h2 className="text-ink">{column.heading}</h2>
      <ul className="flex flex-col gap-[11px]">
        {column.links.map((link) => (
          <li key={link.label}>
            <Link href={link.href} className="text-slate hover:text-cobalt">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Lastform.dc.html:165-208 — four-column link grid over a fog top rule, with
// the copyright left and the render badge right. Rendered per page, not from
// the layout, so each page's routeKey reaches the badge.
export function SiteFooter({ routeKey }: { readonly routeKey: RouteKey }) {
  return (
    <footer className="flex flex-col gap-10 px-10 pb-[34px] pt-12">
      <div className="grid grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="flex flex-col gap-[10px]">
          <p className="w-fit font-display text-[18px] font-extrabold text-ink [font-variation-settings:'wdth'_116]">
            LASTFORM
          </p>
          <address className="font-mono text-meta not-italic leading-[2] tracking-[0.14em] text-slate">
            WORKSHOP 12 — SE MORRISON
            <br />
            PORTLAND OR 97214
          </address>
        </div>
        {FOOTER_COLUMNS.map((column) => (
          <FooterColumn key={column.heading} column={column} />
        ))}
      </div>
      <div className="flex items-end justify-between border-t border-fog pt-5">
        {/* Hardcoded until Task 16, same as FOOTER_COLUMNS above. */}
        <p className="font-mono text-meta tracking-[0.14em] text-slate">© 2026 LASTFORM LLC</p>
        <RenderBadge routeKey={routeKey} />
      </div>
    </footer>
  );
}
