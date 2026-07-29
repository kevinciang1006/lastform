// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { middleware } from '@/middleware';
import { NextRequest } from 'next/server';

describe('middleware', () => {
  function getCookiesFromResponse(response: ReturnType<typeof middleware>): string[] {
    return Array.from(response.headers.getSetCookie());
  }

  it('sets lf-currency to USD when x-vercel-ip-country is absent', () => {
    const request = new NextRequest(new URL('http://localhost/'), {
      headers: {},
    });

    const response = middleware(request);
    const cookieHeaders = getCookiesFromResponse(response);

    const currencyCookie = cookieHeaders.find((c: string) => c.startsWith('lf-currency='));
    expect(currencyCookie).toContain('lf-currency=USD');
  });

  it('sets lf-currency to SGD when x-vercel-ip-country is SG', () => {
    const request = new NextRequest(new URL('http://localhost/'), {
      headers: { 'x-vercel-ip-country': 'SG' },
    });

    const response = middleware(request);
    const cookieHeaders = getCookiesFromResponse(response);

    const currencyCookie = cookieHeaders.find((c: string) => c.startsWith('lf-currency='));
    expect(currencyCookie).toContain('lf-currency=SGD');
  });

  it('assigns a bucket when the visitor has no lf-bucket cookie', () => {
    const request = new NextRequest(new URL('http://localhost/'), {
      headers: {},
    });

    const response = middleware(request);
    const cookieHeaders = getCookiesFromResponse(response);

    const bucketCookie = cookieHeaders.find((c: string) => c.startsWith('lf-bucket='));
    expect(bucketCookie).toBeDefined();
    expect(bucketCookie).toMatch(/lf-bucket=[ab]/);
  });

  it('does not reassign lf-bucket when the visitor already has one (stability guarantee)', () => {
    const request = new NextRequest(new URL('http://localhost/'), {
      headers: { cookie: 'lf-bucket=a' },
    });

    const response = middleware(request);
    const cookieHeaders = getCookiesFromResponse(response);

    const bucketCookie = cookieHeaders.find((c: string) => c.startsWith('lf-bucket='));
    expect(bucketCookie).toBeUndefined();
  });

  it('sets cookies with path=/', () => {
    const request = new NextRequest(new URL('http://localhost/'), {
      headers: {},
    });

    const response = middleware(request);
    const cookieHeaders = getCookiesFromResponse(response);

    expect(cookieHeaders.every((c: string) => c.includes('Path=/'))).toBe(true);
  });

  it('sets cookies with maxAge of one year', () => {
    const request = new NextRequest(new URL('http://localhost/'), {
      headers: {},
    });

    const response = middleware(request);
    const cookieHeaders = getCookiesFromResponse(response);

    const YEAR_SECONDS = 60 * 60 * 24 * 365;
    expect(cookieHeaders.every((c: string) => c.includes(`Max-Age=${YEAR_SECONDS}`))).toBe(true);
  });

  it('sets cookies with sameSite=lax', () => {
    const request = new NextRequest(new URL('http://localhost/'), {
      headers: {},
    });

    const response = middleware(request);
    const cookieHeaders = getCookiesFromResponse(response);

    expect(cookieHeaders.every((c: string) => c.includes('SameSite=lax'))).toBe(true);
  });

  it('sets cookies with secure=true in production, false otherwise', () => {
    const request = new NextRequest(new URL('http://localhost/'), {
      headers: {},
    });

    const response = middleware(request);
    const cookieHeaders = getCookiesFromResponse(response);

    const isProduction = process.env.NODE_ENV === 'production';
    if (isProduction) {
      expect(cookieHeaders.every((c: string) => c.includes('Secure'))).toBe(true);
    } else {
      expect(cookieHeaders.some((c: string) => c.includes('Secure'))).toBe(false);
    }
  });
});
