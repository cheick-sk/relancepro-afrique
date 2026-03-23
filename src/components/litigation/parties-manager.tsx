'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  User,
  Building2,
  Mail,
  Phone,
  MapPin,
  Plus,
  Edit2,
  Trash2,
  Scale,
  FileText,
  Users,
  Eye
} from 'lucide-react'

export type PartyType = 'plaintiff' | 'defendant' | 'lawyer' | 'bailiff' | 'court' | 'witness'

interface Party {
  id: string
  type: PartyType
  name: string
  email?: string | null
  phone?: string | null
  address?: string | null
  company?: string | null
  role?: string | null
  notes?: string | null
  createdAt: Date
}

interface PartiesManagerProps {
  litigationId: string
  parties: Party[]
  onAddParty?: (party: Partial<Party>) => Promise<void>
  onEditParty?: (id: string, party: Partial<Party>) => Promise<void>
  onDeleteParty?: (id: string) => Promise<void>
}

const partyTypeConfig: Record<PartyType, {
  label: string
  icon: React.ReactNode
  color: string
  bgColor: string
}> = {
  plaintiff: {
    label: 'Demandeur',
    icon: <User className="h-4 w-4" />,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100'
  },
  defendant: {
    label: 'Défendeur',
    icon: <User className="h-4 w-4" />,
    color: 'text-red-600',
    bgColor: 'bg-red-100'
  },
  lawyer: {
    label: 'Avocat',
    icon: <Scale className="h-4 w-4" />,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100'
  },
  bailiff: {
    label: 'Huissier',
    icon: <FileText className="h-4 w-4" />,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100'
  },
  court: {
    label: 'Tribunal',
    icon: <Building2 className="h-4 w-4" />,
    color: 'text-gray-600',
    bgColor: 'bg-gray-100'
  },
  witness: {
    label: 'Témoin',
    icon: <Eye className="h-4 w-4" />,
    color: 'text-teal-600',
    bgColor: 'bg-teal-100'
  }
}

export function PartiesManager({
  litigationId,
  parties,
  onAddParty,
  onEditParty,
  onDeleteParty
}: PartiesManagerProps) {
  const [isAddingParty, setIsAddingParty] = useState(false)
  const [editingParty, setEditingParty] = useState<Party | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const [formData, setFormData] = useState({
    type: 'defendant' as PartyType,
    name: '',
    email: '',
    phone: '',
    address: '',
    company: '',
    role: '',
    notes: ''
  })

  const resetForm = () => {
    setFormData({
      type: 'defendant',
      name: '',
      email: '',
      phone: '',
      address: '',
      company: '',
      role: '',
      notes: ''
    })
  }

  const handleSubmit = async () => {
    if (!onAddParty) return
    setIsSubmitting(true)
    try {
      await onAddParty({
        ...formData,
        email: formData.email || null,
        phone: formData.phone || null,
        address: formData.address || null,
        company: formData.company || null,
        role: formData.role || null,
        notes: formData.notes || null
      })
      resetForm()
      setIsAddingParty(false)
    } catch (error) {
      console.error('Error adding party:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = async () => {
    if (!editingParty || !onEditParty) return
    setIsSubmitting(true)
    try {
      await onEditParty(editingParty.id, {
        ...formData,
        email: formData.email || null,
        phone: formData.phone || null,
        address: formData.address || null,
        company: formData.company || null,
        role: formData.role || null,
        notes: formData.notes || null
      })
      setEditingParty(null)
      resetForm()
    } catch (error) {
      console.error('Error editing party:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!onDeleteParty) return
    if (confirm('Êtes-vous sûr de vouloir supprimer cette partie ?')) {
      await onDeleteParty(id)
    }
  }

  const openEditDialog = (party: Party) => {
    setEditingParty(party)
    setFormData({
      type: party.type,
      name: party.name,
      email: party.email || '',
      phone: party.phone || '',
      address: party.address || '',
      company: party.company || '',
      role: party.role || '',
      notes: party.notes || ''
    })
  }

  // Group parties by type
  const partiesByType = parties.reduce((acc, party) => {
    if (!acc[party.type]) {
      acc[party.type] = []
    }
    acc[party.type].push(party)
    return acc
  }, {} as Record<PartyType, Party[]>)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg flex items-center gap-2">
          <Users className="h-5 w-5" />
          Parties impliquées
        </CardTitle>
        {onAddParty && (
          <Dialog open={isAddingParty} onOpenChange={setIsAddingParty}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Ajouter
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Ajouter une partie</DialogTitle>
                <DialogDescription>
                  Ajoutez une nouvelle partie impliquée dans le dossier.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>Type</Label>
                  <Select 
                    value={formData.type} 
                    onValueChange={(v) => setFormData({ ...formData, type: v as PartyType })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(partyTypeConfig).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          <div className="flex items-center gap-2">
                            <span className={config.color}>{config.icon}</span>
                            {config.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Nom *</Label>
                  <Input 
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Nom complet"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Email</Label>
                    <Input 
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="email@exemple.com"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Téléphone</Label>
                    <Input 
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+224..."
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Adresse</Label>
                  <Input 
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Adresse complète"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Entreprise/Cabinet</Label>
                    <Input 
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      placeholder="Nom de l'entreprise"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Rôle</Label>
                    <Input 
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      placeholder="Rôle spécifique"
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Notes</Label>
                  <Textarea 
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Notes additionnelles"
                    rows={2}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddingParty(false)}>
                  Annuler
                </Button>
                <Button onClick={handleSubmit} disabled={isSubmitting || !formData.name}>
                  {isSubmitting ? 'Ajout...' : 'Ajouter'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </CardHeader>
      <CardContent>
        {parties.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Aucune partie enregistrée</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(partiesByType).map(([type, typeParties]) => {
              const config = partyTypeConfig[type as PartyType]
              return (
                <div key={type}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`${config.color}`}>{config.icon}</span>
                    <h4 className="font-medium">{config.label}</h4>
                    <Badge variant="secondary" className="text-xs">
                      {typeParties.length}
                    </Badge>
                  </div>
                  <div className="grid gap-3">
                    {typeParties.map((party) => (
                      <div 
                        key={party.id} 
                        className="p-4 rounded-lg border border-gray-200 bg-white hover:shadow-sm transition-shadow"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-medium">{party.name}</span>
                              {party.company && (
                                <Badge variant="outline" className="text-xs">
                                  {party.company}
                                </Badge>
                              )}
                              {party.role && (
                                <Badge variant="secondary" className="text-xs">
                                  {party.role}
                                </Badge>
                              )}
                            </div>
                            <div className="grid gap-1 text-sm text-muted-foreground">
                              {party.email && (
                                <div className="flex items-center gap-2">
                                  <Mail className="h-3.5 w-3.5" />
                                  <a href={`mailto:${party.email}`} className="hover:text-primary">
                                    {party.email}
                                  </a>
                                </div>
                              )}
                              {party.phone && (
                                <div className="flex items-center gap-2">
                                  <Phone className="h-3.5 w-3.5" />
                                  <a href={`tel:${party.phone}`} className="hover:text-primary">
                                    {party.phone}
                                  </a>
                                </div>
                              )}
                              {party.address && (
                                <div className="flex items-center gap-2">
                                  <MapPin className="h-3.5 w-3.5" />
                                  <span>{party.address}</span>
                                </div>
                              )}
                              {party.notes && (
                                <p className="mt-2 text-xs italic">{party.notes}</p>
                              )}
                            </div>
                          </div>
                          
                          {/* Actions */}
                          {(onEditParty || onDeleteParty) && (
                            <div className="flex items-center gap-1">
                              {onEditParty && (
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-8 w-8 p-0"
                                  onClick={() => openEditDialog(party)}
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                              )}
                              {onDeleteParty && (
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                  onClick={() => handleDelete(party.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
      
      {/* Edit Dialog */}
      <Dialog open={!!editingParty} onOpenChange={() => setEditingParty(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Modifier la partie</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Type</Label>
              <Select 
                value={formData.type} 
                onValueChange={(v) => setFormData({ ...formData, type: v as PartyType })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(partyTypeConfig).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <span className={config.color}>{config.icon}</span>
                        {config.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Nom</Label>
              <Input 
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Email</Label>
                <Input 
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Téléphone</Label>
                <Input 
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Adresse</Label>
              <Input 
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Entreprise/Cabinet</Label>
                <Input 
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Rôle</Label>
                <Input 
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Notes</Label>
              <Textarea 
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingParty(null)}>
              Annuler
            </Button>
            <Button onClick={handleEdit} disabled={isSubmitting}>
              {isSubmitting ? 'Modification...' : 'Modifier'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

export default PartiesManager
