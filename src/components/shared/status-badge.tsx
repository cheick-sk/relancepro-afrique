"use client";

import { Badge } from "@/components/ui/badge";
import { ClientStatus, DebtStatus } from "@/types";

interface StatusBadgeProps {
  status: ClientStatus | DebtStatus;
  type: "client" | "debt";
}

const clientStatusConfig: Record<ClientStatus, { label: string; className: string }> = {
  active: { label: "Actif", className: "bg-green-100 text-green-700 hover:bg-green-100" },
  inactive: { label: "Inactif", className: "bg-gray-100 text-gray-700 hover:bg-gray-100" },
  blacklisted: { label: "Liste noire", className: "bg-red-100 text-red-700 hover:bg-red-100" },
};

const debtStatusConfig: Record<DebtStatus, { label: string; className: string }> = {
  pending: { label: "En attente", className: "bg-yellow-100 text-yellow-700 hover:bg-yellow-100" },
  paid: { label: "Payée", className: "bg-green-100 text-green-700 hover:bg-green-100" },
  partial: { label: "Partielle", className: "bg-blue-100 text-blue-700 hover:bg-blue-100" },
  disputed: { label: "Contestée", className: "bg-orange-100 text-orange-700 hover:bg-orange-100" },
  cancelled: { label: "Annulée", className: "bg-gray-100 text-gray-700 hover:bg-gray-100" },
};

export function StatusBadge({ status, type }: StatusBadgeProps) {
  const config = type === "client" 
    ? clientStatusConfig[status as ClientStatus]
    : debtStatusConfig[status as DebtStatus];

  return (
    <Badge variant="secondary" className={config.className}>
      {config.label}
    </Badge>
  );
}

// Helper pour formater les montants
export function formatCurrency(amount: number, currency: string = "XOF"): string {
  const formatter = new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  return formatter.format(amount);
}

// Helper pour formater les dates
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

// Helper pour calculer les jours de retard
export function getDaysOverdue(dueDate: Date | string): number {
  const due = typeof dueDate === "string" ? new Date(dueDate) : dueDate;
  const today = new Date();
  const diffTime = today.getTime() - due.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
}
