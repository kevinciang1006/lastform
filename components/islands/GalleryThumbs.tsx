'use client';

import Image from 'next/image';
import { useState } from 'react';
import type { ImageRef } from '@/lib/content/schema';

interface GalleryThumbsProps {
  readonly images: readonly ImageRef[];
  /**
   * The annotated first image, already rendered on the server. Passing it as a
   * slot rather than letting this island render it keeps the LCP image — and
   * the whole zero-JS annotation overlay — out of the client bundle.
   */
  readonly primary: React.ReactNode;
}

const THUMB_LABELS = ['01 LATERAL', '02 SOLE', '03 WELT DETAIL', '04 LAST'];

export function GalleryThumbs({ images, primary }: GalleryThumbsProps) {
  const [index, setIndex] = useState(0);
  const active = images[index];

  return (
    <div>
      <div className="border-b border-fog">
        {index === 0 ? (
          primary
        ) : active ? (
          <div className="relative aspect-[2000/2600] bg-fog/30">
            <Image
              src={active.url}
              alt={active.alt}
              width={active.width}
              height={active.height}
              sizes="(min-width: 1024px) 58vw, 100vw"
              className="absolute inset-0 size-full object-cover"
              {...(active.lqip === null ? {} : { placeholder: 'blur' as const, blurDataURL: active.lqip })}
            />
          </div>
        ) : null}
      </div>

      {images.length < 2 ? null : (
        <div className="grid grid-cols-4">
          {images.map((image, i) => (
            <button
              key={image.url}
              type="button"
              aria-pressed={i === index}
              onClick={() => setIndex(i)}
              className={`flex h-[132px] items-center justify-center bg-fog/30 font-mono text-spec tracking-meta ${
                i === images.length - 1 ? '' : 'border-r border-fog'
              } ${i === index ? 'border-b-2 border-b-cobalt text-ink' : 'text-slate'}`}
            >
              {/* The index is spoken as well as shown, so the active thumbnail
                  is not signalled by its cobalt underline alone. */}
              {THUMB_LABELS[i] ?? `0${i + 1}`}
              {i === index ? <span className="sr-only"> (showing)</span> : null}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
