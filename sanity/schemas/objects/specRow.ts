import { defineField, defineType } from 'sanity';

// Lifted out of product.materials and product.construction, which each carried
// their own inline copy under this same name. One top-level type now serves
// both fields, which is what the duplicated inline definitions were already
// pretending to be.
export const specRow = defineType({
  name: 'specRow',
  title: 'Spec row',
  type: 'object',
  fields: [
    defineField({ name: 'label', title: 'Label', type: 'string', validation: (Rule) => Rule.required() }),
    defineField({ name: 'value', title: 'Value', type: 'string', validation: (Rule) => Rule.required() }),
  ],
  preview: { select: { title: 'label', subtitle: 'value' } },
});
