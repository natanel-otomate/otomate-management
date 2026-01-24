import { addMonthsUTC, lastNMonthsUTC, parseISODateOnly, toYearMonth } from './dates';

export type ForecastPoint = {
  ym: string;
  expected_cents: number;
  actual_cents: number;
};

export type ProjectForForecast = {
  start_date: string | null;
  end_date: string | null;
  contract_value_cents: number;
};

function monthsBetweenInclusiveUTC(start: Date, end: Date): Date[] {
  const months: Date[] = [];
  let cur = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
  const last = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1));
  while (cur.getTime() <= last.getTime()) {
    months.push(cur);
    cur = addMonthsUTC(cur, 1);
  }
  return months;
}

export function buildExpectedByMonth(
  months: Date[],
  projects: ProjectForForecast[]
): Record<string, number> {
  const expected: Record<string, number> = {};
  for (const m of months) expected[toYearMonth(m)] = 0;

  for (const p of projects) {
    const start = parseISODateOnly(p.start_date) || months[0] || new Date();
    const end = parseISODateOnly(p.end_date) || start;
    const span = monthsBetweenInclusiveUTC(start, end);
    const spanCount = Math.max(1, span.length);

    const total = Math.max(0, Number(p.contract_value_cents || 0));
    const base = Math.floor(total / spanCount);
    let remainder = total - base * spanCount;

    for (const m of span) {
      const ym = toYearMonth(m);
      if (expected[ym] === undefined) continue; // outside requested window
      const add = base + (remainder > 0 ? 1 : 0);
      if (remainder > 0) remainder -= 1;
      expected[ym] += add;
    }
  }

  return expected;
}

export function buildSeries(
  monthsCount: number,
  expectedByYm: Record<string, number>,
  actualByYm: Record<string, number>
): ForecastPoint[] {
  const months = lastNMonthsUTC(monthsCount);
  return months.map((m) => {
    const ym = toYearMonth(m);
    return {
      ym,
      expected_cents: expectedByYm[ym] || 0,
      actual_cents: actualByYm[ym] || 0,
    };
  });
}

export function averageTrendline(points: number[]): number[] {
  if (points.length === 0) return [];
  const avg =
    points.reduce((sum, v) => sum + (Number.isFinite(v) ? v : 0), 0) /
    points.length;
  return points.map(() => avg);
}
