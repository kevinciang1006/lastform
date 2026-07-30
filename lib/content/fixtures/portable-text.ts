import type { PortableTextBlock } from '@portabletext/types';

/** A normal paragraph in the real Portable Text shape — not the bare `{ _type }`
 *  stub the schema's predicate would also accept, which renders nothing. Shared
 *  by the product descriptions and the journal bodies so both stay byte-identical
 *  in structure to what the Sanity seed script (Task 12) will write. */
export function paragraph(key: string, text: string): PortableTextBlock {
  return {
    _type: 'block',
    _key: key,
    style: 'normal',
    markDefs: [],
    children: [{ _type: 'span', _key: `${key}s0`, text, marks: [] }],
  };
}

/** Custom block type Task 19's Portable Text serializer renders distinctly from
 *  a normal paragraph. Extends PortableTextBlock (rather than a bare object) so
 *  it satisfies the schema's inferred `PortableTextBlock[]` field type under
 *  strict mode without a cast. */
export interface PullQuoteBlock extends PortableTextBlock {
  _type: 'pullQuote';
  quote: string;
  attribution: string;
}

export function pullQuote(key: string, quote: string, attribution: string): PullQuoteBlock {
  return { _type: 'pullQuote', _key: key, children: [], markDefs: [], quote, attribution };
}
