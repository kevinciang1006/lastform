import { defineCliConfig } from 'sanity/cli';

/**
 * Required for `pnpm sanity dev` and `pnpm sanity graphql deploy`. The Studio
 * runs standalone rather than embedded — see app/studio for why — so this is
 * what makes the instruction on that page actually work.
 */
export default defineCliConfig({
  api: {
    projectId: process.env['NEXT_PUBLIC_SANITY_PROJECT_ID'] ?? '',
    dataset: process.env['NEXT_PUBLIC_SANITY_DATASET'] ?? 'production',
  },
});
