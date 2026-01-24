import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';
import { lastNMonthsUTC, toYearMonth } from '@/lib/dates';
import { buildExpectedByMonth } from '@/lib/forecast';
import { safeInt } from '@/lib/money';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const monthsCount = Math.min(
      24,
      Math.max(3, Number(url.searchParams.get('months') || 12))
    );

    const months = lastNMonthsUTC(monthsCount);
    const supabase = getSupabaseClient();

    // Pull all projects for forecasting
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('id,start_date,end_date,contract_value_cents,currency,status');
    if (projectsError) throw projectsError;

    // Pull paid invoices for actuals
    const { data: invoices, error: invError } = await supabase
      .from('invoices')
      .select('amount_cents,paid_date,status,currency')
      .eq('status', 'paid');
    if (invError) throw invError;

    // Pull open payment requests
    const { data: prs, error: prError } = await supabase
      .from('payment_requests')
      .select('amount_cents,status,currency,due_date')
      .eq('status', 'open');
    if (prError) throw prError;

    const actualByYm: Record<string, number> = {};
    for (const m of months) actualByYm[toYearMonth(m)] = 0;
    for (const inv of invoices || []) {
      if (!inv.paid_date) continue;
      const d = new Date(`${inv.paid_date}T00:00:00.000Z`);
      const ym = toYearMonth(d);
      if (actualByYm[ym] === undefined) continue;
      actualByYm[ym] += safeInt(inv.amount_cents, 0);
    }

    const expectedByYm = buildExpectedByMonth(
      months,
      (projects || []).map((p: any) => ({
        start_date: p.start_date ?? null,
        end_date: p.end_date ?? null,
        contract_value_cents: safeInt(p.contract_value_cents, 0),
      }))
    );

    const series = months.map((m) => {
      const ym = toYearMonth(m);
      return {
        ym,
        expected_cents: expectedByYm[ym] || 0,
        actual_cents: actualByYm[ym] || 0,
      };
    });

    const open_payment_requests_count = (prs || []).length;
    const open_payment_requests_cents = (prs || []).reduce(
      (sum: number, r: any) => sum + safeInt(r.amount_cents, 0),
      0
    );

    const paid_30d_cents = (invoices || []).reduce((sum: number, inv: any) => {
      if (!inv.paid_date) return sum;
      const paid = new Date(`${inv.paid_date}T00:00:00.000Z`).getTime();
      const days = (Date.now() - paid) / (1000 * 60 * 60 * 24);
      if (days <= 30) return sum + safeInt(inv.amount_cents, 0);
      return sum;
    }, 0);

    const paid_90d_cents = (invoices || []).reduce((sum: number, inv: any) => {
      if (!inv.paid_date) return sum;
      const paid = new Date(`${inv.paid_date}T00:00:00.000Z`).getTime();
      const days = (Date.now() - paid) / (1000 * 60 * 60 * 24);
      if (days <= 90) return sum + safeInt(inv.amount_cents, 0);
      return sum;
    }, 0);

    return NextResponse.json({
      series,
      open_payment_requests_count,
      open_payment_requests_cents,
      totals: {
        paid_30d_cents,
        paid_90d_cents,
      },
    });
  } catch (error) {
    const details = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to compute dashboard metrics', details },
      { status: 500 }
    );
  }
}
