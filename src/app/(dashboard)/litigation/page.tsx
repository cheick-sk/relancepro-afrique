'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Plus,
  Search,
  Scale,
  Filter,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle
} from 'lucide-react'
import { CaseCard } from '@/components/litigation/case-card'
import { StatusBadge } from '@/components/litigation/status-badge'
import { TypeBadge } from '@/components/litigation/type-badge'

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
  filedAt: string | null
  client: {
    id: string
    name: string
    company: string | null
    email: string | null
    phone: string | null
  }
  debt: {
    id: string
    reference: string | null
    amount: number
    currency: string
  } | null
  nextEvent: {
    title: string
    date: string
  } | null
  _count: {
    documents: number
    parties: number
    events: number
  }
}

interface Pagination {
  page: number
  limit: number
  total: number
  pages: number
}

const statusOptions = [
  { value: 'all', label: 'Tous les statuts' },
  { value: 'pending', label: 'En attente' },
  { value: 'in_progress', label: 'En cours' },
  { value: 'closed', label: 'Clôturé' },
  { value: 'won', label: 'Gagné' },
  { value: 'lost', label: 'Perdu' }
]

const typeOptions = [
  { value: 'all', label: 'Tous les types' },
  { value: 'pre_legal', label: 'Pré-judiciaire' },
  { value: 'mediation', label: 'Médiation' },
  { value: 'court', label: 'Tribunal' },
  { value: 'enforcement', label: 'Exécution' }
]

export default function LitigationPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [litigations, setLitigations] = useState<Litigation[]>([])
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Filters
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all')
  const [typeFilter, setTypeFilter] = useState(searchParams.get('type') || 'all')

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    won: 0,
    lost: 0,
    totalAmount: 0,
    recoveredAmount: 0
  })

  const fetchLitigations = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter)
      if (typeFilter && typeFilter !== 'all') params.set('type', typeFilter)
      params.set('page', pagination.page.toString())
      params.set('limit', pagination.limit.toString())
      
      const response = await fetch(`/api/litigation?${params}`)
      if (!response.ok) throw new Error('Erreur lors du chargement')
      
      const data = await response.json()
      setLitigations(data.data)
      setPagination(data.pagination)
      
      // Calculate stats from data
      if (data.data.length > 0) {
        const allResponse = await fetch('/api/litigation?limit=1000')
        if (allResponse.ok) {
          const allData = await allResponse.json()
          const all = allData.data as Litigation[]
          setStats({
            total: all.length,
            pending: all.filter(l => l.status === 'pending').length,
            inProgress: all.filter(l => l.status === 'in_progress').length,
            won: all.filter(l => l.status === 'won').length,
            lost: all.filter(l => l.status === 'lost').length,
            totalAmount: all.reduce((sum, l) => sum + l.amount, 0),
            recoveredAmount: all.reduce((sum, l) => sum + l.amountRecovered, 0)
          })
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchLitigations()
  }, [statusFilter, typeFilter, pagination.page])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPagination({ ...pagination, page: 1 })
    fetchLitigations()
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-GN', {
      style: 'currency',
      currency: 'GNF',
      minimumFractionDigits: 0
    }).format(amount)
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Scale className="h-6 w-6" />
            Contentieux
          </h1>
          <p className="text-muted-foreground">
            Gérez vos dossiers contentieux et procédures judiciaires
          </p>
        </div>
        <Button onClick={() => router.push('/litigation/new')}>
          <Plus className="mr-2 h-4 w-4" />
          Nouveau dossier
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total dossiers</CardTitle>
            <Scale className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              {stats.pending} en attente, {stats.inProgress} en cours
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taux de succès</CardTitle>
            <Badge variant="secondary" className="bg-green-100 text-green-700">
              {stats.won + stats.lost > 0 
                ? Math.round((stats.won / (stats.won + stats.lost)) * 100) 
                : 0}%
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.won} gagnés</div>
            <p className="text-xs text-muted-foreground">
              {stats.lost} perdus
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Montant réclamé</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalAmount)}</div>
            <p className="text-xs text-muted-foreground">
              Total des créances
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Récupéré</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(stats.recoveredAmount)}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalAmount > 0 
                ? Math.round((stats.recoveredAmount / stats.totalAmount) * 100) 
                : 0}% récupéré
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Rechercher par référence ou client..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button type="submit" variant="secondary">
            Rechercher
          </Button>
        </form>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {typeOptions.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
            <p className="text-destructive font-medium">{error}</p>
            <Button variant="outline" onClick={fetchLitigations} className="mt-4">
              Réessayer
            </Button>
          </div>
        </div>
      ) : litigations.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Scale className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="font-medium text-lg">Aucun dossier trouvé</h3>
            <p className="text-muted-foreground mb-4">
              {search || statusFilter !== 'all' || typeFilter !== 'all'
                ? 'Modifiez vos filtres pour voir plus de résultats'
                : 'Créez votre premier dossier contentieux'}
            </p>
            <Button onClick={() => router.push('/litigation/new')}>
              <Plus className="mr-2 h-4 w-4" />
              Nouveau dossier
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {litigations.map((litigation) => (
              <CaseCard
                key={litigation.id}
                id={litigation.id}
                reference={litigation.reference}
                status={litigation.status}
                type={litigation.type}
                stage={litigation.stage}
                amount={litigation.amount}
                amountRecovered={litigation.amountRecovered}
                currency={litigation.currency}
                clientName={litigation.client.name}
                clientCompany={litigation.client.company}
                filedAt={litigation.filedAt ? new Date(litigation.filedAt) : null}
                nextEvent={litigation.nextEvent ? {
                  title: litigation.nextEvent.title,
                  date: new Date(litigation.nextEvent.date)
                } : null}
                totalCosts={litigation.totalCosts}
              />
            ))}
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page === 1}
                onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
              >
                <ChevronLeft className="h-4 w-4" />
                Précédent
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {pagination.page} sur {pagination.pages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page === pagination.pages}
                onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
              >
                Suivant
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
