"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import {
  SCORE_ZONES,
  CREDIT_RATINGS,
  type CreditRating,
  getScoreZone,
  getRatingFromScore,
} from "@/lib/credit/factors"

interface ScoreGaugeProps {
  score: number | null | undefined
  rating?: CreditRating | null
  size?: "sm" | "md" | "lg"
  showLabel?: boolean
  showRating?: boolean
  animated?: boolean
  className?: string
}

export function ScoreGauge({
  score,
  rating,
  size = "md",
  showLabel = true,
  showRating = true,
  animated = true,
  className,
}: ScoreGaugeProps) {
  const [animatedScore, setAnimatedScore] = React.useState(0)
  const actualScore = score ?? 0
  const actualRating = rating ?? getRatingFromScore(actualScore)
  const zone = getScoreZone(actualScore)
  const ratingInfo = CREDIT_RATINGS[actualRating]

  // Animation effect
  React.useEffect(() => {
    if (!animated) {
      setAnimatedScore(actualScore)
      return
    }

    const duration = 1000
    const steps = 60
    const stepValue = actualScore / steps
    let currentStep = 0

    const interval = setInterval(() => {
      currentStep++
      setAnimatedScore(Math.min(Math.round(stepValue * currentStep), actualScore))
      
      if (currentStep >= steps) {
        clearInterval(interval)
      }
    }, duration / steps)

    return () => clearInterval(interval)
  }, [actualScore, animated])

  // Size configurations
  const sizes = {
    sm: {
      container: "w-32 h-32",
      text: "text-lg",
      subtext: "text-xs",
      strokeWidth: 8,
      radius: 45,
    },
    md: {
      container: "w-48 h-48",
      text: "text-3xl",
      subtext: "text-sm",
      strokeWidth: 12,
      radius: 70,
    },
    lg: {
      container: "w-64 h-64",
      text: "text-5xl",
      subtext: "text-base",
      strokeWidth: 16,
      radius: 100,
    },
  }

  const config = sizes[size]
  const radius = config.radius
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (animatedScore / 1000) * circumference

  // Generate arc path for the gauge background
  const generateArcPath = () => {
    const startAngle = -135
    const endAngle = 135
    const x1 = 50 + 40 * Math.cos((startAngle * Math.PI) / 180)
    const y1 = 50 + 40 * Math.sin((startAngle * Math.PI) / 180)
    const x2 = 50 + 40 * Math.cos((endAngle * Math.PI) / 180)
    const y2 = 50 + 40 * Math.sin((endAngle * Math.PI) / 180)
    
    return `M ${x1} ${y1} A 40 40 0 1 1 ${x2} ${y2}`
  }

  return (
    <div className={cn("relative flex flex-col items-center", className)}>
      <div className={cn("relative", config.container)}>
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full transform -rotate-90"
        >
          {/* Background track */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={config.strokeWidth}
            className="text-muted/20"
          />
          
          {/* Colored progress arc */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke={zone.color}
            strokeWidth={config.strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-1000 ease-out"
            style={{
              filter: `drop-shadow(0 0 6px ${zone.color}40)`,
            }}
          />
          
          {/* Score markers */}
          {size !== "sm" && (
            <>
              {[0, 250, 500, 750, 1000].map((marker) => {
                const angle = -135 + (marker / 1000) * 270
                const rad = (angle * Math.PI) / 180
                const x = 50 + (radius + 8) * Math.cos(rad)
                const y = 50 + (radius + 8) * Math.sin(rad)
                return (
                  <text
                    key={marker}
                    x={x}
                    y={y}
                    fill="currentColor"
                    fontSize="4"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="text-muted-foreground"
                  >
                    {marker}
                  </text>
                )
              })}
            </>
          )}
        </svg>
        
        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className={cn(
              "font-bold tabular-nums",
              config.text,
              animatedScore === 0 && "text-muted-foreground"
            )}
            style={{ color: zone.color }}
          >
            {animatedScore.toString().padStart(3, "0")}
          </span>
          
          {showRating && (
            <span
              className={cn("font-semibold", config.subtext)}
              style={{ color: ratingInfo.color }}
            >
              {actualRating}
            </span>
          )}
        </div>
      </div>
      
      {showLabel && (
        <div className="mt-2 text-center">
          <p className="font-medium" style={{ color: zone.color }}>
            {zone.label}
          </p>
          <p className="text-sm text-muted-foreground">
            {ratingInfo.description}
          </p>
        </div>
      )}
    </div>
  )
}

// Compact inline version
interface ScoreBadgeProps {
  score: number | null | undefined
  rating?: CreditRating | null
  className?: string
}

export function ScoreBadge({ score, rating, className }: ScoreBadgeProps) {
  const actualScore = score ?? 0
  const actualRating = rating ?? getRatingFromScore(actualScore)
  const zone = getScoreZone(actualScore)
  const ratingInfo = CREDIT_RATINGS[actualRating]

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 px-3 py-1.5 rounded-full",
        "bg-muted/50 border",
        className
      )}
      style={{ borderColor: zone.color }}
    >
      <span
        className="font-bold tabular-nums"
        style={{ color: zone.color }}
      >
        {actualScore.toString().padStart(3, "0")}
      </span>
      <span
        className="text-sm font-semibold px-1.5 py-0.5 rounded"
        style={{
          backgroundColor: ratingInfo.color,
          color: "white",
        }}
      >
        {actualRating}
      </span>
    </div>
  )
}

// Mini gauge for lists/tables
interface MiniGaugeProps {
  score: number | null | undefined
  className?: string
}

export function MiniGauge({ score, className }: MiniGaugeProps) {
  const actualScore = score ?? 0
  const zone = getScoreZone(actualScore)
  const percentage = (actualScore / 1000) * 100

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${percentage}%`,
            backgroundColor: zone.color,
          }}
        />
      </div>
      <span
        className="text-sm font-medium tabular-nums w-8"
        style={{ color: zone.color }}
      >
        {actualScore.toString().padStart(3, "0")}
      </span>
    </div>
  )
}

export default ScoreGauge
