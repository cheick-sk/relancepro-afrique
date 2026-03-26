'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
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
  Upload,
  Download,
  Trash2,
  Eye,
  File,
  FileImage,
  FileSpreadsheet,
  FileArchive,
  Plus,
  ExternalLink
} from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

export type DocumentType = 'demand_letter' | 'court_filing' | 'notice' | 'evidence' | 'judgment' | 'other'

interface Document {
  id: string
  name: string
  type: DocumentType
  description?: string | null
  fileUrl: string
  fileSize?: number | null
  mimeType?: string | null
  uploadedBy?: string | null
  uploadedAt: Date
}

interface DocumentsManagerProps {
  litigationId: string
  documents: Document[]
  onUploadDocument?: (document: Partial<Document> & { file?: File }) => Promise<void>
  onDeleteDocument?: (id: string) => Promise<void>
}

const documentTypeConfig: Record<DocumentType, {
  label: string
  color: string
  bgColor: string
}> = {
  demand_letter: {
    label: 'Mise en demeure',
    color: 'text-purple-700',
    bgColor: 'bg-purple-50'
  },
  court_filing: {
    label: 'Assignation',
    color: 'text-red-700',
    bgColor: 'bg-red-50'
  },
  notice: {
    label: 'Avis',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50'
  },
  evidence: {
    label: 'Preuve',
    color: 'text-orange-700',
    bgColor: 'bg-orange-50'
  },
  judgment: {
    label: 'Jugement',
    color: 'text-green-700',
    bgColor: 'bg-green-50'
  },
  other: {
    label: 'Autre',
    color: 'text-gray-700',
    bgColor: 'bg-gray-50'
  }
}

const getFileIcon = (mimeType?: string | null) => {
  if (!mimeType) return <File className="h-8 w-8 text-gray-400" />
  
  if (mimeType.startsWith('image/')) {
    return <FileImage className="h-8 w-8 text-blue-500" />
  }
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) {
    return <FileSpreadsheet className="h-8 w-8 text-green-500" />
  }
  if (mimeType.includes('pdf')) {
    return <FileText className="h-8 w-8 text-red-500" />
  }
  if (mimeType.includes('zip') || mimeType.includes('archive')) {
    return <FileArchive className="h-8 w-8 text-yellow-500" />
  }
  
  return <File className="h-8 w-8 text-gray-400" />
}

const formatFileSize = (bytes?: number | null) => {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function DocumentsManager({
  litigationId,
  documents,
  onUploadDocument,
  onDeleteDocument
}: DocumentsManagerProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  
  const [formData, setFormData] = useState({
    name: '',
    type: 'other' as DocumentType,
    description: ''
  })

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'other',
      description: ''
    })
    setSelectedFile(null)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      if (!formData.name) {
        setFormData({ ...formData, name: file.name.replace(/\.[^/.]+$/, '') })
      }
    }
  }

  const handleSubmit = async () => {
    if (!onUploadDocument || !selectedFile) return
    setIsSubmitting(true)
    try {
      await onUploadDocument({
        ...formData,
        file: selectedFile,
        description: formData.description || null
      })
      resetForm()
      setIsUploading(false)
    } catch (error) {
      console.error('Error uploading document:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!onDeleteDocument) return
    if (confirm('Êtes-vous sûr de vouloir supprimer ce document ?')) {
      await onDeleteDocument(id)
    }
  }

  // Group documents by type
  const documentsByType = documents.reduce((acc, doc) => {
    if (!acc[doc.type]) {
      acc[doc.type] = []
    }
    acc[doc.type].push(doc)
    return acc
  }, {} as Record<DocumentType, Document[]>)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Documents
          {documents.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {documents.length}
            </Badge>
          )}
        </CardTitle>
        {onUploadDocument && (
          <Dialog open={isUploading} onOpenChange={setIsUploading}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Upload className="h-4 w-4 mr-1" />
                Ajouter
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Ajouter un document</DialogTitle>
                <DialogDescription>
                  Téléversez un document pour ce dossier contentieux.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>Fichier</Label>
                  <Input 
                    type="file"
                    onChange={handleFileChange}
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xlsx,.xls"
                  />
                  {selectedFile && (
                    <p className="text-xs text-muted-foreground">
                      {selectedFile.name} ({formatFileSize(selectedFile.size)})
                    </p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label>Type</Label>
                  <Select 
                    value={formData.type} 
                    onValueChange={(v) => setFormData({ ...formData, type: v as DocumentType })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(documentTypeConfig).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          <span className={config.color}>{config.label}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Nom du document</Label>
                  <Input 
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Nom du document"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Description (optionnelle)</Label>
                  <Textarea 
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Description du document"
                    rows={2}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsUploading(false)}>
                  Annuler
                </Button>
                <Button 
                  onClick={handleSubmit} 
                  disabled={isSubmitting || !selectedFile || !formData.name}
                >
                  {isSubmitting ? 'Téléversement...' : 'Téléverser'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </CardHeader>
      <CardContent>
        {documents.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Aucun document</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(documentsByType).map(([type, typeDocs]) => {
              const config = documentTypeConfig[type as DocumentType]
              return (
                <div key={type}>
                  <div className="flex items-center gap-2 mb-3">
                    <h4 className={`font-medium ${config.color}`}>{config.label}</h4>
                    <Badge variant="secondary" className="text-xs">
                      {typeDocs.length}
                    </Badge>
                  </div>
                  <div className="grid gap-2">
                    {typeDocs.map((doc) => (
                      <div 
                        key={doc.id} 
                        className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 bg-white hover:shadow-sm transition-shadow"
                      >
                        <div className="flex-shrink-0">
                          {getFileIcon(doc.mimeType)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium truncate">{doc.name}</p>
                            {doc.fileSize && (
                              <span className="text-xs text-muted-foreground">
                                ({formatFileSize(doc.fileSize)})
                              </span>
                            )}
                          </div>
                          {doc.description && (
                            <p className="text-sm text-muted-foreground truncate">
                              {doc.description}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            Ajouté le {format(new Date(doc.uploadedAt), 'd MMM yyyy', { locale: fr })}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0"
                            asChild
                          >
                            <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0"
                            asChild
                          >
                            <a href={doc.fileUrl} download>
                              <Download className="h-4 w-4" />
                            </a>
                          </Button>
                          {onDeleteDocument && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                              onClick={() => handleDelete(doc.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
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
    </Card>
  )
}

export default DocumentsManager
