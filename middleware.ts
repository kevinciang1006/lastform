import { NextResponse, type NextRequest } from 'next/server';
import { currencyForCountry } from '@/lib/format';

const YEAR_SECONDS = 60 * 60 * 24 * 365;

// This runs before the cache on every matched request, which is exactly why it
// stays this cheap: two header reads and two cookie writes, no I/O.
export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  const currency = currencyForCountry(request.headers.get('x-vercel-ip-country'));
  response.cookies.set('lf-currency', currency, { path: '/', maxAge: YEAR_SECONDS, sameSite: 'lax' });

  // Bucket must be stable across visits, so it is only assigned when absent.
  if (!request.cookies.has('lf-bucket')) {
    const bucket = Math.random() < 0.5 ? 'a' : 'b';
    response.cookies.set('lf-bucket', bucket, { path: '/', maxAge: YEAR_SECONDS, sameSite: 'lax' });
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|studio|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|ico)$).*)'],
};
