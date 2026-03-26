import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/config"
import { db } from "@/lib/db"
import { createCreditInquiry, getCreditInquiries } from "@/lib/credit/report"

/**
 * GET /api/credit/inquiry
 * Get credit inquiries for clients
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const url = new URL(request.url)
    const clientId = url.searchParams.get("clientId")
    const limit = parseInt(url.searchParams.get("limit") || "20")

    if (clientId) {
      // Get inquiries for specific client
      const inquiries = await getCreditInquiries(clientId)
      return NextResponse.json({
        success: true,
        data: inquiries.slice(0, limit),
      })
    }

    // Get all recent inquiries for user's clients
    const inquiries = await db.creditInquiry.findMany({
      where: {
        profileId: session.user.id,
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            company: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    })

    return NextResponse.json({
      success: true,
      data: inquiries,
    })
  } catch (error) {
    console.error("Error fetching credit inquiries:", error)
    return NextResponse.json(
      { error: "Failed to fetch credit inquiries" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/credit/inquiry
 * Create a new credit inquiry
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { clientId, reason, consentGiven, inquiredBy } = body

    if (!clientId) {
      return NextResponse.json(
        { error: "Client ID is required" },
        { status: 400 }
      )
    }

    // Verify client belongs to user
    const client = await db.client.findFirst({
      where: {
        id: clientId,
        profileId: session.user.id,
      },
    })

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 })
    }

    // Create inquiry
    await createCreditInquiry(
      session.user.id,
      clientId,
      inquiredBy || null,
      reason || "Credit check",
      consentGiven === true
    )

    return NextResponse.json({
      success: true,
      message: "Credit inquiry recorded successfully",
    })
  } catch (error) {
    console.error("Error creating credit inquiry:", error)
    return NextResponse.json(
      { error: "Failed to create credit inquiry" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/credit/inquiry
 * Delete a credit inquiry
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const url = new URL(request.url)
    const inquiryId = url.searchParams.get("id")

    if (!inquiryId) {
      return NextResponse.json(
        { error: "Inquiry ID is required" },
        { status: 400 }
      )
    }

    // Verify inquiry belongs to user
    const inquiry = await db.creditInquiry.findFirst({
      where: {
        id: inquiryId,
        profileId: session.user.id,
      },
    })

    if (!inquiry) {
      return NextResponse.json({ error: "Inquiry not found" }, { status: 404 })
    }

    // Delete inquiry
    await db.creditInquiry.delete({
      where: { id: inquiryId },
    })

    // Decrement inquiry count on client
    await db.client.update({
      where: { id: inquiry.clientId },
      data: {
        creditInquiries: { decrement: 1 },
      },
    })

    return NextResponse.json({
      success: true,
      message: "Credit inquiry deleted successfully",
    })
  } catch (error) {
    console.error("Error deleting credit inquiry:", error)
    return NextResponse.json(
      { error: "Failed to delete credit inquiry" },
      { status: 500 }
    )
  }
}
