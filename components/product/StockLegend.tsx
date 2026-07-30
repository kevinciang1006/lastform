import { LOW_STOCK_THRESHOLD } from '@/lib/content/schema';

/**
 * Explains the size grid's three states in words. The grid marks low stock with
 * ochre and out of stock with a strikethrough, but colour and decoration are
 * never the only signal — this legend is what makes the codes mean something,
 * and the "fewer than N" number comes from the threshold the code actually uses
 * rather than being written out by hand.
 */
export function StockLegend() {
  return (
    <p className="font-mono text-spec leading-[1.9] tracking-[0.13em] text-slate">
      IN = IN STOCK · LOW = FEWER THAN {LOW_STOCK_THRESHOLD} PAIRS · OUT = OUT OF STOCK, RESUPPLY 4 WEEKS
    </p>
  );
}
