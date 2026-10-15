import { NextResponse } from 'next/server';
import { getProducts } from '@/lib/supabase/live-data';

export async function GET() {
  try {
    const products = await getProducts();
    return NextResponse.json({ products });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to load products.' },
      { status: 500 },
    );
  }
}
