'use client';

import { useEffect, useState } from 'react';
import { onCLS, onINP, onLCP, onTTFB, type Metric } from 'web-vitals';

type Name = 'LCP' | 'INP' | 'CLS' | 'TTFB';

interface Reading {
  readonly name: Name;
  readonly label: string;
  readonly unit: string;
  /** Google's "good" boundary, printed beside the value so the number means
   *  something without the reader knowing the thresholds by heart. */
  readonly good: number;
  readonly decimals: number;
}

const READINGS: readonly Reading[] = [
  { name: 'LCP', label: 'LCP — LARGEST PAINT', unit: 'S', good: 2.5, decimals: 2 },
  { name: 'INP', label: 'INP — INTERACTION', unit: 'MS', good: 200, decimals: 0 },
  { name: 'CLS', label: 'CLS — LAYOUT SHIFT', unit: '', good: 0.1, decimals: 3 },
  { name: 'TTFB', label: 'TTFB — TIME TO FIRST BYTE', unit: 'MS', good: 800, decimals: 0 },
];

/** LCP arrives in milliseconds; the readout shows seconds. */
const toDisplay = (name: Name, value: number): number => (name === 'LCP' ? value / 1000 : value);

/**
 * Measures the visitor's own session with the web-vitals library.
 *
 * These are deliberately labelled THIS SESSION rather than presented as field
 * data. The design export prints "41,208 sessions — 75th percentile — 28 days",
 * which would be a fabrication: this project has no RUM pipeline. A number
 * measured live in the reader's own browser is smaller and true, which is the
 * trade this whole page exists to make.
 */
export function VitalsReporter() {
  const [values, setValues] = useState<Partial<Record<Name, number>>>({});

  useEffect(() => {
    const record = (metric: Metric): void => {
      setValues((prev) => ({ ...prev, [metric.name as Name]: metric.value }));
    };
    onLCP(record);
    onINP(record);
    onCLS(record);
    onTTFB(record);
  }, []);

  return (
    <div className="grid grid-cols-1 border border-ink sm:grid-cols-2 lg:grid-cols-4">
      {READINGS.map((reading, index) => {
        const raw = values[reading.name];
        const value = raw === undefined ? null : toDisplay(reading.name, raw);
        const ratio = value === null ? 0 : Math.min(value / reading.good, 1);
        const withinGood = value !== null && value <= reading.good;

        return (
          <div
            key={reading.name}
            className={`flex flex-col gap-3 px-[22px] pt-[22px] pb-6 ${
              index === READINGS.length - 1 ? '' : 'border-b border-fog lg:border-r lg:border-b-0'
            }`}
          >
            <p className="font-mono text-spec tracking-[0.18em] text-slate">{reading.label}</p>
            <p className="font-mono text-[34px] tracking-[-0.01em] text-cobalt">
              {value === null ? '—' : value.toFixed(reading.decimals)}
              {reading.unit === '' ? null : (
                <span className="text-[14px] tracking-[0.1em] text-slate"> {reading.unit}</span>
              )}
            </p>
            <div aria-hidden="true" className="h-[3px] bg-fog">
              <div className="h-[3px] bg-cobalt" style={{ width: `${ratio * 100}%` }} />
            </div>
            <p className="font-mono text-spec tracking-meta text-slate">
              {value === null ? 'NOT YET MEASURED' : withinGood ? 'GOOD' : 'ABOVE THRESHOLD'} — THRESHOLD{' '}
              {reading.good}
              {reading.unit === '' ? '' : ` ${reading.unit}`}
            </p>
          </div>
        );
      })}
    </div>
  );
}
