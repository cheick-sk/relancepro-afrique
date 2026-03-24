"use client";

import { useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Brain, 
  TrendingUp, 
  TrendingDown,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Info,
  Sparkles,
  Target
} from "lucide-react";

interface PredictionData {
  date: string;
  expected: number;
  lower: number;
  upper: number;
  confidence: number;
}

interface PaymentPredictionProps {
  predictions: PredictionData[];
  totalExpected: number;
  confidence: number;
  factors: {
    name: string;
    impact: "positive" | "negative" | "neutral";
    value: number;
  }[];
  loading?: boolean;
  currency?: string;
}

const CustomTooltip = ({ 
  active, 
  payload, 
  currency 
}: { 
  active?: boolean; 
  payload?: Array<{ value: number; payload: PredictionData }>; 
  currency?: string;
}) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
        <p className="font-medium text-gray-900 dark:text-white mb-2">{data.date}</p>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-gray-500">Prévu:</span>
            <span className="font-medium text-green-600">
              {data.expected.toLocaleString("fr-FR")} {currency}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-gray-500">Intervalle:</span>
            <span className="font-medium text-gray-600">
              {data.lower.toLocaleString("fr-FR")} - {data.upper.toLocaleString("fr-FR")}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-gray-500">Confiance:</span>
            <span className="font-medium text-blue-600">{data.confidence}%</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export function PaymentPrediction({ 
  predictions, 
  totalExpected,
  confidence,
  factors,
  loading,
  currency = "GNF" 
}: PaymentPredictionProps) {
  const [showDetails, setShowDetails] = useState(false);

  if (loading) {
    return (
      <Card className="border-purple-200 dark:border-purple-800">
        <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950">
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-500 animate-pulse" />
            Prédictions IA
          </CardTitle>
          <CardDescription>Prévisions de paiement pour les 30 prochains jours</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const getConfidenceColor = (conf: number) => {
    if (conf >= 80) return "text-green-600";
    if (conf >= 60) return "text-amber-600";
    return "text-red-600";
  };

  const getConfidenceLabel = (conf: number) => {
    if (conf >= 80) return "Élevée";
    if (conf >= 60) return "Moyenne";
    return "Faible";
  };

  return (
    <Card className="border-purple-200 dark:border-purple-800 overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-purple-500" />
              Prédictions IA
              <Badge variant="secondary" className="bg-purple-100 text-purple-700 dark:bg-purple-800 dark:text-purple-200">
                <Sparkles className="h-3 w-3 mr-1" />
                Powered by AI
              </Badge>
            </CardTitle>
            <CardDescription>Prévisions de paiement pour les 30 prochains jours</CardDescription>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Confiance globale</p>
            <p className={`text-2xl font-bold ${getConfidenceColor(confidence)}`}>
              {confidence}%
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        {/* Total Expected */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 border border-green-200 dark:border-green-800 mb-6">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Encaissements attendus</p>
            <p className="text-3xl font-bold text-green-600">
              {totalExpected.toLocaleString("fr-FR")} <span className="text-lg">{currency}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Target className="h-8 w-8 text-green-500" />
            <div className="text-right">
              <p className="text-sm font-medium text-green-700 dark:text-green-300">
                {getConfidenceLabel(confidence)}
              </p>
              <p className="text-xs text-gray-500">confiance</p>
            </div>
          </div>
        </div>

        {/* Prediction Chart */}
        <div className="h-[250px] mb-6">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={predictions} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="expectedGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="confidenceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                className="text-xs"
                tickFormatter={(value) => value.slice(0, 5)}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                className="text-xs"
                tickFormatter={(value) => {
                  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                  if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
                  return value;
                }}
              />
              <Tooltip content={<CustomTooltip currency={currency} />} />
              {/* Confidence interval area */}
              <Area
                type="monotone"
                dataKey={(d) => d.upper}
                stroke="none"
                fill="url(#confidenceGradient)"
                fillOpacity={0.5}
              />
              <Area
                type="monotone"
                dataKey={(d) => d.lower}
                stroke="none"
                fill="white"
                fillOpacity={1}
              />
              {/* Main prediction line */}
              <Area
                type="monotone"
                dataKey="expected"
                stroke="#8b5cf6"
                strokeWidth={3}
                fill="url(#expectedGradient)"
              />
              {/* Reference line for average */}
              <ReferenceLine 
                y={totalExpected / predictions.length} 
                stroke="#f59e0b" 
                strokeDasharray="5 5"
                label={{ value: "Moyenne", position: "right", fill: "#f59e0b", fontSize: 10 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Toggle Details */}
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="flex items-center gap-2 text-sm text-purple-600 hover:text-purple-700 mb-4"
        >
          <Info className="h-4 w-4" />
          {showDetails ? "Masquer les facteurs" : "Voir les facteurs d'influence"}
        </button>

        {/* Influencing Factors */}
        {showDetails && (
          <div className="space-y-3 animate-in slide-in-from-top-2">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Facteurs d&apos;influence</h4>
            <div className="grid gap-2">
              {factors.map((factor, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800"
                >
                  <div className="flex items-center gap-2">
                    {factor.impact === "positive" && (
                      <TrendingUp className="h-4 w-4 text-green-500" />
                    )}
                    {factor.impact === "negative" && (
                      <TrendingDown className="h-4 w-4 text-red-500" />
                    )}
                    {factor.impact === "neutral" && (
                      <div className="h-4 w-4 rounded-full bg-gray-300" />
                    )}
                    <span className="text-sm text-gray-700 dark:text-gray-300">{factor.name}</span>
                  </div>
                  <span className={`text-sm font-medium ${
                    factor.impact === "positive" ? "text-green-600" :
                    factor.impact === "negative" ? "text-red-600" :
                    "text-gray-600"
                  }`}>
                    {factor.value > 0 ? "+" : ""}{factor.value}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI Disclaimer */}
        <div className="mt-4 p-3 rounded-lg bg-gray-50 dark:bg-gray-800 text-xs text-gray-500 dark:text-gray-400 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <p>
            Ces prédictions sont basées sur l&apos;historique de vos paiements et l&apos;analyse IA. 
            Elles sont fournies à titre indicatif et ne constituent pas une garantie.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
