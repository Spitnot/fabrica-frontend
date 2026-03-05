import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

interface Props { 
  params: Promise<{ id: string }> 
}

export async function PATCH(req: NextRequest, { params }: Props) {
  try {
    // 1. Await params
    const { id } = await params;
    
    const { role } = await req.json();

    const { error } = await supabaseAdmin.auth.admin.updateUserById(id, {
      user_metadata: { role },
    });

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Props) {
  try {
    // 1. Await params
    const { id } = await params;
    
    const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}