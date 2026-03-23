'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { 
  Key, 
  Copy, 
  Check, 
  CalendarIcon, 
  Eye, 
  EyeOff,
  Shield,
  Zap,
  Clock,
} from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

// =====================================================
// Types
// =====================================================

export type ApiScope = 
  | 'clients:read'
  | 'clients:write'
  | 'debts:read'
  | 'debts:write'
  | 'reminders:read'
  | 'reminders:write'
  | 'webhooks:manage'
  | 'analytics:read'

interface ScopeInfo {
  name: string
  description: string
  category: 'read' | 'write' | 'manage'
}

const SCOPE_INFO: Record<ApiScope, ScopeInfo> = {
  'clients:read': {
    name: 'Lire les clients',
    description: 'Consulter la liste des clients et leurs détails',
    category: 'read',
  },
  'clients:write': {
    name: 'Gérer les clients',
    description: 'Créer, modifier et supprimer des clients',
    category: 'write',
  },
  'debts:read': {
    name: 'Lire les créances',
    description: 'Consulter la liste des créances et leurs détails',
    category: 'read',
  },
  'debts:write': {
    name: 'Gérer les créances',
    description: 'Créer, modifier et supprimer des créances',
    category: 'write',
  },
  'reminders:read': {
    name: 'Lire les relances',
    description: "Consulter l'historique des relances",
    category: 'read',
  },
  'reminders:write': {
    name: 'Envoyer des relances',
    description: 'Créer et envoyer des relances',
    category: 'write',
  },
  'webhooks:manage': {
    name: 'Gérer les webhooks',
    description: 'Créer, modifier et supprimer des webhooks',
    category: 'manage',
  },
  'analytics:read': {
    name: 'Lire les analytics',
    description: 'Consulter les statistiques et analyses',
    category: 'read',
  },
}

// =====================================================
// Form Schema
// =====================================================

const formSchema = z.object({
  name: z.string().min(1, 'Le nom est requis').max(50, 'Le nom ne peut pas dépasser 50 caractères'),
  scopes: z.array(z.string()).min(1, 'Sélectionnez au moins une permission'),
  rateLimit: z.number().min(1).max(1000),
  expiresAt: z.date().optional(),
})

type FormValues = z.infer<typeof formSchema>

// =====================================================
// Props
// =====================================================

interface KeyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: (key: { id: string; key: string; name: string }) => void
}

// =====================================================
// Component
// =====================================================

export function KeyDialog({ open, onOpenChange, onSuccess }: KeyDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [createdKey, setCreatedKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [showKey, setShowKey] = useState(false)
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      scopes: [],
      rateLimit: 100,
    },
  })
  
  const selectedScopes = form.watch('scopes')
  
  const handleCopy = async () => {
    if (createdKey) {
      await navigator.clipboard.writeText(createdKey)
      setCopied(true)
      toast.success('Clé API copiée dans le presse-papier')
      setTimeout(() => setCopied(false), 2000)
    }
  }
  
  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true)
    
    try {
      const response = await fetch('/api/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: values.name,
          scopes: values.scopes,
          rateLimit: values.rateLimit,
          expiresAt: values.expiresAt?.toISOString(),
        }),
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la création')
      }
      
      setCreatedKey(data.key)
      toast.success('Clé API créée avec succès')
      onSuccess?.(data)
      
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la création')
    } finally {
      setIsSubmitting(false)
    }
  }
  
  const handleClose = () => {
    if (createdKey && !copied) {
      if (!confirm('Attention: Vous n\'avez pas copié la clé API. Elle ne sera plus jamais affichée. Voulez-vous vraiment fermer?')) {
        return
      }
    }
    setCreatedKey(null)
    setShowKey(false)
    form.reset()
    onOpenChange(false)
  }
  
  const toggleScope = (scope: ApiScope) => {
    const current = form.getValues('scopes')
    if (current.includes(scope)) {
      form.setValue('scopes', current.filter(s => s !== scope))
    } else {
      form.setValue('scopes', [...current, scope])
    }
  }
  
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            {createdKey ? 'Clé API créée' : 'Créer une clé API'}
          </DialogTitle>
          <DialogDescription>
            {createdKey 
              ? 'Copiez votre clé API maintenant. Elle ne sera plus jamais affichée.'
              : 'Créez une nouvelle clé API pour accéder à l\'API RelancePro Africa.'
            }
          </DialogDescription>
        </DialogHeader>
        
        {createdKey ? (
          <div className="space-y-4">
            <div className="rounded-lg bg-green-50 dark:bg-green-950/30 p-4 border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-400 mb-2">
                <Check className="h-4 w-4" />
                <span className="font-medium">Clé créée avec succès</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 p-2 bg-white dark:bg-gray-900 rounded border font-mono text-sm">
                  {showKey ? createdKey : '•'.repeat(createdKey.length)}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowKey(!showKey)}
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopy}
                  className={copied ? 'bg-green-100 dark:bg-green-900' : ''}
                >
                  {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            
            <div className="rounded-lg bg-yellow-50 dark:bg-yellow-950/30 p-4 border border-yellow-200 dark:border-yellow-800">
              <p className="text-sm text-yellow-700 dark:text-yellow-400">
                <strong>Important:</strong> Cette clé ne sera affichée qu'une seule fois. 
                Assurez-vous de la copier et de la stocker en toute sécurité.
              </p>
            </div>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom de la clé</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Ex: Integration CRM, App Mobile..." 
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Un nom descriptif pour identifier cette clé
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="scopes"
                render={() => (
                  <FormItem>
                    <FormLabel>Permissions</FormLabel>
                    <FormDescription>
                      Sélectionnez les permissions pour cette clé
                    </FormDescription>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {(Object.entries(SCOPE_INFO) as [ApiScope, ScopeInfo][]).map(([scope, info]) => (
                        <div
                          key={scope}
                          className={cn(
                            'flex items-start space-x-3 rounded-lg border p-3 cursor-pointer transition-colors',
                            selectedScopes.includes(scope)
                              ? 'border-primary bg-primary/5'
                              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                          )}
                          onClick={() => toggleScope(scope)}
                        >
                          <Checkbox
                            checked={selectedScopes.includes(scope)}
                            onCheckedChange={() => toggleScope(scope)}
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{info.name}</span>
                              <Badge 
                                variant={
                                  info.category === 'read' ? 'secondary' :
                                  info.category === 'write' ? 'default' : 
                                  'destructive'
                                }
                                className="text-xs"
                              >
                                {info.category}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {info.description}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="rateLimit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Zap className="h-4 w-4" />
                        Limite de requêtes/min
                      </FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min={1}
                          max={1000}
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 100)}
                        />
                      </FormControl>
                      <FormDescription>
                        Maximum: 1000 req/min
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="expiresAt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Expiration (optionnel)
                      </FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                'w-full pl-3 text-left font-normal',
                                !field.value && 'text-muted-foreground'
                              )}
                            >
                              {field.value ? (
                                format(field.value, 'PPP', { locale: fr })
                              ) : (
                                'Sans expiration'
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date < new Date()}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleClose}>
                  Annuler
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Création...' : 'Créer la clé'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default KeyDialog
