'use client'

import { useState } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  Code,
  Book,
  Key,
  Zap,
  Terminal,
  Copy,
  Check,
  FileJson,
  Lock,
  Clock,
  Activity,
} from 'lucide-react'
import { toast } from 'sonner'

// =====================================================
// API Endpoints Data
// =====================================================

const endpoints = {
  clients: [
    {
      method: 'GET',
      path: '/api/v1/clients',
      description: 'Liste des clients avec pagination et filtres',
      scope: 'clients:read',
      params: [
        { name: 'page', type: 'integer', description: 'Numéro de page (défaut: 1)' },
        { name: 'perPage', type: 'integer', description: 'Éléments par page (défaut: 20, max: 100)' },
        { name: 'status', type: 'string', description: 'Filtrer par statut' },
        { name: 'search', type: 'string', description: 'Recherche par nom, email, téléphone' },
      ],
    },
    {
      method: 'POST',
      path: '/api/v1/clients',
      description: 'Créer un nouveau client',
      scope: 'clients:write',
      body: {
        name: 'string (requis)',
        email: 'string',
        phone: 'string',
        company: 'string',
      },
    },
    {
      method: 'GET',
      path: '/api/v1/clients/{id}',
      description: 'Détails d\'un client',
      scope: 'clients:read',
    },
    {
      method: 'PUT',
      path: '/api/v1/clients/{id}',
      description: 'Modifier un client',
      scope: 'clients:write',
    },
    {
      method: 'DELETE',
      path: '/api/v1/clients/{id}',
      description: 'Supprimer un client',
      scope: 'clients:write',
    },
  ],
  debts: [
    {
      method: 'GET',
      path: '/api/v1/debts',
      description: 'Liste des créances avec pagination',
      scope: 'debts:read',
      params: [
        { name: 'status', type: 'string', description: 'Filtrer par statut' },
        { name: 'clientId', type: 'string', description: 'Filtrer par client' },
        { name: 'overdue', type: 'boolean', description: 'Créances en retard' },
      ],
    },
    {
      method: 'POST',
      path: '/api/v1/debts',
      description: 'Créer une nouvelle créance',
      scope: 'debts:write',
      body: {
        clientId: 'string (requis)',
        amount: 'number (requis)',
        dueDate: 'date (requis)',
        reference: 'string',
        description: 'string',
      },
    },
    {
      method: 'GET',
      path: '/api/v1/debts/{id}',
      description: 'Détails d\'une créance',
      scope: 'debts:read',
    },
    {
      method: 'PUT',
      path: '/api/v1/debts/{id}',
      description: 'Modifier une créance',
      scope: 'debts:write',
    },
    {
      method: 'DELETE',
      path: '/api/v1/debts/{id}',
      description: 'Supprimer une créance',
      scope: 'debts:write',
    },
  ],
  reminders: [
    {
      method: 'GET',
      path: '/api/v1/reminders',
      description: 'Liste des relances',
      scope: 'reminders:read',
    },
    {
      method: 'POST',
      path: '/api/v1/reminders',
      description: 'Créer et envoyer une relance',
      scope: 'reminders:write',
      body: {
        debtId: 'string (requis)',
        type: 'email | whatsapp (requis)',
        subject: 'string',
        message: 'string',
      },
    },
  ],
  webhooks: [
    {
      method: 'GET',
      path: '/api/v1/webhooks',
      description: 'Liste des webhooks',
      scope: 'webhooks:manage',
    },
    {
      method: 'POST',
      path: '/api/v1/webhooks',
      description: 'Créer un webhook',
      scope: 'webhooks:manage',
      body: {
        name: 'string (requis)',
        url: 'string (requis)',
        events: 'array (requis)',
      },
    },
    {
      method: 'DELETE',
      path: '/api/v1/webhooks',
      description: 'Supprimer un webhook',
      scope: 'webhooks:manage',
    },
  ],
  analytics: [
    {
      method: 'GET',
      path: '/api/v1/analytics',
      description: 'Statistiques et analyses',
      scope: 'analytics:read',
      params: [
        { name: 'startDate', type: 'date', description: 'Date de début' },
        { name: 'endDate', type: 'date', description: 'Date de fin' },
      ],
    },
  ],
}

const codeExamples = {
  listClients: `curl -X GET "https://api.relancepro.africa/api/v1/clients?page=1&perPage=20" \\
  -H "Authorization: Bearer rpa_live_your_api_key" \\
  -H "Content-Type: application/json"`,
  
  createClient: `curl -X POST "https://api.relancepro.africa/api/v1/clients" \\
  -H "Authorization: Bearer rpa_live_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Marie Diallo",
    "email": "marie@exemple.com",
    "phone": "+224 620 12 34 56",
    "company": "Diallo & Fils SARL"
  }'`,
  
  createDebt: `curl -X POST "https://api.relancepro.africa/api/v1/debts" \\
  -H "Authorization: Bearer rpa_live_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "clientId": "cl_xxxxx",
    "amount": 5000000,
    "currency": "GNF",
    "reference": "FAC-2024-001",
    "dueDate": "2024-12-31",
    "description": "Facture pour services consult"
  }'`,
  
  sendReminder: `curl -X POST "https://api.relancepro.africa/api/v1/reminders" \\
  -H "Authorization: Bearer rpa_live_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "debtId": "debt_xxxxx",
    "type": "email",
    "subject": "Rappel de paiement",
    "message": "Bonjour, nous vous rappelons..."
  }'`,
  
  graphql: `curl -X POST "https://api.relancepro.africa/api/graphql" \\
  -H "Authorization: Bearer rpa_live_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "query": "query { clients(pagination: { page: 1, perPage: 10 }) { items { id name email } total } }"
  }'`,
}

// =====================================================
// Component
// =====================================================

export default function ApiDocsPage() {
  const [apiKey, setApiKey] = useState('rpa_live_your_api_key')
  const [copiedExample, setCopiedExample] = useState<string | null>(null)
  
  const copyCode = async (key: string, code: string) => {
    await navigator.clipboard.writeText(code.replace('rpa_live_your_api_key', apiKey))
    setCopiedExample(key)
    toast.success('Code copié!')
    setTimeout(() => setCopiedExample(null), 2000)
  }
  
  const getMethodColor = (method: string) => {
    switch (method) {
      case 'GET': return 'bg-green-500'
      case 'POST': return 'bg-blue-500'
      case 'PUT': return 'bg-yellow-500'
      case 'DELETE': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }
  
  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Book className="h-8 w-8" />
            Documentation API
          </h1>
          <p className="text-muted-foreground mt-2">
            Intégrez RelancePro Africa dans vos applications avec notre API REST et GraphQL
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <a href="/openapi.json" target="_blank">
              <FileJson className="h-4 w-4 mr-2" />
              OpenAPI Spec
            </a>
          </Button>
          <Button asChild>
            <a href="/api/graphql" target="_blank">
              <Terminal className="h-4 w-4 mr-2" />
              GraphQL Playground
            </a>
          </Button>
        </div>
      </div>
      
      {/* Quick Start */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            Démarrage rapide
          </CardTitle>
          <CardDescription>
            Commencez à utiliser l'API en quelques minutes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-primary/10 p-2">
                <Key className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h3 className="font-medium">1. Créez une clé API</h3>
                <p className="text-sm text-muted-foreground">
                  Allez dans Clés API pour générer votre clé secrète
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-primary/10 p-2">
                <Lock className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h3 className="font-medium">2. Authentifiez-vous</h3>
                <p className="text-sm text-muted-foreground">
                  Ajoutez la clé dans le header Authorization
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-primary/10 p-2">
                <Terminal className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h3 className="font-medium">3. Faites vos requêtes</h3>
                <p className="text-sm text-muted-foreground">
                  Utilisez REST ou GraphQL selon vos besoins
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4 mt-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-1 block">Votre clé API</label>
              <Input
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="rpa_live_xxxxx"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Base URL</label>
              <code className="block p-2 bg-muted rounded text-sm">
                https://api.relancepro.africa
              </code>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Main Content */}
      <Tabs defaultValue="rest" className="space-y-4">
        <TabsList>
          <TabsTrigger value="rest">
            <Code className="h-4 w-4 mr-2" />
            REST API
          </TabsTrigger>
          <TabsTrigger value="graphql">
            <Terminal className="h-4 w-4 mr-2" />
            GraphQL
          </TabsTrigger>
          <TabsTrigger value="examples">
            <FileJson className="h-4 w-4 mr-2" />
            Exemples
          </TabsTrigger>
          <TabsTrigger value="limits">
            <Activity className="h-4 w-4 mr-2" />
            Limites
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="rest">
          <div className="grid gap-4">
            {Object.entries(endpoints).map(([category, categoryEndpoints]) => (
              <Card key={category}>
                <CardHeader>
                  <CardTitle className="capitalize">{category}</CardTitle>
                  <CardDescription>
                    Endpoints pour la gestion des {category}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible className="w-full">
                    {categoryEndpoints.map((endpoint, index) => (
                      <AccordionItem key={index} value={`${category}-${index}`}>
                        <AccordionTrigger className="hover:no-underline">
                          <div className="flex items-center gap-3">
                            <Badge className={`${getMethodColor(endpoint.method)} text-white font-mono text-xs`}>
                              {endpoint.method}
                            </Badge>
                            <code className="text-sm font-mono">{endpoint.path}</code>
                            <Badge variant="outline" className="text-xs">
                              {endpoint.scope}
                            </Badge>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-4 pl-4">
                            <p className="text-sm text-muted-foreground">
                              {endpoint.description}
                            </p>
                            
                            {endpoint.params && (
                              <div>
                                <h4 className="font-medium text-sm mb-2">Paramètres</h4>
                                <div className="rounded-lg bg-muted p-3 space-y-2">
                                  {endpoint.params.map((param, i) => (
                                    <div key={i} className="flex items-start gap-2 text-sm">
                                      <code className="text-primary">{param.name}</code>
                                      <span className="text-muted-foreground">({param.type})</span>
                                      <span>- {param.description}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {endpoint.body && (
                              <div>
                                <h4 className="font-medium text-sm mb-2">Corps de la requête</h4>
                                <div className="rounded-lg bg-muted p-3">
                                  <pre className="text-sm">
                                    {JSON.stringify(endpoint.body, null, 2)}
                                  </pre>
                                </div>
                              </div>
                            )}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="graphql">
          <Card>
            <CardHeader>
              <CardTitle>API GraphQL</CardTitle>
              <CardDescription>
                Utilisez GraphQL pour des requêtes flexibles et efficaces
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg bg-muted p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Endpoint</span>
                  <code className="text-sm">POST /api/graphql</code>
                </div>
              </div>
              
              <div>
                <h3 className="font-medium mb-2">Exemple de requête</h3>
                <div className="relative">
                  <pre className="rounded-lg bg-gray-900 text-gray-100 p-4 text-sm overflow-x-auto">
                    {`query {
  clients(pagination: { page: 1, perPage: 10 }) {
    items {
      id
      name
      email
      debtsCount
    }
    total
    hasMore
  }
}`}
                  </pre>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={() => copyCode('graphql', codeExamples.graphql)}
                  >
                    {copiedExample === 'graphql' ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              
              <div>
                <h3 className="font-medium mb-2">Schéma disponible</h3>
                <div className="rounded-lg bg-muted p-4 text-sm space-y-2">
                  <div><strong>Queries:</strong> client, clients, debt, debts, reminder, reminders, webhooks, analytics</div>
                  <div><strong>Mutations:</strong> createClient, updateClient, deleteClient, createDebt, updateDebt, deleteDebt, createReminder, createWebhook</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="examples">
          <div className="grid gap-4">
            {Object.entries(codeExamples).map(([key, code]) => (
              <Card key={key}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="relative">
                    <pre className="rounded-lg bg-gray-900 text-gray-100 p-4 text-sm overflow-x-auto whitespace-pre-wrap">
                      {code.replace('rpa_live_your_api_key', apiKey)}
                    </pre>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 bg-gray-800 hover:bg-gray-700"
                      onClick={() => copyCode(key, code)}
                    >
                      {copiedExample === key ? (
                        <Check className="h-4 w-4 text-green-400" />
                      ) : (
                        <Copy className="h-4 w-4 text-gray-400" />
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="limits">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Limites de débit
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                  <span>Requêtes par minute</span>
                  <Badge>100</Badge>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                  <span>Requêtes par jour</span>
                  <Badge>5,000</Badge>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                  <span>Enterprise</span>
                  <Badge variant="secondary">Illimité</Badge>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Headers de réponse
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3 rounded-lg bg-muted">
                  <code className="text-sm">X-RateLimit-Remaining</code>
                  <p className="text-xs text-muted-foreground mt-1">
                    Nombre de requêtes restantes
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-muted">
                  <code className="text-sm">X-RateLimit-Reset</code>
                  <p className="text-xs text-muted-foreground mt-1">
                    Date de réinitialisation du compteur
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-muted">
                  <code className="text-sm">Retry-After</code>
                  <p className="text-xs text-muted-foreground mt-1">
                    Secondes avant de réessayer (si limité)
                  </p>
                </div>
              </CardContent>
            </Card>
            
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Scopes et permissions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2 md:grid-cols-2">
                  {[
                    { scope: 'clients:read', desc: 'Lire les clients' },
                    { scope: 'clients:write', desc: 'Créer/modifier les clients' },
                    { scope: 'debts:read', desc: 'Lire les créances' },
                    { scope: 'debts:write', desc: 'Créer/modifier les créances' },
                    { scope: 'reminders:read', desc: 'Lire les relances' },
                    { scope: 'reminders:write', desc: 'Envoyer des relances' },
                    { scope: 'webhooks:manage', desc: 'Gérer les webhooks' },
                    { scope: 'analytics:read', desc: 'Lire les analytics' },
                  ].map((item) => (
                    <div key={item.scope} className="flex items-center justify-between p-2 rounded-lg bg-muted">
                      <code className="text-sm">{item.scope}</code>
                      <span className="text-xs text-muted-foreground">{item.desc}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
