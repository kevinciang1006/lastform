import { defineField, defineType } from 'sanity';

// Lifted out of product.variants: GraphQL needs a named top-level type for
// every object shape, which GROQ never did. The name is unchanged, so stored
// documents (and the `_type: 'variant'` the seed already writes) still match.
//
// Validation mirrors variantSchema in lib/content/schema.ts — size positive,
// stock a non-negative integer — so the Studio rejects at edit time what Zod
// would otherwise reject at request time.
export const variant = defineType({
  name: 'variant',
  title: 'Variant',
  type: 'object',
  fields: [
    defineField({
      name: 'size',
      title: 'Size (EU)',
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
  preview: {
    select: { size: 'size', stock: 'stock' },
    // The three states here are the three the PDP size grid renders — see
    // stockState() and LOW_STOCK_THRESHOLD in lib/content/schema.ts. The
    // threshold is repeated rather than imported: this module is bundled by
    // the Studio, and pulling the Zod schema module in for one constant would
    // drag the whole content layer along with it.
    //
    // Both values are guarded because a freshly added array member is empty
    // until the editor types into it, and `EU undefined` is a poor list row.
    prepare: ({ size, stock }) => ({
      title: typeof size === 'number' ? `EU ${size}` : 'No size set',
      subtitle:
        typeof stock !== 'number'
          ? 'No stock set'
          : stock <= 0
            ? 'Out of stock'
            : stock < 3
              ? `Low — ${stock} left`
              : `${stock} in stock`,
    }),
  },
});
