/**
 * API Route: Audit Logs
 * Comprehensive audit log management endpoints
 * 
 * GET: List audit logs with pagination and filters
 * Query params:
 *   - page: Page number (default: 1)
 *   - limit: Items per page (default: 50, max: 100)
 *   - action: Filter by action type (can be comma-separated)
 *   - entityType: Filter by entity type
 *   - entityId: Filter by entity ID
 *   - userId: Filter by user ID (deprecated, use profileId)
 *   - profileId: Filter by profile ID
 *   - teamId: Filter by team ID
 *   - status: Filter by status (success, failed, pending)
 *   - startDate: Start date filter (ISO string)
 *   - endDate: End date filter (ISO string)
 *   - search: Search in details, IP, user info
 *   - sortBy: Sort field (createdAt, action, entityType)
 *   - sortOrder: Sort order (asc, desc)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { db } from '@/lib/db';
import { queryAuditLogs, getAuditStatistics, AuditAction, EntityType } from '@/lib/audit/logger';

// GET - Retrieve audit logs with filters
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

    // Pagination
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')));

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
    const sortBy = (searchParams.get('sortBy') as any) || 'createdAt';
    const sortOrder = (searchParams.get('sortOrder') as any) || 'desc';
    const ipAddress = searchParams.get('ipAddress') || undefined;

    // Statistics request
    if (searchParams.get('stats') === 'true') {
      const stats = await getAuditStatistics({
        teamId: teamId || user.teamId || undefined,
        profileId,
        startDate,
        endDate,
      });
      return NextResponse.json(stats);
    }

    // Get available filter options
    if (searchParams.get('filters') === 'true') {
      const [actions, entityTypes, statuses] = await Promise.all([
        db.auditLog.groupBy({
          by: ['action'],
          _count: true,
          orderBy: { _count: { action: 'desc' } },
          take: 50,
        }),
        db.auditLog.groupBy({
          by: ['entityType'],
          where: { entityType: { not: null } },
          _count: true,
          orderBy: { _count: { entityType: 'desc' } },
        }),
        db.auditLog.groupBy({
          by: ['status'],
          _count: true,
        }),
      ]);

      return NextResponse.json({
        actions: actions.map(a => ({ value: a.action, count: a._count })),
        entityTypes: entityTypes.map(e => ({ value: e.entityType, count: e._count })),
        statuses: statuses.map(s => ({ value: s.status, count: s._count })),
      });
    }

    // Get single log by ID
    const logId = searchParams.get('id');
    if (logId) {
      const log = await db.auditLog.findUnique({
        where: { id: logId },
        include: {
          profile: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
              teamRole: true,
            },
          },
          team: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      if (!log) {
        return NextResponse.json(
          { error: 'Log non trouvé' },
          { status: 404 }
        );
      }

      // Get related logs
      const relatedLogs = log.entityType && log.entityId
        ? await db.auditLog.findMany({
            where: {
              entityType: log.entityType,
              entityId: log.entityId,
              id: { not: log.id },
            },
            include: {
              profile: {
                select: { id: true, name: true, email: true },
              },
            },
            orderBy: { createdAt: 'desc' },
            take: 10,
          })
        : [];

      return NextResponse.json({ log, relatedLogs });
    }

    // Team-based filtering: non-admins can only see their team's logs
    const effectiveTeamId = user.role !== 'admin' ? (teamId || user.teamId) : teamId;

    // Query logs
    const result = await queryAuditLogs({
      profileId,
      teamId: effectiveTeamId,
      action,
      entityType,
      entityId,
      status,
      startDate,
      endDate,
      search,
      ipAddress,
      page,
      limit,
      sortBy,
      sortOrder,
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

// POST - Create audit log(s) from client-side
export async function POST(request: NextRequest) {
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
      select: { id: true, teamId: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const logs = Array.isArray(body.logs) ? body.logs : [body];

    // Get request info
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
               request.headers.get('x-real-ip') ||
               request.headers.get('cf-connecting-ip') ||
               null;
    const userAgent = request.headers.get('user-agent');

    // Create audit logs
    const createdLogs = await Promise.all(
      logs.map((log: any) =>
        db.auditLog.create({
          data: {
            profileId: user.id,
            teamId: user.teamId,
            action: log.action,
            entityType: log.entityType || null,
            entityId: log.entityId || null,
            details: log.details ? JSON.stringify(log.details) : null,
            oldValues: log.oldValues ? JSON.stringify(log.oldValues) : null,
            newValues: log.newValues ? JSON.stringify(log.newValues) : null,
            ipAddress: ip,
            userAgent,
            status: log.status || 'success',
            errorMessage: log.errorMessage || null,
          },
        })
      )
    );

    return NextResponse.json({
      success: true,
      count: createdLogs.length,
    });
  } catch (error) {
    console.error('Erreur lors de la création du log d\'audit:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

// GET action types and entity types for dropdowns
export async function OPTIONS() {
  return NextResponse.json({
    actions: Object.values(AuditAction),
    entityTypes: Object.values(EntityType),
    statuses: ['success', 'failed', 'pending'],
  });
}
