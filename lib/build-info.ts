/**
 * Real build metadata, injected at build time in next.config.ts.
 *
 * The design export prints a commit hash and a build timestamp on the
 * engineering page. Those have to be true: this is the one page whose entire
 * job is being credible about how the site is built.
 */
export const BUILD_INFO = {
  commit: process.env['NEXT_PUBLIC_COMMIT_SHA'] ?? 'unknown',
  builtAt: process.env['NEXT_PUBLIC_BUILT_AT'] ?? '',
} as const;
