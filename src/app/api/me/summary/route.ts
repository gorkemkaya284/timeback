import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { calculatePoints } from '@/lib/utils';
import { getCurrentUser } from '@/lib/dev';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();
    const profile = profileData as { risk_score?: number; is_banned?: boolean; created_at?: string } | null;

    // Get all ledger entries to calculate points
    const { data: ledgerEntries } = await supabase
      .from('points_ledger')
      .select('delta')
      .eq('user_id', user.id);

    const totalPoints = ledgerEntries ? calculatePoints(ledgerEntries) : 0;

    // Get recent transactions
    const { data: recentTransactions } = await supabase
      .from('points_ledger')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    return NextResponse.json({
      user: {
        email: user.email,
        id: user.id,
      },
      profile: {
        riskScore: profile?.risk_score || 0,
        isBanned: profile?.is_banned || false,
        createdAt: profile?.created_at,
      },
      points: {
        total: totalPoints,
        minThreshold: parseInt(
          process.env.MIN_REDEMPTION_THRESHOLD || '100',
          10
        ),
      },
      recentTransactions: recentTransactions || [],
    });
  } catch (error) {
    console.error('Summary error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
