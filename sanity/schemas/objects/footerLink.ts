import { defineField, defineType } from 'sanity';

// Lifted out of siteSettings.footerColumns[].links — the deepest of the inline
// objects, two levels down. Consumed by SiteFooter via the `links[]{ label, href }`
// projection in queries.ts.
export const footerLink = defineType({
  name: 'footerLink',
  title: 'Footer link',
  type: 'object',
  fields: [
    defineField({ name: 'label', title: 'Label', type: 'string', validation: (Rule) => Rule.required() }),
    defineField({ name: 'href', title: 'Href', type: 'string', validation: (Rule) => Rule.required() }),
  ],
  preview: { select: { title: 'label', subtitle: 'href' } },
});
