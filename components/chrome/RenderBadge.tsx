import { formatStamp, renderSpec, windowLabelFor, type RouteKey, type RouteRenderSpec } from '@/lib/rendering';

const STRATEGY_PROSE: Readonly<Record<RouteRenderSpec['strategy'], string>> = {
  SSG: 'static generation at build time',
  ISR: 'incremental static regeneration',
  SSR: 'server-side rendering on every request',
  EDGE: 'edge rendering on every request',
  CLIENT: 'client-side rendering',
};

/** The visible badge is dense mono shorthand; assistive tech gets a sentence. */
function accessibleLabel(spec: RouteRenderSpec, generatedAt: Date): string {
  const window =
    spec.revalidate === false
      ? spec.strategy === 'SSG'
        ? 'It is not revalidated after the build.'
        : 'It is never cached.'
      : `It revalidates every ${spec.revalidate} seconds.`;
  return `Rendered using ${STRATEGY_PROSE[spec.strategy]}. HTML generated ${generatedAt.toUTCString()}. ${window}`;
}

export function RenderBadge({ routeKey }: { readonly routeKey: RouteKey }) {
  const spec = renderSpec(routeKey);
  const generatedAt = new Date();

  return (
    <div
      role="group"
      aria-label={accessibleLabel(spec, generatedAt)}
      className="flex items-stretch border border-slate border-l-2 border-l-cobalt"
    >
      {/* Hidden from AT because the role="group" label above says all of this
          in prose — exposing both would read it twice, once as token soup. */}
      <p
        aria-hidden="true"
        className="flex items-center gap-[10px] px-[14px] py-[9px] font-mono text-meta tracking-meta text-slate"
      >
        <span>RENDERED</span>
        <span className="text-cobalt">{spec.strategy}</span>
        <span>·</span>
        <span className="text-ink">
          <time dateTime={generatedAt.toISOString()}>{formatStamp(generatedAt)}</time>
        </span>
        <span>·</span>
        <span>{windowLabelFor(spec)}</span>
      </p>
      {/* Freshness cannot be computed here. The server bakes this timestamp into
          the HTML, so when ISR later serves that HTML from cache this component
          does not re-run — only the browser can tell how old the document is.
          Ships hidden; the ClientPrefs island reveals it. See Task 23. */}
      <span
        hidden
        data-lf-fresh
        data-generated-at={generatedAt.toISOString()}
        data-revalidate={spec.revalidate === false ? '' : String(spec.revalidate)}
        data-strategy={spec.strategy}
        className="flex items-center gap-[7px] bg-cobalt px-3 py-[9px] font-mono text-meta tracking-meta text-chalk"
      >
        <span aria-hidden="true" className="block size-[5px] rounded-[var(--radius-dot)] bg-chalk" />
        FRESH
      </span>
    </div>
  );
}
