"use client";

import { useState, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LineChart,
  Line,
  ComposedChart,
  Area,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Mail,
  MessageSquare,
  TrendingUp,
  BarChart3,
  Send,
  CheckCircle,
  Eye,
  Reply,
  Clock,
  Zap,
  Target,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

interface ReminderChannelData {
  type: string;
  sent: number;
  delivered: number;
  opened: number;
  responded: number;
  successRate: number;
}

interface ReminderNumberData {
  reminderNumber: string;
  sent: number;
  successRate: number;
  avgResponseTime: number;
}

interface ReminderEffectivenessProps {
  channelData: ReminderChannelData[];
  numberData: ReminderNumberData[];
  loading?: boolean;
}

const CHANNEL_COLORS = {
  sent: "#94a3b8",
  delivered: "#f97316",
  opened: "#fbbf24",
  responded: "#22c55e",
};

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) => {
  if (active && payload && payload.length) {
    const labels: Record<string, string> = {
      sent: "Envoyées",
      delivered: "Délivrées",
      opened: "Ouvertes",
      responded: "Réponses",
      successRate: "Taux de succès",
    };

    return (
      <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
        <p className="font-medium text-gray-900 dark:text-white mb-2">{label}</p>
        <div className="space-y-1">
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-gray-600 dark:text-gray-400">
                {labels[entry.name] || entry.name}:
              </span>
              <span className="font-medium text-gray-900 dark:text-white">
                {entry.name === "successRate" ? `${entry.value}%` : entry.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

export function ReminderEffectiveness({
  channelData,
  numberData,
  loading,
}: ReminderEffectivenessProps) {
  const [view, setView] = useState<"channel" | "number">("channel");

  // Calculate overall stats
  const overallStats = useMemo(() => {
    const totalSent = channelData.reduce((sum, d) => sum + d.sent, 0);
    const totalDelivered = channelData.reduce((sum, d) => sum + d.delivered, 0);
    const totalOpened = channelData.reduce((sum, d) => sum + d.opened, 0);
    const totalResponded = channelData.reduce((sum, d) => sum + d.responded, 0);

    const deliveryRate = totalSent > 0 ? Math.round((totalDelivered / totalSent) * 100) : 0;
    const openRate = totalDelivered > 0 ? Math.round((totalOpened / totalDelivered) * 100) : 0;
    const responseRate = totalOpened > 0 ? Math.round((totalResponded / totalOpened) * 100) : 0;

    // Find best performing channel
    const bestChannel = channelData.reduce(
      (best, d) => (d.successRate > best.successRate ? d : best),
      channelData[0] || { type: "N/A", successRate: 0 }
    );

    // Find best reminder number
    const bestReminder = numberData.reduce(
      (best, d) => (d.successRate > best.successRate ? d : best),
      numberData[0] || { reminderNumber: "N/A", successRate: 0 }
    );

    return {
      totalSent,
      totalDelivered,
      totalOpened,
      totalResponded,
      deliveryRate,
      openRate,
      responseRate,
      bestChannel: bestChannel.type,
      bestChannelRate: bestChannel.successRate,
      bestReminder: bestReminder.reminderNumber,
      bestReminderRate: bestReminder.successRate,
    };
  }, [channelData, numberData]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-orange-500" />
            Efficacité des Relances
          </CardTitle>
          <CardDescription>Chargement des données...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[350px] flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-orange-500" />
              Efficacité des Relances
            </CardTitle>
            <CardDescription>Analyse des performances par canal et numéro de relance</CardDescription>
          </div>
          <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 p-1">
            <Button
              variant={view === "channel" ? "default" : "ghost"}
              size="sm"
              onClick={() => setView("channel")}
              className={view === "channel" ? "bg-orange-500 hover:bg-orange-600" : ""}
            >
              <Mail className="h-4 w-4 mr-1" />
              Canal
            </Button>
            <Button
              variant={view === "number" ? "default" : "ghost"}
              size="sm"
              onClick={() => setView("number")}
              className={view === "number" ? "bg-orange-500 hover:bg-orange-600" : ""}
            >
              <BarChart3 className="h-4 w-4 mr-1" />
              Numéro
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Overview Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
            <div className="flex items-center gap-2 mb-1">
              <Send className="h-4 w-4 text-gray-500" />
              <span className="text-xs text-gray-500">Envoyées</span>
            </div>
            <p className="text-xl font-bold text-gray-900 dark:text-white">
              {overallStats.totalSent}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-xs text-gray-500">Délivrées</span>
            </div>
            <p className="text-xl font-bold text-green-600">{overallStats.deliveryRate}%</p>
          </div>
          <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
            <div className="flex items-center gap-2 mb-1">
              <Eye className="h-4 w-4 text-amber-500" />
              <span className="text-xs text-gray-500">Ouvertes</span>
            </div>
            <p className="text-xl font-bold text-amber-600">{overallStats.openRate}%</p>
          </div>
          <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
            <div className="flex items-center gap-2 mb-1">
              <Reply className="h-4 w-4 text-blue-500" />
              <span className="text-xs text-gray-500">Réponses</span>
            </div>
            <p className="text-xl font-bold text-blue-600">{overallStats.responseRate}%</p>
          </div>
        </div>

        {view === "channel" ? (
          <>
            {/* Channel Comparison Chart */}
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={channelData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-gray-200 dark:stroke-gray-700"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="type"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    className="text-xs"
                    tick={{ fill: "#6b7280" }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    className="text-xs"
                    tick={{ fill: "#6b7280" }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    formatter={(value) => {
                      const labels: Record<string, string> = {
                        sent: "Envoyées",
                        delivered: "Délivrées",
                        opened: "Ouvertes",
                        responded: "Réponses",
                      };
                      return (
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {labels[value] || value}
                        </span>
                      );
                    }}
                  />
                  <Bar dataKey="sent" fill={CHANNEL_COLORS.sent} radius={[2, 2, 0, 0]} name="sent" />
                  <Bar
                    dataKey="delivered"
                    fill={CHANNEL_COLORS.delivered}
                    radius={[2, 2, 0, 0]}
                    name="delivered"
                  />
                  <Bar dataKey="opened" fill={CHANNEL_COLORS.opened} radius={[2, 2, 0, 0]} name="opened" />
                  <Bar
                    dataKey="responded"
                    fill={CHANNEL_COLORS.responded}
                    radius={[2, 2, 0, 0]}
                    name="responded"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Channel Detail Cards */}
            <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
              {channelData.map((item) => (
                <div
                  key={item.type}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    item.type === overallStats.bestChannel
                      ? "border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20"
                      : "border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800"
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {item.type === "Email" ? (
                        <Mail className="h-5 w-5 text-gray-500" />
                      ) : (
                        <MessageSquare className="h-5 w-5 text-green-500" />
                      )}
                      <span className="font-medium text-gray-900 dark:text-white">{item.type}</span>
                    </div>
                    {item.type === overallStats.bestChannel && (
                      <Badge variant="outline" className="text-green-600 border-green-300">
                        <Zap className="h-3 w-3 mr-1" />
                        Meilleur
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-4 gap-2 text-sm mb-3">
                    <div className="text-center">
                      <Send className="h-3 w-3 mx-auto text-gray-400 mb-1" />
                      <p className="text-gray-900 dark:text-white font-medium">{item.sent}</p>
                    </div>
                    <div className="text-center">
                      <CheckCircle className="h-3 w-3 mx-auto text-green-500 mb-1" />
                      <p className="text-gray-900 dark:text-white font-medium">{item.delivered}</p>
                    </div>
                    <div className="text-center">
                      <Eye className="h-3 w-3 mx-auto text-amber-500 mb-1" />
                      <p className="text-gray-900 dark:text-white font-medium">{item.opened}</p>
                    </div>
                    <div className="text-center">
                      <Reply className="h-3 w-3 mx-auto text-blue-500 mb-1" />
                      <p className="text-gray-900 dark:text-white font-medium">{item.responded}</p>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-500">Taux de succès</span>
                      <span className="text-sm font-bold text-orange-600">{item.successRate}%</span>
                    </div>
                    <Progress
                      value={item.successRate}
                      className="h-2 [&>div]:bg-gradient-to-r [&>div]:from-orange-400 [&>div]:to-green-500"
                    />
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            {/* Reminder Number Effectiveness */}
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={numberData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-gray-200 dark:stroke-gray-700"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="reminderNumber"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    className="text-xs"
                    tick={{ fill: "#6b7280" }}
                  />
                  <YAxis
                    yAxisId="left"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    className="text-xs"
                    tick={{ fill: "#6b7280" }}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    className="text-xs"
                    tickFormatter={(value) => `${value}%`}
                    tick={{ fill: "#6b7280" }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    formatter={(value) => {
                      const labels: Record<string, string> = {
                        sent: "Envoyées",
                        successRate: "Taux de succès",
                      };
                      return (
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {labels[value] || value}
                        </span>
                      );
                    }}
                  />
                  <Bar
                    yAxisId="left"
                    dataKey="sent"
                    fill="#f97316"
                    radius={[4, 4, 0, 0]}
                    name="sent"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="successRate"
                    stroke="#22c55e"
                    strokeWidth={3}
                    dot={{ fill: "#22c55e", strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, strokeWidth: 2 }}
                    name="successRate"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Reminder Number Cards */}
            <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
              {numberData.map((item, index) => {
                const isFirst = index === 0;
                const trend =
                  item.successRate >= 60
                    ? "up"
                    : item.successRate >= 40
                    ? "neutral"
                    : "down";
                return (
                  <div
                    key={item.reminderNumber}
                    className={`text-center p-3 rounded-lg border-2 transition-all ${
                      item.reminderNumber === overallStats.bestReminder
                        ? "border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20"
                        : "border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800"
                    }`}
                  >
                    <Badge
                      variant="outline"
                      className={`mb-2 ${
                        isFirst
                          ? "border-green-300 text-green-600"
                          : "border-gray-300 text-gray-600"
                      }`}
                    >
                      {item.reminderNumber}
                    </Badge>
                    <div className="space-y-1">
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{item.sent}</p>
                      <p className="text-xs text-gray-500">envoyées</p>
                      <div className="pt-2 flex items-center justify-center gap-1">
                        {trend === "up" && <ArrowUpRight className="h-4 w-4 text-green-500" />}
                        {trend === "down" && <ArrowDownRight className="h-4 w-4 text-red-500" />}
                        {trend === "neutral" && <Target className="h-4 w-4 text-amber-500" />}
                        <span
                          className={`text-sm font-medium ${
                            trend === "up"
                              ? "text-green-600"
                              : trend === "down"
                              ? "text-red-600"
                              : "text-amber-600"
                          }`}
                        >
                          {item.successRate}%
                        </span>
                      </div>
                      <p className="text-xs text-gray-400">
                        <Clock className="h-3 w-3 inline mr-1" />
                        {item.avgResponseTime}j en moyenne
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Best Practices Tip */}
        <div className="mt-4 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
          <div className="flex items-start gap-2">
            <TrendingUp className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Conseil d&apos;optimisation</p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                {view === "channel"
                  ? `Les relances ${overallStats.bestChannel} ont le meilleur taux de succès (${overallStats.bestChannelRate}%). Envisagez de privilégier ce canal pour vos communications prioritaires.`
                  : `La ${overallStats.bestReminder} relance est la plus efficace (${overallStats.bestReminderRate}%). Personnalisez le message pour maximiser son impact.`}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
