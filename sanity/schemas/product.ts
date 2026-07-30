import { defineArrayMember, defineField, defineType } from 'sanity';

// Field names and shapes match lib/content/schema.ts's productSchema
// one-for-one; lib/content/sanity/queries.ts's PRODUCT_PROJECTION is what
// bridges the two, and tests/groq.test.ts checks that projection against
// the schema's own key list.
export const product = defineType({
  name: 'product',
  title: 'Product',
  type: 'document',
  fields: [
    defineField({ name: 'title', title: 'Title', type: 'string', validation: (Rule) => Rule.required() }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'title' },
      validation: (Rule) => Rule.required(),
    }),
    defineField({ name: 'sku', title: 'SKU', type: 'string', validation: (Rule) => Rule.required() }),
    defineField({ name: 'lot', title: 'Lot', type: 'string', validation: (Rule) => Rule.required() }),
    defineField({
      name: 'price',
      title: 'Price',
      type: 'number',
      validation: (Rule) => Rule.required().positive(),
    }),
    defineField({
      name: 'currency',
      title: 'Currency',
      type: 'string',
      initialValue: 'USD',
      validation: (Rule) => Rule.required().regex(/^[A-Z]{3}$/, { name: 'ISO 4217 currency code' }),
    }),
    defineField({ name: 'colour', title: 'Colour', type: 'string', validation: (Rule) => Rule.required() }),
    defineField({ name: 'material', title: 'Material', type: 'string', validation: (Rule) => Rule.required() }),
    defineField({
      name: 'upperMm',
      title: 'Upper (mm)',
      type: 'number',
      validation: (Rule) => Rule.required().positive(),
    }),
    defineField({ name: 'lastShape', title: 'Last', type: 'string', validation: (Rule) => Rule.required() }),
    defineField({
      name: 'dropMm',
      title: 'Drop (mm)',
      type: 'number',
      validation: (Rule) => Rule.required().min(0),
    }),
    defineField({
      name: 'weightGrams',
      title: 'Weight (g)',
      type: 'number',
      validation: (Rule) => Rule.required().positive().integer(),
    }),
    defineField({
      name: 'collection',
      title: 'Collection',
      type: 'reference',
      to: [{ type: 'collection' }],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'images',
      title: 'Images',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'image',
          options: { hotspot: true },
          fields: [
            defineField({
              name: 'alt',
              title: 'Alt text',
              type: 'string',
              validation: (Rule) => Rule.required(),
            }),
          ],
        }),
      ],
      validation: (Rule) => Rule.required().min(1),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'array',
      of: [defineArrayMember({ type: 'block' })],
    }),
    defineField({
      name: 'variants',
      title: 'Variants',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'variant',
          fields: [
            defineField({
              name: 'size',
              title: 'Size',
              type: 'number',
              validation: (Rule) => Rule.required().positive(),
            }),
            defineField({
              name: 'stock',
              title: 'Stock',
              type: 'number',
              validation: (Rule) => Rule.required().min(0).integer(),
            }),
          ],
          preview: { select: { title: 'size', subtitle: 'stock' } },
        }),
      ],
      validation: (Rule) => Rule.required().min(1),
    }),
    defineField({
      name: 'annotations',
      title: 'Annotations',
      description: 'Callouts for the annotated hero figure. x/y are fractions of the image, 0–1.',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'annotation',
          fields: [
            defineField({ name: 'label', title: 'Label', type: 'string', validation: (Rule) => Rule.required() }),
            defineField({ name: 'value', title: 'Value', type: 'string', validation: (Rule) => Rule.required() }),
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
        }),
      ],
    }),
    defineField({
      name: 'materials',
      title: 'Materials spec rows',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'specRow',
          fields: [
            defineField({ name: 'label', title: 'Label', type: 'string', validation: (Rule) => Rule.required() }),
            defineField({ name: 'value', title: 'Value', type: 'string', validation: (Rule) => Rule.required() }),
          ],
          preview: { select: { title: 'label', subtitle: 'value' } },
        }),
      ],
    }),
    defineField({
      name: 'construction',
      title: 'Construction spec rows',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'specRow',
          fields: [
            defineField({ name: 'label', title: 'Label', type: 'string', validation: (Rule) => Rule.required() }),
            defineField({ name: 'value', title: 'Value', type: 'string', validation: (Rule) => Rule.required() }),
          ],
          preview: { select: { title: 'label', subtitle: 'value' } },
        }),
      ],
    }),
    defineField({ name: 'featured', title: 'Featured', type: 'boolean', initialValue: false }),
  ],
  preview: {
    select: { title: 'title', subtitle: 'sku', media: 'images.0' },
  },
});
