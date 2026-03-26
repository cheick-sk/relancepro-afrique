import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/config"
import { db } from "@/lib/db"
import { generateCreditReport, getLatestCreditReport, getCreditSummary } from "@/lib/credit/report"

interface RouteParams {
  params: Promise<{ clientId: string }>
}

/**
 * GET /api/credit/report/[clientId]
 * Get latest credit report for a client
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
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

    // Check if we should return summary instead
    const url = new URL(request.url)
    const summary = url.searchParams.get("summary") === "true"

    if (summary) {
      const summaryData = await getCreditSummary(session.user.id)
      return NextResponse.json({
        success: true,
        data: summaryData,
      })
    }

    // Get latest report
    const report = await getLatestCreditReport(clientId)

    if (!report) {
      // Generate new report if none exists
      const newReport = await generateCreditReport(clientId)
      return NextResponse.json({
        success: true,
        data: newReport,
      })
    }

    return NextResponse.json({
      success: true,
      data: report,
    })
  } catch (error) {
    console.error("Error fetching credit report:", error)
    return NextResponse.json(
      { error: "Failed to fetch credit report" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/credit/report/[clientId]
 * Generate new credit report for a client
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

    // Parse request body for options
    const body = await request.json().catch(() => ({}))
    const { forceNew = false } = body

    // Check for existing valid report
    if (!forceNew) {
      const existingReport = await getLatestCreditReport(clientId)
      if (existingReport && new Date(existingReport.validUntil) > new Date()) {
        return NextResponse.json({
          success: true,
          message: "Existing valid report found",
          data: existingReport,
        })
      }
    }

    // Generate new report
    const report = await generateCreditReport(clientId)

    return NextResponse.json({
      success: true,
      message: "Credit report generated successfully",
      data: report,
    })
  } catch (error) {
    console.error("Error generating credit report:", error)
    return NextResponse.json(
      { error: "Failed to generate credit report" },
      { status: 500 }
    )
  }
}
