import type { SpecRow } from '@/lib/content/schema';

interface SpecTableProps {
  readonly heading: string;
  readonly rows: readonly SpecRow[];
  /**
   * The design prints materials in ink and construction values in cobalt.
   * One component with a tone rather than two near-identical ones — the two
   * tables differ by a single colour and nothing else.
   */
  readonly tone?: 'ink' | 'cobalt';
}

export function SpecTable({ heading, rows, tone = 'ink' }: SpecTableProps) {
  if (rows.length === 0) return null;

  return (
    <section className="flex flex-col gap-[14px]">
      <h2 className="font-mono text-meta tracking-eyebrow text-slate">{heading}</h2>
      <dl className="flex flex-col">
        {rows.map((row, index) => (
          <div
            key={row.label}
            className={`flex justify-between py-[9px] font-mono text-[11px] tracking-[0.06em] ${
              index === rows.length - 1 ? '' : 'border-b border-fog'
            }`}
          >
            <dt className="text-slate">{row.label}</dt>
            <dd className={tone === 'cobalt' ? 'text-cobalt' : 'text-ink'}>{row.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
