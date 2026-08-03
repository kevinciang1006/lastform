import { defineArrayMember, defineField, defineType } from 'sanity';

// A singleton in practice: seeded with a fixed _id (see the Task 12 seed
// script) and, ideally, hidden from the "create new" list in the Studio
// structure (Task 22). The document type itself doesn't need to know that —
// lib/content/sanity/queries.ts's SITE_SETTINGS_QUERY just reads the first
// match.
export const siteSettings = defineType({
  name: 'siteSettings',
  title: 'Site settings',
  type: 'document',
  fields: [
    defineField({
      name: 'announcementBar',
      title: 'Announcement bar',
      type: 'array',
      of: [defineArrayMember({ type: 'string' })],
      validation: (Rule) => Rule.required().min(1),
    }),
    defineField({
      name: 'footerColumns',
      title: 'Footer columns',
      type: 'array',
      of: [defineArrayMember({ type: 'footerColumn' })],
    }),
    defineField({
      name: 'featuredCollections',
      title: 'Featured collections',
      type: 'array',
      of: [defineArrayMember({ type: 'reference', to: [{ type: 'collection' }] })],
    }),
  ],
  preview: {
    prepare: () => ({ title: 'Site settings' }),
  },
});
