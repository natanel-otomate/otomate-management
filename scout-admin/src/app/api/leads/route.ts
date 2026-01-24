import { NextRequest, NextResponse } from 'next/server';
import { getLeads, addLead, Lead } from '../../../lib/leads';

// GET endpoint to fetch all leads
export async function GET() {
  try {
    const leads = await getLeads();
    return NextResponse.json(leads);
  } catch (error) {
    console.error('Error fetching leads:', error);
    return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 });
  }
}

// POST endpoint to create a new lead
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    const { name, company, email, budget_bracket, status, pain_point } = body;

    if (!name || !company || !email || !budget_bracket || !status) {
      return NextResponse.json(
        {
          error:
            'Missing required fields: name, company, email, budget_bracket, status',
        },
        { status: 400 }
      );
    }

    // Validate budget_bracket
    if (!['Low', 'Mid', 'High'].includes(budget_bracket)) {
      return NextResponse.json(
        { error: 'budget_bracket must be one of: Low, Mid, High' },
        { status: 400 }
      );
    }

    // Validate status
    if (!['New', 'Contacted', 'Won', 'Lost'].includes(status)) {
      return NextResponse.json(
        { error: 'status must be one of: New, Contacted, Won, Lost' },
        { status: 400 }
      );
    }

    const newLead: Lead = await addLead({
      name,
      company,
      email,
      budget_bracket,
      status,
      pain_point: pain_point || '',
    });

    return NextResponse.json(newLead, { status: 201 });
  } catch (error) {
    console.error('Error creating lead:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        error: 'Failed to create lead',
        details: errorMessage,
        hint: 'Make sure Supabase is configured with NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables',
      },
      { status: 500 }
    );
  }
}
