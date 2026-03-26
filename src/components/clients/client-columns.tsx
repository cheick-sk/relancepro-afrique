"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Client } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Mail, Phone, Building, Edit, Trash2, Eye } from "lucide-react";
import { StatusBadge, formatCurrency } from "@/components/shared/status-badge";

interface ClientWithStats extends Client {
  debtCount?: number;
  totalDebt?: number;
  balance?: number;
}

interface ColumnOptions {
  onView: (client: Client) => void;
  onEdit: (client: Client) => void;
  onDelete: (client: Client) => void;
}

export function getClientColumns({ onView, onEdit, onDelete }: ColumnOptions): ColumnDef<ClientWithStats>[] {
  return [
    {
      accessorKey: "name",
      header: "Client",
      cell: ({ row }) => {
        const client = row.original;
        return (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-700 font-semibold">
              {client.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">
                {client.name}
              </p>
              {client.company && (
                <p className="text-sm text-gray-500 flex items-center gap-1">
                  <Building className="h-3 w-3" />
                  {client.company}
                </p>
              )}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "email",
      header: "Contact",
      cell: ({ row }) => {
        const client = row.original;
        return (
          <div className="space-y-1">
            {client.email && (
              <p className="text-sm flex items-center gap-1 text-gray-600">
                <Mail className="h-3 w-3" />
                {client.email}
              </p>
            )}
            {client.phone && (
              <p className="text-sm flex items-center gap-1 text-gray-600">
                <Phone className="h-3 w-3" />
                {client.phone}
              </p>
            )}
            {!client.email && !client.phone && (
              <span className="text-sm text-gray-400">Aucun contact</span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "debtCount",
      header: "Créances",
      cell: ({ row }) => {
        const count = row.original.debtCount || 0;
        return (
          <Badge variant="outline" className="font-mono">
            {count} créance{count > 1 ? "s" : ""}
          </Badge>
        );
      },
    },
    {
      accessorKey: "balance",
      header: "Solde dû",
      cell: ({ row }) => {
        const balance = row.original.balance || 0;
        return (
          <span className={`font-semibold ${balance > 0 ? "text-red-600" : "text-green-600"}`}>
            {formatCurrency(balance)}
          </span>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Statut",
      cell: ({ row }) => (
        <StatusBadge status={row.original.status as "active" | "inactive" | "blacklisted"} type="client" />
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const client = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onView(client)}>
                <Eye className="mr-2 h-4 w-4" />
                Voir détails
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(client)}>
                <Edit className="mr-2 h-4 w-4" />
                Modifier
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-red-600"
                onClick={() => onDelete(client)}
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
