// Client Portal Access API Route
// Manage portal access for a specific client
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { generatePortalToken, getClientTokens, revokePortalToken } from "@/lib/portal/tokens";
import { sendEmail } from "@/lib/services/email";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - Get portal access info for a client
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: clientId } = await params;

    // Verify client belongs to user
    const client = await db.client.findFirst({
      where: {
        id: clientId,
        profileId: session.user.id,
      },
      include: {
        portalTokens: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // Get active token count
    const now = new Date();
    const activeTokens = client.portalTokens.filter(
      (t) => t.expiresAt > now && (!t.singleUse || !t.usedAt)
    );

    return NextResponse.json({
      success: true,
      data: {
        client: {
          id: client.id,
          name: client.name,
          email: client.email,
          phone: client.phone,
        },
        portalAccess: {
          hasAccess: activeTokens.length > 0,
          activeTokensCount: activeTokens.length,
          totalTokensCount: client.portalTokens.length,
          tokens: client.portalTokens.map((token) => ({
            id: token.id,
            token: token.token,
            expiresAt: token.expiresAt,
            singleUse: token.singleUse,
            usedAt: token.usedAt,
            accessedAt: token.accessedAt,
            accessedCount: token.accessedCount,
            isActive: token.expiresAt > now && (!token.singleUse || !token.usedAt),
            isExpired: token.expiresAt <= now,
            createdAt: token.createdAt,
          })),
        },
      },
    });
  } catch (error) {
    console.error("Error fetching portal access:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Generate new portal token
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: clientId } = await params;
    const body = await request.json();
    
    const {
      expiresInDays = 30,
      singleUse = false,
      note,
      sendEmail: shouldSendEmail = false,
    } = body;

    // Verify client belongs to user
    const client = await db.client.findFirst({
      where: {
        id: clientId,
        profileId: session.user.id,
      },
      include: {
        profile: {
          select: {
            companyName: true,
            email: true,
          },
        },
      },
    });

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // Generate token
    const token = await generatePortalToken({
      clientId,
      expiresInDays,
      singleUse,
      createdBy: session.user.id,
      note,
    });

    // Generate portal URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const portalUrl = `${baseUrl}/portal/${token.token}`;

    // Send email if requested and client has email
    if (shouldSendEmail && client.email) {
      try {
        await sendEmail({
          to: client.email,
          subject: `Accédez à vos factures - ${client.profile.companyName || "RelancePro"}`,
          html: generatePortalInvitationEmail({
            clientName: client.name,
            creditorName: client.profile.companyName || "votre créancier",
            portalUrl,
            expiresAt: token.expiresAt,
            isSingleUse: singleUse,
          }),
        });
      } catch (emailError) {
        console.error("Failed to send portal invitation email:", emailError);
        // Don't fail the request, but note the email failure
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        token: {
          id: token.id,
          token: token.token,
          expiresAt: token.expiresAt,
          singleUse: token.singleUse,
          portalUrl,
        },
        emailSent: shouldSendEmail && client.email,
      },
    });
  } catch (error) {
    console.error("Error generating portal token:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE - Revoke all portal access for a client
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: clientId } = await params;
    const { searchParams } = new URL(request.url);
    const tokenId = searchParams.get("tokenId");

    // Verify client belongs to user
    const client = await db.client.findFirst({
      where: {
        id: clientId,
        profileId: session.user.id,
      },
    });

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    if (tokenId) {
      // Revoke specific token
      const token = await db.portalToken.findFirst({
        where: {
          id: tokenId,
          clientId,
        },
      });

      if (!token) {
        return NextResponse.json({ error: "Token not found" }, { status: 404 });
      }

      await revokePortalToken(tokenId);
    } else {
      // Revoke all tokens for this client
      await db.portalToken.deleteMany({
        where: {
          clientId,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: tokenId ? "Token revoked" : "All portal access revoked",
    });
  } catch (error) {
    console.error("Error revoking portal access:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Email template generator
function generatePortalInvitationEmail(params: {
  clientName: string;
  creditorName: string;
  portalUrl: string;
  expiresAt: Date;
  isSingleUse: boolean;
}): string {
  const { clientName, creditorName, portalUrl, expiresAt, isSingleUse } = params;
  
  const formatDate = (date: Date) => {
    return date.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Accédez à vos factures</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; padding: 20px 0; border-bottom: 2px solid #f97316; }
    .logo { font-size: 28px; font-weight: bold; }
    .logo-orange { color: #f97316; }
    .content { padding: 30px 0; }
    .button { display: inline-block; background: #f97316; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
    .info-box { background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0; }
    .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
    .footer { text-align: center; padding: 20px 0; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">
      Relance<span class="logo-orange">Pro</span> Africa
    </div>
  </div>
  
  <div class="content">
    <p>Bonjour <strong>${clientName}</strong>,</p>
    
    <p><strong>${creditorName}</strong> vous invite à consulter vos factures et effectuer vos paiements en ligne via notre portail sécurisé.</p>
    
    <div style="text-align: center;">
      <a href="${portalUrl}" class="button">
        Accéder au portail
      </a>
    </div>
    
    <div class="info-box">
      <p><strong>Ce que vous pouvez faire:</strong></p>
      <ul style="margin: 10px 0; padding-left: 20px;">
        <li>Consulter toutes vos factures</li>
        <li>Voir votre historique de paiements</li>
        <li>Effectuer des paiements en ligne sécurisés</li>
        <li>Contacter votre créancier</li>
      </ul>
    </div>
    
    ${isSingleUse ? `
    <div class="warning">
      <p><strong>⚠️ Important:</strong> Ce lien est à usage unique. Il ne sera plus valide après votre première visite.</p>
    </div>
    ` : `
    <p>📅 Ce lien est valide jusqu'au <strong>${formatDate(expiresAt)}</strong>.</p>
    `}
    
    <p>Si le bouton ne fonctionne pas, copiez-collez ce lien dans votre navigateur:</p>
    <p style="word-break: break-all; color: #f97316; font-size: 14px;">${portalUrl}</p>
  </div>
  
  <div class="footer">
    <p>RelancePro Africa - Plateforme de gestion des créances</p>
    <p>Ce message a été envoyé par ${creditorName} via RelancePro.</p>
  </div>
</body>
</html>
  `.trim();
}
