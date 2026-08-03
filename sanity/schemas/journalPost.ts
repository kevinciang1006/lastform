import { defineArrayMember, defineField, defineType } from 'sanity';

export const journalPost = defineType({
  name: 'journalPost',
  title: 'Journal post',
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
    defineField({ name: 'excerpt', title: 'Excerpt', type: 'text', validation: (Rule) => Rule.required() }),
    defineField({
      name: 'coverImage',
      title: 'Cover image',
      type: 'imageWithAlt',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'publishedAt',
      title: 'Published at',
      type: 'datetime',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'body',
      title: 'Body',
      type: 'array',
      of: [
        defineArrayMember({ type: 'block' }),
        defineArrayMember({ type: 'imageWithAlt' }),
        defineArrayMember({ type: 'pullQuote' }),
      ],
      validation: (Rule) => Rule.required(),
    }),
  ],
  preview: { select: { title: 'title', media: 'coverImage' } },
});
