"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  CreditCard,
  TrendingUp,
  AlertTriangle,
  Clock,
  Users,
  RefreshCw,
  ArrowRight,
  BarChart3,
} from "lucide-react"
import { ScoreGauge, ScoreBadge, MiniGauge } from "@/components/credit/score-gauge"
import { RatingIndicator } from "@/components/credit/rating-badge"
import { useCreditSummary } from "@/hooks/use-credit-score"
import { CREDIT_RATINGS, type CreditRating } from "@/lib/credit/factors"
import { format } from "date-fns"
import { fr } from "date-fns/locale"

export default function CreditDashboardPage() {
  const router = useRouter()
  const { data: summary, isLoading, refetch } = useCreditSummary({ autoRefresh: true })
  const [recentInquiries, setRecentInquiries] = React.useState<Array<{
    id: string
    clientId: string
    clientName: string
    reason: string | null
    createdAt: string
  }>>([])
  const [highRiskClients, setHighRiskClients] = React.useState<Array<{
    id: string
    name: string
    creditScore: number | null
    creditRating: string | null
  }>>([])

  // Fetch additional data
  React.useEffect(() => {
    async function fetchAdditionalData() {
      try {
        // Fetch recent inquiries
        const inquiriesRes = await fetch("/api/credit/inquiry?limit=5")
        const inquiriesData = await inquiriesRes.json()
        if (inquiriesData.success) {
          setRecentInquiries(inquiriesData.data.map((i: { client?: { name: string }; clientId: string; reason: string | null; createdAt: string }) => ({
            id: i.clientId,
            clientId: i.clientId,
            clientName: i.client?.name || "Unknown",
            reason: i.reason,
            createdAt: i.createdAt,
          })))
        }

        // Fetch high risk clients
        const clientsRes = await fetch("/api/clients?riskLevel=high&limit=5")
        const clientsData = await clientsRes.json()
        if (clientsData.clients) {
          setHighRiskClients(clientsData.clients.map((c: { id: string; name: string; creditScore: number | null; creditRating: string | null }) => ({
            id: c.id,
            name: c.name,
            creditScore: c.creditScore,
            creditRating: c.creditRating,
          })))
        }
      } catch (error) {
        console.error("Error fetching additional data:", error)
      }
    }

    fetchAdditionalData()
  }, [])

  // Calculate average score color
  const getScoreColor = (score: number) => {
    if (score >= 700) return "text-emerald-500"
    if (score >= 500) return "text-amber-500"
    return "text-red-500"
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Credit Scoring</h1>
          <p className="text-muted-foreground">
            Gerez et suivez les scores de credit de vos clients
          </p>
        </div>
        <Button onClick={() => refetch()} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Actualiser
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.totalClients || 0}</div>
            <p className="text-xs text-muted-foreground">
              {summary?.clientsWithScore || 0} avec score calcule
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Score Moyen</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getScoreColor(summary?.averageScore || 0)}`}>
              {summary?.averageScore || "---"}
            </div>
            <p className="text-xs text-muted-foreground">
              Sur 1000 points
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clients a Risque</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">
              {summary?.highRiskCount || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Scores CCC et moins
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Demandes Recent</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.recentInquiries || 0}</div>
            <p className="text-xs text-muted-foreground">
              30 derniers jours
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="distribution" className="space-y-4">
        <TabsList>
          <TabsTrigger value="distribution">Distribution</TabsTrigger>
          <TabsTrigger value="highRisk">Risque Eleve</TabsTrigger>
          <TabsTrigger value="inquiries">Demandes</TabsTrigger>
        </TabsList>

        {/* Distribution Tab */}
        <TabsContent value="distribution" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Rating Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Distribution des Notes</CardTitle>
                <CardDescription>
                  Repartition des clients par note de credit
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(CREDIT_RATINGS).reverse().map(([rating, info]) => {
                  const count = summary?.ratingDistribution?.[rating as CreditRating] || 0
                  const total = summary?.totalClients || 1
                  const percentage = Math.round((count / total) * 100)

                  return (
                    <div key={rating} className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded flex items-center justify-center text-sm font-bold text-white"
                        style={{ backgroundColor: info.color }}
                      >
                        {rating}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium">{info.label}</span>
                          <span className="text-sm text-muted-foreground">
                            {count} ({percentage}%)
                          </span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${percentage}%`,
                              backgroundColor: info.color,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>

            {/* Score Overview */}
            <Card>
              <CardHeader>
                <CardTitle>Apercu des Scores</CardTitle>
                <CardDescription>
                  Statistiques globales des scores de credit
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Average Score Gauge */}
                <div className="flex justify-center">
                  <ScoreGauge
                    score={summary?.averageScore || 0}
                    size="md"
                    showRating
                  />
                </div>

                {/* Score Ranges */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Excellent (700-1000)</span>
                    <span className="font-medium text-emerald-500">
                      {Object.entries(summary?.ratingDistribution || {})
                        .filter(([r]) => ["AAA", "AA", "A"].includes(r))
                        .reduce((sum, [, count]) => sum + count, 0)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Bon (500-699)</span>
                    <span className="font-medium text-amber-500">
                      {Object.entries(summary?.ratingDistribution || {})
                        .filter(([r]) => ["BBB", "BB"].includes(r))
                        .reduce((sum, [, count]) => sum + count, 0)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Risque (&lt;500)</span>
                    <span className="font-medium text-red-500">
                      {Object.entries(summary?.ratingDistribution || {})
                        .filter(([r]) => ["B", "CCC", "CC", "C", "D"].includes(r))
                        .reduce((sum, [, count]) => sum + count, 0)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* High Risk Tab */}
        <TabsContent value="highRisk" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                Clients a Risque Eleve
              </CardTitle>
              <CardDescription>
                Clients necessitant une attention immediate
              </CardDescription>
            </CardHeader>
            <CardContent>
              {highRiskClients.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Aucun client a risque eleve
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Note</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {highRiskClients.map((client) => (
                      <TableRow key={client.id}>
                        <TableCell className="font-medium">{client.name}</TableCell>
                        <TableCell>
                          <MiniGauge score={client.creditScore} />
                        </TableCell>
                        <TableCell>
                          <RatingIndicator rating={client.creditRating} />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/credit/${client.id}`)}
                          >
                            Voir <ArrowRight className="ml-2 h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Inquiries Tab */}
        <TabsContent value="inquiries" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Demandes de Credit Recent</CardTitle>
              <CardDescription>
                Les dernieres demandes de verification de credit
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recentInquiries.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Aucune demande recente
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead>Raison</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentInquiries.map((inquiry) => (
                      <TableRow key={inquiry.id}>
                        <TableCell className="font-medium">{inquiry.clientName}</TableCell>
                        <TableCell>{inquiry.reason || "Verification credit"}</TableCell>
                        <TableCell>
                          {format(new Date(inquiry.createdAt), "dd MMM yyyy", { locale: fr })}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/credit/${inquiry.clientId}`)}
                          >
                            Voir <ArrowRight className="ml-2 h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
