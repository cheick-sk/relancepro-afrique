// =====================================================
// RELANCEPRO AFRICA - Team Accept Invitation API Route
// Acceptation des invitations d'équipe
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { db } from '@/lib/db';
import { hash, compare } from 'bcryptjs';

// =====================================================
// GET /api/team/accept - Vérifier une invitation
// =====================================================
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { valid: false, error: 'Token d\'invitation requis' },
        { status: 400 }
      );
    }

    // Find the invitation
    const invitation = await db.invitation.findUnique({
      where: { token },
      include: {
        team: {
          select: {
            id: true,
            name: true,
            logoUrl: true,
            owner: {
              select: {
                id: true,
                name: true,
                email: true,
                companyName: true,
              },
            },
          },
        },
      },
    });

    if (!invitation) {
      return NextResponse.json({
        valid: false,
        error: 'Invitation non trouvée',
      });
    }

    // Check if invitation has been declined
    if (invitation.status === 'declined') {
      return NextResponse.json({
        valid: false,
        error: 'Cette invitation a été refusée',
      });
    }

    // Check if invitation has already been accepted
    if (invitation.status === 'accepted' || invitation.acceptedAt) {
      return NextResponse.json({
        valid: false,
        error: 'Cette invitation a déjà été acceptée',
      });
    }

    // Check if invitation has expired
    if (invitation.expiresAt < new Date()) {
      return NextResponse.json({
        valid: false,
        error: 'Cette invitation a expiré',
      });
    }

    // Check if user already exists
    const existingUser = await db.profile.findUnique({
      where: { email: invitation.email.toLowerCase() },
      select: { id: true, teamId: true },
    });

    // Check if user is already in a team
    if (existingUser?.teamId) {
      return NextResponse.json({
        valid: false,
        error: 'Un compte avec cet email est déjà dans une équipe',
      });
    }

    // Return invitation information
    return NextResponse.json({
      valid: true,
      teamName: invitation.team.name,
      teamId: invitation.team.id,
      email: invitation.email,
      role: invitation.role,
      expiresAt: invitation.expiresAt,
      needsAuth: !existingUser, // If user doesn't exist, they need to register
      inviter: {
        name: invitation.team.owner.name || invitation.team.owner.email,
        companyName: invitation.team.owner.companyName,
      },
    });
  } catch (error) {
    console.error('Erreur lors de la vérification de l\'invitation:', error);
    return NextResponse.json(
      { valid: false, error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

// =====================================================
// POST /api/team/accept - Accepter une invitation
// =====================================================
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, action, name, password } = body;

    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { error: 'Token d\'invitation requis' },
        { status: 400 }
      );
    }

    // Find the invitation
    const invitation = await db.invitation.findUnique({
      where: { token },
      include: {
        team: {
          include: {
            members: {
              where: { acceptedAt: { not: null } },
            },
          },
        },
      },
    });

    if (!invitation) {
      return NextResponse.json(
        { error: 'Invitation non trouvée' },
        { status: 404 }
      );
    }

    // Check if invitation has been declined
    if (invitation.status === 'declined') {
      return NextResponse.json(
        { error: 'Cette invitation a été refusée' },
        { status: 400 }
      );
    }

    // Check if invitation has already been accepted
    if (invitation.status === 'accepted' || invitation.acceptedAt) {
      return NextResponse.json(
        { error: 'Cette invitation a déjà été acceptée' },
        { status: 400 }
      );
    }

    // Check if invitation has expired
    if (invitation.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'Cette invitation a expiré' },
        { status: 400 }
      );
    }

    let userId: string;

    if (action === 'register') {
      // Register new user
      if (!name || !password) {
        return NextResponse.json(
          { error: 'Nom et mot de passe requis pour l\'inscription' },
          { status: 400 }
        );
      }

      if (password.length < 6) {
        return NextResponse.json(
          { error: 'Le mot de passe doit contenir au moins 6 caractères' },
          { status: 400 }
        );
      }

      // Check if user already exists
      const existingUser = await db.profile.findUnique({
        where: { email: invitation.email.toLowerCase() },
      });

      if (existingUser) {
        return NextResponse.json(
          { error: 'Un compte avec cet email existe déjà. Veuillez vous connecter.' },
          { status: 400 }
        );
      }

      // Create new user
      const hashedPassword = await hash(password, 10);
      const newUser = await db.profile.create({
        data: {
          email: invitation.email.toLowerCase(),
          name: name.trim(),
          password: hashedPassword,
          teamId: invitation.teamId,
          teamRole: invitation.role,
          subscriptionStatus: 'free',
          preferredCurrency: 'GNF',
          preferredLanguage: 'fr',
        },
      });

      userId = newUser.id;
    } else {
      // Login existing user
      if (!password) {
        return NextResponse.json(
          { error: 'Mot de passe requis' },
          { status: 400 }
        );
      }

      const user = await db.profile.findUnique({
        where: { email: invitation.email.toLowerCase() },
        include: {
          ownedTeam: true,
          teamMemberships: true,
        },
      });

      if (!user || !user.password) {
        return NextResponse.json(
          { error: 'Compte non trouvé. Veuillez créer un compte.' },
          { status: 400 }
        );
      }

      const isValidPassword = await compare(password, user.password);
      if (!isValidPassword) {
        return NextResponse.json(
          { error: 'Mot de passe incorrect' },
          { status: 401 }
        );
      }

      // Check if user is already in a team
      if (user.ownedTeam || (user.teamMemberships && user.teamMemberships.length > 0)) {
        return NextResponse.json(
          { error: 'Vous faites déjà partie d\'une équipe' },
          { status: 400 }
        );
      }

      userId = user.id;
    }

    // Accept the invitation in a transaction
    const result = await db.$transaction(async (tx) => {
      // Create the membership
      const membership = await tx.teamMember.create({
        data: {
          teamId: invitation.teamId,
          userId,
          role: invitation.role,
          invitedBy: invitation.invitedBy,
          invitedAt: invitation.createdAt,
          acceptedAt: new Date(),
        },
      });

      // Update invitation status
      await tx.invitation.update({
        where: { id: invitation.id },
        data: {
          status: 'accepted',
          acceptedAt: new Date(),
        },
      });

      // Update user with team info
      await tx.profile.update({
        where: { id: userId },
        data: {
          teamId: invitation.teamId,
          teamRole: invitation.role,
        },
      });

      return membership;
    });

    return NextResponse.json({
      message: 'Invitation acceptée avec succès',
      membership: {
        id: result.id,
        teamId: result.teamId,
        role: result.role,
        acceptedAt: result.acceptedAt,
      },
      team: {
        id: invitation.team.id,
        name: invitation.team.name,
      },
    });
  } catch (error) {
    console.error('Erreur lors de l\'acceptation de l\'invitation:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

// =====================================================
// DELETE /api/team/accept - Decline an invitation
// =====================================================
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: 'Token d\'invitation requis' },
        { status: 400 }
      );
    }

    const invitation = await db.invitation.findUnique({
      where: { token },
    });

    if (!invitation) {
      return NextResponse.json(
        { error: 'Invitation non trouvée' },
        { status: 404 }
      );
    }

    if (invitation.status !== 'pending') {
      return NextResponse.json(
        { error: 'Cette invitation ne peut plus être refusée' },
        { status: 400 }
      );
    }

    // Update invitation status to declined
    await db.invitation.update({
      where: { id: invitation.id },
      data: {
        status: 'declined',
        declinedAt: new Date(),
      },
    });

    return NextResponse.json({
      message: 'Invitation refusée',
    });
  } catch (error) {
    console.error('Erreur lors du refus de l\'invitation:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
