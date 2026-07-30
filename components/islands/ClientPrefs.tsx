'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import type { Currency } from '@/lib/format';

interface Prefs {
  readonly currency: Currency;
  readonly bucket: 'a' | 'b';
}

const DEFAULT_PREFS: Prefs = { currency: 'USD', bucket: 'a' };

const PrefsContext = createContext<Prefs>(DEFAULT_PREFS);

export function useClientPrefs(): Prefs {
  return useContext(PrefsContext);
}

function readCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match?.[1] === undefined ? null : decodeURIComponent(match[1]);
}

/**
 * FRESH means: this document has not yet outlived its own revalidation window.
 *
 * Exported and pure so the boundary cases are unit-testable — a stale ISR
 * document, a fresh one, a build-time page, an unparseable timestamp.
 */
export function isDocumentFresh(
  generatedAt: string,
  revalidate: string,
  strategy: string,
  now: number,
): boolean {
  const ageMs = now - Date.parse(generatedAt);
  if (Number.isNaN(ageMs) || ageMs < 0) return false;
  // Per-request routes are regenerated for this very response.
  if (strategy === 'SSR' || strategy === 'EDGE') return true;
  // A build-time page with no window is never "fresh", however recent the build.
  if (revalidate === '') return false;
  return ageMs < Number(revalidate) * 1000;
}

/**
 * The seventh and last client island. It does three small jobs that all need
 * the browser and none of which justify their own boundary:
 *
 * 1. Reads the currency cookie the edge middleware set. Reading it here rather
 *    than via headers() on the server is what keeps every page statically
 *    rendered — headers() would force them all dynamic and destroy the whole
 *    point of the project.
 * 2. Swaps the hero CTA label from the stable A/B bucket cookie.
 * 3. Reveals the render badge's FRESH chip. The badge is a Server Component, so
 *    its timestamp is baked into the HTML and it does not re-run when ISR
 *    serves that HTML from cache — only the browser can tell how old the
 *    document actually is.
 */
export function ClientPrefs({ children }: { readonly children: React.ReactNode }) {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);

  useEffect(() => {
    const currency = readCookie('lf-currency');
    const bucket = readCookie('lf-bucket');
    setPrefs({
      currency: (['USD', 'IDR', 'SGD', 'DKK'] as const).find((c) => c === currency) ?? 'USD',
      bucket: bucket === 'b' ? 'b' : 'a',
    });

    if (bucket === 'b') {
      const cta = document.querySelector('[data-lf-cta]');
      if (cta) cta.textContent = 'READ THE SPEC';
    }

    for (const node of document.querySelectorAll<HTMLElement>('[data-lf-fresh]')) {
      const fresh = isDocumentFresh(
        node.dataset['generatedAt'] ?? '',
        node.dataset['revalidate'] ?? '',
        node.dataset['strategy'] ?? '',
        Date.now(),
      );
      node.hidden = !fresh;
    }
  }, []);

  return <PrefsContext.Provider value={prefs}>{children}</PrefsContext.Provider>;
}
