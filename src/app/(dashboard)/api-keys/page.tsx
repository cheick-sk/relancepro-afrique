'use client'

import { useState, useEffect } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Key,
  Plus,
  Trash2,
  Eye,
  Clock,
  Activity,
  AlertTriangle,
  Copy,
  Check,
  Shield,
  Zap,
  Calendar,
  MoreVertical,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { KeyDialog } from '@/components/api-keys/key-dialog'
import { UsageChart } from '@/components/api-keys/usage-chart'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { toast } from 'sonner'

// =====================================================
// Types
// =====================================================

interface ApiKey {
  id: string
  name: string
  keyPrefix: string
  scopes: string[]
  rateLimit: number
  lastUsedAt: string | null
  usageCount: number
  active: boolean
  expiresAt: string | null
  createdAt: string
}

interface UsageStats {
  totalRequests: number
  successRate: number
  avgResponseTime: number
  endpointStats: Array<{
    endpoint: string
    count: number
    avgResponseTime: number
  }>
  dailyStats: Array<{
    date: string
    count: number
  }>
}

// =====================================================
// Component
// =====================================================

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [selectedKeyStats, setSelectedKeyStats] = useState<UsageStats | null>(null)
  const [selectedKeyId, setSelectedKeyId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteKeyId, setDeleteKeyId] = useState<string | null>(null)
  
  useEffect(() => {
    fetchKeys()
  }, [])
  
  const fetchKeys = async () => {
    try {
      const response = await fetch('/api/api-keys')
      const data = await response.json()
      
      if (response.ok) {
        setKeys(data.keys || [])
      } else {
        toast.error('Erreur lors du chargement des clés API')
      }
    } catch (error) {
      toast.error('Erreur lors du chargement des clés API')
    } finally {
      setIsLoading(false)
    }
  }
  
  const fetchKeyStats = async (keyId: string) => {
    try {
      const response = await fetch(`/api/api-keys/${keyId}/stats`)
      const data = await response.json()
      
      if (response.ok) {
        setSelectedKeyStats(data.stats)
        setSelectedKeyId(keyId)
      }
    } catch (error) {
      toast.error('Erreur lors du chargement des statistiques')
    }
  }
  
  const toggleKeyActive = async (keyId: string, active: boolean) => {
    try {
      const response = await fetch(`/api/api-keys/${keyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active }),
      })
      
      if (response.ok) {
        setKeys(keys.map(k => k.id === keyId ? { ...k, active } : k))
        toast.success(active ? 'Clé API activée' : 'Clé API désactivée')
      } else {
        toast.error('Erreur lors de la modification')
      }
    } catch (error) {
      toast.error('Erreur lors de la modification')
    }
  }
  
  const deleteKey = async () => {
    if (!deleteKeyId) return
    
    try {
      const response = await fetch(`/api/api-keys/${deleteKeyId}`, {
        method: 'DELETE',
      })
      
      if (response.ok) {
        setKeys(keys.filter(k => k.id !== deleteKeyId))
        toast.success('Clé API supprimée')
      } else {
        toast.error('Erreur lors de la suppression')
      }
    } catch (error) {
      toast.error('Erreur lors de la suppression')
    } finally {
      setDeleteKeyId(null)
    }
  }
  
  const copyKeyId = async (keyPrefix: string) => {
    await navigator.clipboard.writeText(keyPrefix)
    toast.success('Préfixe copié')
  }
  
  const getScopeBadge = (scope: string) => {
    const isRead = scope.includes(':read')
    const isWrite = scope.includes(':write')
    const isManage = scope.includes(':manage')
    
    if (isWrite) return <Badge variant="default" className="text-xs">{scope}</Badge>
    if (isManage) return <Badge variant="destructive" className="text-xs">{scope}</Badge>
    return <Badge variant="secondary" className="text-xs">{scope}</Badge>
  }
  
  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false
    return new Date(expiresAt) < new Date()
  }
  
  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clés API</h1>
          <p className="text-muted-foreground">
            Gérez vos clés API pour accéder à l'API RelancePro Africa
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nouvelle clé
        </Button>
      </div>
      
      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clés actives</CardTitle>
            <Key className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {keys.filter(k => k.active).length}
            </div>
            <p className="text-xs text-muted-foreground">
              sur {keys.length} clés au total
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Requêtes totales</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {keys.reduce((sum, k) => sum + k.usageCount, 0).toLocaleString('fr-FR')}
            </div>
            <p className="text-xs text-muted-foreground">
              toutes clés confondues
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clés expirées</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {keys.filter(k => isExpired(k.expiresAt)).length}
            </div>
            <p className="text-xs text-muted-foreground">
              nécessitent un renouvellement
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Limite moyenne</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {keys.length > 0 
                ? Math.round(keys.reduce((sum, k) => sum + k.rateLimit, 0) / keys.length)
                : 0
              } req/min
            </div>
            <p className="text-xs text-muted-foreground">
              par clé
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Main Content */}
      <Tabs defaultValue="keys" className="space-y-4">
        <TabsList>
          <TabsTrigger value="keys">
            <Key className="h-4 w-4 mr-2" />
            Clés API
          </TabsTrigger>
          <TabsTrigger value="usage" disabled={!selectedKeyId}>
            <Activity className="h-4 w-4 mr-2" />
            Statistiques
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="keys">
          <Card>
            <CardHeader>
              <CardTitle>Vos clés API</CardTitle>
              <CardDescription>
                Gérez et surveillez vos clés API. Le préfixe est affiché pour identification.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Chargement...
                </div>
              ) : keys.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Key className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Aucune clé API configurée</p>
                  <Button variant="outline" className="mt-4" onClick={() => setDialogOpen(true)}>
                    Créer une clé
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom</TableHead>
                      <TableHead>Préfixe</TableHead>
                      <TableHead>Permissions</TableHead>
                      <TableHead>Limite</TableHead>
                      <TableHead>Utilisation</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {keys.map((key) => (
                      <TableRow key={key.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{key.name}</div>
                            {key.expiresAt && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                                <Calendar className="h-3 w-3" />
                                {isExpired(key.expiresAt) ? (
                                  <span className="text-red-500">Expirée</span>
                                ) : (
                                  <span>Expire le {format(new Date(key.expiresAt), 'PPP', { locale: fr })}</span>
                                )}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <code className="text-xs bg-muted px-2 py-1 rounded">
                              {key.keyPrefix}...
                            </code>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6"
                              onClick={() => copyKeyId(key.keyPrefix)}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {key.scopes.slice(0, 2).map((scope) => (
                              <span key={scope}>{getScopeBadge(scope)}</span>
                            ))}
                            {key.scopes.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{key.scopes.length - 2}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {key.rateLimit} req/min
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{key.usageCount.toLocaleString('fr-FR')}</div>
                            {key.lastUsedAt && (
                              <div className="text-xs text-muted-foreground">
                                {format(new Date(key.lastUsedAt), 'dd MMM yyyy', { locale: fr })}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={key.active && !isExpired(key.expiresAt)}
                            disabled={isExpired(key.expiresAt)}
                            onCheckedChange={(checked) => toggleKeyActive(key.id, checked)}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => fetchKeyStats(key.id)}>
                                <Eye className="h-4 w-4 mr-2" />
                                Voir les statistiques
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-red-600"
                                onClick={() => setDeleteKeyId(key.id)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Supprimer
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="usage">
          {selectedKeyStats ? (
            <UsageChart stats={selectedKeyStats} />
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Sélectionnez une clé pour voir ses statistiques</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
      
      {/* Create Key Dialog */}
      <KeyDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={(key) => {
          setDialogOpen(false)
          fetchKeys()
        }}
      />
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteKeyId} onOpenChange={() => setDeleteKeyId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer la clé API?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Les applications utilisant cette clé ne pourront plus accéder à l'API.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={deleteKey} className="bg-red-600 hover:bg-red-700">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
