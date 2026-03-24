"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Bell,
  Clock,
  MoreVertical,
  Send,
  Calendar,
  SkipForward,
  RefreshCw,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/components/shared/status-badge";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";

interface UpcomingReminder {
  id: string;
  clientName: string;
  amount: number;
  currency: string;
  reference: string | null;
  dueDate: Date;
  nextReminderAt: Date | null;
  reminderCount: number;
  daysOverdue: number;
}

export function UpcomingRemindersWidget() {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [reminders, setReminders] = useState<UpcomingReminder[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [skipDialogOpen, setSkipDialogOpen] = useState(false);
  const [selectedReminder, setSelectedReminder] = useState<UpcomingReminder | null>(null);

  const fetchReminders = useCallback(async () => {
    if (!session?.user) return;

    try {
      setLoading(true);
      // Fetch debts with upcoming reminders
      const response = await fetch("/api/debts?status=pending,partial&limit=5&sort=nextReminderAt");
      
      if (response.ok) {
        const debts = await response.json();
        
        // Filter and transform
        const upcoming: UpcomingReminder[] = debts
          .filter((debt: { nextReminderAt: Date | null }) => debt.nextReminderAt)
          .slice(0, 5)
          .map((debt: {
            id: string;
            client: { name: string };
            amount: number;
            paidAmount: number;
            currency: string;
            reference: string | null;
            dueDate: Date;
            nextReminderAt: Date | null;
            reminderCount: number;
          }) => {
            const now = new Date();
            const dueDate = new Date(debt.dueDate);
            const daysOverdue = Math.floor(
              (now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
            );
            
            return {
              id: debt.id,
              clientName: debt.client?.name || "Client inconnu",
              amount: debt.amount - (debt.paidAmount || 0),
              currency: debt.currency,
              reference: debt.reference,
              dueDate: debt.dueDate,
              nextReminderAt: debt.nextReminderAt,
              reminderCount: debt.reminderCount,
              daysOverdue: Math.max(0, daysOverdue),
            };
          });
        
        setReminders(upcoming);
      }
    } catch (error) {
      console.error("Error fetching reminders:", error);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    fetchReminders();
  }, [fetchReminders]);

  const handleSendNow = async (reminder: UpcomingReminder) => {
    setProcessingId(reminder.id);
    
    try {
      const response = await fetch("/api/reminders/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          debtId: reminder.id,
          type: "auto",
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast({
          title: "Relance envoyée",
          description: `La relance pour ${reminder.clientName} a été envoyée avec succès.`,
        });
        await fetchReminders();
      } else {
        toast({
          variant: "destructive",
          title: "Erreur",
          description: result.error || "Impossible d'envoyer la relance",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Une erreur est survenue",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReschedule = async (reminder: UpcomingReminder, days: number) => {
    setProcessingId(reminder.id);
    
    try {
      const newDate = new Date();
      newDate.setDate(newDate.getDate() + days);
      newDate.setHours(9, 0, 0, 0);

      const response = await fetch(`/api/debts/${reminder.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nextReminderAt: newDate.toISOString(),
        }),
      });

      if (response.ok) {
        toast({
          title: "Relance reprogrammée",
          description: `La relance a été reprogrammée pour le ${formatDate(newDate)}.`,
        });
        await fetchReminders();
      } else {
        throw new Error("Failed to reschedule");
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de reprogrammer la relance",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleSkip = async () => {
    if (!selectedReminder) return;
    
    setProcessingId(selectedReminder.id);
    setSkipDialogOpen(false);
    
    try {
      const response = await fetch("/api/reminders/skip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          debtId: selectedReminder.id,
        }),
      });

      if (response.ok) {
        toast({
          title: "Relance ignorée",
          description: `La relance pour ${selectedReminder.clientName} a été ignorée.`,
        });
        await fetchReminders();
      } else {
        throw new Error("Failed to skip");
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible d'ignorer la relance",
      });
    } finally {
      setProcessingId(null);
      setSelectedReminder(null);
    }
  };

  const getReminderStatus = (reminder: UpcomingReminder) => {
    const now = new Date();
    const nextReminder = reminder.nextReminderAt ? new Date(reminder.nextReminderAt) : null;
    
    if (!nextReminder) {
      return { label: "Non planifiée", className: "bg-gray-100 text-gray-600" };
    }
    
    if (nextReminder <= now) {
      return { label: "En attente", className: "bg-red-100 text-red-700" };
    }
    
    const hoursUntil = Math.floor(
      (nextReminder.getTime() - now.getTime()) / (1000 * 60 * 60)
    );
    
    if (hoursUntil < 24) {
      return { label: "Aujourd'hui", className: "bg-orange-100 text-orange-700" };
    }
    
    return { label: formatDate(nextReminder), className: "bg-green-100 text-green-700" };
  };

  const getReminderBadge = (count: number) => {
    if (count === 0) return { label: "1ère", className: "bg-blue-50 text-blue-700" };
    if (count === 1) return { label: "2ème", className: "bg-yellow-50 text-yellow-700" };
    return { label: "3ème", className: "bg-red-50 text-red-700" };
  };

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="h-4 w-4 text-orange-500" />
            Relances à venir
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Bell className="h-4 w-4 text-orange-500" />
                Relances à venir
              </CardTitle>
              <CardDescription className="text-sm mt-1">
                Les prochaines relances planifiées
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchReminders}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {reminders.length === 0 ? (
            <div className="text-center py-6">
              <Clock className="h-10 w-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">Aucune relance planifiée</p>
              <Link href="/debts">
                <Button variant="link" size="sm" className="mt-2 text-orange-600">
                  Gérer les créances
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1 custom-scrollbar">
              {reminders.map((reminder) => {
                const status = getReminderStatus(reminder);
                const badge = getReminderBadge(reminder.reminderCount);
                const isProcessing = processingId === reminder.id;
                
                return (
                  <div
                    key={reminder.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm text-gray-900 dark:text-white truncate">
                          {reminder.clientName}
                        </p>
                        <Badge variant="outline" className={`text-xs ${badge.className}`}>
                          {badge.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                          {formatCurrency(reminder.amount, reminder.currency)}
                        </span>
                        {reminder.daysOverdue > 0 && (
                          <span className="text-xs text-red-600">
                            ({reminder.daysOverdue}j retard)
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${status.className}`}>
                          {status.label}
                        </span>
                        {reminder.reference && (
                          <span className="text-xs text-gray-400 truncate">
                            #{reminder.reference}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        onClick={() => handleSendNow(reminder)}
                        disabled={isProcessing}
                      >
                        {isProcessing ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4 text-orange-500" />
                        )}
                      </Button>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            disabled={isProcessing}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem
                            onClick={() => handleSendNow(reminder)}
                          >
                            <Send className="mr-2 h-4 w-4" />
                            Envoyer maintenant
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleReschedule(reminder, 1)}
                          >
                            <Calendar className="mr-2 h-4 w-4" />
                            Demain
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleReschedule(reminder, 3)}
                          >
                            <Calendar className="mr-2 h-4 w-4" />
                            Dans 3 jours
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleReschedule(reminder, 7)}
                          >
                            <Calendar className="mr-2 h-4 w-4" />
                            Dans 1 semaine
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedReminder(reminder);
                              setSkipDialogOpen(true);
                            }}
                            className="text-red-600"
                          >
                            <SkipForward className="mr-2 h-4 w-4" />
                            Ignorer cette relance
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          
          {reminders.length > 0 && (
            <Link href="/reminders">
              <Button variant="ghost" size="sm" className="w-full mt-3 text-orange-600">
                Voir toutes les relances
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          )}
        </CardContent>
      </Card>

      {/* Skip Confirmation Dialog */}
      <AlertDialog open={skipDialogOpen} onOpenChange={setSkipDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ignorer cette relance ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action va marquer cette relance comme effectuée sans envoyer de message.
              La prochaine relance sera planifiée automatiquement.
              <br /><br />
              Client : <strong>{selectedReminder?.clientName}</strong>
              <br />
              Montant : <strong>{selectedReminder && formatCurrency(selectedReminder.amount, selectedReminder.currency)}</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSkip}
              className="bg-red-600 hover:bg-red-700"
            >
              Ignorer la relance
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
