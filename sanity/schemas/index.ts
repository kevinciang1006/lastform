import { collection } from './collection';
import { journalPost } from './journalPost';
import { annotation } from './objects/annotation';
import { footerColumn } from './objects/footerColumn';
import { footerLink } from './objects/footerLink';
import { pullQuote } from './objects/pullQuote';
import { specRow } from './objects/specRow';
import { variant } from './objects/variant';
import { product } from './product';
import { siteSettings } from './siteSettings';

// Object types are registered alongside the documents rather than declared
// inline in them: GraphQL has no notion of an anonymous inline object, so every
// shape a field uses needs a top-level type here or `sanity graphql deploy`
// refuses to extract the schema. GROQ never cared, which is why this only
// surfaced when the GraphQL API was first deployed.
const objectTypes = [variant, annotation, specRow, pullQuote, footerLink, footerColumn];

export const schemaTypes = [product, collection, journalPost, siteSettings, ...objectTypes];
