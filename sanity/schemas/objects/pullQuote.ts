import { defineField, defineType } from 'sanity';

// Lifted out of journalPost.body. The name is load-bearing beyond the Studio:
// PortableTextBody.tsx keys its custom block renderer off `_type: 'pullQuote'`,
// and lib/content/fixtures/portable-text.ts stamps the same value.
export const pullQuote = defineType({
  name: 'pullQuote',
  title: 'Pull quote',
  type: 'object',
  fields: [
    defineField({ name: 'quote', title: 'Quote', type: 'text', validation: (Rule) => Rule.required() }),
    defineField({ name: 'attribution', title: 'Attribution', type: 'string' }),
  ],
  preview: { select: { title: 'quote', subtitle: 'attribution' } },
});
