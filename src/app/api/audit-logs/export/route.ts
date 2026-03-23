/**
 * API Route: Audit Logs Export
 * Export audit logs in various formats (CSV, JSON, PDF)
 * 
 * GET: Export audit logs
 * Query params:
 *   - format: Export format (csv, json, pdf) - default: csv
 *   - All filter params from the main audit-logs route
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { db } from '@/lib/db';
import { exportAuditLogs, generateAuditReport } from '@/lib/audit/export';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      );
    }

    // Get user's team info
    const user = await db.profile.findUnique({
      where: { id: session.user.id },
      select: { 
        id: true, 
        teamId: true, 
        teamRole: true,
        role: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);

    // Export format
    const format = (searchParams.get('format') || 'csv') as 'csv' | 'json' | 'pdf';

    // Filters
    const actionParam = searchParams.get('action');
    const action = actionParam ? actionParam.split(',') as any : undefined;
    const entityType = searchParams.get('entityType') as any || undefined;
    const entityId = searchParams.get('entityId') || undefined;
    const profileId = searchParams.get('profileId') || searchParams.get('userId') || undefined;
    const teamId = searchParams.get('teamId') || undefined;
    const status = searchParams.get('status') as any || undefined;
    const startDate = searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined;
    const endDate = searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined;
    const search = searchParams.get('search') || undefined;

    // Team-based filtering: non-admins can only export their team's logs
    const effectiveTeamId = user.role !== 'admin' ? (teamId || user.teamId) : teamId;

    // Generate report (for PDF or as additional data)
    if (searchParams.get('report') === 'true') {
      const report = await generateAuditReport(
        startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate || new Date(),
        {
          teamId: effectiveTeamId || undefined,
          profileId,
        }
      );
      return NextResponse.json(report);
    }

    // Export logs
    const { content, filename, mimeType } = await exportAuditLogs({
      format,
      profileId,
      teamId: effectiveTeamId,
      action,
      entityType,
      entityId,
      status,
      startDate,
      endDate,
      search,
    });

    // Return the file
    return new NextResponse(content, {
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Erreur lors de l\'export des logs d\'audit:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
