export type YearMonth = `${number}-${string}`;

export function toYearMonth(d: Date): YearMonth {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}` as YearMonth;
}

export function parseISODateOnly(value: string | null | undefined): Date | null {
  if (!value) return null;
  // Expect YYYY-MM-DD
  const d = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function monthStartUTC(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

export function addMonthsUTC(d: Date, months: number): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, 1));
}

export function lastNMonthsUTC(n: number, from: Date = new Date()): Date[] {
  const start = monthStartUTC(from);
  const out: Date[] = [];
  for (let i = n - 1; i >= 0; i--) out.push(addMonthsUTC(start, -i));
  return out;
}
