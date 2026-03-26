// =====================================================
// RELANCEPRO AFRICA - Team Invite API Route
// Gestion des invitations d'équipe
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { db } from '@/lib/db';
import { hasPermission, canAddMember, getAssignableRoles, TeamRole } from '@/lib/auth/roles';
import { randomUUID } from 'crypto';
import { sendTeamInvitation } from '@/lib/services/email';
import logger from '@/lib/logger';

// Durée de validité d'une invitation (7 jours)
const INVITATION_EXPIRY_DAYS = 7;

// =====================================================
// POST /api/team/invite - Envoyer une invitation
// =====================================================
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const body = await request.json();
    const { email, role } = body;

    // Validation des entrées
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Email invalide' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    const validRoles: TeamRole[] = ['admin', 'manager', 'agent', 'viewer'];
    
    if (!role || !validRoles.includes(role as TeamRole)) {
      return NextResponse.json(
        { error: 'Rôle invalide. Rôles valides: admin, manager, agent, viewer' },
        { status: 400 }
      );
    }

    // Récupérer l'utilisateur et son équipe
    const user = await db.profile.findUnique({
      where: { id: session.user.id },
      include: {
        ownedTeam: {
          include: {
            members: {
              where: { acceptedAt: { not: null } },
            },
            invitations: {
              where: {
                acceptedAt: null,
                expiresAt: { gt: new Date() },
              },
            },
          },
        },
        teamMemberships: {
          include: {
            team: {
              include: {
                members: {
                  where: { acceptedAt: { not: null } },
                },
                invitations: {
                  where: {
                    acceptedAt: null,
                    expiresAt: { gt: new Date() },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
    }

    // Déterminer l'équipe et le rôle de l'utilisateur
    let teamId: string | null = null;
    let userRole: TeamRole | null = null;
    let currentMemberCount = 0;
    let pendingInvitationCount = 0;
    let plan = 'starter';

    if (user.ownedTeam) {
      teamId = user.ownedTeam.id;
      userRole = 'owner';
      currentMemberCount = user.ownedTeam.members.length;
      pendingInvitationCount = user.ownedTeam.invitations.length;
      plan = user.subscriptionPlan || 'starter';
    } else if (user.teamMemberships && user.teamMemberships.length > 0) {
      const membership = user.teamMemberships[0];
      teamId = membership.teamId;
      userRole = membership.role as TeamRole;
      currentMemberCount = membership.team.members.length;
      pendingInvitationCount = membership.team.invitations.length;
      
      // Récupérer le plan du propriétaire
      const owner = await db.profile.findFirst({
        where: { id: membership.team.ownerId },
        select: { subscriptionPlan: true },
      });
      plan = owner?.subscriptionPlan || 'starter';
    }

    if (!teamId || !userRole) {
      return NextResponse.json(
        { error: 'Vous ne faites partie d\'aucune équipe' },
        { status: 400 }
      );
    }

    // Vérifier les permissions
    if (!hasPermission(userRole, 'team:invite')) {
      return NextResponse.json(
        { error: 'Vous n\'avez pas la permission d\'inviter des membres' },
        { status: 403 }
      );
    }

    // Vérifier que l'utilisateur peut assigner ce rôle
    const assignableRoles = getAssignableRoles(userRole);
    if (!assignableRoles.includes(role as TeamRole)) {
      return NextResponse.json(
        { error: `Vous ne pouvez pas assigner le rôle "${role}"` },
        { status: 403 }
      );
    }

    // Vérifier si l'email est déjà membre de l'équipe
    const existingMember = await db.teamMember.findFirst({
      where: {
        teamId,
        user: { email: normalizedEmail },
      },
      include: { user: true },
    });

    if (existingMember) {
      return NextResponse.json(
        { error: 'Cet utilisateur est déjà membre de l\'équipe' },
        { status: 400 }
      );
    }

    // Vérifier s'il y a déjà une invitation en cours
    const existingInvitation = await db.invitation.findFirst({
      where: {
        teamId,
        email: normalizedEmail,
        acceptedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (existingInvitation) {
      return NextResponse.json(
        { error: 'Une invitation a déjà été envoyée à cet email' },
        { status: 400 }
      );
    }

    // Vérifier les limites de l'équipe
    const totalCount = currentMemberCount + pendingInvitationCount;
    if (!canAddMember(totalCount, plan)) {
      const limit = plan === 'enterprise' ? 'illimité' : getTeamLimit(plan);
      return NextResponse.json(
        { 
          error: `Limite de membres atteinte. Votre plan ${plan} permet ${limit === -1 ? 'un nombre illimité' : limit} membre(s).`,
          currentCount: totalCount,
          limit: limit === -1 ? null : limit,
        },
        { status: 400 }
      );
    }

    // Créer l'invitation
    const token = randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + INVITATION_EXPIRY_DAYS);

    const invitation = await db.invitation.create({
      data: {
        teamId,
        email: normalizedEmail,
        role: role as string,
        token,
        status: 'pending',
        expiresAt,
        invitedBy: session.user.id,
      },
    });

    // TODO: Envoyer l'email d'invitation
    // pour l'instant, on retourne le lien d'acceptation
    const acceptUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/invite/${token}`;

    return NextResponse.json({
      message: 'Invitation envoyée avec succès',
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        expiresAt: invitation.expiresAt,
        acceptUrl,
      },
    });
  } catch (error) {
    console.error('Erreur lors de l\'envoi de l\'invitation:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

// Helper pour récupérer la limite d'équipe
function getTeamLimit(plan: string): number {
  const limits: Record<string, number> = {
    starter: 1,
    business: 3,
    enterprise: -1, // Illimité
  };
  return limits[plan] ?? 1;
}

// =====================================================
// GET /api/team/invite - Lister les invitations en attente
// =====================================================
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const user = await db.profile.findUnique({
      where: { id: session.user.id },
      include: {
        ownedTeam: {
          include: {
            invitations: {
              where: {
                status: 'pending',
                expiresAt: { gt: new Date() },
              },
              orderBy: { createdAt: 'desc' },
            },
          },
        },
        teamMemberships: {
          include: {
            team: {
              include: {
                invitations: {
                  where: {
                    status: 'pending',
                    expiresAt: { gt: new Date() },
                  },
                  orderBy: { createdAt: 'desc' },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
    }

    let invitations: typeof user.ownedTeam extends { invitations: infer I } ? I : never = [];
    let userRole: TeamRole | null = null;

    if (user.ownedTeam) {
      invitations = user.ownedTeam.invitations;
      userRole = 'owner';
    } else if (user.teamMemberships && user.teamMemberships.length > 0) {
      const membership = user.teamMemberships[0];
      userRole = membership.role as TeamRole;
      
      if (userRole === 'admin' || userRole === 'owner') {
        invitations = membership.team.invitations;
      }
    }

    return NextResponse.json({
      invitations: invitations.map((inv) => ({
        id: inv.id,
        email: inv.email,
        role: inv.role,
        createdAt: inv.createdAt,
        expiresAt: inv.expiresAt,
      })),
      userRole,
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des invitations:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

// =====================================================
// DELETE /api/team/invite - Annuler une invitation
// =====================================================
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const invitationId = searchParams.get('id');

    if (!invitationId) {
      return NextResponse.json(
        { error: 'ID d\'invitation requis' },
        { status: 400 }
      );
    }

    // Récupérer l'utilisateur et vérifier les permissions
    const user = await db.profile.findUnique({
      where: { id: session.user.id },
      include: {
        ownedTeam: true,
        teamMemberships: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
    }

    let teamId: string | null = null;
    let userRole: TeamRole | null = null;

    if (user.ownedTeam) {
      teamId = user.ownedTeam.id;
      userRole = 'owner';
    } else if (user.teamMemberships && user.teamMemberships.length > 0) {
      const membership = user.teamMemberships[0];
      teamId = membership.teamId;
      userRole = membership.role as TeamRole;
    }

    if (!teamId || !userRole) {
      return NextResponse.json(
        { error: 'Vous ne faites partie d\'aucune équipe' },
        { status: 400 }
      );
    }

    if (!hasPermission(userRole, 'team:invite')) {
      return NextResponse.json(
        { error: 'Vous n\'avez pas la permission d\'annuler des invitations' },
        { status: 403 }
      );
    }

    // Supprimer l'invitation
    const invitation = await db.invitation.findFirst({
      where: {
        id: invitationId,
        teamId,
      },
    });

    if (!invitation) {
      return NextResponse.json(
        { error: 'Invitation non trouvée' },
        { status: 404 }
      );
    }

    await db.invitation.delete({
      where: { id: invitationId },
    });

    return NextResponse.json({
      message: 'Invitation annulée avec succès',
    });
  } catch (error) {
    console.error('Erreur lors de l\'annulation de l\'invitation:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
