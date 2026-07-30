import { mkdir, writeFile } from 'node:fs/promises';
import sharp from 'sharp';
import { placeholderSvg } from '../lib/content/fixtures/placeholder';
import { PRODUCTS, COLLECTIONS, JOURNAL_POSTS } from '../lib/content/fixtures/data';

const OUT = new URL('../public/fixtures/', import.meta.url);

async function render(caption: string, width: number, height: number, name: string): Promise<void> {
  const buffer = await sharp(Buffer.from(placeholderSvg(caption, width, height)))
    .webp({ quality: 82 })
    .toBuffer();
  await writeFile(new URL(name, OUT), buffer);
}

async function main(): Promise<void> {
  await mkdir(OUT, { recursive: true });
  for (const product of PRODUCTS) {
    for (const [index, image] of product.images.entries()) {
      await render(image.alt.toUpperCase(), image.width, image.height, `${product.slug}-0${index + 1}.webp`);
    }
  }
  for (const collection of COLLECTIONS) {
    await render(`${collection.title.toUpperCase()} — SIDE`, 1200, 900, `collection-${collection.slug}.webp`);
  }
  for (const post of JOURNAL_POSTS) {
    await render(post.title.toUpperCase(), 1600, 900, `journal-${post.slug}.webp`);
  }
}

// Not top-level await: tsx transpiles this to CJS (no "type": "module" in
// package.json), where top-level await is a syntax error. The explicit catch
// also turns a rejected promise into a non-zero exit instead of a warning.
main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
