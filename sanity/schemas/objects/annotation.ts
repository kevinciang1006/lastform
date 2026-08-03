import { defineField, defineType } from 'sanity';

// Lifted out of product.annotations. Field names and types are unchanged, so
// annotationSchema in lib/content/schema.ts and the `label, value, x, y`
// projection in queries.ts both still line up.
export const annotation = defineType({
  name: 'annotation',
  title: 'Annotation',
  type: 'object',
  fields: [
    defineField({ name: 'label', title: 'Label', type: 'string', validation: (Rule) => Rule.required() }),
    defineField({ name: 'value', title: 'Value', type: 'string', validation: (Rule) => Rule.required() }),
    // x/y are fractions of the image, not pixels: AnnotatedFigure positions
    // each callout with `left: x * 100%`, so anything outside 0–1 lands off
    // the figure entirely.
    defineField({
      name: 'x',
      title: 'X (0–1)',
      type: 'number',
      validation: (Rule) => Rule.required().min(0).max(1),
    }),
    defineField({
      name: 'y',
      title: 'Y (0–1)',
      type: 'number',
      validation: (Rule) => Rule.required().min(0).max(1),
    }),
  ],
  preview: { select: { title: 'label', subtitle: 'value' } },
});
