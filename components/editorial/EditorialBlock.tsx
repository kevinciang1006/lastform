import Link from 'next/link';
import type { JournalPost } from '@/lib/content/schema';

/** Lastform.dc.html:153-163 — the one dark band on the page, proving the CMS
 *  carries more than a product table. */
export function EditorialBlock({ post }: { readonly post: JournalPost }) {
  return (
    <section className="grid grid-cols-1 gap-14 bg-ink px-10 py-[76px] text-chalk lg:grid-cols-[1fr_1.15fr]">
      <div className="flex flex-col gap-[18px]">
        <p className="font-mono text-meta tracking-eyebrow text-slate-lift">FIELD NOTE — FROM THE WORKSHOP</p>
        <h2 className="text-balance font-display text-h2 leading-none font-extrabold tracking-display uppercase [font-variation-settings:'wdth'_110]">
          {post.title}
        </h2>
      </div>
      <div className="flex flex-col gap-4 pt-[34px]">
        <p className="max-w-[60ch] text-pretty leading-[1.7] text-fog">{post.excerpt}</p>
        <Link
          href={`/journal/${post.slug}`}
          className="mt-2 w-fit border-b border-cobalt-lift pb-1 font-mono text-[11px] tracking-wide text-cobalt-lift hover:border-chalk hover:text-chalk"
        >
          READ THE FIELD NOTE →
        </Link>
      </div>
    </section>
  );
}
