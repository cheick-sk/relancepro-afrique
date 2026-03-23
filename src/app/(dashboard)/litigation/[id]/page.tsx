'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  ArrowLeft,
  Scale,
  Loader2,
  AlertCircle,
  User,
  DollarSign,
  Calendar,
  Trash2,
  Edit2,
  Save,
  FileText,
  Users,
  Clock
} from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { StatusBadge } from '@/components/litigation/status-badge'
import { TypeBadge } from '@/components/litigation/type-badge'
import { CaseTimeline } from '@/components/litigation/case-timeline'
import { PartiesManager } from '@/components/litigation/parties-manager'
import { DocumentsManager } from '@/components/litigation/documents-manager'
import { CostTracker } from '@/components/litigation/cost-tracker'

interface Litigation {
  id: string
  reference: string
  status: 'pending' | 'in_progress' | 'closed' | 'won' | 'lost'
  type: 'pre_legal' | 'mediation' | 'court' | 'enforcement'
  stage: string
  amount: number
  amountRecovered: number
  currency: string
  legalCosts: number
  courtCosts: number
  bailiffCosts: number
  totalCosts: number
  notes: string | null
  filedAt: string | null
  closedAt: string | null
  createdAt: string
  updatedAt: string
  client: {
    id: string
    name: string
    company: string | null
    email: string | null
    phone: string | null
    address: string | null
  }
  debt: {
    id: string
    reference: string | null
    amount: number
    currency: string
    status: string
    description: string | null
    dueDate: string
  } | null
  parties: any[]
  documents: any[]
  events: any[]
  costs: any[]
  calculatedTotalCosts: number
}

const stageOptions = [
  { value: 'initial', label: 'Initial' },
  { value: 'assigned', label: 'Assigné' },
  { value: 'hearing', label: 'Audience' },
  { value: 'judgment', label: 'Jugement' },
  { value: 'execution', label: 'Exécution' }
]

const statusOptions = [
  { value: 'pending', label: 'En attente' },
  { value: 'in_progress', label: 'En cours' },
  { value: 'closed', label: 'Clôturé' },
  { value: 'won', label: 'Gagné' },
  { value: 'lost', label: 'Perdu' }
]

export default function LitigationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const router = useRouter()
  
  const [litigation, setLitigation] = useState<Litigation | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  
  const [editForm, setEditForm] = useState({
    status: '',
    stage: '',
    amount: '',
    amountRecovered: '',
    notes: ''
  })

  const fetchLitigation = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/litigation/${resolvedParams.id}`)
      if (!response.ok) throw new Error('Dossier non trouvé')
      
      const data = await response.json()
      setLitigation(data)
      setEditForm({
        status: data.status,
        stage: data.stage,
        amount: data.amount.toString(),
        amountRecovered: data.amountRecovered.toString(),
        notes: data.notes || ''
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchLitigation()
  }, [resolvedParams.id])

  const handleSave = async () => {
    if (!litigation) return
    setIsSaving(true)
    
    try {
      const response = await fetch(`/api/litigation/${litigation.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: editForm.status,
          stage: editForm.stage,
          amount: parseFloat(editForm.amount),
          amountRecovered: parseFloat(editForm.amountRecovered),
          notes: editForm.notes || null
        })
      })
      
      if (!response.ok) throw new Error('Erreur lors de la sauvegarde')
      
      await fetchLitigation()
      setIsEditing(false)
    } catch (err) {
      console.error('Error saving:', err)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!litigation) return
    
    try {
      const response = await fetch(`/api/litigation/${litigation.id}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) throw new Error('Erreur lors de la suppression')
      
      router.push('/litigation')
    } catch (err) {
      console.error('Error deleting:', err)
    }
  }

  // Event handlers
  const handleAddEvent = async (event: Partial<any>) => {
    const response = await fetch(`/api/litigation/${litigation?.id}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event)
    })
    if (response.ok) fetchLitigation()
  }

  const handleEditEvent = async (id: string, event: Partial<any>) => {
    // TODO: Implement edit event endpoint
    console.log('Edit event:', id, event)
  }

  const handleDeleteEvent = async (id: string) => {
    // TODO: Implement delete event endpoint
    console.log('Delete event:', id)
  }

  // Party handlers
  const handleAddParty = async (party: Partial<any>) => {
    const response = await fetch(`/api/litigation/${litigation?.id}/parties`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(party)
    })
    if (response.ok) fetchLitigation()
  }

  const handleEditParty = async (id: string, party: Partial<any>) => {
    const response = await fetch(`/api/litigation/${litigation?.id}/parties`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ partyId: id, ...party })
    })
    if (response.ok) fetchLitigation()
  }

  const handleDeleteParty = async (id: string) => {
    const response = await fetch(`/api/litigation/${litigation?.id}/parties?partyId=${id}`, {
      method: 'DELETE'
    })
    if (response.ok) fetchLitigation()
  }

  // Cost handlers
  const handleAddCost = async (cost: Partial<any>) => {
    const response = await fetch(`/api/litigation/${litigation?.id}/costs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cost)
    })
    if (response.ok) fetchLitigation()
  }

  const handleEditCost = async (id: string, cost: Partial<any>) => {
    const response = await fetch(`/api/litigation/${litigation?.id}/costs`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ costId: id, ...cost })
    })
    if (response.ok) fetchLitigation()
  }

  const handleDeleteCost = async (id: string) => {
    const response = await fetch(`/api/litigation/${litigation?.id}/costs?costId=${id}`, {
      method: 'DELETE'
    })
    if (response.ok) fetchLitigation()
  }

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('fr-GN', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0
    }).format(amount)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !litigation) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
          <p className="text-destructive font-medium">{error || 'Dossier non trouvé'}</p>
          <Button variant="outline" onClick={() => router.push('/litigation')} className="mt-4">
            Retour aux dossiers
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/litigation">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{litigation.reference}</h1>
              <StatusBadge status={litigation.status} />
              <TypeBadge type={litigation.type} />
            </div>
            <p className="text-muted-foreground">
              Créé le {format(new Date(litigation.createdAt), 'd MMMM yyyy', { locale: fr })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                Annuler
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Sauvegarder
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setIsEditing(true)}>
                <Edit2 className="mr-2 h-4 w-4" />
                Modifier
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Supprimer
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Supprimer le dossier ?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Cette action est irréversible. Toutes les données associées (événements, documents, coûts) seront supprimées.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                      Supprimer
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Montant réclamé
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(litigation.amount, litigation.currency)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              Récupéré
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(litigation.amountRecovered, litigation.currency)}
            </p>
            <p className="text-xs text-muted-foreground">
              {litigation.amount > 0 
                ? Math.round((litigation.amountRecovered / litigation.amount) * 100) 
                : 0}% récupéré
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-red-600" />
              Coûts totaux
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">
              {formatCurrency(litigation.calculatedTotalCosts, litigation.currency)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Étape actuelle
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="outline" className="text-base">
              {stageOptions.find(s => s.value === litigation.stage)?.label || litigation.stage}
            </Badge>
            {litigation.filedAt && (
              <p className="text-xs text-muted-foreground mt-2">
                Déposé le {format(new Date(litigation.filedAt), 'd MMM yyyy', { locale: fr })}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Form or Details */}
      {isEditing ? (
        <Card>
          <CardHeader>
            <CardTitle>Modifier le dossier</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Statut</Label>
                <Select value={editForm.status} onValueChange={(v) => setEditForm({ ...editForm, status: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Étape</Label>
                <Select value={editForm.stage} onValueChange={(v) => setEditForm({ ...editForm, stage: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {stageOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Montant réclamé</Label>
                <Input 
                  type="number"
                  value={editForm.amount}
                  onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Montant récupéré</Label>
                <Input 
                  type="number"
                  value={editForm.amountRecovered}
                  onChange={(e) => setEditForm({ ...editForm, amountRecovered: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Notes</Label>
              <Textarea 
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                rows={4}
              />
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - Client Info */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Client / Débiteur
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="font-medium">{litigation.client.name}</p>
                  {litigation.client.company && (
                    <p className="text-sm text-muted-foreground">{litigation.client.company}</p>
                  )}
                </div>
                {litigation.client.email && (
                  <p className="text-sm">{litigation.client.email}</p>
                )}
                {litigation.client.phone && (
                  <p className="text-sm">{litigation.client.phone}</p>
                )}
                {litigation.client.address && (
                  <p className="text-sm text-muted-foreground">{litigation.client.address}</p>
                )}
                <Button variant="outline" size="sm" className="w-full" asChild>
                  <Link href={`/clients/${litigation.client.id}`}>
                    Voir la fiche client
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {litigation.debt && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Créance associée
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="font-medium">{litigation.debt.reference || 'Sans référence'}</p>
                    <p className="text-2xl font-bold">{formatCurrency(litigation.debt.amount, litigation.debt.currency)}</p>
                    <Badge variant="outline" className="mt-1">{litigation.debt.status}</Badge>
                  </div>
                  {litigation.debt.description && (
                    <p className="text-sm text-muted-foreground">{litigation.debt.description}</p>
                  )}
                  <Button variant="outline" size="sm" className="w-full" asChild>
                    <Link href={`/debts?id=${litigation.debt.id}`}>
                      Voir la créance
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )}

            {litigation.notes && (
              <Card>
                <CardHeader>
                  <CardTitle>Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap">{litigation.notes}</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Tabs */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="timeline" className="space-y-4">
              <TabsList className="grid grid-cols-4 w-full">
                <TabsTrigger value="timeline" className="gap-2">
                  <Clock className="h-4 w-4" />
                  Chronologie
                </TabsTrigger>
                <TabsTrigger value="parties" className="gap-2">
                  <Users className="h-4 w-4" />
                  Parties
                </TabsTrigger>
                <TabsTrigger value="documents" className="gap-2">
                  <FileText className="h-4 w-4" />
                  Documents
                </TabsTrigger>
                <TabsTrigger value="costs" className="gap-2">
                  <DollarSign className="h-4 w-4" />
                  Coûts
                </TabsTrigger>
              </TabsList>

              <TabsContent value="timeline">
                <CaseTimeline
                  litigationId={litigation.id}
                  events={litigation.events}
                  onAddEvent={handleAddEvent}
                  onEditEvent={handleEditEvent}
                  onDeleteEvent={handleDeleteEvent}
                />
              </TabsContent>

              <TabsContent value="parties">
                <PartiesManager
                  litigationId={litigation.id}
                  parties={litigation.parties}
                  onAddParty={handleAddParty}
                  onEditParty={handleEditParty}
                  onDeleteParty={handleDeleteParty}
                />
              </TabsContent>

              <TabsContent value="documents">
                <DocumentsManager
                  litigationId={litigation.id}
                  documents={litigation.documents}
                />
              </TabsContent>

              <TabsContent value="costs">
                <CostTracker
                  litigationId={litigation.id}
                  costs={litigation.costs}
                  amountRecovered={litigation.amountRecovered}
                  amountClaimed={litigation.amount}
                  currency={litigation.currency}
                  onAddCost={handleAddCost}
                  onEditCost={handleEditCost}
                  onDeleteCost={handleDeleteCost}
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      )}
    </div>
  )
}
