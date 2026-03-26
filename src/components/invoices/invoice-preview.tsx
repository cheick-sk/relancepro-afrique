'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { 
  Building2, 
  Mail, 
  Phone, 
  MapPin, 
  Download,
  Eye,
  QrCode
} from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { formatCurrency, getStatusLabel } from '@/lib/invoices/generator'
import { InvoiceStatusBadge } from './invoice-status-badge'
import type { InvoiceData } from '@/lib/invoices/generator'

interface InvoicePreviewProps {
  invoice: InvoiceData
  onDownload?: () => void
  showActions?: boolean
  compact?: boolean
}

export function InvoicePreview({ 
  invoice, 
  onDownload, 
  showActions = false,
  compact = false 
}: InvoicePreviewProps) {
  // Format dates
  const issueDateFormatted = useMemo(
    () => format(invoice.issueDate, 'dd MMMM yyyy', { locale: fr }),
    [invoice.issueDate]
  )
  
  const dueDateFormatted = useMemo(
    () => format(invoice.dueDate, 'dd MMMM yyyy', { locale: fr }),
    [invoice.dueDate]
  )
  
  // Calculate paid amount
  const paidAmount = invoice.payments?.reduce((sum, p) => sum + p.amount, 0) || 0
  const remainingAmount = invoice.total - paidAmount
  
  if (compact) {
    return (
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm opacity-80">Facture</div>
              <div className="text-lg font-bold">{invoice.number}</div>
            </div>
            <InvoiceStatusBadge status={invoice.status} size="sm" />
          </div>
        </div>
        <CardContent className="p-4">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Client</span>
              <span className="font-medium">{invoice.client.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Échéance</span>
              <span>{format(invoice.dueDate, 'dd/MM/yyyy')}</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span>Total</span>
              <span className="text-primary">{formatCurrency(invoice.total, invoice.currency)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }
  
  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-6 text-white">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="size-5" />
              <span className="font-semibold text-lg">
                {invoice.profile.companyName || invoice.profile.name || 'Votre entreprise'}
              </span>
            </div>
            {invoice.profile.email && (
              <div className="flex items-center gap-1 text-sm opacity-90">
                <Mail className="size-3" />
                {invoice.profile.email}
              </div>
            )}
            {invoice.profile.phone && (
              <div className="flex items-center gap-1 text-sm opacity-90">
                <Phone className="size-3" />
                {invoice.profile.phone}
              </div>
            )}
          </div>
          <div className="text-right">
            <div className="text-sm opacity-80">FACTURE</div>
            <div className="text-2xl font-bold">{invoice.number}</div>
            <div className="mt-2">
              <Badge 
                variant="secondary"
                className="bg-white/20 text-white hover:bg-white/30"
              >
                {getStatusLabel(invoice.status)}
              </Badge>
            </div>
          </div>
        </div>
      </div>
      
      {/* Content */}
      <CardContent className="p-6">
        {/* Client and Dates */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Client */}
          <div className="space-y-2">
            <div className="text-sm font-medium text-muted-foreground">FACTURÉ À</div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="font-medium">{invoice.client.name}</div>
              {invoice.client.company && (
                <div className="text-sm text-muted-foreground">{invoice.client.company}</div>
              )}
              {invoice.client.email && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                  <Mail className="size-3" />
                  {invoice.client.email}
                </div>
              )}
              {invoice.client.phone && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Phone className="size-3" />
                  {invoice.client.phone}
                </div>
              )}
              {invoice.client.address && (
                <div className="flex items-start gap-1 text-sm text-muted-foreground">
                  <MapPin className="size-3 mt-0.5" />
                  {invoice.client.address}
                </div>
              )}
            </div>
          </div>
          
          {/* Dates */}
          <div className="space-y-2">
            <div className="text-sm font-medium text-muted-foreground">DÉTAILS</div>
            <div className="p-3 bg-muted/50 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Date d&apos;émission</span>
                <span className="font-medium">{issueDateFormatted}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Date d&apos;échéance</span>
                <span className="font-medium">{dueDateFormatted}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Devise</span>
                <span className="font-medium">{invoice.currency}</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Items Table */}
        <div className="border rounded-lg overflow-hidden mb-6">
          <div className="grid grid-cols-12 gap-2 p-3 bg-muted/50 text-sm font-medium text-muted-foreground">
            <div className="col-span-6">Description</div>
            <div className="col-span-2 text-center">Qté</div>
            <div className="col-span-2 text-right">Prix unit.</div>
            <div className="col-span-2 text-right">Total</div>
          </div>
          
          <div className="divide-y">
            {invoice.items.map((item, index) => (
              <div 
                key={item.id || index}
                className="grid grid-cols-12 gap-2 p-3 text-sm"
              >
                <div className="col-span-6">
                  <span>{item.description}</span>
                </div>
                <div className="col-span-2 text-center">{item.quantity}</div>
                <div className="col-span-2 text-right">
                  {formatCurrency(item.unitPrice, invoice.currency)}
                </div>
                <div className="col-span-2 text-right font-medium">
                  {formatCurrency(item.total, invoice.currency)}
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-64 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Sous-total HT</span>
              <span>{formatCurrency(invoice.subtotal, invoice.currency)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">TVA</span>
              <span>{formatCurrency(invoice.tax, invoice.currency)}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-semibold text-lg">
              <span>Total TTC</span>
              <span className="text-primary">
                {formatCurrency(invoice.total, invoice.currency)}
              </span>
            </div>
            
            {paidAmount > 0 && (
              <>
                <Separator />
                <div className="flex justify-between text-sm text-green-600">
                  <span>Payé</span>
                  <span>-{formatCurrency(paidAmount, invoice.currency)}</span>
                </div>
                {remainingAmount > 0 && (
                  <div className="flex justify-between font-medium text-orange-600">
                    <span>Reste à payer</span>
                    <span>{formatCurrency(remainingAmount, invoice.currency)}</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
        
        {/* Notes and Terms */}
        {(invoice.notes || invoice.terms) && (
          <div className="mt-6 pt-6 border-t grid md:grid-cols-2 gap-6">
            {invoice.notes && (
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-2">Notes</div>
                <p className="text-sm text-muted-foreground">{invoice.notes}</p>
              </div>
            )}
            {invoice.terms && (
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-2">Conditions</div>
                <p className="text-sm text-muted-foreground">{invoice.terms}</p>
              </div>
            )}
          </div>
        )}
        
        {/* QR Code placeholder */}
        <div className="mt-6 pt-6 border-t">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="size-16 bg-muted rounded-lg flex items-center justify-center">
                <QrCode className="size-8 text-muted-foreground" />
              </div>
              <div className="text-sm text-muted-foreground">
                Scannez pour payer en ligne
              </div>
            </div>
            
            {showActions && onDownload && (
              <Button variant="outline" onClick={onDownload}>
                <Download className="size-4 mr-2" />
                Télécharger PDF
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Mini preview for cards
export function InvoicePreviewMini({ 
  invoice 
}: { 
  invoice: { 
    number: string
    status: string
    dueDate: Date
    total: number
    currency: string
    client: { name: string }
  } 
}) {
  return (
    <div className="flex items-center gap-4">
      <div className="size-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
        <Eye className="size-5 text-orange-600" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{invoice.number}</div>
        <div className="text-sm text-muted-foreground truncate">
          {invoice.client.name}
        </div>
      </div>
      <div className="text-right">
        <div className="font-medium">{formatCurrency(invoice.total, invoice.currency)}</div>
        <InvoiceStatusBadge status={invoice.status} size="sm" />
      </div>
    </div>
  )
}
