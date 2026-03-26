"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell } from "recharts"
import { type PaymentStatus, PAYMENT_STATUS_IMPACT } from "@/lib/credit/factors"
import { format } from "date-fns"
import { fr, enUS } from "date-fns/locale"

// Types
interface PaymentHistoryEntry {
  month: string
  year: number
  monthNum: number
  onTime: number
  late: number
  veryLate: number
  default: number
  total: number
  score: number
}

interface PaymentHistoryChartProps {
  data: PaymentHistoryEntry[]
  language?: "fr" | "en"
  className?: string
}

// Status colors
const STATUS_COLORS: Record<PaymentStatus, string> = {
  on_time: "#10B981",   // Green
  late: "#F59E0B",      // Amber
  very_late: "#EF4444", // Red
  default: "#7F1D1D",   // Dark red
}

const chartConfig: ChartConfig = {
  onTime: {
    label: "On Time",
    color: STATUS_COLORS.on_time,
  },
  late: {
    label: "Late",
    color: STATUS_COLORS.late,
  },
  veryLate: {
    label: "Very Late",
    color: STATUS_COLORS.very_late,
  },
  default: {
    label: "Default",
    color: STATUS_COLORS.default,
  },
}

export function PaymentHistoryChart({
  data,
  language = "fr",
  className,
}: PaymentHistoryChartProps) {
  const locale = language === "fr" ? fr : enUS

  // Format data for chart
  const chartData = data.map((entry) => ({
    month: entry.month,
    fullMonth: format(new Date(entry.year, entry.monthNum), "MMM yyyy", { locale }),
    onTime: entry.onTime,
    late: entry.late,
    veryLate: entry.veryLate,
    default: entry.default,
    total: entry.total,
    score: entry.score,
  }))

  return (
    <div className={cn("space-y-4", className)}>
      <ChartContainer config={chartConfig} className="h-[200px] w-full">
        <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="month"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11 }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11 }}
            tickFormatter={(value) => `${value}`}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(value, name, item) => (
                  <div className="flex items-center gap-2">
                    <span className="capitalize">{name}:</span>
                    <span className="font-medium">{value}</span>
                  </div>
                )}
              />
            }
          />
          <Bar
            dataKey="onTime"
            stackId="a"
            fill={STATUS_COLORS.on_time}
            radius={[0, 0, 0, 0]}
          />
          <Bar
            dataKey="late"
            stackId="a"
            fill={STATUS_COLORS.late}
            radius={[0, 0, 0, 0]}
          />
          <Bar
            dataKey="veryLate"
            stackId="a"
            fill={STATUS_COLORS.very_late}
            radius={[0, 0, 0, 0]}
          />
          <Bar
            dataKey="default"
            stackId="a"
            fill={STATUS_COLORS.default}
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ChartContainer>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 text-sm">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: STATUS_COLORS.on_time }} />
          <span>{language === "fr" ? "A temps" : "On Time"}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: STATUS_COLORS.late }} />
          <span>{language === "fr" ? "En retard" : "Late"}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: STATUS_COLORS.very_late }} />
          <span>{language === "fr" ? "Tres en retard" : "Very Late"}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: STATUS_COLORS.default }} />
          <span>{language === "fr" ? "Defaut" : "Default"}</span>
        </div>
      </div>
    </div>
  )
}

// Compact calendar-style payment history
interface PaymentCalendarProps {
  payments: Array<{
    dueDate: Date
    paidDate: Date | null
    status: PaymentStatus
    amount: number
  }>
  months?: number
  language?: "fr" | "en"
  className?: string
}

export function PaymentCalendar({
  payments,
  months = 12,
  language = "fr",
  className,
}: PaymentCalendarProps) {
  const locale = language === "fr" ? fr : enUS
  
  // Generate month labels for the last N months
  const monthLabels: Array<{ month: string; year: number; monthNum: number }> = []
  const now = new Date()
  
  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    monthLabels.push({
      month: format(date, "MMM", { locale }),
      year: date.getFullYear(),
      monthNum: date.getMonth(),
    })
  }

  // Group payments by month
  const paymentsByMonth = new Map<string, { onTime: number; late: number; veryLate: number; default: number }>()
  
  for (const payment of payments) {
    const date = new Date(payment.dueDate)
    const key = `${date.getFullYear()}-${date.getMonth()}`
    const existing = paymentsByMonth.get(key) || { onTime: 0, late: 0, veryLate: 0, default: 0 }
    
    if (payment.status === "on_time") existing.onTime++
    else if (payment.status === "late") existing.late++
    else if (payment.status === "very_late") existing.veryLate++
    else existing.default++
    
    paymentsByMonth.set(key, existing)
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-1">
        {monthLabels.map(({ month, year, monthNum }, index) => {
          const key = `${year}-${monthNum}`
          const monthData = paymentsByMonth.get(key)
          const total = monthData ? monthData.onTime + monthData.late + monthData.veryLate + monthData.default : 0
          
          let bgColor = "#F3F4F6" // Gray - no payments
          let status: "none" | "good" | "warning" | "bad" = "none"
          
          if (total > 0) {
            if (monthData!.default > 0 || monthData!.veryLate > 0) {
              bgColor = STATUS_COLORS.very_late
              status = "bad"
            } else if (monthData!.late > 0) {
              bgColor = STATUS_COLORS.late
              status = "warning"
            } else {
              bgColor = STATUS_COLORS.on_time
              status = "good"
            }
          }

          return (
            <div
              key={index}
              className="flex-1 flex flex-col items-center"
              title={`${month} ${year}: ${total} payment${total !== 1 ? "s" : ""}`}
            >
              <div
                className="w-full h-6 rounded-sm flex items-center justify-center text-xs font-medium"
                style={{
                  backgroundColor: bgColor,
                  color: status === "none" ? "#6B7280" : "white",
                }}
              >
                {total > 0 ? (
                  <span className="flex items-center justify-center w-full">
                    {total}
                  </span>
                ) : (
                  <span className="text-gray-400">-</span>
                )}
              </div>
              <span className="text-[10px] text-muted-foreground mt-1">{month}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Payment history summary stats
interface PaymentHistoryStatsProps {
  totalPayments: number
  onTimePayments: number
  latePayments: number
  veryLatePayments: number
  defaultedPayments: number
  language?: "fr" | "en"
  className?: string
}

export function PaymentHistoryStats({
  totalPayments,
  onTimePayments,
  latePayments,
  veryLatePayments,
  defaultedPayments,
  language = "fr",
  className,
}: PaymentHistoryStatsProps) {
  const onTimePercent = totalPayments > 0 ? Math.round((onTimePayments / totalPayments) * 100) : 0

  const labels = {
    total: language === "fr" ? "Total paiements" : "Total payments",
    onTime: language === "fr" ? "A temps" : "On time",
    late: language === "fr" ? "En retard" : "Late",
    veryLate: language === "fr" ? "Tres en retard" : "Very late",
    defaulted: language === "fr" ? "En defaut" : "Defaulted",
  }

  return (
    <div className={cn("grid grid-cols-5 gap-2", className)}>
      <div className="text-center p-2 rounded bg-muted">
        <div className="text-2xl font-bold">{totalPayments}</div>
        <div className="text-xs text-muted-foreground">{labels.total}</div>
      </div>
      <div className="text-center p-2 rounded" style={{ backgroundColor: `${STATUS_COLORS.on_time}20` }}>
        <div className="text-2xl font-bold" style={{ color: STATUS_COLORS.on_time }}>
          {onTimePayments}
        </div>
        <div className="text-xs text-muted-foreground">{labels.onTime}</div>
      </div>
      <div className="text-center p-2 rounded" style={{ backgroundColor: `${STATUS_COLORS.late}20` }}>
        <div className="text-2xl font-bold" style={{ color: STATUS_COLORS.late }}>
          {latePayments}
        </div>
        <div className="text-xs text-muted-foreground">{labels.late}</div>
      </div>
      <div className="text-center p-2 rounded" style={{ backgroundColor: `${STATUS_COLORS.very_late}20` }}>
        <div className="text-2xl font-bold" style={{ color: STATUS_COLORS.very_late }}>
          {veryLatePayments}
        </div>
        <div className="text-xs text-muted-foreground">{labels.veryLate}</div>
      </div>
      <div className="text-center p-2 rounded" style={{ backgroundColor: `${STATUS_COLORS.default}20` }}>
        <div className="text-2xl font-bold" style={{ color: STATUS_COLORS.default }}>
          {defaultedPayments}
        </div>
        <div className="text-xs text-muted-foreground">{labels.defaulted}</div>
      </div>
    </div>
  )
}

// Trend indicator
interface PaymentTrendProps {
  direction: "up" | "down" | "stable"
  change: number
  language?: "fr" | "en"
  className?: string
}

export function PaymentTrend({ direction, change, language = "fr", className }: PaymentTrendProps) {
  const trendColors = {
    up: { bg: "bg-emerald-100", text: "text-emerald-700", icon: "↑" },
    down: { bg: "bg-red-100", text: "text-red-700", icon: "↓" },
    stable: { bg: "bg-gray-100", text: "text-gray-700", icon: "→" },
  }

  const labels = {
    up: language === "fr" ? "Amelioration" : "Improving",
    down: language === "fr" ? "Declin" : "Declining",
    stable: language === "fr" ? "Stable" : "Stable",
  }

  const style = trendColors[direction]

  return (
    <div className={cn("inline-flex items-center gap-2 px-3 py-1.5 rounded-full", style.bg, className)}>
      <span className={cn("font-medium", style.text)}>{style.icon}</span>
      <span className={cn("text-sm", style.text)}>
        {change > 0 ? `+${change}` : change} pts
      </span>
      <span className={cn("text-xs", style.text)}>({labels[direction]})</span>
    </div>
  )
}

export default PaymentHistoryChart
