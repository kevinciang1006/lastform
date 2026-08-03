import { fixtureSource } from './fixtures/adapter';
import { sanitySource } from './sanity/adapter';
import type { ContentSource } from './source';

export type ContentSourceKind = 'sanity' | 'fixtures';

/** Which adapter contentSource() will hand back. Separate from the call itself
 *  so the engineering page can state the answer without fetching anything. */
export function contentSourceKind(): ContentSourceKind {
  return process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ? 'sanity' : 'fixtures';
}

// Once per process, not per call: this is a deployment-level fact, and a
// warning on every content read would bury everything else in the log.
let warned = false;

/**
 * The single place every route resolves content through. Lives here, not in
 * source.ts, because source.ts is imported by both adapters (types and the
 * toProductCard/facetsFrom helpers) — adding the reverse edge there, so it
 * could call sanitySource()/fixtureSource(), would create an import cycle.
 * This module is the one place allowed to depend on both adapters.
 *
 * Selection is by credential presence, not a flag, so a misconfigured deploy
 * degrades to fixtures instead of throwing at request time.
 *
 * That degradation is announced rather than silent. Fixtures render a complete,
 * plausible-looking catalogue, so a production deploy that lost its project id
 * would look entirely healthy while serving content no editor can change — the
 * real failure mode is believing Sanity is wired when it is not. The warning
 * below and the SOURCE row on /engineering are what make the fallback visible.
 */
export function contentSource(): ContentSource {
  if (contentSourceKind() === 'fixtures') {
    if (!warned) {
      warned = true;
      console.warn(
        '[content] NEXT_PUBLIC_SANITY_PROJECT_ID is not set — serving built-in fixtures, not Sanity. ' +
          'Content is frozen at build time and the CMS is not connected.',
      );
    }
    return fixtureSource();
  }
  return sanitySource();
}
