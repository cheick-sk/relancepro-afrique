'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Plus,
  Edit2,
  Trash2,
  Receipt,
  CheckCircle2,
  Clock,
  AlertCircle
} from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

export type CostType = 'lawyer' | 'court' | 'bailiff' | 'expert' | 'other'
export type CostStatus = 'pending' | 'paid' | 'reimbursed'

interface Cost {
  id: string
  type: CostType
  description: string
  amount: number
  currency: string
  incurredAt: Date
  paidAt?: Date | null
  status: CostStatus
  receiptUrl?: string | null
  notes?: string | null
  createdAt: Date
}

interface CostTrackerProps {
  litigationId: string
  costs: Cost[]
  amountRecovered: number
  amountClaimed: number
  currency: string
  onAddCost?: (cost: Partial<Cost>) => Promise<void>
  onEditCost?: (id: string, cost: Partial<Cost>) => Promise<void>
  onDeleteCost?: (id: string) => Promise<void>
}

const costTypeConfig: Record<CostType, {
  label: string
  color: string
  bgColor: string
}> = {
  lawyer: {
    label: 'Avocat',
    color: 'text-purple-700',
    bgColor: 'bg-purple-50'
  },
  court: {
    label: 'Tribunal',
    color: 'text-red-700',
    bgColor: 'bg-red-50'
  },
  bailiff: {
    label: 'Huissier',
    color: 'text-orange-700',
    bgColor: 'bg-orange-50'
  },
  expert: {
    label: 'Expert',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50'
  },
  other: {
    label: 'Autre',
    color: 'text-gray-700',
    bgColor: 'bg-gray-50'
  }
}

const costStatusConfig: Record<CostStatus, {
  label: string
  color: string
  icon: React.ReactNode
}> = {
  pending: {
    label: 'En attente',
    color: 'bg-yellow-100 text-yellow-700',
    icon: <Clock className="h-3 w-3" />
  },
  paid: {
    label: 'Payé',
    color: 'bg-green-100 text-green-700',
    icon: <CheckCircle2 className="h-3 w-3" />
  },
  reimbursed: {
    label: 'Remboursé',
    color: 'bg-blue-100 text-blue-700',
    icon: <CheckCircle2 className="h-3 w-3" />
  }
}

const formatCurrency = (amount: number, currency: string) => {
  return new Intl.NumberFormat('fr-GN', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

export function CostTracker({
  litigationId,
  costs,
  amountRecovered,
  amountClaimed,
  currency,
  onAddCost,
  onEditCost,
  onDeleteCost
}: CostTrackerProps) {
  const [isAddingCost, setIsAddingCost] = useState(false)
  const [editingCost, setEditingCost] = useState<Cost | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const [formData, setFormData] = useState({
    type: 'other' as CostType,
    description: '',
    amount: '',
    currency: currency,
    incurredAt: format(new Date(), "yyyy-MM-dd"),
    paidAt: '',
    status: 'pending' as CostStatus,
    receiptUrl: '',
    notes: ''
  })

  // Calculate totals
  const totalCosts = costs.reduce((sum, c) => sum + c.amount, 0)
  const paidCosts = costs.filter(c => c.status === 'paid' || c.status === 'reimbursed')
    .reduce((sum, c) => sum + c.amount, 0)
  const pendingCosts = costs.filter(c => c.status === 'pending')
    .reduce((sum, c) => sum + c.amount, 0)
  
  // ROI calculation
  const netRecovery = amountRecovered - totalCosts
  const roi = totalCosts > 0 ? ((amountRecovered - totalCosts) / totalCosts) * 100 : 0

  const resetForm = () => {
    setFormData({
      type: 'other',
      description: '',
      amount: '',
      currency: currency,
      incurredAt: format(new Date(), "yyyy-MM-dd"),
      paidAt: '',
      status: 'pending',
      receiptUrl: '',
      notes: ''
    })
  }

  const handleSubmit = async () => {
    if (!onAddCost) return
    setIsSubmitting(true)
    try {
      await onAddCost({
        ...formData,
        amount: parseFloat(formData.amount),
        paidAt: formData.paidAt ? new Date(formData.paidAt) : null,
        receiptUrl: formData.receiptUrl || null,
        notes: formData.notes || null
      })
      resetForm()
      setIsAddingCost(false)
    } catch (error) {
      console.error('Error adding cost:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = async () => {
    if (!editingCost || !onEditCost) return
    setIsSubmitting(true)
    try {
      await onEditCost(editingCost.id, {
        ...formData,
        amount: parseFloat(formData.amount),
        paidAt: formData.paidAt ? new Date(formData.paidAt) : null,
        receiptUrl: formData.receiptUrl || null,
        notes: formData.notes || null
      })
      setEditingCost(null)
      resetForm()
    } catch (error) {
      console.error('Error editing cost:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!onDeleteCost) return
    if (confirm('Êtes-vous sûr de vouloir supprimer ce coût ?')) {
      await onDeleteCost(id)
    }
  }

  const openEditDialog = (cost: Cost) => {
    setEditingCost(cost)
    setFormData({
      type: cost.type,
      description: cost.description,
      amount: cost.amount.toString(),
      currency: cost.currency,
      incurredAt: format(new Date(cost.incurredAt), "yyyy-MM-dd"),
      paidAt: cost.paidAt ? format(new Date(cost.paidAt), "yyyy-MM-dd") : '',
      status: cost.status,
      receiptUrl: cost.receiptUrl || '',
      notes: cost.notes || ''
    })
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Suivi des coûts
        </CardTitle>
        {onAddCost && (
          <Dialog open={isAddingCost} onOpenChange={setIsAddingCost}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Ajouter
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Ajouter un coût</DialogTitle>
                <DialogDescription>
                  Enregistrez un nouveau coût pour ce dossier.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>Type</Label>
                  <Select 
                    value={formData.type} 
                    onValueChange={(v) => setFormData({ ...formData, type: v as CostType })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(costTypeConfig).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          <span className={config.color}>{config.label}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Description</Label>
                  <Input 
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Description du coût"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Montant</Label>
                    <Input 
                      type="number"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Statut</Label>
                    <Select 
                      value={formData.status} 
                      onValueChange={(v) => setFormData({ ...formData, status: v as CostStatus })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">En attente</SelectItem>
                        <SelectItem value="paid">Payé</SelectItem>
                        <SelectItem value="reimbursed">Remboursé</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Date d'engagement</Label>
                    <Input 
                      type="date"
                      value={formData.incurredAt}
                      onChange={(e) => setFormData({ ...formData, incurredAt: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Date de paiement</Label>
                    <Input 
                      type="date"
                      value={formData.paidAt}
                      onChange={(e) => setFormData({ ...formData, paidAt: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Notes</Label>
                  <Textarea 
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Notes additionnelles"
                    rows={2}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddingCost(false)}>
                  Annuler
                </Button>
                <Button onClick={handleSubmit} disabled={isSubmitting || !formData.description || !formData.amount}>
                  {isSubmitting ? 'Ajout...' : 'Ajouter'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </CardHeader>
      <CardContent>
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
            <p className="text-xs text-muted-foreground mb-1">Total des coûts</p>
            <p className="text-lg font-semibold">{formatCurrency(totalCosts, currency)}</p>
          </div>
          <div className="p-4 rounded-lg bg-green-50 border border-green-200">
            <p className="text-xs text-muted-foreground mb-1">Payé</p>
            <p className="text-lg font-semibold text-green-600">{formatCurrency(paidCosts, currency)}</p>
          </div>
          <div className="p-4 rounded-lg bg-yellow-50 border border-yellow-200">
            <p className="text-xs text-muted-foreground mb-1">En attente</p>
            <p className="text-lg font-semibold text-yellow-600">{formatCurrency(pendingCosts, currency)}</p>
          </div>
          <div className={`p-4 rounded-lg border ${netRecovery >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <p className="text-xs text-muted-foreground mb-1">Récupération nette</p>
            <p className={`text-lg font-semibold ${netRecovery >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(netRecovery, currency)}
            </p>
          </div>
        </div>

        {/* ROI Section */}
        {totalCosts > 0 && (
          <div className="mb-6 p-4 rounded-lg border border-gray-200 bg-white">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium flex items-center gap-2">
                {netRecovery >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                )}
                Retour sur investissement
              </h4>
              <Badge className={netRecovery >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                {roi.toFixed(1)}%
              </Badge>
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Montant récupéré</p>
                <p className="font-medium text-green-600">{formatCurrency(amountRecovered, currency)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Coûts totaux</p>
                <p className="font-medium text-red-600">-{formatCurrency(totalCosts, currency)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Bénéfice net</p>
                <p className={`font-medium ${netRecovery >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(netRecovery, currency)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Costs List */}
        {costs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Aucun coût enregistré</p>
          </div>
        ) : (
          <div className="space-y-2">
            {costs.map((cost) => {
              const config = costTypeConfig[cost.type]
              const statusConfig = costStatusConfig[cost.status]
              
              return (
                <div 
                  key={cost.id} 
                  className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 bg-white hover:shadow-sm transition-shadow"
                >
                  <div className={`p-2 rounded-lg ${config.bgColor}`}>
                    <Receipt className={`h-4 w-4 ${config.color}`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{cost.description}</span>
                      <Badge className={`text-xs ${config.bgColor} ${config.color}`}>
                        {config.label}
                      </Badge>
                      <Badge className={`text-xs ${statusConfig.color}`}>
                        {statusConfig.icon}
                        <span className="ml-1">{statusConfig.label}</span>
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                      <span>Engagé le {format(new Date(cost.incurredAt), 'd MMM yyyy', { locale: fr })}</span>
                      {cost.paidAt && (
                        <span>Payé le {format(new Date(cost.paidAt), 'd MMM yyyy', { locale: fr })}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatCurrency(cost.amount, cost.currency)}</p>
                    {cost.receiptUrl && (
                      <a href={cost.receiptUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
                        Reçu
                      </a>
                    )}
                  </div>
                  {(onEditCost || onDeleteCost) && (
                    <div className="flex items-center gap-1">
                      {onEditCost && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0"
                          onClick={() => openEditDialog(cost)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      )}
                      {onDeleteCost && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(cost.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
      
      {/* Edit Dialog */}
      <Dialog open={!!editingCost} onOpenChange={() => setEditingCost(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le coût</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Type</Label>
              <Select 
                value={formData.type} 
                onValueChange={(v) => setFormData({ ...formData, type: v as CostType })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(costTypeConfig).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      <span className={config.color}>{config.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Description</Label>
              <Input 
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Montant</Label>
                <Input 
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Statut</Label>
                <Select 
                  value={formData.status} 
                  onValueChange={(v) => setFormData({ ...formData, status: v as CostStatus })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">En attente</SelectItem>
                    <SelectItem value="paid">Payé</SelectItem>
                    <SelectItem value="reimbursed">Remboursé</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Date d'engagement</Label>
                <Input 
                  type="date"
                  value={formData.incurredAt}
                  onChange={(e) => setFormData({ ...formData, incurredAt: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Date de paiement</Label>
                <Input 
                  type="date"
                  value={formData.paidAt}
                  onChange={(e) => setFormData({ ...formData, paidAt: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingCost(null)}>
              Annuler
            </Button>
            <Button onClick={handleEdit} disabled={isSubmitting}>
              {isSubmitting ? 'Modification...' : 'Modifier'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

export default CostTracker
