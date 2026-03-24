'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, FileText, Loader2 } from 'lucide-react'
import { InvoiceForm } from '@/components/invoices/invoice-form'
import { toast } from 'sonner'
import type { InvoiceItem } from '@/components/invoices/invoice-items'

interface Client {
  id: string
  name: string
  email: string | null
  phone: string | null
  company: string | null
}

interface InvoiceFormData {
  clientId: string
  dueDate: Date
  currency: string
  taxRate: number
  notes: string
  terms: string
  items: InvoiceItem[]
}

export default function NewInvoicePage() {
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  // Fetch clients
  useEffect(() => {
    const fetchClients = async () => {
      try {
        setIsLoading(true)
        const response = await fetch('/api/clients')
        
        if (!response.ok) {
          throw new Error('Erreur lors du chargement des clients')
        }
        
        const data = await response.json()
        setClients(data.clients || [])
      } catch (error) {
        console.error('Error fetching clients:', error)
        toast.error('Erreur lors du chargement des clients')
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchClients()
  }, [])
  
  // Handle form submission
  const handleSubmit = useCallback(async (formData: InvoiceFormData) => {
    try {
      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          clientId: formData.clientId,
          dueDate: formData.dueDate.toISOString(),
          currency: formData.currency,
          taxRate: formData.taxRate,
          notes: formData.notes || null,
          terms: formData.terms || null,
          items: formData.items.map(item => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice
          }))
        })
      })
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erreur lors de la création de la facture')
      }
      
      const invoice = await response.json()
      toast.success('Facture créée avec succès')
      router.push(`/invoices/${invoice.id}`)
    } catch (error) {
      console.error('Error creating invoice:', error)
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la création de la facture')
      throw error
    }
  }, [router])
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="size-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="space-y-6 p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push('/invoices')}
        >
          <ArrowLeft className="size-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Nouvelle facture</h1>
          <p className="text-muted-foreground">
            Créez une nouvelle facture pour votre client
          </p>
        </div>
      </div>
      
      {/* No clients warning */}
      {clients.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="size-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold mb-2">Aucun client</h3>
            <p className="text-muted-foreground mb-4">
              Vous devez d&apos;abord créer un client avant de pouvoir créer une facture.
            </p>
            <Button onClick={() => router.push('/clients')}>
              Créer un client
            </Button>
          </CardContent>
        </Card>
      ) : (
        <InvoiceForm
          clients={clients}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  )
}
