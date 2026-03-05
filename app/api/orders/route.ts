import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

// GET — all orders with customer join (admin only)
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('orders')
      .select('*, customers(contacto_nombre, company_name, email)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST — create new order
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const { data, error } = await supabaseAdmin
      .from('orders')
      .insert(body)
      .select('*, customers(email, contacto_nombre)')
      .single();

    if (error) throw error;

    // Note: Email sending is handled by the Frontend using sendEmail()
    
    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}