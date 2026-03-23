"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
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
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import {
  User,
  CreditCard,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  FileText,
  ArrowLeft,
  Clock,
  DollarSign,
  Shield,
  AlertCircle,
} from "lucide-react"
import { ScoreGauge } from "@/components/credit/score-gauge"
import { RatingBadge, RatingBadgeDetailed, RatingScale } from "@/components/credit/rating-badge"
import { FactorsBreakdown, FactorsSummary } from "@/components/credit/factors-breakdown"
import { PaymentHistoryChart, PaymentCalendar, PaymentHistoryStats } from "@/components/credit/payment-history-chart"
import { CreditLimitCalculator, CompactCreditLimit } from "@/components/credit/credit-limit-calculator"
import { useCreditScore, useCreditReport } from "@/hooks/use-credit-score"
import { CREDIT_RATINGS } from "@/lib/credit/factors"
import { format } from "date-fns"
import { fr } from "date-fns/locale"

export default function ClientCreditPage() {
  const params = useParams()
  const router = useRouter()
  const clientId = params.clientId as string

  const { data: scoreData, isLoading: scoreLoading, refetch, recalculate } = useCreditScore({
    clientId,
    onSuccess: (data) => {
      console.log("Score updated:", data.score)
    },
  })

  const { data: reportData, isLoading: reportLoading, generate: generateReport } = useCreditReport({
    clientId,
  })

  const isLoading = scoreLoading || reportLoading

  // Calculate payment stats from history
  const paymentStats = React.useMemo(() => {
    if (!scoreData?.paymentHistory) return null

    const history = scoreData.paymentHistory
    return {
      total: history.length,
      onTime: history.filter(p => p.status === "on_time").length,
      late: history.filter(p => p.status === "late").length,
      veryLate: history.filter(p => p.status === "very_late").length,
      defaulted: history.filter(p => p.status === "default").length,
    }
  }, [scoreData?.paymentHistory])

  if (isLoading) {
    return (
      <div className="flex-1 space-y-6 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-muted rounded" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    )
  }

  if (!scoreData) {
    return (
      <div className="flex-1 space-y-6 p-6">
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Client non trouve</h2>
          <p className="text-muted-foreground mb-4">
            Impossible de charger les donnees de credit pour ce client.
          </p>
          <Button onClick={() => router.push("/credit")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour au tableau de bord
          </Button>
        </div>
      </div>
    )
  }

  const ratingInfo = CREDIT_RATINGS[scoreData.rating as keyof typeof CREDIT_RATINGS]

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard">Tableau de bord</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/credit">Credit</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{scoreData.clientName}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.push("/credit")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{scoreData.clientName}</h1>
            <p className="text-muted-foreground">Profil de credit</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => generateReport()} variant="outline">
            <FileText className="mr-2 h-4 w-4" />
            Generer Rapport
          </Button>
          <Button onClick={() => recalculate()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Recalculer
          </Button>
        </div>
      </div>

      {/* Main Score Card */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Score Gauge */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Score de Credit</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center py-6">
            <ScoreGauge
              score={scoreData.score}
              rating={scoreData.rating as keyof typeof CREDIT_RATINGS}
              size="lg"
              showRating
            />
          </CardContent>
        </Card>

        {/* Rating Details */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Details de la Note</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <RatingBadgeDetailed
              rating={scoreData.rating as keyof typeof CREDIT_RATINGS}
              score={scoreData.score}
            />
            
            <Separator />
            
            {/* Risk Level */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Niveau de risque</span>
              <Badge
                variant="outline"
                style={{
                  borderColor: scoreData.riskLevel === "low" ? "#10B981" : 
                              scoreData.riskLevel === "medium" ? "#F59E0B" : "#EF4444",
                  color: scoreData.riskLevel === "low" ? "#10B981" : 
                         scoreData.riskLevel === "medium" ? "#F59E0B" : "#EF4444",
                }}
              >
                {scoreData.riskLevel === "low" && <Shield className="h-3 w-3 mr-1" />}
                {scoreData.riskLevel === "medium" && <AlertTriangle className="h-3 w-3 mr-1" />}
                {scoreData.riskLevel === "high" && <AlertTriangle className="h-3 w-3 mr-1" />}
                {scoreData.riskLevel === "low" ? "Faible" : 
                 scoreData.riskLevel === "medium" ? "Moyen" : "Eleve"}
              </Badge>
            </div>

            {/* Last Review */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Derniere revision</span>
              <span className="text-sm">
                {scoreData.lastReview 
                  ? format(new Date(scoreData.lastReview), "dd MMM yyyy", { locale: fr })
                  : "Jamais"}
              </span>
            </div>

            {/* Inquiries */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Demandes de credit</span>
              <span className="text-sm font-medium">{scoreData.inquiryCount || 0}</span>
            </div>

            <Separator />

            <RatingScale currentRating={scoreData.rating as keyof typeof CREDIT_RATINGS} />
          </CardContent>
        </Card>

        {/* Credit Limit */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Limite de Credit</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground mb-2">Limite recommandee</p>
              <p className="text-3xl font-bold" style={{ color: ratingInfo?.color }}>
                {scoreData.creditLimit 
                  ? new Intl.NumberFormat("fr-GN", {
                      style: "currency",
                      currency: "GNF",
                      maximumFractionDigits: 0,
                    }).format(scoreData.creditLimit)
                  : "---"}
              </p>
            </div>

            <Separator />

            {/* Factors Summary */}
            {scoreData.factors && (
              <>
                <p className="text-sm font-medium">Facteurs</p>
                <FactorsSummary factors={scoreData.factors} />
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="factors" className="space-y-4">
        <TabsList>
          <TabsTrigger value="factors">Facteurs</TabsTrigger>
          <TabsTrigger value="history">Historique</TabsTrigger>
          <TabsTrigger value="recommendations">Recommandations</TabsTrigger>
          <TabsTrigger value="calculator">Calculateur</TabsTrigger>
        </TabsList>

        {/* Factors Tab */}
        <TabsContent value="factors">
          <Card>
            <CardHeader>
              <CardTitle>Analyse des Facteurs</CardTitle>
              <CardDescription>
                Decomposition detaillee des facteurs influencant le score
              </CardDescription>
            </CardHeader>
            <CardContent>
              {scoreData.factors ? (
                <FactorsBreakdown factors={scoreData.factors} language="fr" />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Aucun facteur disponible. Recalculez le score pour voir les details.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Payment History Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Historique des Paiements</CardTitle>
                <CardDescription>
                  12 derniers mois
                </CardDescription>
              </CardHeader>
              <CardContent>
                {scoreData.paymentHistory && scoreData.paymentHistory.length > 0 ? (
                  <>
                    <PaymentCalendar
                      payments={scoreData.paymentHistory.map(p => ({
                        dueDate: new Date(p.dueDate),
                        paidDate: p.paidDate ? new Date(p.paidDate) : null,
                        status: p.status as "on_time" | "late" | "very_late" | "default",
                        amount: p.amount,
                      }))}
                      months={12}
                      language="fr"
                    />
                    
                    {paymentStats && (
                      <div className="mt-6">
                        <PaymentHistoryStats
                          totalPayments={paymentStats.total}
                          onTimePayments={paymentStats.onTime}
                          latePayments={paymentStats.late}
                          veryLatePayments={paymentStats.veryLate}
                          defaultedPayments={paymentStats.defaulted}
                          language="fr"
                        />
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Aucun historique de paiement disponible
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Payments */}
            <Card>
              <CardHeader>
                <CardTitle>Paiements Recents</CardTitle>
                <CardDescription>
                  Derniers paiements enregistres
                </CardDescription>
              </CardHeader>
              <CardContent>
                {scoreData.paymentHistory && scoreData.paymentHistory.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Montant</TableHead>
                        <TableHead>Echeance</TableHead>
                        <TableHead>Jours retard</TableHead>
                        <TableHead>Statut</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {scoreData.paymentHistory.slice(0, 10).map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell className="font-medium">
                            {new Intl.NumberFormat("fr-GN", {
                              style: "currency",
                              currency: "GNF",
                              maximumFractionDigits: 0,
                            }).format(payment.amount)}
                          </TableCell>
                          <TableCell>
                            {format(new Date(payment.dueDate), "dd MMM yyyy", { locale: fr })}
                          </TableCell>
                          <TableCell>
                            {payment.daysLate > 0 ? (
                              <span className="text-red-500">{payment.daysLate} jours</span>
                            ) : (
                              <span className="text-emerald-500">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              style={{
                                borderColor: payment.status === "on_time" ? "#10B981" :
                                            payment.status === "late" ? "#F59E0B" :
                                            payment.status === "very_late" ? "#EF4444" : "#7F1D1D",
                                color: payment.status === "on_time" ? "#10B981" :
                                       payment.status === "late" ? "#F59E0B" :
                                       payment.status === "very_late" ? "#EF4444" : "#7F1D1D",
                              }}
                            >
                              {payment.status === "on_time" ? "A temps" :
                               payment.status === "late" ? "Retard" :
                               payment.status === "very_late" ? "Tres retard" : "Defaut"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Aucun paiement enregistre
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Recommendations Tab */}
        <TabsContent value="recommendations">
          <Card>
            <CardHeader>
              <CardTitle>Recommandations</CardTitle>
              <CardDescription>
                Suggestions pour ameliorer le score de credit
              </CardDescription>
            </CardHeader>
            <CardContent>
              {reportData?.recommendations && reportData.recommendations.length > 0 ? (
                <div className="space-y-4">
                  {reportData.recommendations.map((rec, index) => (
                    <div
                      key={index}
                      className="p-4 rounded-lg border"
                      style={{
                        borderColor: rec.priority === "high" ? "#EF4444" :
                                    rec.priority === "medium" ? "#F59E0B" : "#6B7280",
                      }}
                    >
                      <div className="flex items-start gap-3">
                        {rec.priority === "high" ? (
                          <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                        ) : rec.priority === "medium" ? (
                          <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
                        ) : (
                          <CheckCircle2 className="h-5 w-5 text-gray-400 mt-0.5" />
                        )}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium">{rec.title}</h4>
                            <Badge variant="outline" className="text-xs">
                              {rec.category}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {rec.description}
                          </p>
                          <p className="text-sm font-medium text-primary">
                            {rec.action}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Impact potentiel: {rec.potentialImpact}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Aucune recommandation disponible. Generez un rapport pour voir les recommandations.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Calculator Tab */}
        <TabsContent value="calculator">
          <CreditLimitCalculator
            currentScore={scoreData.score}
            language="fr"
            onCalculate={(result) => {
              console.log("Credit limit calculated:", result)
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
