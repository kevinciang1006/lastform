import Image from 'next/image';
import type { ImageRef } from '@/lib/content/schema';

interface ProductImageProps {
  readonly image: ImageRef;
  /** Required, not optional: an image without `sizes` downloads at its full
   *  intrinsic width on every viewport, which is the single easiest way to
   *  lose the LCP budget. */
  readonly sizes: string;
  readonly priority?: boolean;
  readonly className?: string;
}

export function ProductImage({ image, sizes, priority = false, className }: ProductImageProps) {
  return (
    <Image
      src={image.url}
      alt={image.alt}
      width={image.width}
      height={image.height}
      sizes={sizes}
      priority={priority}
      className={className}
      // Sanity supplies an LQIP; fixture mode has none, and passing
      // placeholder="blur" without a blurDataURL is a runtime error.
      {...(image.lqip === null ? {} : { placeholder: 'blur' as const, blurDataURL: image.lqip })}
    />
  );
}
