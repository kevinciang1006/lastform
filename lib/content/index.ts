import { fixtureSource } from './fixtures/adapter';
import { sanitySource } from './sanity/adapter';
import type { ContentSource } from './source';

/**
 * The single place every route resolves content through. Lives here, not in
 * source.ts, because source.ts is imported by both adapters (types and the
 * toProductCard/facetsFrom helpers) — adding the reverse edge there, so it
 * could call sanitySource()/fixtureSource(), would create an import cycle.
 * This module is the one place allowed to depend on both adapters.
 *
 * Selection is by credential presence, not a flag, so a misconfigured deploy
 * degrades to fixtures instead of throwing at request time.
 */
export function contentSource(): ContentSource {
  return process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ? sanitySource() : fixtureSource();
}
