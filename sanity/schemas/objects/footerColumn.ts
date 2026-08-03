import { defineArrayMember, defineField, defineType } from 'sanity';

// Lifted out of siteSettings.footerColumns. Its `links` array now references
// the top-level footerLink type by name rather than declaring it inline.
export const footerColumn = defineType({
  name: 'footerColumn',
  title: 'Footer column',
  type: 'object',
  fields: [
    defineField({ name: 'title', title: 'Title', type: 'string', validation: (Rule) => Rule.required() }),
    defineField({
      name: 'links',
      title: 'Links',
      type: 'array',
      of: [defineArrayMember({ type: 'footerLink' })],
    }),
  ],
  preview: { select: { title: 'title' } },
});
