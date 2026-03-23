import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/config"
import { db } from "@/lib/db"
import { calculateCreditScore, updateClientCreditScore } from "@/lib/credit/scoring"
import { getRatingFromScore } from "@/lib/credit/factors"

interface RouteParams {
  params: Promise<{ clientId: string }>
}

/**
 * GET /api/credit/score/[clientId]
 * Get current credit score for a client
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { clientId } = await params

    // Get client
    const client = await db.client.findFirst({
      where: {
        id: clientId,
        profileId: session.user.id,
      },
      include: {
        paymentHistoryRecords: {
          orderBy: { dueDate: "desc" },
          take: 12,
        },
        creditReports: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    })

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 })
    }

    // If no score exists, calculate one
    if (client.creditScore === null) {
      const scoreResult = await calculateCreditScore(clientId)
      
      return NextResponse.json({
        success: true,
        data: {
          clientId: client.id,
          clientName: client.name,
          score: scoreResult.score,
          rating: scoreResult.rating,
          riskLevel: scoreResult.riskLevel,
          factors: scoreResult.factors,
          recommendation: scoreResult.recommendation,
          lastReview: null,
          inquiryCount: client.creditInquiries,
          paymentHistory: client.paymentHistoryRecords.map(p => ({
            id: p.id,
            amount: p.amount,
            dueDate: p.dueDate,
            paidDate: p.paidDate,
            daysLate: p.daysLate,
            status: p.status,
          })),
        },
      })
    }

    // Return existing score data
    return NextResponse.json({
      success: true,
      data: {
        clientId: client.id,
        clientName: client.name,
        score: client.creditScore,
        rating: client.creditRating,
        riskLevel: getRiskLevelFromRating(client.creditRating || "B"),
        lastReview: client.lastCreditReview,
        inquiryCount: client.creditInquiries,
        creditLimit: client.creditLimit,
        paymentHistory: client.paymentHistoryRecords.map(p => ({
          id: p.id,
          amount: p.amount,
          dueDate: p.dueDate,
          paidDate: p.paidDate,
          daysLate: p.daysLate,
          status: p.status,
        })),
        latestReport: client.creditReports[0] || null,
      },
    })
  } catch (error) {
    console.error("Error fetching credit score:", error)
    return NextResponse.json(
      { error: "Failed to fetch credit score" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/credit/score/[clientId]
 * Recalculate credit score for a client
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { clientId } = await params

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

    // Calculate and update score
    const scoreResult = await updateClientCreditScore(clientId)

    return NextResponse.json({
      success: true,
      message: "Credit score recalculated successfully",
      data: {
        clientId: client.id,
        clientName: client.name,
        score: scoreResult.score,
        rating: scoreResult.rating,
        riskLevel: scoreResult.riskLevel,
        factors: scoreResult.factors,
        recommendation: scoreResult.recommendation,
      },
    })
  } catch (error) {
    console.error("Error recalculating credit score:", error)
    return NextResponse.json(
      { error: "Failed to recalculate credit score" },
      { status: 500 }
    )
  }
}

/**
 * Helper function to get risk level from rating
 */
function getRiskLevelFromRating(rating: string): "low" | "medium" | "high" {
  const lowRatings = ["AAA", "AA", "A", "BBB"]
  const mediumRatings = ["BB", "B"]
  
  if (lowRatings.includes(rating)) return "low"
  if (mediumRatings.includes(rating)) return "medium"
  return "high"
}
