// =====================================================
// RELANCEPRO AFRICA - Team Members API Route
// Gestion des membres de l'équipe
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { db } from '@/lib/db';
import { hasPermission, canManageRole, TeamRole } from '@/lib/auth/roles';

// =====================================================
// GET /api/team/members/[id] - Récupérer un membre
// =====================================================
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { id } = await params;

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

    if (user.ownedTeam) {
      teamId = user.ownedTeam.id;
    } else if (user.teamMemberships && user.teamMemberships.length > 0) {
      teamId = user.teamMemberships[0].teamId;
    }

    if (!teamId) {
      return NextResponse.json(
        { error: 'Vous ne faites partie d\'aucune équipe' },
        { status: 400 }
      );
    }

    // Récupérer le membre
    const member = await db.teamMember.findFirst({
      where: {
        id,
        teamId,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            avatarUrl: true,
            phone: true,
            createdAt: true,
          },
        },
      },
    });

    if (!member) {
      return NextResponse.json(
        { error: 'Membre non trouvé' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      member: {
        id: member.id,
        userId: member.userId,
        role: member.role,
        invitedAt: member.invitedAt,
        acceptedAt: member.acceptedAt,
        status: member.acceptedAt ? 'active' : 'pending',
        user: member.user,
      },
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du membre:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

// =====================================================
// PUT /api/team/members/[id] - Modifier le rôle d'un membre
// =====================================================
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { role } = body;

    // Validation du rôle
    const validRoles: TeamRole[] = ['owner', 'admin', 'manager', 'agent'];
    if (!role || !validRoles.includes(role as TeamRole)) {
      return NextResponse.json(
        { error: 'Rôle invalide' },
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

    if (!hasPermission(userRole, 'team:manage')) {
      return NextResponse.json(
        { error: 'Vous n\'avez pas la permission de modifier les rôles' },
        { status: 403 }
      );
    }

    // Récupérer le membre à modifier
    const member = await db.teamMember.findFirst({
      where: {
        id,
        teamId,
      },
      include: {
        user: true,
      },
    });

    if (!member) {
      return NextResponse.json(
        { error: 'Membre non trouvé' },
        { status: 404 }
      );
    }

    // Vérifier que l'utilisateur peut gérer ce rôle
    if (!canManageRole(userRole, member.role as TeamRole)) {
      return NextResponse.json(
        { error: 'Vous ne pouvez pas modifier ce membre' },
        { status: 403 }
      );
    }

    // Vérifier que l'utilisateur peut assigner le nouveau rôle
    if (!canManageRole(userRole, role as TeamRole)) {
      return NextResponse.json(
        { error: `Vous ne pouvez pas assigner le rôle "${role}"` },
        { status: 403 }
      );
    }

    // Ne pas permettre de changer le rôle du propriétaire
    if (member.role === 'owner') {
      return NextResponse.json(
        { error: 'Le rôle du propriétaire ne peut pas être modifié' },
        { status: 400 }
      );
    }

    // Mettre à jour le rôle
    const updatedMember = await db.$transaction(async (tx) => {
      // Mettre à jour le membership
      const updated = await tx.teamMember.update({
        where: { id },
        data: { role },
      });

      // Mettre à jour le teamRole de l'utilisateur
      await tx.profile.update({
        where: { id: member.userId },
        data: { teamRole: role },
      });

      return updated;
    });

    return NextResponse.json({
      message: 'Rôle mis à jour avec succès',
      member: {
        id: updatedMember.id,
        userId: updatedMember.userId,
        role: updatedMember.role,
      },
    });
  } catch (error) {
    console.error('Erreur lors de la modification du rôle:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

// =====================================================
// DELETE /api/team/members/[id] - Supprimer un membre
// =====================================================
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { id } = await params;

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

    if (!hasPermission(userRole, 'team:manage')) {
      return NextResponse.json(
        { error: 'Vous n\'avez pas la permission de supprimer des membres' },
        { status: 403 }
      );
    }

    // Récupérer le membre à supprimer
    const member = await db.teamMember.findFirst({
      where: {
        id,
        teamId,
      },
    });

    if (!member) {
      return NextResponse.json(
        { error: 'Membre non trouvé' },
        { status: 404 }
      );
    }

    // Vérifier que l'utilisateur peut gérer ce membre
    if (!canManageRole(userRole, member.role as TeamRole)) {
      return NextResponse.json(
        { error: 'Vous ne pouvez pas supprimer ce membre' },
        { status: 403 }
      );
    }

    // Ne pas permettre de supprimer le propriétaire
    if (member.role === 'owner') {
      return NextResponse.json(
        { error: 'Le propriétaire ne peut pas être supprimé' },
        { status: 400 }
      );
    }

    // Supprimer le membre et mettre à jour l'utilisateur
    await db.$transaction(async (tx) => {
      // Supprimer le membership
      await tx.teamMember.delete({
        where: { id },
      });

      // Mettre à jour l'utilisateur
      await tx.profile.update({
        where: { id: member.userId },
        data: {
          teamId: null,
          teamRole: null,
        },
      });
    });

    return NextResponse.json({
      message: 'Membre supprimé avec succès',
    });
  } catch (error) {
    console.error('Erreur lors de la suppression du membre:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
