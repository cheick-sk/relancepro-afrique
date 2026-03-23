"use client"

import * as React from "react"
import type { CreditRating } from "@/lib/credit/factors"
import type { ScoringFactor } from "@/lib/credit/factors"

// Types
interface CreditScoreData {
  clientId: string
  clientName: string
  score: number
  rating: CreditRating | string
  riskLevel: "low" | "medium" | "high"
  factors?: ScoringFactor[]
  recommendation?: string
  lastReview?: Date | null
  inquiryCount?: number
  creditLimit?: number | null
  paymentHistory?: Array<{
    id: string
    amount: number
    dueDate: Date
    paidDate: Date | null
    daysLate: number
    status: string
  }>
}

interface UseCreditScoreOptions {
  clientId: string | null
  autoRefresh?: boolean
  refreshInterval?: number // in milliseconds
  onSuccess?: (data: CreditScoreData) => void
  onError?: (error: Error) => void
}

interface UseCreditScoreReturn {
  data: CreditScoreData | null
  isLoading: boolean
  error: Error | null
  refetch: () => Promise<void>
  recalculate: () => Promise<void>
  lastUpdated: Date | null
}

/**
 * Hook for fetching and managing credit scores
 */
export function useCreditScore({
  clientId,
  autoRefresh = false,
  refreshInterval = 60000, // 1 minute default
  onSuccess,
  onError,
}: UseCreditScoreOptions): UseCreditScoreReturn {
  const [data, setData] = React.useState<CreditScoreData | null>(null)
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<Error | null>(null)
  const [lastUpdated, setLastUpdated] = React.useState<Date | null>(null)

  // Cache key for this client
  const cacheKey = React.useMemo(() => {
    if (!clientId) return null
    return `credit-score-${clientId}`
  }, [clientId])

  // Fetch credit score
  const fetchData = React.useCallback(async () => {
    if (!clientId) {
      setData(null)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/credit/score/${clientId}`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to fetch credit score")
      }

      // Parse dates in payment history
      if (result.data.paymentHistory) {
        result.data.paymentHistory = result.data.paymentHistory.map((p: { dueDate: string; paidDate: string | null }) => ({
          ...p,
          dueDate: new Date(p.dueDate),
          paidDate: p.paidDate ? new Date(p.paidDate) : null,
        }))
      }

      setData(result.data)
      setLastUpdated(new Date())
      
      // Cache in localStorage
      if (cacheKey) {
        try {
          localStorage.setItem(cacheKey, JSON.stringify({
            data: result.data,
            timestamp: Date.now(),
          }))
        } catch {
          // Ignore localStorage errors
        }
      }

      onSuccess?.(result.data)
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Unknown error")
      setError(error)
      onError?.(error)
    } finally {
      setIsLoading(false)
    }
  }, [clientId, cacheKey, onSuccess, onError])

  // Recalculate credit score
  const recalculate = React.useCallback(async () => {
    if (!clientId) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/credit/score/${clientId}`, {
        method: "POST",
      })
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to recalculate credit score")
      }

      setData(result.data)
      setLastUpdated(new Date())
      
      onSuccess?.(result.data)
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Unknown error")
      setError(error)
      onError?.(error)
    } finally {
      setIsLoading(false)
    }
  }, [clientId, onSuccess, onError])

  // Load cached data on mount
  React.useEffect(() => {
    if (!cacheKey) return

    try {
      const cached = localStorage.getItem(cacheKey)
      if (cached) {
        const { data: cachedData, timestamp } = JSON.parse(cached)
        // Use cached data if less than 5 minutes old
        if (Date.now() - timestamp < 300000) {
          setData(cachedData)
          setLastUpdated(new Date(timestamp))
        }
      }
    } catch {
      // Ignore localStorage errors
    }
  }, [cacheKey])

  // Initial fetch
  React.useEffect(() => {
    fetchData()
  }, [fetchData])

  // Auto refresh
  React.useEffect(() => {
    if (!autoRefresh || !clientId) return

    const interval = setInterval(fetchData, refreshInterval)
    return () => clearInterval(interval)
  }, [autoRefresh, clientId, refreshInterval, fetchData])

  return {
    data,
    isLoading,
    error,
    refetch: fetchData,
    recalculate,
    lastUpdated,
  }
}

// Hook for credit summary across all clients
interface CreditSummaryData {
  totalClients: number
  clientsWithScore: number
  averageScore: number
  ratingDistribution: Record<CreditRating, number>
  highRiskCount: number
  recentInquiries: number
}

interface UseCreditSummaryOptions {
  autoRefresh?: boolean
  refreshInterval?: number
}

interface UseCreditSummaryReturn {
  data: CreditSummaryData | null
  isLoading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

export function useCreditSummary({
  autoRefresh = false,
  refreshInterval = 60000,
}: UseCreditSummaryOptions = {}): UseCreditSummaryReturn {
  const [data, setData] = React.useState<CreditSummaryData | null>(null)
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<Error | null>(null)

  const fetchData = React.useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/credit/report/summary?summary=true")
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to fetch credit summary")
      }

      setData(result.data)
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Unknown error")
      setError(error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchData()
  }, [fetchData])

  React.useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(fetchData, refreshInterval)
    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, fetchData])

  return {
    data,
    isLoading,
    error,
    refetch: fetchData,
  }
}

// Hook for credit reports
interface CreditReportData {
  id: string
  clientId: string
  clientName: string
  score: number
  rating: CreditRating
  ratingLabel: string
  riskLevel: {
    level: string
    color: string
    description: string
  }
  factors: ScoringFactor[]
  recommendations: Array<{
    priority: string
    category: string
    title: string
    description: string
    action: string
    potentialImpact: string
  }>
  paymentHistory: Array<{
    id: string
    amount: number
    dueDate: Date
    paidDate: Date | null
    daysLate: number
    status: string
  }>
  outstandingDebts: Array<{
    id: string
    reference: string | null
    description: string | null
    amount: number
    paidAmount: number
    remainingAmount: number
    dueDate: Date
    daysOverdue: number
    status: string
  }>
  creditLimit: number
  validUntil: Date
  generatedAt: Date
}

interface UseCreditReportOptions {
  clientId: string | null
  forceNew?: boolean
}

interface UseCreditReportReturn {
  data: CreditReportData | null
  isLoading: boolean
  error: Error | null
  generate: () => Promise<void>
}

export function useCreditReport({
  clientId,
  forceNew = false,
}: UseCreditReportOptions): UseCreditReportReturn {
  const [data, setData] = React.useState<CreditReportData | null>(null)
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<Error | null>(null)

  const fetchData = React.useCallback(async () => {
    if (!clientId) {
      setData(null)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/credit/report/${clientId}`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to fetch credit report")
      }

      setData(result.data)
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Unknown error")
      setError(error)
    } finally {
      setIsLoading(false)
    }
  }, [clientId])

  const generate = React.useCallback(async () => {
    if (!clientId) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/credit/report/${clientId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ forceNew: true }),
      })
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to generate credit report")
      }

      setData(result.data)
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Unknown error")
      setError(error)
    } finally {
      setIsLoading(false)
    }
  }, [clientId])

  React.useEffect(() => {
    if (!forceNew) {
      fetchData()
    }
  }, [fetchData, forceNew])

  return {
    data,
    isLoading,
    error,
    generate,
  }
}

export default useCreditScore
