"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from "recharts"
import { type ScoringFactor, FACTOR_WEIGHTS, getImpactColor } from "@/lib/credit/factors"
import {
  TrendingUp,
  TrendingDown,
  Minus,
  HelpCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
} from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface FactorsBreakdownProps {
  factors: ScoringFactor[]
  language?: "fr" | "en"
  className?: string
}

// Color palette for factors
const FACTOR_COLORS: Record<string, string> = {
  "Payment History": "#3B82F6",      // Blue
  "Outstanding Debt": "#EF4444",     // Red
  "Credit Age": "#10B981",           // Green
  "New Inquiries": "#F59E0B",        // Amber
  "Credit Mix": "#8B5CF6",           // Purple
  "Historique de paiements": "#3B82F6",
  "Dette en cours": "#EF4444",
  "Anciennete credit": "#10B981",
  "Nouvelles demandes": "#F59E0B",
  "Diversite credit": "#8B5CF6",
}

export function FactorsBreakdown({
  factors,
  language = "fr",
  className,
}: FactorsBreakdownProps) {
  // Prepare data for pie chart
  const chartData = factors.map((factor) => ({
    name: factor.name,
    value: factor.weight,
    score: factor.score,
    impact: factor.impact,
    fill: FACTOR_COLORS[factor.name] || "#6B7280",
  }))

  const chartConfig: ChartConfig = {
    paymentHistory: {
      label: language === "fr" ? "Historique" : "History",
    },
    outstandingDebt: {
      label: language === "fr" ? "Dette" : "Debt",
    },
    creditAge: {
      label: language === "fr" ? "Anciennete" : "Age",
    },
    newInquiries: {
      label: language === "fr" ? "Demandes" : "Inquiries",
    },
    creditMix: {
      label: language === "fr" ? "Diversite" : "Mix",
    },
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Pie Chart */}
      <div className="flex justify-center">
        <ChartContainer config={chartConfig} className="h-[200px] w-[200px]">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={2}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.fill}
                  stroke="hsl(var(--background))"
                  strokeWidth={2}
                />
              ))}
            </Pie>
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value, name, item) => (
                    <div className="flex flex-col gap-1">
                      <span className="font-medium">{name}</span>
                      <span className="text-muted-foreground">
                        Weight: {value}%
                      </span>
                      <span className="text-muted-foreground">
                        Score: {item.payload.score}/100
                      </span>
                    </div>
                  )}
                />
              }
            />
          </PieChart>
        </ChartContainer>
      </div>

      {/* Factors List */}
      <div className="space-y-3">
        {factors.map((factor, index) => (
          <FactorCard key={index} factor={factor} language={language} />
        ))}
      </div>
    </div>
  )
}

// Individual factor card
interface FactorCardProps {
  factor: ScoringFactor
  language: "fr" | "en"
}

function FactorCard({ factor, language }: FactorCardProps) {
  const impactColor = getImpactColor(factor.impact)
  const factorColor = FACTOR_COLORS[factor.name] || "#6B7280"
  
  const ImpactIcon = {
    positive: TrendingUp,
    negative: TrendingDown,
    neutral: Minus,
  }[factor.impact]

  const categoryLabels: Record<string, { fr: string; en: string }> = {
    "Payment History": { fr: "Historique de paiements", en: "Payment History" },
    "Outstanding Debt": { fr: "Dette en cours", en: "Outstanding Debt" },
    "Credit Age": { fr: "Anciennete credit", en: "Credit Age" },
    "New Inquiries": { fr: "Nouvelles demandes", en: "New Inquiries" },
    "Credit Mix": { fr: "Diversite credit", en: "Credit Mix" },
  }

  const label = categoryLabels[factor.name]?.[language] || factor.name

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: factorColor }}
          />
          <div>
            <div className="font-medium">{label}</div>
            <div className="text-sm text-muted-foreground">
              {factor.weight}% {language === "fr" ? "du score" : "of score"}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <span
            className="text-lg font-bold tabular-nums"
            style={{ color: impactColor }}
          >
            {Math.round(factor.score)}
          </span>
          <ImpactIcon
            className="h-4 w-4"
            style={{ color: impactColor }}
          />
        </div>
      </div>

      {/* Progress bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">
            {language === "fr" ? "Score du facteur" : "Factor score"}
          </span>
          <span>{Math.round(factor.score)}/100</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${factor.score}%`,
              backgroundColor: factorColor,
            }}
          />
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-muted-foreground">{factor.description}</p>

      {/* Suggestion */}
      {factor.suggestion && (
        <div
          className="flex items-start gap-2 text-sm p-2 rounded"
          style={{ backgroundColor: `${impactColor}10` }}
        >
          {factor.impact === "negative" ? (
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" style={{ color: impactColor }} />
          ) : factor.impact === "positive" ? (
            <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" style={{ color: impactColor }} />
          ) : (
            <Info className="h-4 w-4 mt-0.5 shrink-0" style={{ color: impactColor }} />
          )}
          <span style={{ color: impactColor }}>{factor.suggestion}</span>
        </div>
      )}
    </div>
  )
}

// Compact factors summary for cards/tables
interface FactorsSummaryProps {
  factors: ScoringFactor[]
  className?: string
}

export function FactorsSummary({ factors, className }: FactorsSummaryProps) {
  const positiveCount = factors.filter((f) => f.impact === "positive").length
  const negativeCount = factors.filter((f) => f.impact === "negative").length
  const neutralCount = factors.filter((f) => f.impact === "neutral").length

  return (
    <div className={cn("flex items-center gap-4", className)}>
      <div className="flex items-center gap-1">
        <TrendingUp className="h-4 w-4 text-emerald-500" />
        <span className="text-sm font-medium text-emerald-600">{positiveCount}</span>
      </div>
      <div className="flex items-center gap-1">
        <Minus className="h-4 w-4 text-gray-400" />
        <span className="text-sm font-medium text-gray-500">{neutralCount}</span>
      </div>
      <div className="flex items-center gap-1">
        <TrendingDown className="h-4 w-4 text-red-500" />
        <span className="text-sm font-medium text-red-600">{negativeCount}</span>
      </div>
    </div>
  )
}

// Factor tooltip helper
interface FactorTooltipProps {
  factor: ScoringFactor
  children: React.ReactNode
}

export function FactorTooltip({ factor, children }: FactorTooltipProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="space-y-2">
            <p className="font-medium">{factor.name}</p>
            <p className="text-sm text-muted-foreground">{factor.description}</p>
            <div className="flex items-center gap-2">
              <span className="text-sm">Score: {Math.round(factor.score)}/100</span>
              <span className="text-sm text-muted-foreground">
                (Weight: {factor.weight}%)
              </span>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export default FactorsBreakdown
