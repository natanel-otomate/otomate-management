import { NextRequest, NextResponse } from 'next/server';
import { createClient, listClients } from '@/lib/clients';

export async function GET() {
  try {
    const clients = await listClients();
    return NextResponse.json(clients);
  } catch (error) {
    const details = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch clients', details },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, company, email } = body || {};

    if (!name || !company || !email) {
      return NextResponse.json(
        { error: 'Missing required fields: name, company, email' },
        { status: 400 }
      );
    }

    const created = await createClient({ name, company, email });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    const details = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to create client', details },
      { status: 500 }
    );
  }
}
