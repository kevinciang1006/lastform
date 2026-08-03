import { defineField, defineType } from 'sanity';

/**
 * An image that carries its own alt text.
 *
 * Every image field here previously declared `type: 'image'` with an inline
 * `fields: [alt]`. GROQ served that correctly and `graphql deploy` accepted it
 * without complaint — but the extractor does not carry inline custom fields
 * onto the built-in `Image` type, so the deployed schema exposed only
 * `_key/_type/asset/media/hotspot/crop` and `alt` was silently unreachable.
 * Querying it returned `Cannot query field "alt" on type "Image"`, which the
 * search adapter turned into an empty result set.
 *
 * Naming the type is what makes the field survive extraction: GraphQL gets an
 * `ImageWithAlt` type with `alt` on it. This is the same lift the six object
 * types beside this file needed, and the reason it was missed is that this one
 * produced no error to notice — the dry-run passed either way.
 *
 * Stored values carry `_type: 'imageWithAlt'`; see lib/content/seed-documents.ts.
 */
export const imageWithAlt = defineType({
  name: 'imageWithAlt',
  title: 'Image',
  type: 'image',
  options: { hotspot: true },
  fields: [
    defineField({
      name: 'alt',
      title: 'Alt text',
      type: 'string',
      description: 'Describes the image for screen readers and when the image fails to load.',
      validation: (Rule) => Rule.required(),
    }),
  ],
});
