"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Debt } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreHorizontal,
  Edit,
  Trash2,
  Mail,
  MessageSquare,
  Clock,
  CheckCircle,
  AlertTriangle,
  FileText,
} from "lucide-react";
import {
  StatusBadge,
  formatCurrency,
  formatDate,
  getDaysOverdue,
} from "@/components/shared/status-badge";

interface DebtWithClient extends Debt {
  client?: {
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    company?: string | null;
  };
}

interface ColumnOptions {
  onEdit: (debt: Debt) => void;
  onDelete: (debt: Debt) => void;
  onSendReminder: (debt: Debt, type: "email" | "whatsapp") => void;
  onCreateInvoice?: (debt: Debt) => void;
}

export function getDebtColumns({
  onEdit,
  onDelete,
  onSendReminder,
  onCreateInvoice,
}: ColumnOptions): ColumnDef<DebtWithClient>[] {
  return [
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
      accessorKey: "reference",
      header: "Référence",
      cell: ({ row }) => {
        const ref = row.original.reference;
        return ref ? (
          <Badge variant="outline" className="font-mono">
            {ref}
          </Badge>
        ) : (
          <span className="text-gray-400">-</span>
        );
      },
    },
    {
      accessorKey: "amount",
      header: "Montant",
      cell: ({ row }) => {
        const debt = row.original;
        const balance = debt.amount - debt.paidAmount;
        return (
          <div>
            <p className="font-semibold text-gray-900 dark:text-white">
              {formatCurrency(debt.amount, debt.currency)}
            </p>
            {debt.paidAmount > 0 && (
              <p className="text-sm text-green-600">
                Reste: {formatCurrency(balance, debt.currency)}
              </p>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "dueDate",
      header: "Échéance",
      cell: ({ row }) => {
        const debt = row.original;
        const daysOverdue = getDaysOverdue(debt.dueDate);
        const isOverdue = daysOverdue > 0 && debt.status !== "paid";
        const isPaid = debt.status === "paid";

        return (
          <div className="flex items-center gap-2">
            {isPaid ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : isOverdue ? (
              <AlertTriangle className="h-4 w-4 text-red-500" />
            ) : (
              <Clock className="h-4 w-4 text-gray-400" />
            )}
            <div>
              <p className={isOverdue ? "text-red-600 font-medium" : ""}>
                {formatDate(debt.dueDate)}
              </p>
              {isOverdue && (
                <p className="text-xs text-red-500">
                  {daysOverdue} jour{daysOverdue > 1 ? "s" : ""} de retard
                </p>
              )}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Statut",
      cell: ({ row }) => (
        <StatusBadge
          status={row.original.status as "pending" | "paid" | "partial" | "disputed" | "cancelled"}
          type="debt"
        />
      ),
    },
    {
      accessorKey: "reminderCount",
      header: "Relances",
      cell: ({ row }) => {
        const count = row.original.reminderCount;
        return (
          <Badge variant={count > 0 ? "secondary" : "outline"}>
            {count} envoyée{count > 1 ? "s" : ""}
          </Badge>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const debt = row.original;
        const client = debt.client;
        const canSendEmail = client?.email;
        const canSendWhatsApp = client?.phone;
        const isPaid = debt.status === "paid";

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {!isPaid && canSendEmail && (
                <DropdownMenuItem
                  onClick={() => onSendReminder(debt, "email")}
                >
                  <Mail className="mr-2 h-4 w-4" />
                  Envoyer email
                </DropdownMenuItem>
              )}
              {!isPaid && canSendWhatsApp && (
                <DropdownMenuItem
                  onClick={() => onSendReminder(debt, "whatsapp")}
                >
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Envoyer WhatsApp
                </DropdownMenuItem>
              )}
              {!isPaid && (canSendEmail || canSendWhatsApp) && (
                <DropdownMenuSeparator />
              )}
              {onCreateInvoice && (
                <DropdownMenuItem onClick={() => onCreateInvoice(debt)}>
                  <FileText className="mr-2 h-4 w-4" />
                  Créer une facture
                </DropdownMenuItem>
              )}
              {onCreateInvoice && <DropdownMenuSeparator />}
              <DropdownMenuItem onClick={() => onEdit(debt)}>
                <Edit className="mr-2 h-4 w-4" />
                Modifier
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-red-600"
                onClick={() => onDelete(debt)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Supprimer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
}
