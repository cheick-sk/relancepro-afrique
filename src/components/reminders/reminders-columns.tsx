"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Reminder } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreHorizontal,
  Mail,
  MessageSquare,
  CheckCircle,
  XCircle,
  Clock,
  ExternalLink,
} from "lucide-react";
import { formatDate } from "@/components/shared/status-badge";

interface ReminderWithRelations extends Reminder {
  client?: {
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    company?: string | null;
  };
  debt?: {
    id: string;
    reference?: string | null;
    amount: number;
    currency: string;
    status: string;
  };
}

const statusConfig: Record<string, { label: string; className: string; icon: React.ComponentType<{ className?: string }> }> = {
  pending: { label: "En attente", className: "bg-yellow-100 text-yellow-700", icon: Clock },
  sent: { label: "Envoyée", className: "bg-blue-100 text-blue-700", icon: CheckCircle },
  delivered: { label: "Délivrée", className: "bg-green-100 text-green-700", icon: CheckCircle },
  opened: { label: "Ouverte", className: "bg-purple-100 text-purple-700", icon: CheckCircle },
  failed: { label: "Échouée", className: "bg-red-100 text-red-700", icon: XCircle },
};

export function getRemindersColumns(): ColumnDef<ReminderWithRelations>[] {
  return [
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => {
        const type = row.original.type;
        return (
          <div className="flex items-center gap-2">
            {type === "email" ? (
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                <Mail className="h-4 w-4 text-blue-600" />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                <MessageSquare className="h-4 w-4 text-green-600" />
              </div>
            )}
            <span className="capitalize">{type === "email" ? "Email" : "WhatsApp"}</span>
          </div>
        );
      },
    },
    {
      accessorKey: "client",
      header: "Client",
      cell: ({ row }) => {
        const client = row.original.client;
        if (!client) return <span className="text-gray-400">-</span>;
        return (
          <div>
            <p className="font-medium text-gray-900 dark:text-white">
              {client.name}
            </p>
            {client.company && (
              <p className="text-sm text-gray-500">{client.company}</p>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "debt",
      header: "Facture",
      cell: ({ row }) => {
        const debt = row.original.debt;
        if (!debt) return <span className="text-gray-400">-</span>;
        return (
          <Badge variant="outline" className="font-mono">
            {debt.reference || `#${debt.id.slice(0, 6)}`}
          </Badge>
        );
      },
    },
    {
      accessorKey: "subject",
      header: "Sujet / Message",
      cell: ({ row }) => {
        const reminder = row.original;
        const message = reminder.subject || reminder.message;
        return (
          <p className="max-w-xs truncate text-sm text-gray-600">
            {message}
          </p>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Statut",
      cell: ({ row }) => {
        const status = row.original.status;
        const config = statusConfig[status] || statusConfig.pending;
        const Icon = config.icon;
        return (
          <Badge variant="secondary" className={config.className}>
            <Icon className="h-3 w-3 mr-1" />
            {config.label}
          </Badge>
        );
      },
    },
    {
      accessorKey: "createdAt",
      header: "Date",
      cell: ({ row }) => {
        const date = row.original.createdAt;
        const sentAt = row.original.sentAt;
        return (
          <div className="text-sm">
            <p>{formatDate(date)}</p>
            {sentAt && (
              <p className="text-xs text-gray-400">
                Envoyé: {formatDate(sentAt)}
              </p>
            )}
          </div>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const reminder = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => {
                  // View details
                  console.log("View reminder:", reminder.id);
                }}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Voir détails
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
}
