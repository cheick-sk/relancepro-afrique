'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { 
  CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Check, 
  User, 
  FileText, 
  Settings,
  Eye,
  Search,
  Building2,
  Mail,
  Phone
} from 'lucide-react'
import { InvoiceItems, type InvoiceItem } from './invoice-items'
import { InvoicePreview } from './invoice-preview'
import { formatCurrency } from '@/lib/invoices/generator'

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

const initialFormData: InvoiceFormData = {
  clientId: '',
  dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
  currency: 'GNF',
  taxRate: 0,
  notes: '',
  terms: 'Paiement à réception de facture.',
  items: [
    { id: `item-${Date.now()}`, description: '', quantity: 1, unitPrice: 0, total: 0 }
  ]
}

const steps = [
  { id: 1, title: 'Client', description: 'Sélectionner le client', icon: User },
  { id: 2, title: 'Articles', description: 'Ajouter les articles', icon: FileText },
  { id: 3, title: 'Options', description: 'Notes et conditions', icon: Settings },
  { id: 4, title: 'Aperçu', description: 'Vérifier et créer', icon: Eye }
]

const currencies = [
  { value: 'GNF', label: 'Franc guinéen (GNF)' },
  { value: 'XOF', label: 'Franc CFA (XOF)' },
  { value: 'XAF', label: 'Franc CFA (XAF)' },
  { value: 'EUR', label: 'Euro (EUR)' },
  { value: 'USD', label: 'Dollar US (USD)' }
]

const defaultTerms = [
  'Paiement à réception de facture.',
  'Paiement sous 15 jours.',
  'Paiement sous 30 jours.',
  'Paiement sous 45 jours.',
  'Paiement sous 60 jours.'
]

interface InvoiceFormProps {
  initialData?: Partial<InvoiceFormData>
  onSubmit: (data: InvoiceFormData) => Promise<void>
  clients: Client[]
  isEditing?: boolean
}

export function InvoiceForm({ initialData, onSubmit, clients, isEditing = false }: InvoiceFormProps) {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState<InvoiceFormData>({
    ...initialFormData,
    ...initialData
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [clientSearch, setClientSearch] = useState('')
  const [showClientSelect, setShowClientSelect] = useState(false)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  
  // Find selected client on mount
  useEffect(() => {
    if (formData.clientId) {
      const client = clients.find(c => c.id === formData.clientId)
      if (client) setSelectedClient(client)
    }
  }, [formData.clientId, clients])
  
  // Handle client selection
  const handleClientSelect = useCallback((client: Client) => {
    setSelectedClient(client)
    setFormData(prev => ({ ...prev, clientId: client.id }))
    setShowClientSelect(false)
    setClientSearch('')
  }, [])
  
  // Handle items change
  const handleItemsChange = useCallback((items: InvoiceItem[]) => {
    setFormData(prev => ({ ...prev, items }))
  }, [])
  
  // Handle form field change
  const handleFieldChange = useCallback((
    field: keyof InvoiceFormData, 
    value: string | number | Date
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }, [])
  
  // Navigate to next step
  const nextStep = useCallback(() => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1)
    }
  }, [currentStep])
  
  // Navigate to previous step
  const prevStep = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }, [currentStep])
  
  // Validate current step
  const validateStep = useCallback((step: number): boolean => {
    switch (step) {
      case 1:
        return !!formData.clientId
      case 2:
        return formData.items.length > 0 && 
          formData.items.every(item => item.description && item.quantity > 0 && item.unitPrice > 0)
      case 3:
      case 4:
        return true
      default:
        return false
    }
  }, [formData])
  
  // Handle form submission
  const handleSubmit = useCallback(async () => {
    if (!validateStep(4)) return
    
    setIsSubmitting(true)
    try {
      await onSubmit(formData)
    } catch (error) {
      console.error('Error submitting invoice:', error)
    } finally {
      setIsSubmitting(false)
    }
  }, [formData, onSubmit, validateStep])
  
  // Filter clients by search
  const filteredClients = clients.filter(client => 
    client.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
    client.email?.toLowerCase().includes(clientSearch.toLowerCase()) ||
    client.company?.toLowerCase().includes(clientSearch.toLowerCase())
  )
  
  // Calculate totals
  const subtotal = formData.items.reduce((sum, item) => sum + item.total, 0)
  const tax = subtotal * (formData.taxRate / 100)
  const total = subtotal + tax
  
  return (
    <div className="space-y-6">
      {/* Progress Steps */}
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center flex-1">
            <button
              onClick={() => setCurrentStep(step.id)}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-lg transition-colors',
                currentStep === step.id 
                  ? 'bg-primary text-primary-foreground' 
                  : currentStep > step.id
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted'
              )}
            >
              <div className={cn(
                'size-8 rounded-full flex items-center justify-center border-2',
                currentStep === step.id 
                  ? 'border-primary-foreground' 
                  : currentStep > step.id
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-muted-foreground'
              )}>
                {currentStep > step.id ? (
                  <Check className="size-4" />
                ) : (
                  <step.icon className="size-4" />
                )}
              </div>
              <div className="hidden md:block text-left">
                <div className="text-sm font-medium">{step.title}</div>
                <div className="text-xs opacity-70">{step.description}</div>
              </div>
            </button>
            {index < steps.length - 1 && (
              <div className={cn(
                'flex-1 h-0.5 mx-2',
                currentStep > step.id ? 'bg-primary' : 'bg-muted'
              )} />
            )}
          </div>
        ))}
      </div>
      
      {/* Step Content */}
      <div className="min-h-[400px]">
        {/* Step 1: Client Selection */}
        {currentStep === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="size-5" />
                Sélectionner le client
              </CardTitle>
              <CardDescription>
                Choisissez le client pour cette facture
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedClient ? (
                <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                  <div className="flex items-center gap-4">
                    <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Building2 className="size-6 text-primary" />
                    </div>
                    <div>
                      <div className="font-medium">{selectedClient.name}</div>
                      {selectedClient.company && (
                        <div className="text-sm text-muted-foreground">
                          {selectedClient.company}
                        </div>
                      )}
                      <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                        {selectedClient.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="size-3" />
                            {selectedClient.email}
                          </span>
                        )}
                        {selectedClient.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="size-3" />
                            {selectedClient.phone}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedClient(null)
                      setFormData(prev => ({ ...prev, clientId: '' }))
                    }}
                  >
                    Changer
                  </Button>
                </div>
              ) : (
                <Popover open={showClientSelect} onOpenChange={setShowClientSelect}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between"
                    >
                      <span className="flex items-center gap-2">
                        <Search className="size-4" />
                        Rechercher un client...
                      </span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0" align="start">
                    <Command>
                      <CommandInput 
                        placeholder="Rechercher par nom, email ou entreprise..." 
                        value={clientSearch}
                        onValueChange={setClientSearch}
                      />
                      <CommandList>
                        <CommandEmpty>Aucun client trouvé.</CommandEmpty>
                        <CommandGroup>
                          {filteredClients.map((client) => (
                            <CommandItem
                              key={client.id}
                              value={client.id}
                              onSelect={() => handleClientSelect(client)}
                            >
                              <div className="flex items-center gap-3 w-full">
                                <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center">
                                  <User className="size-4 text-primary" />
                                </div>
                                <div className="flex-1">
                                  <div className="font-medium">{client.name}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {client.company || client.email || client.phone}
                                  </div>
                                </div>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              )}
              
              {/* Due Date and Currency */}
              <div className="grid grid-cols-2 gap-4 pt-4">
                <div className="space-y-2">
                  <Label>Date d&apos;échéance</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start">
                        <CalendarIcon className="size-4 mr-2" />
                        {format(formData.dueDate, 'dd MMMM yyyy', { locale: fr })}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={formData.dueDate}
                        onSelect={(date) => date && handleFieldChange('dueDate', date)}
                        disabled={(date) => date < new Date()}
                        locale={fr}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                
                <div className="space-y-2">
                  <Label>Devise</Label>
                  <Select
                    value={formData.currency}
                    onValueChange={(value) => handleFieldChange('currency', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {currencies.map((currency) => (
                        <SelectItem key={currency.value} value={currency.value}>
                          {currency.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Step 2: Items */}
        {currentStep === 2 && (
          <InvoiceItems
            items={formData.items}
            onChange={handleItemsChange}
            currency={formData.currency}
            taxRate={formData.taxRate}
            onTaxRateChange={(rate) => handleFieldChange('taxRate', rate)}
          />
        )}
        
        {/* Step 3: Options */}
        {currentStep === 3 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="size-5" />
                Notes et conditions
              </CardTitle>
              <CardDescription>
                Ajoutez des notes et conditions à votre facture
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => handleFieldChange('notes', e.target.value)}
                  placeholder="Notes additionnelles pour le client..."
                  rows={3}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Conditions de paiement</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {defaultTerms.map((term) => (
                    <Button
                      key={term}
                      variant={formData.terms === term ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleFieldChange('terms', term)}
                    >
                      {term}
                    </Button>
                  ))}
                </div>
                <Textarea
                  value={formData.terms}
                  onChange={(e) => handleFieldChange('terms', e.target.value)}
                  placeholder="Conditions de paiement..."
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Step 4: Preview */}
        {currentStep === 4 && (
          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Résumé</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Client</span>
                  <span className="font-medium">{selectedClient?.name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Date d&apos;échéance</span>
                  <span>{format(formData.dueDate, 'dd MMM yyyy', { locale: fr })}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Articles</span>
                  <span>{formData.items.length}</span>
                </div>
                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Sous-total HT</span>
                    <span>{formatCurrency(subtotal, formData.currency)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">TVA ({formData.taxRate}%)</span>
                    <span>{formatCurrency(tax, formData.currency)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-lg">
                    <span>Total TTC</span>
                    <span className="text-primary">{formatCurrency(total, formData.currency)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <InvoicePreview
              invoice={{
                number: 'APERÇU',
                status: 'draft',
                issueDate: new Date(),
                dueDate: formData.dueDate,
                subtotal,
                tax,
                total,
                currency: formData.currency,
                notes: formData.notes,
                terms: formData.terms,
                client: {
                  name: selectedClient?.name || '',
                  email: selectedClient?.email,
                  phone: selectedClient?.phone,
                  company: selectedClient?.company,
                  address: null
                },
                profile: {
                  name: null,
                  companyName: null,
                  email: '',
                  phone: null
                },
                items: formData.items,
                payments: []
              }}
            />
          </div>
        )}
      </div>
      
      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-4 border-t">
        <Button
          variant="outline"
          onClick={prevStep}
          disabled={currentStep === 1}
        >
          <ChevronLeft className="size-4 mr-1" />
          Précédent
        </Button>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => router.push('/invoices')}
          >
            Annuler
          </Button>
          
          {currentStep < 4 ? (
            <Button
              onClick={nextStep}
              disabled={!validateStep(currentStep)}
            >
              Suivant
              <ChevronRight className="size-4 ml-1" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !validateStep(currentStep)}
            >
              {isSubmitting ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Création...
                </>
              ) : (
                <>
                  <Check className="size-4 mr-1" />
                  {isEditing ? 'Enregistrer' : 'Créer la facture'}
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
