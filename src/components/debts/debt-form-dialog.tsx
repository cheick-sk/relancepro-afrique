"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { Debt, Client } from "@/types";
import { config } from "@/lib/config";

interface DebtFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  debt?: Debt | null;
  clients: Client[];
  preselectedClientId?: string;
  onSuccess: () => void;
}

export function DebtFormDialog({
  open,
  onOpenChange,
  debt,
  clients,
  preselectedClientId,
  onSuccess,
}: DebtFormDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    clientId: debt?.clientId || preselectedClientId || "",
    reference: debt?.reference || "",
    description: debt?.description || "",
    amount: debt?.amount?.toString() || "",
    currency: debt?.currency || "XOF",
    dueDate: debt?.dueDate
      ? new Date(debt.dueDate).toISOString().split("T")[0]
      : "",
    status: debt?.status || "pending",
  });

  const isEditing = !!debt;

  useEffect(() => {
    if (preselectedClientId && !debt) {
      setFormData((prev) => ({ ...prev, clientId: preselectedClientId }));
    }
  }, [preselectedClientId, debt]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = isEditing ? `/api/debts/${debt.id}` : "/api/debts";
      const method = isEditing ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        onSuccess();
        onOpenChange(false);
        if (!isEditing) {
          setFormData({
            clientId: "",
            reference: "",
            description: "",
            amount: "",
            currency: "XOF",
            dueDate: "",
            status: "pending",
          });
        }
      }
    } catch (error) {
      console.error("Error saving debt:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Modifier la créance" : "Nouvelle créance"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Modifiez les informations de la créance"
              : "Enregistrez une nouvelle créance à recouvrer"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {!isEditing && (
              <div className="space-y-2">
                <Label htmlFor="clientId">Client *</Label>
                <Select
                  value={formData.clientId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, clientId: value })
                  }
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                        {client.company && ` (${client.company})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="reference">Référence / N° Facture</Label>
                <Input
                  id="reference"
                  name="reference"
                  value={formData.reference}
                  onChange={handleChange}
                  placeholder="FAC-2024-001"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dueDate">Date d&apos;échéance *</Label>
                <Input
                  id="dueDate"
                  name="dueDate"
                  type="date"
                  value={formData.dueDate}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Montant *</Label>
                <Input
                  id="amount"
                  name="amount"
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={handleChange}
                  placeholder="150000"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Devise</Label>
                <Select
                  value={formData.currency}
                  onValueChange={(value) =>
                    setFormData({ ...formData, currency: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {config.currencies.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.code} - {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={2}
                placeholder="Description de la créance..."
              />
            </div>
            {isEditing && (
              <div className="space-y-2">
                <Label htmlFor="status">Statut</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) =>
                    setFormData({ ...formData, status: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {config.debtStatuses.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              className="bg-orange-500 hover:bg-orange-600"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {isEditing ? "Modifier" : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
