import { NextResponse } from 'next/server';
import { getClient } from '../../../../lib/clients';
import { toSafeErrorDetails } from '../../../../lib/apiErrors';

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
    return NextResponse.json(client);
  } catch (error) {
    const detailsObj = toSafeErrorDetails(error);
    return NextResponse.json(
      { error: 'Failed to fetch client', details: detailsObj.message, ...detailsObj },
      { status: 500 }
    );
  }
}
