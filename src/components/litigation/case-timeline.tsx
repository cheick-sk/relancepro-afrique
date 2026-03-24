'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
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
  FileText,
  Scale,
  Gavel,
  DollarSign,
  Calendar,
  MessageSquare,
  AlertCircle,
  CheckCircle2,
  Clock,
  Plus,
  Bell,
  Edit2,
  Trash2
} from 'lucide-react'
import { format, isPast, isFuture, isToday } from 'date-fns'
import { fr } from 'date-fns/locale'

export type EventType = 'filing' | 'hearing' | 'judgment' | 'payment' | 'document' | 'note' | 'status_change'

interface TimelineEvent {
  id: string
  type: EventType
  title: string
  description?: string | null
  eventDate: Date
  reminderDate?: Date | null
  status: 'scheduled' | 'completed' | 'cancelled' | 'postponed'
  createdBy?: string | null
  createdAt: Date
}

interface CaseTimelineProps {
  litigationId: string
  events: TimelineEvent[]
  onAddEvent?: (event: Partial<TimelineEvent>) => Promise<void>
  onEditEvent?: (id: string, event: Partial<TimelineEvent>) => Promise<void>
  onDeleteEvent?: (id: string) => Promise<void>
}

const eventTypeConfig: Record<EventType, {
  label: string
  icon: React.ReactNode
  color: string
  bgColor: string
}> = {
  filing: {
    label: 'Dépôt',
    icon: <FileText className="h-4 w-4" />,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100'
  },
  hearing: {
    label: 'Audience',
    icon: <Scale className="h-4 w-4" />,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100'
  },
  judgment: {
    label: 'Jugement',
    icon: <Gavel className="h-4 w-4" />,
    color: 'text-red-600',
    bgColor: 'bg-red-100'
  },
  payment: {
    label: 'Paiement',
    icon: <DollarSign className="h-4 w-4" />,
    color: 'text-green-600',
    bgColor: 'bg-green-100'
  },
  document: {
    label: 'Document',
    icon: <FileText className="h-4 w-4" />,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100'
  },
  note: {
    label: 'Note',
    icon: <MessageSquare className="h-4 w-4" />,
    color: 'text-gray-600',
    bgColor: 'bg-gray-100'
  },
  status_change: {
    label: 'Changement de statut',
    icon: <AlertCircle className="h-4 w-4" />,
    color: 'text-amber-600',
    bgColor: 'bg-amber-100'
  }
}

const eventStatusConfig = {
  scheduled: { label: 'Planifié', color: 'bg-blue-100 text-blue-700' },
  completed: { label: 'Terminé', color: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Annulé', color: 'bg-gray-100 text-gray-700' },
  postponed: { label: 'Reporté', color: 'bg-orange-100 text-orange-700' }
}

export function CaseTimeline({
  litigationId,
  events,
  onAddEvent,
  onEditEvent,
  onDeleteEvent
}: CaseTimelineProps) {
  const [isAddingEvent, setIsAddingEvent] = useState(false)
  const [editingEvent, setEditingEvent] = useState<TimelineEvent | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Form state
  const [formData, setFormData] = useState({
    type: 'note' as EventType,
    title: '',
    description: '',
    eventDate: '',
    reminderDate: '',
    status: 'scheduled' as const
  })

  const sortedEvents = [...events].sort((a, b) => 
    new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime()
  )

  const resetForm = () => {
    setFormData({
      type: 'note',
      title: '',
      description: '',
      eventDate: '',
      reminderDate: '',
      status: 'scheduled'
    })
  }

  const handleSubmit = async () => {
    if (!onAddEvent) return
    setIsSubmitting(true)
    try {
      await onAddEvent({
        ...formData,
        eventDate: new Date(formData.eventDate),
        reminderDate: formData.reminderDate ? new Date(formData.reminderDate) : null
      })
      resetForm()
      setIsAddingEvent(false)
    } catch (error) {
      console.error('Error adding event:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = async () => {
    if (!editingEvent || !onEditEvent) return
    setIsSubmitting(true)
    try {
      await onEditEvent(editingEvent.id, {
        ...formData,
        eventDate: new Date(formData.eventDate),
        reminderDate: formData.reminderDate ? new Date(formData.reminderDate) : null
      })
      setEditingEvent(null)
      resetForm()
    } catch (error) {
      console.error('Error editing event:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!onDeleteEvent) return
    if (confirm('Êtes-vous sûr de vouloir supprimer cet événement ?')) {
      await onDeleteEvent(id)
    }
  }

  const openEditDialog = (event: TimelineEvent) => {
    setEditingEvent(event)
    setFormData({
      type: event.type,
      title: event.title,
      description: event.description || '',
      eventDate: format(new Date(event.eventDate), "yyyy-MM-dd'T'HH:mm"),
      reminderDate: event.reminderDate ? format(new Date(event.reminderDate), "yyyy-MM-dd'T'HH:mm") : '',
      status: event.status
    })
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Chronologie
        </CardTitle>
        {onAddEvent && (
          <Dialog open={isAddingEvent} onOpenChange={setIsAddingEvent}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Ajouter
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Ajouter un événement</DialogTitle>
                <DialogDescription>
                  Ajoutez un nouvel événement à la chronologie du dossier.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>Type</Label>
                  <Select 
                    value={formData.type} 
                    onValueChange={(v) => setFormData({ ...formData, type: v as EventType })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(eventTypeConfig).map(([key, config]) => (
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
                  <Label>Titre</Label>
                  <Input 
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Titre de l'événement"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Description</Label>
                  <Textarea 
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Description (optionnelle)"
                    rows={3}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Date de l'événement</Label>
                  <Input 
                    type="datetime-local"
                    value={formData.eventDate}
                    onChange={(e) => setFormData({ ...formData, eventDate: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Date de rappel (optionnelle)</Label>
                  <Input 
                    type="datetime-local"
                    value={formData.reminderDate}
                    onChange={(e) => setFormData({ ...formData, reminderDate: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddingEvent(false)}>
                  Annuler
                </Button>
                <Button onClick={handleSubmit} disabled={isSubmitting || !formData.title || !formData.eventDate}>
                  {isSubmitting ? 'Ajout...' : 'Ajouter'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </CardHeader>
      <CardContent>
        {sortedEvents.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Aucun événement enregistré</p>
          </div>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />
            
            {/* Events */}
            <div className="space-y-4">
              {sortedEvents.map((event) => {
                const config = eventTypeConfig[event.type]
                const eventDate = new Date(event.eventDate)
                const isOverdue = event.status === 'scheduled' && isPast(eventDate) && !isToday(eventDate)
                const isUpcoming = event.status === 'scheduled' && isFuture(eventDate)
                
                return (
                  <div key={event.id} className="relative pl-10">
                    {/* Timeline dot */}
                    <div className={`absolute left-0 p-2 rounded-full ${config.bgColor} ${config.color}`}>
                      {config.icon}
                    </div>
                    
                    {/* Event content */}
                    <div className={`p-4 rounded-lg border ${isOverdue ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-white'}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{event.title}</span>
                            <Badge className={eventStatusConfig[event.status].color}>
                              {eventStatusConfig[event.status].label}
                            </Badge>
                            {isOverdue && (
                              <Badge variant="destructive" className="gap-1">
                                <AlertCircle className="h-3 w-3" />
                                En retard
                              </Badge>
                            )}
                            {isUpcoming && (
                              <Badge variant="secondary" className="gap-1">
                                <Clock className="h-3 w-3" />
                                À venir
                              </Badge>
                            )}
                            {event.reminderDate && (
                              <Badge variant="outline" className="gap-1">
                                <Bell className="h-3 w-3" />
                                Rappel
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {format(eventDate, "d MMMM yyyy 'à' HH:mm", { locale: fr })}
                          </p>
                          {event.description && (
                            <p className="text-sm text-gray-600">{event.description}</p>
                          )}
                        </div>
                        
                        {/* Actions */}
                        {(onEditEvent || onDeleteEvent) && (
                          <div className="flex items-center gap-1">
                            {onEditEvent && (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 w-8 p-0"
                                onClick={() => openEditDialog(event)}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                            )}
                            {onDeleteEvent && (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                onClick={() => handleDelete(event.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </CardContent>
      
      {/* Edit Dialog */}
      <Dialog open={!!editingEvent} onOpenChange={() => setEditingEvent(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier l'événement</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Type</Label>
              <Select 
                value={formData.type} 
                onValueChange={(v) => setFormData({ ...formData, type: v as EventType })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(eventTypeConfig).map(([key, config]) => (
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
              <Label>Titre</Label>
              <Input 
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Description</Label>
              <Textarea 
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="grid gap-2">
              <Label>Date de l'événement</Label>
              <Input 
                type="datetime-local"
                value={formData.eventDate}
                onChange={(e) => setFormData({ ...formData, eventDate: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Statut</Label>
              <Select 
                value={formData.status} 
                onValueChange={(v) => setFormData({ ...formData, status: v as typeof formData.status })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">Planifié</SelectItem>
                  <SelectItem value="completed">Terminé</SelectItem>
                  <SelectItem value="cancelled">Annulé</SelectItem>
                  <SelectItem value="postponed">Reporté</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingEvent(null)}>
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

export default CaseTimeline
