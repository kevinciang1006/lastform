import { NextResponse, type NextRequest } from 'next/server';
import { currencyForCountry } from '@/lib/format';

const YEAR_SECONDS = 60 * 60 * 24 * 365;

// Not httpOnly: the ClientPrefs island reads both of these from document.cookie.
// Neither value is sensitive — a currency hint and a display-variant coin flip.
const COOKIE_OPTIONS = {
  path: '/',
  maxAge: YEAR_SECONDS,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
} as const;

// This runs before the cache on every matched request, which is exactly why it
// stays this cheap: one header read, at most two cookie writes, and no I/O.
export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  const currency = currencyForCountry(request.headers.get('x-vercel-ip-country'));
  response.cookies.set('lf-currency', currency, COOKIE_OPTIONS);

  // Assigned only when absent, so the bucket survives across visits. This is a
  // check-then-set with no coordination: concurrent requests from a visitor who
  // has no cookie yet can each roll a different value, and the last response
  // processed wins. That is acceptable here — the bucket picks one CTA label,
  // so a first-paint disagreement costs nothing and it is stable ever after.
  if (!request.cookies.has('lf-bucket')) {
    response.cookies.set('lf-bucket', Math.random() < 0.5 ? 'a' : 'b', COOKIE_OPTIONS);
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|studio|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|ico)$).*)'],
};
