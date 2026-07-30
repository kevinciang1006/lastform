import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { PageShell } from '@/components/chrome/PageShell';
import { PortableTextBody } from '@/components/editorial/PortableTextBody';
import { ProductImage } from '@/components/product/ProductImage';
import { contentSource } from '@/lib/content';

// Long-form editorial, static once published. No revalidate window: the
// publish webhook invalidates the path instead, so writers are not waiting on a
// deploy. See ROUTES.journal in lib/rendering.
type Params = Promise<{ readonly slug: string }>;

export async function generateStaticParams() {
  return (await contentSource().getJournalSlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const post = await contentSource().getJournalPost(slug);
  if (!post) return { title: 'Not found' };
  return {
    title: post.title,
    description: post.excerpt,
    openGraph: { title: post.title, images: [{ url: post.coverImage.url }] },
  };
}

export default async function JournalPostPage({ params }: { params: Params }) {
  const { slug } = await params;
  const post = await contentSource().getJournalPost(slug);
  if (!post) notFound();

  const published = new Date(post.publishedAt);

  return (
    <PageShell routeKey="journal">
      <article className="mx-auto max-w-[76ch] px-10 py-14">
        <header className="flex flex-col gap-5">
          <p className="font-mono text-meta tracking-eyebrow text-slate">
            FIELD NOTE —{' '}
            <time dateTime={post.publishedAt}>
              {published.toISOString().slice(0, 10).replace(/-/g, '.')}
            </time>
          </p>
          <h1 className="text-balance font-display text-h1 leading-[0.94] font-extrabold tracking-display uppercase [font-variation-settings:'wdth'_112]">
            {post.title}
          </h1>
          <p className="max-w-[60ch] text-pretty text-[1.0625rem] leading-[1.7] text-slate">{post.excerpt}</p>
        </header>

        <div className="relative my-10 aspect-[16/9] bg-fog/30">
          <ProductImage
            image={post.coverImage}
            priority
            sizes="(min-width: 1024px) 76ch, 100vw"
            className="absolute inset-0 size-full object-cover"
          />
        </div>

        <PortableTextBody value={post.body} />
      </article>
    </PageShell>
  );
}
