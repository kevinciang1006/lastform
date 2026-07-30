import { createClient, type SanityClient } from 'next-sanity';

let client: SanityClient | undefined;

/**
 * Constructed lazily. This module is imported unconditionally from
 * lib/content/index.ts — both adapters must be importable so contentSource()
 * can choose between them at request time — and createClient() throws if
 * `projectId` is missing. Deferring construction to first use means an
 * unconfigured deploy only fails if sanitySource() is actually selected and
 * one of its methods is called; contentSource() already gates that on
 * credential presence, so the throw never happens in fixture mode.
 */
export function sanityClient(): SanityClient {
  client ??= createClient({
    projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
    dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
    apiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION,
    // ISR already handles caching at the route level; the CDN would be a
    // second, uncontrolled cache layer stacked on top of that.
    useCdn: false,
    token: process.env.SANITY_API_READ_TOKEN,
  });
  return client;
}
