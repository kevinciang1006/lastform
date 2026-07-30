import Link from 'next/link';
import { RenderBadge } from '@/components/chrome/RenderBadge';
import type { RouteKey } from '@/lib/rendering';

interface FooterLink {
  readonly label: string;
  readonly href: string;
}

interface FooterColumnData {
  readonly title: string;
  readonly links: readonly FooterLink[];
}

function FooterColumn({ column }: { readonly column: FooterColumnData }) {
  return (
    <div className="flex flex-col gap-[11px] font-mono text-meta tracking-meta">
      <h2 className="text-ink">{column.title}</h2>
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
interface SiteFooterProps {
  readonly routeKey: RouteKey;
  readonly columns: readonly FooterColumnData[];
}

export function SiteFooter({ routeKey, columns }: SiteFooterProps) {
  return (
    <footer className="flex flex-col gap-10 px-10 pb-[34px] pt-12">
      <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr] lg:gap-0">
        <div className="flex flex-col gap-[10px]">
          <p className="w-fit font-display text-[18px] font-extrabold text-ink [font-variation-settings:'wdth'_116]">
            LASTFORM
          </p>
          <address className="font-mono text-meta not-italic leading-[2] tracking-meta text-slate">
            WORKSHOP 12 — SE MORRISON
            <br />
            PORTLAND OR 97214
          </address>
        </div>
        {columns.map((column) => (
          <FooterColumn key={column.title} column={column} />
        ))}
      </div>
      <div className="flex items-end justify-between border-t border-fog pt-5">
        <p className="font-mono text-meta tracking-meta text-slate">© 2026 LASTFORM LLC</p>
        <RenderBadge routeKey={routeKey} />
      </div>
    </footer>
  );
}
