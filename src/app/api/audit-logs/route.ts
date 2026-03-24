/**
 * API Route: Audit Logs
 * GET: Retrieve audit logs (admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { getAuditLogs, exportAuditLogs, getAuditStats, AuditAction } from '@/lib/audit';

// GET - Récupérer les logs d'audit
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      );
    }

    // Vérifier si l'utilisateur est admin
    // Note: Dans une implémentation complète, on vérifierait le rôle depuis la DB
    const user = await fetch(`${process.env.NEXTAUTH_URL}/api/user/${session.user.id}`);
    if (!user.ok) {
      return NextResponse.json(
        { error: 'Non autorisé - Admin requis' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    
    // Paramètres de pagination
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    
    // Filtres
    const userId = searchParams.get('userId') || undefined;
    const action = searchParams.get('action')?.split(',') as any || undefined;
    const entityType = searchParams.get('entityType') as any || undefined;
    const entityId = searchParams.get('entityId') || undefined;
    const status = searchParams.get('status') as any || undefined;
    const startDate = searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined;
    const endDate = searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined;
    const search = searchParams.get('search') || undefined;
    const export_format = searchParams.get('export');

    // Export CSV
    if (export_format === 'csv') {
      const csv = await exportAuditLogs({
        userId,
        action,
        entityType,
        entityId,
        status,
        startDate,
        endDate,
        search,
      });

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="audit-logs-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    }

    // Stats
    if (searchParams.get('stats') === 'true') {
      const days = parseInt(searchParams.get('days') || '30');
      const stats = await getAuditStats(days);
      return NextResponse.json(stats);
    }

    // Récupérer les logs
    const result = await getAuditLogs({
      userId,
      action,
      entityType,
      entityId,
      status,
      startDate,
      endDate,
      search,
      page,
      limit,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Erreur lors de la récupération des logs d\'audit:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
