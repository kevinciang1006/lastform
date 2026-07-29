import { badgeLine, formatStamp, renderSpec, windowLabelFor, type RouteKey } from '@/lib/rendering';

/** Freshness is only meaningful for a window-based strategy. */
const FRESH_WINDOW_MS = 60_000;

export function RenderBadge({ routeKey }: { readonly routeKey: RouteKey }) {
  const spec = renderSpec(routeKey);
  const generatedAt = new Date();
  const line = badgeLine(spec, generatedAt);
  const isFresh = typeof spec.revalidate === 'number' && spec.revalidate * 1000 > FRESH_WINDOW_MS;

  return (
    <div
      aria-label={`Render strategy: ${line}`}
      className="flex items-stretch border border-slate border-l-2 border-l-cobalt"
    >
      <p className="flex items-center gap-[10px] px-[14px] py-[9px] font-mono text-meta tracking-[0.14em] text-slate">
        <span>RENDERED</span>
        <span className="text-cobalt">{spec.strategy}</span>
        <span aria-hidden="true">·</span>
        <span className="text-ink">
          <time dateTime={generatedAt.toISOString()}>{formatStamp(generatedAt)}</time>
        </span>
        <span aria-hidden="true">·</span>
        <span>{windowLabelFor(spec)}</span>
      </p>
      {isFresh ? (
        <span className="flex items-center gap-[7px] bg-cobalt px-3 py-[9px] font-mono text-meta tracking-[0.14em] text-chalk">
          <span aria-hidden="true" className="block size-[5px] rounded-[var(--radius-dot)] bg-chalk" />
          FRESH
        </span>
      ) : null}
    </div>
  );
}
