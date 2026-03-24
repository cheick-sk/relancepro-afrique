"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
  MoreHorizontal,
  Mail,
  MessageSquare,
  Eye,
  Phone,
  Users,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Building2,
  Calendar,
  TrendingUp,
  SortAsc,
  SortDesc,
  Filter,
} from "lucide-react";

interface TopDebtorData {
  id: string;
  name: string;
  company: string | null;
  email?: string | null;
  phone?: string | null;
  totalDebt: number;
  paidAmount: number;
  debtCount: number;
  riskLevel: string | null;
  daysOverdue?: number;
  lastReminder?: string | null;
}

interface TopDebtorsProps {
  data: TopDebtorData[];
  loading?: boolean;
  currency?: string;
  onViewClient?: (id: string) => void;
  onSendReminder?: (id: string, type: "email" | "whatsapp") => void;
}

type SortField = "totalDebt" | "daysOverdue" | "debtCount" | "paidAmount";
type SortOrder = "asc" | "desc";

const RISK_CONFIG: Record<
  string,
  {
    bgColor: string;
    textColor: string;
    borderColor: string;
    icon: React.ComponentType<{ className?: string }>;
    label: string;
  }
> = {
  low: {
    bgColor: "bg-green-100 dark:bg-green-900/30",
    textColor: "text-green-700 dark:text-green-400",
    borderColor: "border-green-200 dark:border-green-800",
    icon: ShieldCheck,
    label: "Faible",
  },
  medium: {
    bgColor: "bg-amber-100 dark:bg-amber-900/30",
    textColor: "text-amber-700 dark:text-amber-400",
    borderColor: "border-amber-200 dark:border-amber-800",
    icon: AlertTriangle,
    label: "Moyen",
  },
  high: {
    bgColor: "bg-red-100 dark:bg-red-900/30",
    textColor: "text-red-700 dark:text-red-400",
    borderColor: "border-red-200 dark:border-red-800",
    icon: ShieldAlert,
    label: "Élevé",
  },
};

export function TopDebtors({
  data,
  loading,
  currency = "GNF",
  onViewClient,
  onSendReminder,
}: TopDebtorsProps) {
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("totalDebt");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [riskFilter, setRiskFilter] = useState<string | null>(null);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  const filteredAndSortedData = useMemo(() => {
    let filtered = data.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        (item.company?.toLowerCase().includes(search.toLowerCase()) ?? false);
      const matchesRisk = riskFilter ? item.riskLevel === riskFilter : true;
      return matchesSearch && matchesRisk;
    });

    filtered.sort((a, b) => {
      const aValue = a[sortField] || 0;
      const bValue = b[sortField] || 0;
      return sortOrder === "asc" ? aValue - bValue : bValue - aValue;
    });

    return filtered;
  }, [data, search, sortField, sortOrder, riskFilter]);

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M ${currency}`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}K ${currency}`;
    }
    return `${value.toLocaleString("fr-FR")} ${currency}`;
  };

  const getDaysOverdueColor = (days?: number) => {
    if (!days || days <= 0) return "text-green-600";
    if (days <= 30) return "text-amber-600";
    if (days <= 60) return "text-orange-600";
    return "text-red-600";
  };

  const getDaysOverdueBg = (days?: number) => {
    if (!days || days <= 0) return "bg-green-100 dark:bg-green-900/30";
    if (days <= 30) return "bg-amber-100 dark:bg-amber-900/30";
    if (days <= 60) return "bg-orange-100 dark:bg-orange-900/30";
    return "bg-red-100 dark:bg-red-900/30";
  };

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    const totalDebt = data.reduce((sum, d) => sum + d.totalDebt, 0);
    const totalPaid = data.reduce((sum, d) => sum + d.paidAmount, 0);
    const avgDaysOverdue = data.length > 0
      ? Math.round(data.reduce((sum, d) => sum + (d.daysOverdue || 0), 0) / data.length)
      : 0;
    const highRiskCount = data.filter((d) => d.riskLevel === "high").length;

    return {
      totalDebt,
      totalPaid,
      avgDaysOverdue,
      highRiskCount,
      clientCount: data.length,
    };
  }, [data]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-orange-500" />
            Top Débiteurs
          </CardTitle>
          <CardDescription>Chargement des données...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-orange-500" />
                Top Débiteurs
              </CardTitle>
              <CardDescription>
                {data.length} client{data.length > 1 ? "s" : ""} avec des créances impayées
              </CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Rechercher un client..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Risk Filter Pills */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant={riskFilter === null ? "default" : "outline"}
              size="sm"
              onClick={() => setRiskFilter(null)}
              className={riskFilter === null ? "bg-orange-500 hover:bg-orange-600" : ""}
            >
              Tous
            </Button>
            <Button
              variant={riskFilter === "high" ? "default" : "outline"}
              size="sm"
              onClick={() => setRiskFilter("high")}
              className={riskFilter === "high" ? "bg-red-500 hover:bg-red-600" : ""}
            >
              <ShieldAlert className="h-3 w-3 mr-1" />
              Élevé
            </Button>
            <Button
              variant={riskFilter === "medium" ? "default" : "outline"}
              size="sm"
              onClick={() => setRiskFilter("medium")}
              className={riskFilter === "medium" ? "bg-amber-500 hover:bg-amber-600" : ""}
            >
              <AlertTriangle className="h-3 w-3 mr-1" />
              Moyen
            </Button>
            <Button
              variant={riskFilter === "low" ? "default" : "outline"}
              size="sm"
              onClick={() => setRiskFilter("low")}
              className={riskFilter === "low" ? "bg-green-500 hover:bg-green-600" : ""}
            >
              <ShieldCheck className="h-3 w-3 mr-1" />
              Faible
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Summary Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
            <p className="text-xs text-gray-500 dark:text-gray-400">Total Dû</p>
            <p className="text-lg font-bold text-orange-600">{formatCurrency(summaryStats.totalDebt)}</p>
          </div>
          <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
            <p className="text-xs text-gray-500 dark:text-gray-400">Total Payé</p>
            <p className="text-lg font-bold text-green-600">{formatCurrency(summaryStats.totalPaid)}</p>
          </div>
          <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
            <p className="text-xs text-gray-500 dark:text-gray-400">Retard Moyen</p>
            <p className="text-lg font-bold text-amber-600">{summaryStats.avgDaysOverdue} jours</p>
          </div>
          <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
            <p className="text-xs text-gray-500 dark:text-gray-400">Risque Élevé</p>
            <p className="text-lg font-bold text-red-600">{summaryStats.highRiskCount}</p>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50 dark:bg-gray-800/50">
                <TableHead className="font-semibold">Client</TableHead>
                <TableHead>
                  <button
                    onClick={() => handleSort("totalDebt")}
                    className="flex items-center gap-1 hover:text-orange-600 transition-colors"
                  >
                    Montant dû
                    {sortField === "totalDebt" ? (
                      sortOrder === "asc" ? (
                        <ArrowUp className="h-4 w-4" />
                      ) : (
                        <ArrowDown className="h-4 w-4" />
                      )
                    ) : (
                      <ArrowUpDown className="h-4 w-4" />
                    )}
                  </button>
                </TableHead>
                <TableHead>
                  <button
                    onClick={() => handleSort("daysOverdue")}
                    className="flex items-center gap-1 hover:text-orange-600 transition-colors"
                  >
                    Jours retard
                    {sortField === "daysOverdue" ? (
                      sortOrder === "asc" ? (
                        <ArrowUp className="h-4 w-4" />
                      ) : (
                        <ArrowDown className="h-4 w-4" />
                      )
                    ) : (
                      <ArrowUpDown className="h-4 w-4" />
                    )}
                  </button>
                </TableHead>
                <TableHead>Créances</TableHead>
                <TableHead>Risque</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                    {search || riskFilter
                      ? "Aucun client ne correspond aux critères"
                      : "Aucune créance impayée"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredAndSortedData.slice(0, 10).map((debtor, index) => {
                  const riskConfig =
                    RISK_CONFIG[debtor.riskLevel?.toLowerCase() || ""] || RISK_CONFIG.medium;
                  const RiskIcon = riskConfig.icon;

                  return (
                    <TableRow
                      key={debtor.id}
                      className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${
                        index === 0 ? "bg-orange-50/50 dark:bg-orange-900/10" : ""
                      }`}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${
                              index === 0
                                ? "bg-gradient-to-br from-orange-400 to-amber-500"
                                : "bg-gray-400"
                            }`}
                          >
                            {debtor.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-gray-900 dark:text-white">
                                {debtor.name}
                              </p>
                              {index === 0 && (
                                <Badge variant="outline" className="text-xs border-orange-300 text-orange-600">
                                  #1
                                </Badge>
                              )}
                            </div>
                            {debtor.company && (
                              <div className="flex items-center gap-1 text-sm text-gray-500">
                                <Building2 className="h-3 w-3" />
                                {debtor.company}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white">
                            {formatCurrency(debtor.totalDebt)}
                          </p>
                          {debtor.paidAmount > 0 && (
                            <p className="text-xs text-green-600">
                              +{formatCurrency(debtor.paidAmount)} payé
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full ${getDaysOverdueBg(
                            debtor.daysOverdue
                          )}`}
                        >
                          <Clock className={`h-4 w-4 ${getDaysOverdueColor(debtor.daysOverdue)}`} />
                          <span className={`font-medium ${getDaysOverdueColor(debtor.daysOverdue)}`}>
                            {debtor.daysOverdue && debtor.daysOverdue > 0
                              ? `${debtor.daysOverdue}j`
                              : "-"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {debtor.debtCount} créance{debtor.debtCount > 1 ? "s" : ""}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`${riskConfig.bgColor} ${riskConfig.textColor} border-0`}
                        >
                          <RiskIcon className="h-3 w-3 mr-1" />
                          {riskConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={() => onViewClient?.(debtor.id)}>
                              <Eye className="h-4 w-4 mr-2" />
                              Voir le client
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {debtor.email && (
                              <DropdownMenuItem
                                onClick={() => onSendReminder?.(debtor.id, "email")}
                              >
                                <Mail className="h-4 w-4 mr-2" />
                                Envoyer email
                              </DropdownMenuItem>
                            )}
                            {debtor.phone && (
                              <DropdownMenuItem
                                onClick={() => onSendReminder?.(debtor.id, "whatsapp")}
                              >
                                <MessageSquare className="h-4 w-4 mr-2" />
                                Envoyer WhatsApp
                              </DropdownMenuItem>
                            )}
                            {debtor.phone && (
                              <DropdownMenuItem>
                                <Phone className="h-4 w-4 mr-2" />
                                Appeler
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Footer Summary */}
        <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
          <span>
            Affichage de {Math.min(filteredAndSortedData.length, 10)} sur {data.length} clients
          </span>
          <span>
            Taux de récupération:{" "}
            <span className="font-medium text-green-600">
              {summaryStats.totalDebt > 0
                ? Math.round((summaryStats.totalPaid / summaryStats.totalDebt) * 100)
                : 0}
              %
            </span>
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
