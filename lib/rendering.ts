export type RenderStrategy = 'SSG' | 'ISR' | 'SSR' | 'EDGE' | 'CLIENT';

export interface RouteRenderSpec {
  readonly route: string;
  readonly strategy: RenderStrategy;
  /** Seconds, or false where caching is impossible or incorrect. */
  readonly revalidate: number | false;
  readonly reasoning: string;
  readonly onDemand: boolean;
}

export type RouteKey =
  | 'home'
  | 'collection'
  | 'product'
  | 'stock'
  | 'search'
  | 'journal'
  | 'engineering'
  | 'cart'
  | 'studio'
  | 'middleware';

export const ROUTES: Readonly<Record<RouteKey, RouteRenderSpec>> = {
  home: {
    route: '/',
    strategy: 'ISR',
    revalidate: 3600,
    reasoning: 'Editorial content changes hourly at most. The cheapest possible render that is still fresh.',
    onDemand: false,
  },
  collection: {
    route: '/collections/[slug]',
    strategy: 'SSG',
    revalidate: 3600,
    reasoning: 'Four finite, high-traffic, rarely changing collections. Build-time cost is bounded; unknown slugs fall back to ISR.',
    onDemand: false,
  },
  product: {
    route: '/products/[slug]',
    strategy: 'ISR',
    revalidate: 300,
    reasoning: 'The spec sheet never changes and price rarely does, so it is cached. Stock is read separately and never cached.',
    onDemand: true,
  },
  stock: {
    route: '/api/stock',
    strategy: 'EDGE',
    revalidate: false,
    reasoning: 'Source of truth for the size grid. A cached stock response is a correctness bug, so this is never cached.',
    onDemand: false,
  },
  search: {
    route: '/search',
    strategy: 'SSR',
    revalidate: false,
    reasoning: 'Output is a pure function of user input. Caching it is pointless and would serve one visitor another visitor results.',
    onDemand: false,
  },
  journal: {
    route: '/journal/[slug]',
    strategy: 'SSG',
    revalidate: false,
    reasoning: 'Long-form editorial, static once published. The publish webhook revalidates it so writers are not blocked on a deploy.',
    onDemand: true,
  },
  engineering: {
    route: '/engineering',
    strategy: 'SSG',
    revalidate: false,
    reasoning: 'Generated from this manifest at build time, so it cannot describe a rendering plan the site is not running.',
    onDemand: false,
  },
  cart: {
    route: '/cart',
    strategy: 'CLIENT',
    revalidate: false,
    reasoning: 'Per-user state held in localStorage. No server involvement and no SEO value, so nothing to render or cache.',
    onDemand: false,
  },
  studio: {
    route: '/studio',
    strategy: 'CLIENT',
    revalidate: false,
    reasoning: 'The embedded Sanity Studio is a client-only application and is excluded from the middleware matcher.',
    onDemand: false,
  },
  middleware: {
    route: 'middleware.ts',
    strategy: 'EDGE',
    revalidate: false,
    reasoning: 'Runs before the cache on every request, which is exactly why it stays under fifteen lines of logic.',
    onDemand: false,
  },
};

export function renderSpec(key: RouteKey): RouteRenderSpec {
  return ROUTES[key];
}

function windowLabel(spec: RouteRenderSpec): string {
  if (typeof spec.revalidate === 'number') return `REVALIDATE ${spec.revalidate}S`;
  if (spec.strategy === 'SSG') return 'AT BUILD';
  return 'NO-STORE';
}

/** Exported so RenderBadge's <time> element cannot drift from the badge text. */
export function formatStamp(at: Date): string {
  return at.toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC');
}

export function badgeLine(spec: RouteRenderSpec, generatedAt: Date): string {
  return `RENDERED ${spec.strategy} · ${formatStamp(generatedAt)} · ${windowLabel(spec)}`;
}

/** Exported for the same reason: the badge renders this half separately. */
export function windowLabelFor(spec: RouteRenderSpec): string {
  return windowLabel(spec);
}

export function routeCounts(): { static: number; dynamic: number } {
  const specs = Object.values(ROUTES);
  const isStatic = (s: RouteRenderSpec) => s.strategy === 'SSG' || s.strategy === 'ISR';
  return {
    static: specs.filter(isStatic).length,
    dynamic: specs.filter((s) => !isStatic(s)).length,
  };
}
