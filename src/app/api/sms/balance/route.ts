// =====================================================
// RELANCEPRO AFRICA - SMS Balance API Route
// Get provider balances
// =====================================================

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { getAllBalances } from '@/lib/sms/service';

// =====================================================
// GET: Get Provider Balances
// =====================================================

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const balances = await getAllBalances();

    return NextResponse.json({
      success: true,
      balances,
    });
  } catch (error) {
    console.error('[SMS Balance] Error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des soldes' },
      { status: 500 }
    );
  }
}
