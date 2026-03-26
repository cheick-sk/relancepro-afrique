"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { CREDIT_RATINGS, type CreditRating } from "@/lib/credit/factors"

interface RatingBadgeProps {
  rating: CreditRating | string
  size?: "sm" | "md" | "lg"
  showLabel?: boolean
  className?: string
}

export function RatingBadge({
  rating,
  size = "md",
  showLabel = false,
  className,
}: RatingBadgeProps) {
  const ratingInfo = CREDIT_RATINGS[rating as CreditRating]

  if (!ratingInfo) {
    return (
      <span className={cn("px-2 py-1 rounded text-muted-foreground", className)}>
        ---
      </span>
    )
  }

  const sizes = {
    sm: "text-xs px-1.5 py-0.5",
    md: "text-sm px-2 py-1",
    lg: "text-base px-3 py-1.5",
  }

  return (
    <div className={cn("inline-flex items-center gap-1.5", className)}>
      <span
        className={cn(
          "font-bold rounded",
          sizes[size]
        )}
        style={{
          backgroundColor: ratingInfo.color,
          color: "white",
          textShadow: "0 1px 1px rgba(0,0,0,0.2)",
        }}
      >
        {rating}
      </span>
      {showLabel && (
        <span className="text-muted-foreground">{ratingInfo.label}</span>
      )}
    </div>
  )
}

// Rating badge with detailed info
interface RatingBadgeDetailedProps {
  rating: CreditRating | string
  score?: number | null
  className?: string
}

export function RatingBadgeDetailed({
  rating,
  score,
  className,
}: RatingBadgeDetailedProps) {
  const ratingInfo = CREDIT_RATINGS[rating as CreditRating]

  if (!ratingInfo) {
    return (
      <div className={cn("text-muted-foreground", className)}>
        No rating available
      </div>
    )
  }

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div
        className="w-12 h-12 rounded-lg flex items-center justify-center"
        style={{ backgroundColor: ratingInfo.color }}
      >
        <span className="text-xl font-bold text-white">{rating}</span>
      </div>
      <div className="flex flex-col">
        <span className="font-semibold" style={{ color: ratingInfo.color }}>
          {ratingInfo.label}
        </span>
        <span className="text-sm text-muted-foreground">
          {ratingInfo.description}
        </span>
        {score !== undefined && score !== null && (
          <span className="text-xs text-muted-foreground mt-0.5">
            Score: {score.toString().padStart(3, "0")} ({ratingInfo.min}-{ratingInfo.max})
          </span>
        )}
      </div>
    </div>
  )
}

// Rating scale visualization
interface RatingScaleProps {
  currentRating?: CreditRating | string | null
  className?: string
}

export function RatingScale({ currentRating, className }: RatingScaleProps) {
  const ratings = Object.entries(CREDIT_RATINGS).reverse() as [CreditRating, typeof CREDIT_RATINGS[CreditRating]][]

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      {ratings.map(([key, info]) => {
        const isActive = currentRating === key
        
        return (
          <div
            key={key}
            className={cn(
              "flex items-center gap-2 px-2 py-1 rounded transition-all",
              isActive ? "bg-muted scale-105" : "opacity-50 hover:opacity-75"
            )}
          >
            <div
              className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold text-white"
              style={{ backgroundColor: info.color }}
            >
              {key}
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium">{info.label}</div>
              <div className="text-xs text-muted-foreground">
                {info.min} - {info.max}
              </div>
            </div>
            {isActive && (
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: info.color }}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

// Compact rating indicator for tables
interface RatingIndicatorProps {
  rating: CreditRating | string | null | undefined
  className?: string
}

export function RatingIndicator({ rating, className }: RatingIndicatorProps) {
  if (!rating || !CREDIT_RATINGS[rating as CreditRating]) {
    return (
      <span className={cn("text-muted-foreground", className)}>--</span>
    )
  }

  const ratingInfo = CREDIT_RATINGS[rating as CreditRating]

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <div
        className="w-3 h-3 rounded-sm"
        style={{ backgroundColor: ratingInfo.color }}
      />
      <span
        className="font-medium"
        style={{ color: ratingInfo.color }}
      >
        {rating}
      </span>
    </div>
  )
}

export default RatingBadge
