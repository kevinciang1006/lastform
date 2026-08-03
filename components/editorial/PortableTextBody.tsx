import { PortableText, type PortableTextComponents } from '@portabletext/react';
import type { PortableTextBlock } from '@portabletext/types';
import Link from 'next/link';

interface PullQuoteValue {
  readonly quote: string;
  readonly attribution?: string;
}

interface EditorialImageValue {
  readonly url?: string;
  readonly alt?: string;
  readonly caption?: string;
}

/**
 * Serializers for the house voice. The defaults would render acceptable prose,
 * but the pull quote and the figure caption are the two places the editorial
 * pages are supposed to look like the rest of the site rather than like a blog.
 */
const components: PortableTextComponents = {
  block: {
    normal: ({ children }) => <p className="max-w-[68ch] text-pretty leading-[1.7]">{children}</p>,
    h2: ({ children }) => (
      <h2 className="mt-4 font-display text-h3 font-extrabold tracking-display uppercase [font-variation-settings:'wdth'_110]">
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className="mt-3 font-mono text-meta tracking-eyebrow text-slate uppercase">{children}</h3>
    ),
    blockquote: ({ children }) => (
      <blockquote className="border-l-2 border-cobalt pl-5 text-pretty leading-[1.7] text-slate">{children}</blockquote>
    ),
  },
  marks: {
    strong: ({ children }) => <strong className="font-medium">{children}</strong>,
    em: ({ children }) => <em className="italic">{children}</em>,
    link: ({ children, value }) => {
      const href = typeof value?.['href'] === 'string' ? value['href'] : '#';
      const external = href.startsWith('http');
      return (
        <Link
          href={href}
          className="border-b border-cobalt pb-px text-cobalt"
          {...(external ? { rel: 'noreferrer', target: '_blank' } : {})}
        >
          {children}
        </Link>
      );
    },
  },
  types: {
    pullQuote: ({ value }: { value: PullQuoteValue }) => (
      <figure className="my-2 border-l-2 border-cobalt pl-6">
        <blockquote className="font-display text-h3 leading-[1.1] font-extrabold tracking-display [font-variation-settings:'wdth'_110]">
          {value.quote}
        </blockquote>
        {value.attribution === undefined ? null : (
          <figcaption className="mt-3 font-mono text-meta tracking-eyebrow text-slate">
            {value.attribution.toUpperCase()}
          </figcaption>
        )}
      </figure>
    ),
    // Keyed on the schema type name, which is `imageWithAlt` rather than the
    // built-in `image` — naming it is what carries `alt` through GraphQL schema
    // extraction. `image` stays as an alias so body content written before the
    // rename still renders rather than silently disappearing.
    imageWithAlt: ({ value }: { value: EditorialImageValue }) => renderEditorialImage(value),
    image: ({ value }: { value: EditorialImageValue }) => renderEditorialImage(value),
  },
};

function renderEditorialImage(value: EditorialImageValue) {
  if (value.url === undefined) return null;
  return (
        <figure className="my-4">
          <div className="relative aspect-[16/9] bg-fog/30">
            {/* eslint-disable-next-line @next/next/no-img-element -- editorial
                images arrive from portable text without known dimensions, and
                next/image requires them or fill+sizes on a measured parent. */}
            <img src={value.url} alt={value.alt ?? ''} className="absolute inset-0 size-full object-cover" />
          </div>
          {value.caption === undefined ? null : (
            <figcaption className="mt-2 font-mono text-spec tracking-mono text-slate">{value.caption}</figcaption>
          )}
        </figure>
      );
}

export function PortableTextBody({ value }: { readonly value: readonly PortableTextBlock[] }) {
  if (value.length === 0) return null;
  return (
    <div className="flex flex-col gap-4">
      <PortableText value={[...value]} components={components} />
    </div>
  );
}
