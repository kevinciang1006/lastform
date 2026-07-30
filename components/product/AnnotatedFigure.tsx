import { ProductImage } from '@/components/product/ProductImage';
import type { Annotation, ImageRef } from '@/lib/content/schema';

interface AnnotatedFigureProps {
  readonly image: ImageRef;
  readonly annotations: readonly Annotation[];
  readonly caption: string;
  readonly priority?: boolean;
  readonly sizes?: string;
}

/** Percent inset the leader lines run out to, matching the design's margins. */
const LEFT_EDGE = 4;
const RIGHT_EDGE = 96;
const STAGGER_MS = 120;
const MAX_DELAY_MS = 800;

/**
 * The one thing this site will be remembered for: a product photograph
 * annotated like a technical drawing.
 *
 * It ships no JavaScript. The leader lines are inline SVG animated by CSS
 * keyframes, the labels are ordinary positioned HTML so they inherit the mono
 * tokens and stay selectable, and the whole thing stays a Server Component —
 * which matters because this sits on the PDP, the route with the tightest
 * budget in the project. The reduced-motion block in globals.css neutralises
 * the animation, so no guard is needed here.
 */
export function AnnotatedFigure({
  image,
  annotations,
  caption,
  priority = false,
  sizes = '(min-width: 1024px) 60vw, 100vw',
}: AnnotatedFigureProps) {
  return (
    <figure className="relative m-0">
      <div className="relative aspect-[2000/2600] overflow-hidden bg-fog/30">
        <ProductImage
          image={image}
          priority={priority}
          sizes={sizes}
          className="absolute inset-0 size-full object-cover"
        />

        {annotations.length === 0 ? null : (
          <>
            {/* preserveAspectRatio="none" lets a 0-100 grid map straight onto the
                container, so an annotation's normalised x/y needs no maths. */}
            <svg
              aria-hidden="true"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              className="pointer-events-none absolute inset-0 size-full"
            >
              {annotations.map((annotation, index) => {
                const x = annotation.x * 100;
                const y = annotation.y * 100;
                const toLeft = annotation.x < 0.5;
                const delay = Math.min(index * STAGGER_MS, MAX_DELAY_MS);
                return (
                  <g key={`${annotation.label}-${index}`}>
                    <line
                      x1={x}
                      y1={y}
                      x2={toLeft ? LEFT_EDGE : RIGHT_EDGE}
                      y2={y}
                      pathLength={1}
                      strokeDasharray={1}
                      strokeDashoffset={1}
                      vectorEffect="non-scaling-stroke"
                      className="stroke-slate"
                      style={{ animation: `lf-draw 0.55s ${delay}ms cubic-bezier(0.2, 0.7, 0.3, 1) both` }}
                    />
                    <circle
                      cx={x}
                      cy={y}
                      r={0.6}
                      vectorEffect="non-scaling-stroke"
                      className="fill-cobalt"
                      style={{ animation: `lf-fade 0.3s ${delay + 400}ms both` }}
                    />
                  </g>
                );
              })}
            </svg>

            {annotations.map((annotation, index) => {
              const toLeft = annotation.x < 0.5;
              const delay = Math.min(index * STAGGER_MS, MAX_DELAY_MS) + 450;
              return (
                <div
                  key={`${annotation.label}-${index}`}
                  style={{
                    top: `${annotation.y * 100}%`,
                    ...(toLeft ? { left: `${LEFT_EDGE}%` } : { right: `${100 - RIGHT_EDGE}%` }),
                    animation: `lf-fade 0.4s ${delay}ms both`,
                  }}
                  className={`absolute -translate-y-full pb-[7px] ${toLeft ? 'text-left' : 'text-right'}`}
                >
                  <span className="block font-mono text-spec tracking-mono text-slate">{annotation.label}</span>
                  <span className="block font-mono text-value tracking-value text-cobalt">{annotation.value}</span>
                </div>
              );
            })}
          </>
        )}

        <figcaption className="absolute bottom-0 left-0 border-t border-r border-fog bg-chalk px-4 py-3 font-mono text-spec tracking-mono text-slate">
          {caption}
        </figcaption>
      </div>
    </figure>
  );
}
