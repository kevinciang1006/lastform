import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { schemaTypes } from './sanity/schemas';

// Not wired to a route yet — Task 22 mounts this under /studio. Written now
// so the schemas have a config to validate against. `projectId`/`dataset`
// fall back to empty/production rather than using a non-null assertion, so
// this module stays import-safe (and typecheck-clean) with no Sanity env
// vars set; an actually-missing projectId only matters once someone loads
// the Studio route, which doesn't exist yet.
export default defineConfig({
  name: 'default',
  title: 'Lastform',
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ?? '',
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production',
  basePath: '/studio',
  plugins: [structureTool()],
  schema: { types: schemaTypes },
});
