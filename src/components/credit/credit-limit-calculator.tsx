"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Calculator,
  TrendingUp,
  AlertTriangle,
  Shield,
  Info,
  RefreshCw,
} from "lucide-react"
import {
  CREDIT_RATINGS,
  type CreditRating,
  getRatingFromScore,
  calculateCreditLimit,
  CREDIT_LIMIT_MULTIPLIERS,
} from "@/lib/credit/factors"
import { ScoreGauge } from "./score-gauge"
import { RatingBadge } from "./rating-badge"

interface CreditLimitCalculatorProps {
  currentScore?: number
  currentDebt?: number
  monthlyIncome?: number
  onCalculate?: (result: CreditLimitResult) => void
  language?: "fr" | "en"
  className?: string
}

interface CreditLimitResult {
  score: number
  rating: CreditRating
  creditLimit: number
  riskLevel: "low" | "medium" | "high"
  recommendations: string[]
  factors: {
    incomeMultiplier: number
    currentDebtImpact: number
    scoreAdjustment: number
  }
}

export function CreditLimitCalculator({
  currentScore = 500,
  currentDebt = 0,
  monthlyIncome,
  onCalculate,
  language = "fr",
  className,
}: CreditLimitCalculatorProps) {
  const [score, setScore] = React.useState(currentScore)
  const [debt, setDebt] = React.useState(currentDebt)
  const [income, setIncome] = React.useState(monthlyIncome || 0)
  const [useIncome, setUseIncome] = React.useState(!!monthlyIncome)
  const [currency, setCurrency] = React.useState("GNF")
  const [result, setResult] = React.useState<CreditLimitResult | null>(null)

  // Labels based on language
  const labels = {
    title: language === "fr" ? "Calculateur de Limite de Credit" : "Credit Limit Calculator",
    description: language === "fr"
      ? "Estimez la limite de credit recommandee en fonction du score et des revenus"
      : "Estimate recommended credit limit based on score and income",
    creditScore: language === "fr" ? "Score de credit" : "Credit Score",
    currentDebt: language === "fr" ? "Dette actuelle" : "Current Debt",
    monthlyIncome: language === "fr" ? "Revenu mensuel" : "Monthly Income",
    useIncome: language === "fr" ? "Utiliser le revenu" : "Use Income",
    calculate: language === "fr" ? "Calculer" : "Calculate",
    recommendedLimit: language === "fr" ? "Limite recommandee" : "Recommended Limit",
    riskLevel: language === "fr" ? "Niveau de risque" : "Risk Level",
    low: language === "fr" ? "Faible" : "Low",
    medium: language === "fr" ? "Moyen" : "Medium",
    high: language === "fr" ? "Eleve" : "High",
    recommendations: language === "fr" ? "Recommandations" : "Recommendations",
  }

  const handleCalculate = React.useCallback(() => {
    const rating = getRatingFromScore(score)
    const multiplier = CREDIT_LIMIT_MULTIPLIERS[rating]
    
    let creditLimit: number
    let incomeMultiplier = multiplier
    let currentDebtImpact = debt
    let scoreAdjustment = 0

    if (useIncome && income > 0) {
      // Income-based calculation
      creditLimit = Math.max(0, (income * multiplier) - debt)
      scoreAdjustment = creditLimit > 0 ? Math.round((creditLimit / income) * 100) : 0
    } else {
      // Score-based calculation (no income provided)
      creditLimit = Math.max(0, (score / 10) * 1000 - debt)
      scoreAdjustment = Math.round(score / 10)
    }

    // Determine risk level
    let riskLevel: "low" | "medium" | "high"
    if (["AAA", "AA", "A", "BBB"].includes(rating)) {
      riskLevel = "low"
    } else if (["BB", "B"].includes(rating)) {
      riskLevel = "medium"
    } else {
      riskLevel = "high"
    }

    // Generate recommendations
    const recommendations: string[] = []
    
    if (rating === "D" || rating === "C" || rating === "CC") {
      recommendations.push(
        language === "fr"
          ? "Score critique - pas de credit supplementaire recommande"
          : "Critical score - no additional credit recommended"
      )
    } else if (debt > 0 && creditLimit > 0) {
      const debtRatio = (debt / (debt + creditLimit)) * 100
      if (debtRatio > 50) {
        recommendations.push(
          language === "fr"
            ? "Dette elevee - envisagez de reduire la dette existante"
            : "High debt - consider reducing existing debt"
        )
      }
    }

    if (useIncome && multiplier > 1.5) {
      recommendations.push(
        language === "fr"
          ? `Multiplicateur favorable (${multiplier}x) - bonne capacite de credit`
          : `Favorable multiplier (${multiplier}x) - good credit capacity`
      )
    }

    if (score < 600) {
      recommendations.push(
        language === "fr"
          ? "Ameliorez votre score pour augmenter votre limite de credit"
          : "Improve your score to increase your credit limit"
      )
    }

    const newResult: CreditLimitResult = {
      score,
      rating,
      creditLimit,
      riskLevel,
      recommendations,
      factors: {
        incomeMultiplier: multiplier,
        currentDebtImpact: debt,
        scoreAdjustment,
      },
    }

    setResult(newResult)
    onCalculate?.(newResult)
  }, [score, debt, income, useIncome, language, onCalculate])

  // Auto-calculate on initial load
  React.useEffect(() => {
    handleCalculate()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const riskColors = {
    low: { bg: "bg-emerald-100", text: "text-emerald-700", icon: Shield },
    medium: { bg: "bg-amber-100", text: "text-amber-700", icon: TrendingUp },
    high: { bg: "bg-red-100", text: "text-red-700", icon: AlertTriangle },
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          {labels.title}
        </CardTitle>
        <CardDescription>{labels.description}</CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Score Input */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>{labels.creditScore}</Label>
            <span className="text-2xl font-bold tabular-nums">{score}</span>
          </div>
          <Slider
            value={[score]}
            onValueChange={([value]) => setScore(value)}
            min={0}
            max={1000}
            step={10}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0</span>
            <span>500</span>
            <span>1000</span>
          </div>
        </div>

        {/* Current Debt Input */}
        <div className="space-y-2">
          <Label>{labels.currentDebt} ({currency})</Label>
          <Input
            type="number"
            value={debt}
            onChange={(e) => setDebt(Number(e.target.value))}
            min={0}
          />
        </div>

        {/* Use Income Toggle */}
        <div className="flex items-center justify-between">
          <Label>{labels.useIncome}</Label>
          <Switch checked={useIncome} onCheckedChange={setUseIncome} />
        </div>

        {/* Monthly Income Input */}
        {useIncome && (
          <div className="space-y-2">
            <Label>{labels.monthlyIncome} ({currency})</Label>
            <Input
              type="number"
              value={income}
              onChange={(e) => setIncome(Number(e.target.value))}
              min={0}
            />
          </div>
        )}

        {/* Currency Selector */}
        <div className="space-y-2">
          <Label>Currency</Label>
          <Select value={currency} onValueChange={setCurrency}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="GNF">GNF - Franc Guineen</SelectItem>
              <SelectItem value="XOF">XOF - Franc CFA</SelectItem>
              <SelectItem value="EUR">EUR - Euro</SelectItem>
              <SelectItem value="USD">USD - Dollar US</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Calculate Button */}
        <Button onClick={handleCalculate} className="w-full">
          <RefreshCw className="h-4 w-4 mr-2" />
          {labels.calculate}
        </Button>

        {/* Results */}
        {result && (
          <div className="space-y-4 pt-4 border-t">
            {/* Score Display */}
            <div className="flex justify-center">
              <ScoreGauge score={result.score} size="sm" showLabel={false} />
            </div>

            {/* Credit Limit Result */}
            <div className="text-center p-4 rounded-lg bg-muted">
              <p className="text-sm text-muted-foreground mb-1">{labels.recommendedLimit}</p>
              <p className="text-3xl font-bold">
                {new Intl.NumberFormat(language === "fr" ? "fr-GN" : "en-US", {
                  style: "currency",
                  currency,
                  maximumFractionDigits: 0,
                }).format(result.creditLimit)}
              </p>
              <div className="mt-2">
                <RatingBadge rating={result.rating} />
              </div>
            </div>

            {/* Risk Level */}
            <div
              className={cn(
                "flex items-center gap-2 p-3 rounded-lg",
                riskColors[result.riskLevel].bg
              )}
            >
              {React.createElement(riskColors[result.riskLevel].icon, {
                className: cn("h-5 w-5", riskColors[result.riskLevel].text),
              })}
              <span className={riskColors[result.riskLevel].text}>
                {labels.riskLevel}: {labels[result.riskLevel]}
              </span>
            </div>

            {/* Factors */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 rounded bg-muted">
                <p className="text-xs text-muted-foreground">Multiplier</p>
                <p className="font-semibold">{result.factors.incomeMultiplier}x</p>
              </div>
              <div className="p-2 rounded bg-muted">
                <p className="text-xs text-muted-foreground">
                  {language === "fr" ? "Dette" : "Debt"}
                </p>
                <p className="font-semibold">
                  {new Intl.NumberFormat(language === "fr" ? "fr-GN" : "en-US", {
                    notation: "compact",
                  }).format(result.factors.currentDebtImpact)}
                </p>
              </div>
              <div className="p-2 rounded bg-muted">
                <p className="text-xs text-muted-foreground">
                  {language === "fr" ? "Ajustement" : "Adjustment"}
                </p>
                <p className="font-semibold">{result.factors.scoreAdjustment}%</p>
              </div>
            </div>

            {/* Recommendations */}
            {result.recommendations.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  {labels.recommendations}
                </h4>
                <ul className="space-y-1">
                  {result.recommendations.map((rec, index) => (
                    <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-primary">•</span>
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Compact version for inline use
interface CompactCreditLimitProps {
  score: number
  currentDebt?: number
  monthlyIncome?: number
  language?: "fr" | "en"
  className?: string
}

export function CompactCreditLimit({
  score,
  currentDebt = 0,
  monthlyIncome,
  language = "fr",
  className,
}: CompactCreditLimitProps) {
  const rating = getRatingFromScore(score)
  const creditLimit = calculateCreditLimit(score, monthlyIncome, currentDebt)
  const ratingInfo = CREDIT_RATINGS[rating]

  const label = language === "fr" ? "Limite suggeree" : "Suggested Limit"

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center"
        style={{ backgroundColor: ratingInfo.color }}
      >
        <span className="text-sm font-bold text-white">{rating}</span>
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-semibold">
          {new Intl.NumberFormat(language === "fr" ? "fr-GN" : "en-US", {
            style: "currency",
            currency: "GNF",
            maximumFractionDigits: 0,
          }).format(creditLimit)}
        </p>
      </div>
    </div>
  )
}

export default CreditLimitCalculator
