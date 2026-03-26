"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, MessageSquare } from "lucide-react";

interface ReminderEffectivenessData {
  type: string;
  sent: number;
  delivered: number;
  opened: number;
  responded: number;
  successRate: number;
}

interface ReminderEffectivenessChartProps {
  data: ReminderEffectivenessData[];
  loading?: boolean;
}

const COLORS = {
  sent: "hsl(215, 16%, 47%)",      // Gray
  delivered: "hsl(24, 95%, 53%)",  // Orange
  opened: "hsl(38, 92%, 50%)",     // Amber
  responded: "hsl(142, 76%, 36%)", // Green
};

export function ReminderEffectivenessChart({ data, loading }: ReminderEffectivenessChartProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-orange-500" />
            Efficacité des Relances
          </CardTitle>
          <CardDescription>Comparaison Email vs WhatsApp</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-orange-500" />
          Efficacité des Relances
        </CardTitle>
        <CardDescription>Comparaison Email vs WhatsApp</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
              <XAxis
                dataKey="type"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                className="text-xs"
                tickFormatter={(value) => (
                  <span className="flex items-center gap-1">
                    {value === "Email" ? <Mail className="h-4 w-4" /> : <MessageSquare className="h-4 w-4" />}
                    {value}
                  </span>
                )}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                className="text-xs"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(255, 255, 255, 0.95)",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                }}
                formatter={(value: number, name: string) => {
                  const labels: Record<string, string> = {
                    sent: "Envoyées",
                    delivered: "Délivrées",
                    opened: "Ouvertes",
                    responded: "Réponses",
                  };
                  return [value, labels[name] || name];
                }}
              />
              <Legend
                formatter={(value) => {
                  const labels: Record<string, string> = {
                    sent: "Envoyées",
                    delivered: "Délivrées",
                    opened: "Ouvertes",
                    responded: "Réponses",
                  };
                  return <span className="text-sm text-gray-600 dark:text-gray-400">{labels[value] || value}</span>;
                }}
              />
              <Bar dataKey="sent" fill={COLORS.sent} radius={[2, 2, 0, 0]} />
              <Bar dataKey="delivered" fill={COLORS.delivered} radius={[2, 2, 0, 0]} />
              <Bar dataKey="opened" fill={COLORS.opened} radius={[2, 2, 0, 0]} />
              <Bar dataKey="responded" fill={COLORS.responded} radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Success Rate Summary */}
        <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
          {data.map((item) => (
            <div key={item.type} className="text-center p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
              <div className="flex items-center justify-center gap-2 mb-2">
                {item.type === "Email" ? (
                  <Mail className="h-5 w-5 text-gray-500" />
                ) : (
                  <MessageSquare className="h-5 w-5 text-green-500" />
                )}
                <span className="font-medium">{item.type}</span>
              </div>
              <p className="text-2xl font-bold text-orange-600">{item.successRate}%</p>
              <p className="text-xs text-gray-500">Taux de succès</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
