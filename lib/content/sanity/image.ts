import { createImageUrlBuilder } from '@sanity/image-url';
import { imageRefSchema, type ImageRef } from '@/lib/content/schema';
import { sanityClient } from './client';

/**
 * The shape every image-bearing projection produces: `asset->` expanded just
 * far enough to read `metadata` without a second round trip. The schema
 * requires `lqip` to be present (string or null, never missing), which is
 * why every projection that touches an image must ask for it explicitly.
 */
export interface RawImage {
  readonly alt: string;
  readonly asset: {
    readonly url: string;
    readonly metadata: {
      readonly lqip: string | null;
      readonly dimensions: {
        readonly width: number;
        readonly height: number;
      };
    };
  } | null;
}

let builder: ReturnType<typeof createImageUrlBuilder> | undefined;

function urlBuilder(): ReturnType<typeof createImageUrlBuilder> {
  // Lazy for the same reason sanityClient() is lazy: building it requires a
  // configured client, and this module loads unconditionally.
  builder ??= createImageUrlBuilder(sanityClient());
  return builder;
}

/**
 * Projects a raw Sanity image reference into the shared ImageRef shape.
 * Passing `{ asset: { url } }` (rather than a bare `_ref`) lets the builder
 * derive the asset id from the already-resolved CDN URL, so this needs no
 * extra round trip beyond the one the projection already made.
 *
 * A null asset (an image field an editor added but never uploaded into)
 * produces an object that fails `imageRefSchema` with a clear validation
 * error instead of throwing a bare TypeError on `.url`.
 */
export function imageRefFrom(source: RawImage): ImageRef {
  const { asset } = source;
  return imageRefSchema.parse({
    url: asset ? urlBuilder().image({ asset: { url: asset.url } }).url() : '',
    lqip: asset?.metadata.lqip ?? null,
    width: asset?.metadata.dimensions.width ?? 0,
    height: asset?.metadata.dimensions.height ?? 0,
    alt: source.alt,
  });
}
