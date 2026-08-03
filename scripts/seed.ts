import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createClient, type SanityClient } from 'next-sanity';
import { DEFAULT_SITE_SETTINGS } from '@/lib/content/defaults';
import { COLLECTIONS, JOURNAL_POSTS, PRODUCTS } from '@/lib/content/fixtures/data';
import {
  buildCollectionDocument,
  buildJournalDocument,
  buildProductDocument,
  buildSiteSettingsDocument,
  imageFileNames,
  type AssetIds,
  type SeedDocument,
} from '@/lib/content/seed-documents';

/**
 * Runner for the Sanity seed. Document construction lives in
 * lib/content/seed-documents.ts so the tests can import and verify it without
 * importing this file — which calls main() on load and would exit the test
 * process. This module is the I/O half only: credentials, uploads, transactions.
 */

const IMAGE_DIR = new URL('../public/fixtures/', import.meta.url);

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing required environment variable: ${name}`);
    console.error('Set it in .env.local — see .env.example for what each variable is.');
    process.exit(1);
  }
  return value;
}

interface AssetResult {
  readonly ids: AssetIds;
  readonly uploaded: number;
  readonly reused: number;
}

/**
 * Uploads every fixture image whose bytes are not already in the dataset.
 *
 * Keyed on content hash rather than filename, because Sanity itself dedups on
 * content: `assets.upload` called twice with identical bytes returns the
 * existing asset instead of creating a second one, and that asset keeps the
 * `originalFilename` of whichever name got there first. Eight of these
 * photographs appear three times each under different names (the secondary
 * product shots), so a filename lookup misses 16 of the 55 on every run — it
 * re-uploads them, Sanity dedups them away, and the reused count lies about
 * work that was never done. `sha1hash` is the SHA-1 of the raw bytes, verified
 * against `shasum` on the fixture files, so this matches Sanity's own rule
 * exactly.
 *
 * One query for the whole set rather than one per file: 55 sequential round
 * trips to answer a question a single `in` can answer.
 */
async function uploadImages(client: SanityClient): Promise<AssetResult> {
  const files = imageFileNames();

  const buffers = new Map<string, Buffer>();
  const hashes = new Map<string, string>();
  for (const file of files) {
    let buffer: Buffer;
    try {
      buffer = await readFile(new URL(file, IMAGE_DIR));
    } catch {
      console.error(`Missing ${file} in public/fixtures. Run \`pnpm placeholders\` first.`);
      process.exit(1);
    }
    buffers.set(file, buffer);
    hashes.set(file, createHash('sha1').update(buffer).digest('hex'));
  }

  const existing = await client.fetch<{ sha1hash: string | null; _id: string }[]>(
    '*[_type == "sanity.imageAsset" && sha1hash in $hashes]{ sha1hash, _id }',
    { hashes: [...new Set(hashes.values())] },
  );
  const byHash = new Map(
    existing.flatMap(({ sha1hash, _id }) => (sha1hash ? [[sha1hash, _id] as const] : [])),
  );

  const ids: Record<string, string> = {};
  let uploaded = 0;
  let reused = 0;
  for (const file of files) {
    // Non-null: both maps were filled from `files` in the loop above.
    const hash = hashes.get(file)!;
    const alreadyThere = byHash.get(hash);
    if (alreadyThere) {
      ids[file] = alreadyThere;
      reused += 1;
      continue;
    }

    // Already rasterized WebP, never SVG: Sanity produces neither LQIP metadata
    // nor image transforms for SVG assets, and the projection reads both.
    const asset = await client.assets.upload('image', buffers.get(file)!, { filename: file });
    ids[file] = asset._id;
    // Recorded so the duplicate names of these same bytes reuse this upload
    // rather than repeating it within a single run.
    byHash.set(hash, asset._id);
    uploaded += 1;
  }

  return { ids, uploaded, reused };
}

interface CommitResult {
  readonly created: number;
  readonly updated: number;
}

async function commitAll(
  client: SanityClient,
  label: string,
  docs: readonly SeedDocument[],
): Promise<CommitResult> {
  // Which ids already exist has to be read before the transaction commits;
  // afterwards every one of them exists and the distinction is unrecoverable.
  // createOrReplace itself reports nothing about which branch it took.
  const ids = docs.map((doc) => doc._id);
  const present = new Set(
    await client.fetch<string[]>('*[_id in $ids]._id', { ids }),
  );

  const transaction = client.transaction();
  // Queued in a loop rather than chained through reduce, because Sanity's
  // transaction methods mutate and return `this`. Each document is widened into
  // a single-typed local first: passing the SeedDocument union straight in
  // defeats generic inference, which then pins to one member and rejects the rest.
  for (const doc of docs) {
    const stub: Record<string, unknown> & { _id: string; _type: string } = { ...doc };
    transaction.createOrReplace(stub);
  }
  await transaction.commit();

  const updated = ids.filter((id) => present.has(id)).length;
  const result = { created: ids.length - updated, updated };
  console.log(`${label.padEnd(12)} ${String(result.created).padStart(3)} created  ${String(result.updated).padStart(3)} updated`);
  return result;
}

async function main(): Promise<void> {
  const projectId = requireEnv('NEXT_PUBLIC_SANITY_PROJECT_ID');
  const dataset = requireEnv('NEXT_PUBLIC_SANITY_DATASET');
  const token = requireEnv('SANITY_API_WRITE_TOKEN');

  const client = createClient({
    projectId,
    dataset,
    token,
    apiVersion: process.env['NEXT_PUBLIC_SANITY_API_VERSION'] ?? '2024-10-01',
    useCdn: false,
  });

  const assets = await uploadImages(client);
  console.log(`assets       ${String(assets.uploaded).padStart(3)} uploaded  ${String(assets.reused).padStart(3)} reused`);

  // Collections first: every product holds a reference to one.
  const results = [
    await commitAll(client, 'collections', COLLECTIONS.map((c) => buildCollectionDocument(c, assets.ids))),
    await commitAll(client, 'products', PRODUCTS.map((p) => buildProductDocument(p, assets.ids))),
    await commitAll(client, 'journal', JOURNAL_POSTS.map((p) => buildJournalDocument(p, assets.ids))),
    await commitAll(client, 'settings', [buildSiteSettingsDocument(DEFAULT_SITE_SETTINGS)]),
  ];

  const created = results.reduce((sum, r) => sum + r.created, 0);
  const updated = results.reduce((sum, r) => sum + r.updated, 0);
  console.log(
    `\nseed complete — ${created} created, ${updated} updated, ` +
      `${assets.uploaded} assets uploaded, ${assets.reused} assets reused`,
  );
}

// Not top-level await: tsx transpiles to CJS, where it is a syntax error.
main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
