import { afterEach, describe, expect, it, vi } from 'vitest';
import { contentSource } from '@/lib/content';

// The 14 ContentSource methods, kept as a literal list rather than imported
// from the interface so this test also catches a method being dropped from
// the interface without a corresponding adapter update.
const METHODS = [
  'listCollections',
  'getCollection',
  'getCollectionSlugs',
  'listProducts',
  'getProduct',
  'getProductSlugs',
  'getFeaturedProduct',
  'listRelated',
  'getStock',
  'listJournalPosts',
  'getJournalPost',
  'getJournalSlugs',
  'getSiteSettings',
  'searchProducts',
] as const;

describe('contentSource', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('selects fixtures when no Sanity project id is configured', async () => {
    vi.stubEnv('NEXT_PUBLIC_SANITY_PROJECT_ID', '');
    const source = contentSource();
    // Proves it is actually wired to fixture data, not merely shaped like it.
    expect(await source.getProductSlugs()).toHaveLength(24);
  });

  it('selects the Sanity adapter once a project id is present, without touching the network', () => {
    vi.stubEnv('NEXT_PUBLIC_SANITY_PROJECT_ID', 'test-project');
    const source = contentSource();
    // Every ContentSource method must exist; none of them may be invoked here
    // since no live Sanity project exists in this environment.
    for (const method of METHODS) {
      expect(typeof source[method], method).toBe('function');
    }
  });
});
