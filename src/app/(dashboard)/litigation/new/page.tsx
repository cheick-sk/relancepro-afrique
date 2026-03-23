'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ArrowLeft,
  Scale,
  Loader2,
  AlertCircle,
  User,
  FileText,
  DollarSign
} from 'lucide-react'
import Link from 'next/link'

interface Client {
  id: string
  name: string
  company: string | null
  email: string | null
  phone: string | null
}

interface Debt {
  id: string
  reference: string | null
  amount: number
  currency: string
  status: string
  description: string | null
  dueDate: string
}

export default function NewLitigationPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [clients, setClients] = useState<Client[]>([])
  const [debts, setDebts] = useState<Debt[]>([])
  const [loadingClients, setLoadingClients] = useState(true)
  
  const [formData, setFormData] = useState({
    clientId: searchParams.get('clientId') || '',
    debtId: searchParams.get('debtId') || '',
    type: 'pre_legal',
    amount: '',
    currency: 'GNF',
    notes: ''
  })

  useEffect(() => {
    fetchClients()
  }, [])

  useEffect(() => {
    if (formData.clientId) {
      fetchDebts(formData.clientId)
    } else {
      setDebts([])
    }
  }, [formData.clientId])

  const fetchClients = async () => {
    try {
      const response = await fetch('/api/clients?limit=100')
      if (response.ok) {
        const data = await response.json()
        setClients(data.clients || data.data || [])
      }
    } catch (err) {
      console.error('Error fetching clients:', err)
    } finally {
      setLoadingClients(false)
    }
  }

  const fetchDebts = async (clientId: string) => {
    try {
      const response = await fetch(`/api/debts?clientId=${clientId}&limit=100`)
      if (response.ok) {
        const data = await response.json()
        setDebts(data.debts || data.data || [])
        
        // Auto-fill amount from first unpaid debt
        const unpaidDebts = (data.debts || data.data || []).filter(
          (d: Debt) => d.status === 'pending' || d.status === 'partial'
        )
        if (unpaidDebts.length > 0 && !formData.amount) {
          setFormData(prev => ({
            ...prev,
            amount: unpaidDebts[0].amount.toString(),
            currency: unpaidDebts[0].currency
          }))
        }
      }
    } catch (err) {
      console.error('Error fetching debts:', err)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/litigation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: formData.clientId,
          debtId: formData.debtId || null,
          type: formData.type,
          amount: parseFloat(formData.amount),
          currency: formData.currency,
          notes: formData.notes || null
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erreur lors de la création')
      }

      const litigation = await response.json()
      router.push(`/litigation/${litigation.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue')
    } finally {
      setIsLoading(false)
    }
  }

  const typeOptions = [
    { value: 'pre_legal', label: 'Pré-judiciaire', description: 'Mise en demeure, formal notices' },
    { value: 'mediation', label: 'Médiation', description: 'Médiation par tiers' },
    { value: 'court', label: 'Tribunal', description: 'Procédure judiciaire' },
    { value: 'enforcement', label: 'Exécution', description: 'Huissier, saisie' }
  ]

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('fr-GN', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0
    }).format(amount)
  }

  return (
    <div className="flex-1 space-y-6 p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/litigation">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Scale className="h-6 w-6" />
            Nouveau dossier contentieux
          </h1>
          <p className="text-muted-foreground">
            Créez un nouveau dossier pour poursuivre une créance
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          {/* Client Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Client / Débiteur
              </CardTitle>
              <CardDescription>
                Sélectionnez le client concerné par ce dossier
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="clientId">Client *</Label>
                <Select 
                  value={formData.clientId} 
                  onValueChange={(v) => setFormData({ ...formData, clientId: v, debtId: '' })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un client" />
                  </SelectTrigger>
                  <SelectContent>
                    {loadingClients ? (
                      <SelectItem value="_loading" disabled>
                        Chargement...
                      </SelectItem>
                    ) : clients.length === 0 ? (
                      <SelectItem value="_empty" disabled>
                        Aucun client disponible
                      </SelectItem>
                    ) : (
                      clients.map(client => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                          {client.company && ` (${client.company})`}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {formData.clientId && debts.length > 0 && (
                <div className="grid gap-2">
                  <Label htmlFor="debtId">Créance associée (optionnelle)</Label>
                  <Select 
                    value={formData.debtId} 
                    onValueChange={(v) => {
                      const debt = debts.find(d => d.id === v)
                      setFormData({ 
                        ...formData, 
                        debtId: v === '_none' ? '' : v,
                        amount: debt ? (debt.amount - (debt.paidAmount || 0)).toString() : formData.amount,
                        currency: debt?.currency || formData.currency
                      })
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner une créance" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">Aucune créance associée</SelectItem>
                      {debts.map(debt => (
                        <SelectItem key={debt.id} value={debt.id}>
                          {debt.reference || 'Sans référence'} - {formatCurrency(debt.amount, debt.currency)} 
                          <span className="text-muted-foreground ml-2">({debt.status})</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Litigation Type */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Type de procédure
              </CardTitle>
              <CardDescription>
                Choisissez le type de procédure contentieuse
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label>Type de procédure *</Label>
                <div className="grid grid-cols-2 gap-2">
                  {typeOptions.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      className={`p-4 text-left rounded-lg border-2 transition-colors ${
                        formData.type === opt.value
                          ? 'border-primary bg-primary/5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setFormData({ ...formData, type: opt.value as any })}
                    >
                      <p className="font-medium">{opt.label}</p>
                      <p className="text-xs text-muted-foreground">{opt.description}</p>
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Amount */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Montant réclamé
              </CardTitle>
              <CardDescription>
                Indiquez le montant de la créance en contentieux
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2 grid gap-2">
                  <Label htmlFor="amount">Montant *</Label>
                  <Input
                    id="amount"
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="0"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Devise</Label>
                  <Select 
                    value={formData.currency} 
                    onValueChange={(v) => setFormData({ ...formData, currency: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GNF">GNF</SelectItem>
                      <SelectItem value="XOF">XOF</SelectItem>
                      <SelectItem value="XAF">XAF</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Notes additionnelles</CardTitle>
              <CardDescription>
                Ajoutez des informations complémentaires sur ce dossier
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Notes sur le dossier, contexte, historique..."
                rows={4}
              />
            </CardContent>
          </Card>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-4 text-sm text-destructive bg-destructive/10 rounded-lg">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-4">
            <Button type="button" variant="outline" asChild>
              <Link href="/litigation">Annuler</Link>
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading || !formData.clientId || !formData.amount}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Création...
                </>
              ) : (
                <>
                  <Scale className="mr-2 h-4 w-4" />
                  Créer le dossier
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
