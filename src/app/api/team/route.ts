// =====================================================
// RELANCEPRO AFRICA - Team API Route
// Gestion des équipes (GET, POST, PUT)
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { db } from '@/lib/db';
import { hasPermission, canAddMember, getTeamLimit, TEAM_LIMITS_BY_PLAN } from '@/lib/auth/roles';
import { randomUUID } from 'crypto';

// =====================================================
// GET /api/team - Récupérer les informations de l'équipe
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
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    email: true,
                    name: true,
                    avatarUrl: true,
                  },
                },
              },
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
                  include: {
                    user: {
                      select: {
                        id: true,
                        email: true,
                        name: true,
                        avatarUrl: true,
                      },
                    },
                  },
                },
                invitations: {
                  where: {
                    acceptedAt: null,
                    expiresAt: { gt: new Date() },
                  },
                },
                owner: {
                  select: {
                    id: true,
                    email: true,
                    name: true,
                    avatarUrl: true,
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

    // L'utilisateur est propriétaire d'une équipe
    if (user.ownedTeam) {
      const team = user.ownedTeam;
      const plan = user.subscriptionPlan || 'starter';
      
      return NextResponse.json({
        team: {
          id: team.id,
          name: team.name,
          logoUrl: team.logoUrl,
          maxMembers: team.maxMembers,
          createdAt: team.createdAt,
          updatedAt: team.updatedAt,
        },
        members: team.members.map((member) => ({
          id: member.id,
          userId: member.userId,
          role: member.role,
          invitedAt: member.invitedAt,
          acceptedAt: member.acceptedAt,
          user: member.user,
          status: member.acceptedAt ? 'active' : 'pending',
        })),
        invitations: team.invitations.map((inv) => ({
          id: inv.id,
          email: inv.email,
          role: inv.role,
          createdAt: inv.createdAt,
          expiresAt: inv.expiresAt,
        })),
        currentUserRole: 'owner',
        plan,
        limits: {
          maxMembers: getTeamLimit(plan),
          currentMembers: team.members.filter((m) => m.acceptedAt).length,
          pendingInvitations: team.invitations.length,
        },
      });
    }

    // L'utilisateur est membre d'une équipe
    if (user.teamMemberships && user.teamMemberships.length > 0) {
      const membership = user.teamMemberships[0];
      const team = membership.team;
      const owner = await db.profile.findUnique({
        where: { id: team.ownerId },
        select: {
          subscriptionPlan: true,
        },
      });
      const plan = owner?.subscriptionPlan || 'starter';

      return NextResponse.json({
        team: {
          id: team.id,
          name: team.name,
          logoUrl: team.logoUrl,
          maxMembers: team.maxMembers,
          createdAt: team.createdAt,
          updatedAt: team.updatedAt,
        },
        members: team.members.map((member) => ({
          id: member.id,
          userId: member.userId,
          role: member.role,
          invitedAt: member.invitedAt,
          acceptedAt: member.acceptedAt,
          user: member.user,
          status: member.acceptedAt ? 'active' : 'pending',
        })),
        invitations: membership.role === 'admin' || membership.role === 'owner'
          ? team.invitations.map((inv) => ({
              id: inv.id,
              email: inv.email,
              role: inv.role,
              createdAt: inv.createdAt,
              expiresAt: inv.expiresAt,
            }))
          : [],
        currentUserRole: membership.role,
        plan,
        limits: {
          maxMembers: getTeamLimit(plan),
          currentMembers: team.members.filter((m) => m.acceptedAt).length,
          pendingInvitations: team.invitations.length,
        },
      });
    }

    // L'utilisateur n'a pas d'équipe
    return NextResponse.json({
      team: null,
      members: [],
      invitations: [],
      currentUserRole: null,
      plan: user.subscriptionPlan || 'starter',
      limits: {
        maxMembers: getTeamLimit(user.subscriptionPlan || 'starter'),
        currentMembers: 0,
        pendingInvitations: 0,
      },
    });
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'équipe:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

// =====================================================
// POST /api/team - Créer une nouvelle équipe
// =====================================================
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Le nom de l\'équipe est requis' },
        { status: 400 }
      );
    }

    // Vérifier si l'utilisateur a déjà une équipe
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

    if (user.ownedTeam || (user.teamMemberships && user.teamMemberships.length > 0)) {
      return NextResponse.json(
        { error: 'Vous faites déjà partie d\'une équipe' },
        { status: 400 }
      );
    }

    // Déterminer la limite de membres selon le plan
    const plan = user.subscriptionPlan || 'starter';
    const maxMembers = getTeamLimit(plan);

    // Créer l'équipe et mettre à jour l'utilisateur en une transaction
    const team = await db.$transaction(async (tx) => {
      // Créer l'équipe
      const newTeam = await tx.team.create({
        data: {
          name: name.trim(),
          ownerId: session.user.id,
          maxMembers,
        },
      });

      // Créer le membership pour le propriétaire
      await tx.teamMember.create({
        data: {
          teamId: newTeam.id,
          userId: session.user.id,
          role: 'owner',
          acceptedAt: new Date(),
        },
      });

      // Mettre à jour l'utilisateur avec teamId et teamRole
      await tx.profile.update({
        where: { id: session.user.id },
        data: {
          teamId: newTeam.id,
          teamRole: 'owner',
        },
      });

      return newTeam;
    });

    return NextResponse.json({
      message: 'Équipe créée avec succès',
      team: {
        id: team.id,
        name: team.name,
        maxMembers: team.maxMembers,
        createdAt: team.createdAt,
      },
    });
  } catch (error) {
    console.error('Erreur lors de la création de l\'équipe:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

// =====================================================
// PUT /api/team - Mettre à jour le nom de l'équipe
// =====================================================
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const body = await request.json();
    const { name, logoUrl } = body;

    // Vérifier les permissions
    const user = await db.profile.findUnique({
      where: { id: session.user.id },
      include: {
        ownedTeam: true,
        teamMemberships: {
          include: { team: true },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
    }

    // Déterminer le rôle et l'équipe
    let teamId: string | null = null;
    let userRole: string | null = null;

    if (user.ownedTeam) {
      teamId = user.ownedTeam.id;
      userRole = 'owner';
    } else if (user.teamMemberships && user.teamMemberships.length > 0) {
      teamId = user.teamMemberships[0].teamId;
      userRole = user.teamMemberships[0].role;
    }

    if (!teamId || !userRole) {
      return NextResponse.json(
        { error: 'Vous ne faites partie d\'aucune équipe' },
        { status: 400 }
      );
    }

    // Seul le propriétaire peut modifier le nom de l'équipe
    if (userRole !== 'owner') {
      return NextResponse.json(
        { error: 'Seul le propriétaire peut modifier l\'équipe' },
        { status: 403 }
      );
    }

    // Préparer les données à mettre à jour
    const updateData: { name?: string; logoUrl?: string | null } = {};
    
    if (name !== undefined && typeof name === 'string' && name.trim().length > 0) {
      updateData.name = name.trim();
    }
    
    if (logoUrl !== undefined) {
      updateData.logoUrl = logoUrl;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'Aucune donnée à mettre à jour' },
        { status: 400 }
      );
    }

    // Mettre à jour l'équipe
    const updatedTeam = await db.team.update({
      where: { id: teamId },
      data: updateData,
    });

    return NextResponse.json({
      message: 'Équipe mise à jour avec succès',
      team: {
        id: updatedTeam.id,
        name: updatedTeam.name,
        logoUrl: updatedTeam.logoUrl,
        updatedAt: updatedTeam.updatedAt,
      },
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'équipe:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

// =====================================================
// DELETE /api/team - Supprimer l'équipe (propriétaire uniquement)
// =====================================================
export async function DELETE() {
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
            members: true,
          },
        },
      },
    });

    if (!user || !user.ownedTeam) {
      return NextResponse.json(
        { error: 'Vous n\'êtes pas propriétaire d\'une équipe' },
        { status: 400 }
      );
    }

    const team = user.ownedTeam;
    const activeMembers = team.members.filter(
      (m) => m.acceptedAt && m.userId !== session.user.id
    );

    if (activeMembers.length > 0) {
      return NextResponse.json(
        { error: 'Vous devez supprimer tous les membres avant de supprimer l\'équipe' },
        { status: 400 }
      );
    }

    // Supprimer l'équipe (cascade supprime les membres et invitations)
    await db.$transaction(async (tx) => {
      // Supprimer l'équipe
      await tx.team.delete({
        where: { id: team.id },
      });

      // Mettre à jour l'utilisateur
      await tx.profile.update({
        where: { id: session.user.id },
        data: {
          teamId: null,
          teamRole: null,
        },
      });
    });

    return NextResponse.json({
      message: 'Équipe supprimée avec succès',
    });
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'équipe:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
