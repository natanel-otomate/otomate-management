import { NextResponse } from 'next/server';
import {
  getClient,
  listBillingByClient,
  listProjectsByClient,
  listSubtasksByTaskIds,
  listTasksByProjectIds,
} from '../../../../../lib/clients';
import { lastNMonthsUTC, toYearMonth } from '../../../../../lib/dates';
import { buildExpectedByMonth } from '../../../../../lib/forecast';
import { toSafeErrorDetails } from '../../../../../lib/apiErrors';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const { clientId } = await params;

    const client = await getClient(clientId);
    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    const months = lastNMonthsUTC(12);
    const projects = await listProjectsByClient(clientId);
    const tasks = await listTasksByProjectIds(projects.map((p) => p.id));
    const subtasks = await listSubtasksByTaskIds(tasks.map((t) => t.id));
    const billing = await listBillingByClient(clientId);

    // Actual payments by month (paid invoices)
    const actualByYm: Record<string, number> = {};
    for (const m of months) actualByYm[toYearMonth(m)] = 0;
    for (const inv of billing.invoices) {
      if (inv.status !== 'paid' || !inv.paid_date) continue;
      const d = new Date(`${inv.paid_date}T00:00:00.000Z`);
      const ym = toYearMonth(d);
      if (actualByYm[ym] === undefined) continue;
      actualByYm[ym] += Number(inv.amount_cents || 0);
    }

    const expectedByYm = buildExpectedByMonth(months, projects);

    const series = months.map((m) => {
      const ym = toYearMonth(m);
      return {
        ym,
        expected_cents: expectedByYm[ym] || 0,
        actual_cents: actualByYm[ym] || 0,
      };
    });

    const total_value_cents = projects.reduce(
      (sum, p) => sum + Number(p.contract_value_cents || 0),
      0
    );

    const open_payment_requests = billing.payment_requests.filter(
      (r) => r.status === 'open'
    );
    const open_payment_requests_cents = open_payment_requests.reduce(
      (sum, r) => sum + Number(r.amount_cents || 0),
      0
    );

    return NextResponse.json({
      client,
      projects,
      tasks,
      subtasks,
      billing,
      metrics: {
        total_value_cents,
        open_payment_requests_count: open_payment_requests.length,
        open_payment_requests_cents,
        series,
      },
    });
  } catch (error) {
    const detailsObj = toSafeErrorDetails(error);
    return NextResponse.json(
      { error: 'Failed to fetch client details', details: detailsObj.message, ...detailsObj },
      { status: 500 }
    );
  }
}
