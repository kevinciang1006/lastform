import { readFile } from 'node:fs/promises';
import { createClient, type SanityClient } from 'next-sanity';
import { DEFAULT_SITE_SETTINGS } from '@/lib/content/defaults';
import { COLLECTIONS, JOURNAL_POSTS, PRODUCTS } from '@/lib/content/fixtures/data';
import {
  buildCollectionDocument,
  buildJournalDocument,
  buildProductDocument,
  buildSiteSettingsDocument,
  fileNameOf,
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

async function uploadImages(client: SanityClient): Promise<AssetIds> {
  const ids: Record<string, string> = {};
  for (const file of imageFileNames()) {
    let buffer: Buffer;
    try {
      buffer = await readFile(new URL(file, IMAGE_DIR));
    } catch {
      console.error(`Missing ${file} in public/fixtures. Run \`pnpm placeholders\` first.`);
      process.exit(1);
    }
    // Already rasterized WebP, never SVG: Sanity produces neither LQIP metadata
    // nor image transforms for SVG assets, and the projection reads both.
    const asset = await client.assets.upload('image', buffer, { filename: file });
    ids[file] = asset._id;
  }
  console.log(`assets     ${Object.keys(ids).length} uploaded`);
  return ids;
}

async function commitAll(client: SanityClient, label: string, docs: readonly SeedDocument[]): Promise<void> {
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
  console.log(`${label.padEnd(10)} ${docs.length} written`);
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

  const assetIds = await uploadImages(client);

  // Collections first: every product holds a reference to one.
  await commitAll(client, 'collections', COLLECTIONS.map((c) => buildCollectionDocument(c, assetIds)));
  await commitAll(client, 'products', PRODUCTS.map((p) => buildProductDocument(p, assetIds)));
  await commitAll(client, 'journal', JOURNAL_POSTS.map((p) => buildJournalDocument(p, assetIds)));
  await commitAll(client, 'settings', [buildSiteSettingsDocument(DEFAULT_SITE_SETTINGS)]);

  console.log('seed complete');
}

// Not top-level await: tsx transpiles to CJS, where it is a syntax error.
main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
