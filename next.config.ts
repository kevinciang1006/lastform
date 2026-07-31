import { execSync } from 'node:child_process';
import type { NextConfig } from 'next';

/** The engineering page prints these as fact, so they are read rather than
 *  written by hand. Degrades to "unknown" where git is unavailable — a tarball
 *  build, or a CI checkout without history — instead of failing the build. */
function commitSha(): string {
  const fromVercel = process.env['VERCEL_GIT_COMMIT_SHA'];
  if (fromVercel) return fromVercel.slice(0, 7);
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return 'unknown';
  }
}

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_COMMIT_SHA: commitSha(),
    NEXT_PUBLIC_BUILT_AT: new Date().toISOString(),
  },
  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'cdn.sanity.io' }],
  },
};

export default nextConfig;
