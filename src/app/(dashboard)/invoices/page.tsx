'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Plus, 
  FileText, 
  Send, 
  CheckCircle, 
  AlertTriangle,
  Clock,
  XCircle
} from 'lucide-react'
import { InvoiceList, InvoiceStats } from '@/components/invoices/invoice-list'
import { toast } from 'sonner'

interface Invoice {
  id: string
  number: string
  status: string
  issueDate: string
  dueDate: string
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
  createdAt: string
}

interface InvoiceStatsData {
  total: number
  totalAmount: number
  byStatus: Record<string, { count: number; total: number }>
}

export default function InvoicesPage() {
  const router = useRouter()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [stats, setStats] = useState<InvoiceStatsData>({
    total: 0,
    totalAmount: 0,
    byStatus: {}
  })
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')
  
  // Fetch invoices
  const fetchInvoices = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/invoices')
      
      if (!response.ok) {
        throw new Error('Erreur lors du chargement des factures')
      }
      
      const data = await response.json()
      setInvoices(data.invoices || [])
      setStats(data.stats || {
        total: 0,
        totalAmount: 0,
        byStatus: {}
      })
    } catch (error) {
      console.error('Error fetching invoices:', error)
      toast.error('Erreur lors du chargement des factures')
    } finally {
      setIsLoading(false)
    }
  }, [])
  
  useEffect(() => {
    fetchInvoices()
  }, [fetchInvoices])
  
  // Handle delete
  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette facture ?')) {
      return
    }
    
    try {
      const response = await fetch(`/api/invoices/${id}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erreur lors de la suppression')
      }
      
      toast.success('Facture supprimée avec succès')
      fetchInvoices()
    } catch (error) {
      console.error('Error deleting invoice:', error)
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la suppression')
    }
  }
  
  // Handle send
  const handleSend = async (id: string) => {
    try {
      const response = await fetch(`/api/invoices/${id}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ channel: 'email' })
      })
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erreur lors de l\'envoi')
      }
      
      toast.success('Facture envoyée avec succès')
      fetchInvoices()
    } catch (error) {
      console.error('Error sending invoice:', error)
      toast.error(error instanceof Error ? error.message : 'Erreur lors de l\'envoi')
    }
  }
  
  // Handle mark as paid
  const handleMarkPaid = async (id: string) => {
    // Find the invoice to get total
    const invoice = invoices.find(i => i.id === id)
    if (!invoice) return
    
    try {
      const response = await fetch(`/api/invoices/${id}/pay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: invoice.total,
          method: 'cash',
          reference: 'Paiement enregistré manuellement'
        })
      })
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erreur lors de l\'enregistrement')
      }
      
      toast.success('Paiement enregistré avec succès')
      fetchInvoices()
    } catch (error) {
      console.error('Error marking invoice as paid:', error)
      toast.error(error instanceof Error ? error.message : 'Erreur lors de l\'enregistrement')
    }
  }
  
  // Handle download
  const handleDownload = async (id: string) => {
    try {
      window.open(`/api/invoices/${id}/pdf`, '_blank')
    } catch (error) {
      console.error('Error downloading invoice:', error)
      toast.error('Erreur lors du téléchargement')
    }
  }
  
  // Filter invoices by tab
  const filteredInvoices = activeTab === 'all' 
    ? invoices 
    : invoices.filter(i => i.status === activeTab)
  
  // Tab counts
  const tabCounts = {
    all: invoices.length,
    draft: invoices.filter(i => i.status === 'draft').length,
    sent: invoices.filter(i => i.status === 'sent').length,
    paid: invoices.filter(i => i.status === 'paid').length,
    overdue: invoices.filter(i => i.status === 'overdue').length,
    cancelled: invoices.filter(i => i.status === 'cancelled').length
  }
  
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Factures</h1>
          <p className="text-muted-foreground">
            Gérez vos factures et suivez les paiements
          </p>
        </div>
        <Button onClick={() => router.push('/invoices/new')}>
          <Plus className="size-4 mr-2" />
          Nouvelle facture
        </Button>
      </div>
      
      {/* Stats */}
      <InvoiceStats stats={stats} />
      
      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all" className="gap-1">
            <FileText className="size-4" />
            Toutes
            <span className="ml-1 text-xs bg-muted rounded-full px-1.5">
              {tabCounts.all}
            </span>
          </TabsTrigger>
          <TabsTrigger value="draft" className="gap-1">
            <FileText className="size-4" />
            Brouillons
            {tabCounts.draft > 0 && (
              <span className="ml-1 text-xs bg-muted rounded-full px-1.5">
                {tabCounts.draft}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="sent" className="gap-1">
            <Send className="size-4" />
            Envoyées
            {tabCounts.sent > 0 && (
              <span className="ml-1 text-xs bg-muted rounded-full px-1.5">
                {tabCounts.sent}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="paid" className="gap-1">
            <CheckCircle className="size-4" />
            Payées
            {tabCounts.paid > 0 && (
              <span className="ml-1 text-xs bg-muted rounded-full px-1.5">
                {tabCounts.paid}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="overdue" className="gap-1">
            <AlertTriangle className="size-4" />
            En retard
            {tabCounts.overdue > 0 && (
              <span className="ml-1 text-xs bg-destructive text-destructive-foreground rounded-full px-1.5">
                {tabCounts.overdue}
              </span>
            )}
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value={activeTab} className="mt-4">
          <InvoiceList
            invoices={filteredInvoices}
            onRefresh={fetchInvoices}
            onDelete={handleDelete}
            onSend={handleSend}
            onMarkPaid={handleMarkPaid}
            onDownload={handleDownload}
            isLoading={isLoading}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
