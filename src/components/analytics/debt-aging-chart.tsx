"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock } from "lucide-react";

interface DebtAgingData {
  bucket: string;
  amount: number;
  count: number;
  percentage: number;
}

interface DebtAgingChartProps {
  data: DebtAgingData[];
  loading?: boolean;
}

const COLORS = [
  "hsl(142, 76%, 36%)", // Green - 0-30 days
  "hsl(38, 92%, 50%)",  // Amber - 31-60 days
  "hsl(24, 95%, 53%)",  // Orange - 61-90 days
  "hsl(0, 84%, 60%)",   // Red - 90+ days
];

export function DebtAgingChart({ data, loading }: DebtAgingChartProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-orange-500" />
            Ancienneté des Créances
          </CardTitle>
          <CardDescription>Répartition par tranche d&apos;âge</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalAmount = data.reduce((sum, item) => sum + item.amount, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-orange-500" />
          Ancienneté des Créances
        </CardTitle>
        <CardDescription>Répartition par tranche d&apos;âge</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="amount"
                nameKey="bucket"
                label={({ bucket, percentage }) => `${bucket}: ${percentage}%`}
                labelLine={false}
              >
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => [`${value.toLocaleString("fr-FR")} GNF`, "Montant"]}
              />
              <Legend
                verticalAlign="bottom"
                height={36}
                formatter={(value) => <span className="text-sm text-gray-600 dark:text-gray-400">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        {totalAmount > 0 && (
          <div className="text-center mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
            <p className="text-sm text-gray-500">Total impayé</p>
            <p className="text-xl font-bold text-orange-600">
              {totalAmount.toLocaleString("fr-FR")} GNF
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
