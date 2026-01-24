import { NextResponse } from 'next/server';
import { getClient } from '@/lib/clients';

export async function GET(
  _req: Request,
  { params }: { params: { clientId: string } }
) {
  try {
    const client = await getClient(params.clientId);
    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }
    return NextResponse.json(client);
  } catch (error) {
    const details = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch client', details },
      { status: 500 }
    );
  }
}
