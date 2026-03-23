'use client'

import { useState, useEffect, useCallback, use } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { 
  ArrowLeft, 
  Send, 
  Download, 
  DollarSign, 
  Edit, 
  Trash2,
  CheckCircle,
  Clock,
  AlertTriangle,
  Mail,
  Phone,
  Building2,
  Calendar,
  FileText,
  History
} from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { InvoicePreview } from '@/components/invoices/invoice-preview'
import { InvoiceStatusBadge } from '@/components/invoices/invoice-status-badge'
import { InvoiceItems } from '@/components/invoices/invoice-items'
import { formatCurrency, getStatusLabel } from '@/lib/invoices/generator'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface InvoiceDetail {
  id: string
  number: string
  status: string
  issueDate: Date
  dueDate: Date
  subtotal: number
  tax: number
  total: number
  currency: string
  notes: string | null
  terms: string | null
  paidAt: Date | null
  cancelledAt: Date | null
  sentAt: Date | null
  createdAt: Date
  client: {
    id: string
    name: string
    email: string | null
    phone: string | null
    company: string | null
    address: string | null
  }
  profile: {
    id: string
    name: string | null
    email: string
    companyName: string | null
    phone: string | null
  }
  items: Array<{
    id: string
    description: string
    quantity: number
    unitPrice: number
    total: number
  }>
  payments: Array<{
    id: string
    amount: number
    method: string
    reference: string | null
    paidAt: Date
  }>
  debt: {
    id: string
    reference: string | null
    amount: number
  } | null
  paidAmount: number
  remainingAmount: number
  isFullyPaid: boolean
}

const paymentMethods = [
  { value: 'card', label: 'Carte bancaire' },
  { value: 'mobile_money', label: 'Mobile Money' },
  { value: 'bank_transfer', label: 'Virement bancaire' },
  { value: 'cash', label: 'Espèces' },
  { value: 'check', label: 'Chèque' }
]

export default function InvoiceDetailPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = use(params)
  const router = useRouter()
  const searchParams = useSearchParams()
  const isEditing = searchParams.get('edit') === 'true'
  
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)
  const [showSendDialog, setShowSendDialog] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [paymentReference, setPaymentReference] = useState('')
  const [sendChannel, setSendChannel] = useState<'email' | 'whatsapp'>('email')
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Fetch invoice
  const fetchInvoice = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/invoices/${id}`)
      
      if (!response.ok) {
        throw new Error('Erreur lors du chargement de la facture')
      }
      
      const data = await response.json()
      setInvoice(data)
      
      // Set default payment amount
      setPaymentAmount(data.remainingAmount?.toString() || data.total?.toString() || '0')
    } catch (error) {
      console.error('Error fetching invoice:', error)
      toast.error('Erreur lors du chargement de la facture')
    } finally {
      setIsLoading(false)
    }
  }, [id])
  
  useEffect(() => {
    fetchInvoice()
  }, [fetchInvoice])
  
  // Handle download
  const handleDownload = async () => {
    try {
      window.open(`/api/invoices/${id}/pdf`, '_blank')
    } catch (error) {
      console.error('Error downloading invoice:', error)
      toast.error('Erreur lors du téléchargement')
    }
  }
  
  // Handle send
  const handleSend = async () => {
    try {
      setIsSubmitting(true)
      const response = await fetch(`/api/invoices/${id}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ channel: sendChannel })
      })
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erreur lors de l\'envoi')
      }
      
      toast.success(`Facture envoyée via ${sendChannel === 'email' ? 'email' : 'WhatsApp'}`)
      setShowSendDialog(false)
      fetchInvoice()
    } catch (error) {
      console.error('Error sending invoice:', error)
      toast.error(error instanceof Error ? error.message : 'Erreur lors de l\'envoi')
    } finally {
      setIsSubmitting(false)
    }
  }
  
  // Handle payment
  const handlePayment = async () => {
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      toast.error('Veuillez entrer un montant valide')
      return
    }
    
    try {
      setIsSubmitting(true)
      const response = await fetch(`/api/invoices/${id}/pay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: parseFloat(paymentAmount),
          method: paymentMethod,
          reference: paymentReference
        })
      })
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erreur lors de l\'enregistrement')
      }
      
      const result = await response.json()
      toast.success(result.message)
      setShowPaymentDialog(false)
      fetchInvoice()
    } catch (error) {
      console.error('Error recording payment:', error)
      toast.error(error instanceof Error ? error.message : 'Erreur lors de l\'enregistrement')
    } finally {
      setIsSubmitting(false)
    }
  }
  
  // Handle delete
  const handleDelete = async () => {
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
      router.push('/invoices')
    } catch (error) {
      console.error('Error deleting invoice:', error)
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la suppression')
    }
  }
  
  // Format payment method
  const formatPaymentMethod = (method: string) => {
    return paymentMethods.find(m => m.value === method)?.label || method
  }
  
  // Status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft':
        return <FileText className="size-5" />
      case 'sent':
        return <Send className="size-5" />
      case 'paid':
        return <CheckCircle className="size-5" />
      case 'overdue':
        return <AlertTriangle className="size-5" />
      case 'cancelled':
        return <FileText className="size-5" />
      default:
        return <Clock className="size-5" />
    }
  }
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    )
  }
  
  if (!invoice) {
    return (
      <div className="text-center py-12">
        <FileText className="size-12 mx-auto mb-4 text-muted-foreground opacity-50" />
        <h2 className="text-xl font-semibold mb-2">Facture non trouvée</h2>
        <p className="text-muted-foreground mb-4">
          La facture demandée n&apos;existe pas ou vous n&apos;y avez pas accès.
        </p>
        <Button onClick={() => router.push('/invoices')}>
          <ArrowLeft className="size-4 mr-2" />
          Retour aux factures
        </Button>
      </div>
    )
  }
  
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/invoices')}
          >
            <ArrowLeft className="size-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">
                Facture {invoice.number}
              </h1>
              <InvoiceStatusBadge status={invoice.status} />
            </div>
            <p className="text-muted-foreground">
              Créée le {format(new Date(invoice.createdAt), 'dd MMMM yyyy', { locale: fr })}
            </p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          {invoice.status === 'draft' && (
            <>
              <Button variant="outline" onClick={() => router.push(`/invoices/${id}?edit=true`)}>
                <Edit className="size-4 mr-2" />
                Modifier
              </Button>
              <Button onClick={() => setShowSendDialog(true)}>
                <Send className="size-4 mr-2" />
                Envoyer
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                <Trash2 className="size-4 mr-2" />
                Supprimer
              </Button>
            </>
          )}
          
          {invoice.status === 'sent' && (
            <>
              <Button variant="outline" onClick={() => setShowPaymentDialog(true)}>
                <DollarSign className="size-4 mr-2" />
                Enregistrer un paiement
              </Button>
              <Button variant="outline" onClick={() => setShowSendDialog(true)}>
                <Send className="size-4 mr-2" />
                Renvoyer
              </Button>
            </>
          )}
          
          {(invoice.status === 'sent' || invoice.status === 'overdue') && !invoice.isFullyPaid && (
            <Button onClick={() => setShowPaymentDialog(true)}>
              <DollarSign className="size-4 mr-2" />
              Marquer comme payée
            </Button>
          )}
          
          <Button variant="outline" onClick={handleDownload}>
            <Download className="size-4 mr-2" />
            PDF
          </Button>
        </div>
      </div>
      
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{formatCurrency(invoice.total, invoice.currency)}</p>
              </div>
              <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center">
                <FileText className="size-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Payé</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(invoice.paidAmount, invoice.currency)}
                </p>
              </div>
              <div className="size-10 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="size-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Reste</p>
                <p className="text-2xl font-bold text-orange-600">
                  {formatCurrency(invoice.remainingAmount, invoice.currency)}
                </p>
              </div>
              <div className="size-10 rounded-full bg-orange-100 flex items-center justify-center">
                <Clock className="size-5 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Échéance</p>
                <p className="text-lg font-bold">
                  {format(new Date(invoice.dueDate), 'dd MMM', { locale: fr })}
                </p>
              </div>
              <div className="size-10 rounded-full bg-muted flex items-center justify-center">
                <Calendar className="size-5 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Main Content */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Invoice Preview */}
        <div className="lg:col-span-2">
          <InvoicePreview
            invoice={invoice}
            onDownload={handleDownload}
            showActions
          />
        </div>
        
        {/* Sidebar */}
        <div className="space-y-6">
          {/* Client Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Client</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Building2 className="size-5 text-primary" />
                </div>
                <div>
                  <div className="font-medium">{invoice.client.name}</div>
                  {invoice.client.company && (
                    <div className="text-sm text-muted-foreground">
                      {invoice.client.company}
                    </div>
                  )}
                </div>
              </div>
              
              {invoice.client.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="size-4 text-muted-foreground" />
                  <a href={`mailto:${invoice.client.email}`} className="hover:underline">
                    {invoice.client.email}
                  </a>
                </div>
              )}
              
              {invoice.client.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="size-4 text-muted-foreground" />
                  <a href={`tel:${invoice.client.phone}`} className="hover:underline">
                    {invoice.client.phone}
                  </a>
                </div>
              )}
              
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={() => router.push(`/clients/${invoice.client.id}`)}
              >
                Voir le client
              </Button>
            </CardContent>
          </Card>
          
          {/* Linked Debt */}
          {invoice.debt && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Créance liée</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-muted-foreground">Référence</div>
                    <div className="font-medium">{invoice.debt.reference || 'N/A'}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">Montant</div>
                    <div className="font-medium">
                      {formatCurrency(invoice.debt.amount, invoice.currency)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Payment History */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <History className="size-4" />
                Historique des paiements
              </CardTitle>
            </CardHeader>
            <CardContent>
              {invoice.payments.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground text-sm">
                  Aucun paiement enregistré
                </div>
              ) : (
                <div className="space-y-3">
                  {invoice.payments.map((payment) => (
                    <div 
                      key={payment.id}
                      className="flex items-center justify-between p-2 bg-muted/50 rounded-lg text-sm"
                    >
                      <div>
                        <div className="font-medium">
                          {formatCurrency(payment.amount, invoice.currency)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatPaymentMethod(payment.method)}
                          {payment.reference && ` - ${payment.reference}`}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(payment.paidAt), 'dd/MM/yyyy')}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {!invoice.isFullyPaid && invoice.status !== 'cancelled' && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-3"
                  onClick={() => setShowPaymentDialog(true)}
                >
                  <DollarSign className="size-4 mr-2" />
                  Enregistrer un paiement
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enregistrer un paiement</DialogTitle>
            <DialogDescription>
              Enregistrez un paiement pour cette facture.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Total facture:</span>
                <span className="font-medium ml-2">
                  {formatCurrency(invoice.total, invoice.currency)}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Reste à payer:</span>
                <span className="font-medium ml-2 text-orange-600">
                  {formatCurrency(invoice.remainingAmount, invoice.currency)}
                </span>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Montant du paiement</Label>
              <Input
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                min="0.01"
                max={invoice.remainingAmount}
                step="0.01"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Mode de paiement</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map((method) => (
                    <SelectItem key={method.value} value={method.value}>
                      {method.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Référence (optionnel)</Label>
              <Input
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                placeholder="Numéro de transaction, etc."
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handlePayment} disabled={isSubmitting}>
              {isSubmitting ? 'Enregistrement...' : 'Enregistrer le paiement'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Send Dialog */}
      <Dialog open={showSendDialog} onOpenChange={setShowSendDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Envoyer la facture</DialogTitle>
            <DialogDescription>
              Choisissez comment envoyer cette facture au client.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Button
                variant={sendChannel === 'email' ? 'default' : 'outline'}
                className="h-auto py-4"
                onClick={() => setSendChannel('email')}
              >
                <div className="text-center">
                  <Mail className="size-6 mx-auto mb-2" />
                  <div className="font-medium">Email</div>
                  {invoice.client.email && (
                    <div className="text-xs opacity-70 mt-1">
                      {invoice.client.email}
                    </div>
                  )}
                </div>
              </Button>
              
              <Button
                variant={sendChannel === 'whatsapp' ? 'default' : 'outline'}
                className="h-auto py-4"
                onClick={() => setSendChannel('whatsapp')}
                disabled={!invoice.client.phone}
              >
                <div className="text-center">
                  <Phone className="size-6 mx-auto mb-2" />
                  <div className="font-medium">WhatsApp</div>
                  {invoice.client.phone ? (
                    <div className="text-xs opacity-70 mt-1">
                      {invoice.client.phone}
                    </div>
                  ) : (
                    <div className="text-xs opacity-70 mt-1 text-destructive">
                      Non configuré
                    </div>
                  )}
                </div>
              </Button>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSendDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleSend} disabled={isSubmitting}>
              {isSubmitting ? 'Envoi...' : 'Envoyer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
