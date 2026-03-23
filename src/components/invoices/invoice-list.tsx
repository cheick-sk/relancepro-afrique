'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { 
  MoreHorizontal, 
  Eye, 
  Edit, 
  Trash2, 
  Send, 
  Download,
  DollarSign,
  Search,
  ArrowUpDown,
  CheckSquare,
  XSquare,
  FileText,
  Filter
} from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { formatCurrency, getStatusLabel } from '@/lib/invoices/generator'
import { InvoiceStatusBadge, InvoiceStatusBadgeCompact, type InvoiceStatus } from './invoice-status-badge'

interface InvoiceListItem {
  id: string
  number: string
  status: InvoiceStatus
  issueDate: Date
  dueDate: Date
  subtotal: number
  tax: number
  total: number
  currency: string
  client: {
    id: string
    name: string
    email: string | null
    company: string | null
  }
  _count?: {
    payments: number
  }
  createdAt: Date
}

interface InvoiceListProps {
  invoices: InvoiceListItem[]
  onRefresh?: () => void
  onDelete?: (id: string) => void
  onSend?: (id: string) => void
  onMarkPaid?: (id: string) => void
  onDownload?: (id: string) => void
  isLoading?: boolean
}

type SortField = 'number' | 'dueDate' | 'issueDate' | 'total' | 'clientName' | 'status'
type SortDirection = 'asc' | 'desc'

// Sort indicator component (outside to avoid creating during render)
function SortIndicator({ 
  field, 
  currentField, 
  direction, 
  onSort 
}: { 
  field: SortField
  currentField: SortField
  direction: SortDirection
  onSort: (field: SortField) => void 
}) {
  return (
    <button 
      onClick={() => onSort(field)}
      className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
    >
      {currentField === field && (
        <ArrowUpDown className={cn(
          'size-3',
          direction === 'desc' && 'rotate-180'
        )} />
      )}
    </button>
  )
}

export function InvoiceList({
  invoices,
  onRefresh,
  onDelete,
  onSend,
  onMarkPaid,
  onDownload,
  isLoading = false
}: InvoiceListProps) {
  const router = useRouter()
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [sortField, setSortField] = useState<SortField>('issueDate')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  
  // Filter invoices
  const filteredInvoices = useMemo(() => {
    let result = [...invoices]
    
    // Apply search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      result = result.filter(invoice => 
        invoice.number.toLowerCase().includes(search) ||
        invoice.client.name.toLowerCase().includes(search) ||
        invoice.client.company?.toLowerCase().includes(search) ||
        invoice.client.email?.toLowerCase().includes(search)
      )
    }
    
    // Apply status filter
    if (statusFilter !== 'all') {
      result = result.filter(invoice => invoice.status === statusFilter)
    }
    
    // Apply sorting
    result.sort((a, b) => {
      let comparison = 0
      
      switch (sortField) {
        case 'number':
          comparison = a.number.localeCompare(b.number)
          break
        case 'dueDate':
          comparison = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
          break
        case 'issueDate':
          comparison = new Date(a.issueDate).getTime() - new Date(b.issueDate).getTime()
          break
        case 'total':
          comparison = a.total - b.total
          break
        case 'clientName':
          comparison = a.client.name.localeCompare(b.client.name)
          break
        case 'status':
          comparison = a.status.localeCompare(b.status)
          break
      }
      
      return sortDirection === 'asc' ? comparison : -comparison
    })
    
    return result
  }, [invoices, searchTerm, statusFilter, sortField, sortDirection])
  
  // Toggle sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }
  
  // Toggle select all
  const handleSelectAll = () => {
    if (selectedIds.length === filteredInvoices.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(filteredInvoices.map(i => i.id))
    }
  }
  
  // Toggle select one
  const handleSelectOne = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id))
    } else {
      setSelectedIds([...selectedIds, id])
    }
  }
  
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-lg">Factures</CardTitle>
            <CardDescription>
              {filteredInvoices.length} facture{filteredInvoices.length !== 1 ? 's' : ''}
              {selectedIds.length > 0 && ` (${selectedIds.length} sélectionnée${selectedIds.length !== 1 ? 's' : ''})`}
            </CardDescription>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 w-48"
              />
            </div>
            
            {/* Status filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36">
                <Filter className="size-4 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="draft">Brouillons</SelectItem>
                <SelectItem value="sent">Envoyées</SelectItem>
                <SelectItem value="paid">Payées</SelectItem>
                <SelectItem value="overdue">En retard</SelectItem>
                <SelectItem value="cancelled">Annulées</SelectItem>
              </SelectContent>
            </Select>
            
            {/* Bulk actions */}
            {selectedIds.length > 0 && (
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedIds([])}
                >
                  <XSquare className="size-4 mr-1" />
                  Annuler
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            Chargement...
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="size-12 mx-auto mb-2 opacity-50" />
            <p>Aucune facture trouvée</p>
            {(searchTerm || statusFilter !== 'all') && (
              <Button
                variant="link"
                size="sm"
                onClick={() => {
                  setSearchTerm('')
                  setStatusFilter('all')
                }}
              >
                Réinitialiser les filtres
              </Button>
            )}
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={selectedIds.length === filteredInvoices.length}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead className="w-32">
                    <div className="flex items-center gap-1">
                      N° <SortIndicator field="number" currentField={sortField} direction={sortDirection} onSort={handleSort} />
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center gap-1">
                      Client <SortIndicator field="clientName" currentField={sortField} direction={sortDirection} onSort={handleSort} />
                    </div>
                  </TableHead>
                  <TableHead className="w-28">
                    <div className="flex items-center gap-1">
                      Émission <SortIndicator field="issueDate" currentField={sortField} direction={sortDirection} onSort={handleSort} />
                    </div>
                  </TableHead>
                  <TableHead className="w-28">
                    <div className="flex items-center gap-1">
                      Échéance <SortIndicator field="dueDate" currentField={sortField} direction={sortDirection} onSort={handleSort} />
                    </div>
                  </TableHead>
                  <TableHead className="w-24">
                    <div className="flex items-center gap-1">
                      Total <SortIndicator field="total" currentField={sortField} direction={sortDirection} onSort={handleSort} />
                    </div>
                  </TableHead>
                  <TableHead className="w-28">
                    <div className="flex items-center gap-1">
                      Statut <SortIndicator field="status" currentField={sortField} direction={sortDirection} onSort={handleSort} />
                    </div>
                  </TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.map((invoice) => (
                  <TableRow
                    key={invoice.id}
                    className={cn(
                      'cursor-pointer',
                      selectedIds.includes(invoice.id) && 'bg-muted/50'
                    )}
                    onClick={() => router.push(`/invoices/${invoice.id}`)}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedIds.includes(invoice.id)}
                        onCheckedChange={() => handleSelectOne(invoice.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <span className="font-mono font-medium">{invoice.number}</span>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{invoice.client.name}</div>
                        {invoice.client.company && (
                          <div className="text-xs text-muted-foreground">
                            {invoice.client.company}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(invoice.issueDate, 'dd/MM/yy')}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(invoice.dueDate, 'dd/MM/yy')}
                    </TableCell>
                    <TableCell className="font-medium text-right">
                      {formatCurrency(invoice.total, invoice.currency)}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <InvoiceStatusBadgeCompact status={invoice.status} />
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => router.push(`/invoices/${invoice.id}`)}>
                            <Eye className="size-4 mr-2" />
                            Voir
                          </DropdownMenuItem>
                          {invoice.status === 'draft' && (
                            <DropdownMenuItem onClick={() => router.push(`/invoices/${invoice.id}?edit=true`)}>
                              <Edit className="size-4 mr-2" />
                              Modifier
                            </DropdownMenuItem>
                          )}
                          {invoice.status === 'draft' && onSend && (
                            <DropdownMenuItem onClick={() => onSend(invoice.id)}>
                              <Send className="size-4 mr-2" />
                              Envoyer
                            </DropdownMenuItem>
                          )}
                          {invoice.status === 'sent' && onMarkPaid && (
                            <DropdownMenuItem onClick={() => onMarkPaid(invoice.id)}>
                              <DollarSign className="size-4 mr-2" />
                              Marquer comme payée
                            </DropdownMenuItem>
                          )}
                          {onDownload && (
                            <DropdownMenuItem onClick={() => onDownload(invoice.id)}>
                              <Download className="size-4 mr-2" />
                              Télécharger PDF
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          {invoice.status === 'draft' && onDelete && (
                            <DropdownMenuItem 
                              onClick={() => onDelete(invoice.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="size-4 mr-2" />
                              Supprimer
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Stats cards component
export function InvoiceStats({ 
  stats 
}: { 
  stats: {
    total: number
    totalAmount: number
    byStatus: Record<string, { count: number; total: number }>
    currency?: string
  }
}) {
  const currency = stats.currency || 'GNF'
  
  const statusCards = [
    { 
      status: 'draft', 
      label: 'Brouillons', 
      color: 'text-gray-600',
      bgColor: 'bg-gray-100'
    },
    { 
      status: 'sent', 
      label: 'Envoyées', 
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    { 
      status: 'paid', 
      label: 'Payées', 
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    { 
      status: 'overdue', 
      label: 'En retard', 
      color: 'text-red-600',
      bgColor: 'bg-red-50'
    }
  ]
  
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {statusCards.map(({ status, label, color, bgColor }) => {
        const data = stats.byStatus[status] || { count: 0, total: 0 }
        
        return (
          <Card key={status}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{label}</p>
                  <p className="text-2xl font-bold">{data.count}</p>
                </div>
                <div className={cn('size-10 rounded-full flex items-center justify-center', bgColor)}>
                  <FileText className={cn('size-5', color)} />
                </div>
              </div>
              {data.total > 0 && (
                <p className="text-sm font-medium mt-2">
                  {formatCurrency(data.total, currency)}
                </p>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
