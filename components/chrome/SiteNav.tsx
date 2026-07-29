import Link from 'next/link';

interface NavItem {
  readonly label: string;
  readonly href: string;
}

// The PRD's four collections, not the design export's BOOTS/DERBIES/TRAINERS/LASTS.
const COLLECTION_ITEMS: readonly NavItem[] = [
  { label: 'BOOTS', href: '/collections/boots' },
  { label: 'DERBIES', href: '/collections/derbies' },
  { label: 'LOW PROFILE', href: '/collections/low-profile' },
  { label: 'ARCHIVE', href: '/collections/archive' },
];

const ENGINEERING_ITEM: NavItem = { label: 'ENGINEERING', href: '/engineering' };

function NavLink({
  item,
  isActive,
  mutedByDefault,
}: {
  readonly item: NavItem;
  readonly isActive: boolean;
  readonly mutedByDefault: boolean;
}) {
  // Active state layers a border under the colour change (Lastform.dc.html:223)
  // so the current section is never marked by colour alone.
  const className = isActive
    ? 'border-b border-cobalt pb-[3px] text-cobalt'
    : `${mutedByDefault ? 'text-slate' : 'text-ink'} hover:text-cobalt`;

  return (
    <Link href={item.href} aria-current={isActive ? 'page' : undefined} className={className}>
      {item.label}
    </Link>
  );
}

// `currentHref` has no caller yet: the only route this phase builds is the
// home page, which matches none of these sections. Later collection/PDP pages
// wire this up so the current section can carry aria-current plus the underline.
export function SiteNav({ currentHref }: { readonly currentHref?: string }) {
  return (
    <nav aria-label="Primary" className="flex gap-7 font-mono text-meta tracking-mono">
      {COLLECTION_ITEMS.map((item) => (
        <NavLink key={item.href} item={item} isActive={item.href === currentHref} mutedByDefault={false} />
      ))}
      <NavLink item={ENGINEERING_ITEM} isActive={ENGINEERING_ITEM.href === currentHref} mutedByDefault />
    </nav>
  );
}
