"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FileText,
  Plus,
  RefreshCw,
  Mail,
  MessageSquare,
  Smartphone,
  Star,
  MoreVertical,
  Pencil,
  Trash2,
  Download,
  Upload,
  Copy,
  Search,
  Filter,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TemplateEditor } from "@/components/templates/template-editor";
import { 
  TemplateType, 
  TemplateCategory, 
  TemplateTone, 
  TemplateLanguage,
  TemplateCreate,
  CATEGORY_LABELS,
  TONE_LABELS,
  TONE_COLORS,
  LANGUAGE_LABELS,
  LANGUAGE_FLAGS,
} from "@/lib/templates/types";
import { TEMPLATE_VARIABLES, replaceVariables } from "@/lib/templates/variables";
import { toast } from "sonner";

interface Template {
  id: string;
  name: string;
  type: TemplateType;
  category: TemplateCategory;
  subject: string | null;
  body: string;
  tone: TemplateTone;
  language: TemplateLanguage;
  isDefault: boolean;
  isActive: boolean;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

export default function TemplatesPage() {
  const { data: session } = useSession();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<Template | null>(null);
  const [activeTab, setActiveTab] = useState<TemplateType>("email");
  
  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [toneFilter, setToneFilter] = useState<TemplateTone | "all">("all");
  const [languageFilter, setLanguageFilter] = useState<TemplateLanguage | "all">("all");

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/templates");
      if (response.ok) {
        const data = await response.json();
        setTemplates(data);
      }
    } catch (error) {
      console.error("Error fetching templates:", error);
      toast.error("Erreur lors du chargement des templates");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session) {
      fetchTemplates();
    }
  }, [session, fetchTemplates]);

  const handleCreate = () => {
    setSelectedTemplate(null);
    setEditDialogOpen(true);
  };

  const handleEdit = (template: Template) => {
    setSelectedTemplate(template);
    setEditDialogOpen(true);
  };

  const handleDelete = (template: Template) => {
    setTemplateToDelete(template);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!templateToDelete) return;

    try {
      const response = await fetch(`/api/templates/${templateToDelete.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Template supprimé avec succès");
        fetchTemplates();
      } else {
        const error = await response.json();
        toast.error(error.error || "Erreur lors de la suppression");
      }
    } catch (error) {
      console.error("Error deleting template:", error);
      toast.error("Erreur lors de la suppression");
    } finally {
      setDeleteDialogOpen(false);
      setTemplateToDelete(null);
    }
  };

  const handleSave = async (template: TemplateCreate) => {
    const isEdit = !!selectedTemplate?.id;
    const url = isEdit ? `/api/templates/${selectedTemplate.id}` : "/api/templates";
    const method = isEdit ? "PUT" : "POST";

    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(template),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Erreur lors de l'enregistrement");
    }

    fetchTemplates();
    setEditDialogOpen(false);
  };

  const handleDuplicate = async (template: Template) => {
    try {
      const response = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${template.name} (copie)`,
          type: template.type,
          category: template.category,
          subject: template.subject,
          body: template.body,
          tone: template.tone,
          language: template.language,
          isDefault: false,
        }),
      });

      if (response.ok) {
        toast.success("Template dupliqué avec succès");
        fetchTemplates();
      }
    } catch (error) {
      console.error("Error duplicating template:", error);
      toast.error("Erreur lors de la duplication");
    }
  };

  const handleExport = () => {
    const data = JSON.stringify(templates, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `templates-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Templates exportés avec succès");
  };

  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const importedTemplates = JSON.parse(text);

        for (const template of importedTemplates) {
          await fetch("/api/templates", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...template,
              isDefault: false,
            }),
          });
        }

        toast.success(`${importedTemplates.length} templates importés`);
        fetchTemplates();
      } catch (error) {
        console.error("Error importing templates:", error);
        toast.error("Erreur lors de l'import");
      }
    };
    input.click();
  };

  // Filter templates
  const filteredTemplates = templates.filter((t) => {
    // Type filter
    if (t.type !== activeTab) return false;
    
    // Search filter
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      if (
        !t.name.toLowerCase().includes(searchLower) &&
        !t.subject?.toLowerCase().includes(searchLower) &&
        !t.body.toLowerCase().includes(searchLower)
      ) {
        return false;
      }
    }
    
    // Tone filter
    if (toneFilter !== "all" && t.tone !== toneFilter) return false;
    
    // Language filter
    if (languageFilter !== "all" && t.language !== languageFilter) return false;
    
    return true;
  });

  // Get preview text
  const getPreviewText = (body: string) => {
    const preview = replaceVariables(body);
    return preview.substring(0, 100) + (preview.length > 100 ? "..." : "");
  };

  // Get type icon
  const getTypeIcon = (type: TemplateType) => {
    switch (type) {
      case "email":
        return <Mail className="h-4 w-4" />;
      case "whatsapp":
        return <MessageSquare className="h-4 w-4" />;
      case "sms":
        return <Smartphone className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <FileText className="h-6 w-6 text-orange-500" />
            Modèles de messages
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Créez et personnalisez vos modèles de relances
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchTemplates} size="sm">
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Actualiser
          </Button>
          <Button variant="outline" onClick={handleImport} size="sm">
            <Upload className="mr-2 h-4 w-4" />
            Importer
          </Button>
          <Button variant="outline" onClick={handleExport} disabled={templates.length === 0} size="sm">
            <Download className="mr-2 h-4 w-4" />
            Exporter
          </Button>
          <Button className="bg-orange-500 hover:bg-orange-600" onClick={handleCreate} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Nouveau template
          </Button>
        </div>
      </div>

      {/* Variables disponibles */}
      <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
        <CardHeader className="py-3">
          <CardTitle className="text-sm text-blue-700 dark:text-blue-300">
            Variables dynamiques disponibles
          </CardTitle>
        </CardHeader>
        <CardContent className="py-2">
          <div className="flex flex-wrap gap-2">
            {TEMPLATE_VARIABLES.slice(0, 10).map((v) => (
              <Badge key={v.key} variant="secondary" className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                {`{${v.key}}`}
              </Badge>
            ))}
            <Badge variant="outline" className="text-blue-600">
              +{TEMPLATE_VARIABLES.length - 10} autres
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Tabs and Filters */}
      <div className="space-y-4">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TemplateType)}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <TabsList>
              <TabsTrigger value="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email ({templates.filter((t) => t.type === "email").length})
              </TabsTrigger>
              <TabsTrigger value="whatsapp" className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                WhatsApp ({templates.filter((t) => t.type === "whatsapp").length})
              </TabsTrigger>
              <TabsTrigger value="sms" className="flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                SMS ({templates.filter((t) => t.type === "sms").length})
              </TabsTrigger>
            </TabsList>

            {/* Filters */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Rechercher..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-48"
                />
              </div>
              <Select value={toneFilter} onValueChange={(v) => setToneFilter(v as TemplateTone | "all")}>
                <SelectTrigger className="w-32">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Ton" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les tons</SelectItem>
                  {Object.entries(TONE_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={languageFilter} onValueChange={(v) => setLanguageFilter(v as TemplateLanguage | "all")}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Langue" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les langues</SelectItem>
                  {Object.entries(LANGUAGE_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {LANGUAGE_FLAGS[key as TemplateLanguage]} {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <TabsContent value="email" className="mt-4">
            <TemplatesGrid
              templates={filteredTemplates}
              loading={loading}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onDuplicate={handleDuplicate}
              getPreviewText={getPreviewText}
              getTypeIcon={getTypeIcon}
            />
          </TabsContent>

          <TabsContent value="whatsapp" className="mt-4">
            <TemplatesGrid
              templates={filteredTemplates}
              loading={loading}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onDuplicate={handleDuplicate}
              getPreviewText={getPreviewText}
              getTypeIcon={getTypeIcon}
            />
          </TabsContent>

          <TabsContent value="sms" className="mt-4">
            <TemplatesGrid
              templates={filteredTemplates}
              loading={loading}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onDuplicate={handleDuplicate}
              getPreviewText={getPreviewText}
              getTypeIcon={getTypeIcon}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedTemplate ? "Modifier le template" : "Nouveau template"}
            </DialogTitle>
            <DialogDescription>
              Créez un modèle de message avec des variables dynamiques pour personnaliser vos relances.
            </DialogDescription>
          </DialogHeader>
          <TemplateEditor
            template={selectedTemplate ? {
              id: selectedTemplate.id,
              name: selectedTemplate.name,
              type: selectedTemplate.type,
              category: selectedTemplate.category,
              subject: selectedTemplate.subject,
              body: selectedTemplate.body,
              tone: selectedTemplate.tone,
              language: selectedTemplate.language,
              isDefault: selectedTemplate.isDefault,
              isActive: selectedTemplate.isActive,
              usageCount: selectedTemplate.usageCount,
            } : undefined}
            onSave={handleSave}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le template ?</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer le template{" "}
              <strong>{templateToDelete?.name}</strong> ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Grid component for templates
interface TemplatesGridProps {
  templates: Template[];
  loading: boolean;
  onEdit: (template: Template) => void;
  onDelete: (template: Template) => void;
  onDuplicate: (template: Template) => void;
  getPreviewText: (body: string) => string;
  getTypeIcon: (type: TemplateType) => React.ReactNode;
}

function TemplatesGrid({ 
  templates, 
  loading, 
  onEdit, 
  onDelete, 
  onDuplicate,
  getPreviewText,
  getTypeIcon,
}: TemplatesGridProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 mb-4">Aucun template trouvé</p>
          <Button className="bg-orange-500 hover:bg-orange-600">
            <Plus className="mr-2 h-4 w-4" />
            Créer un template
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {templates.map((template) => (
        <Card key={template.id} className="relative group hover:shadow-md transition-shadow">
          {/* Default badge */}
          {template.isDefault && (
            <div className="absolute -top-2 -right-2">
              <Badge className="bg-yellow-500 hover:bg-yellow-600">
                <Star className="h-3 w-3 mr-1 fill-current" />
                Par défaut
              </Badge>
            </div>
          )}

          <CardHeader className="pb-2">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-lg ${
                  template.type === 'email' 
                    ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300'
                    : template.type === 'whatsapp'
                    ? 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300'
                    : 'bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-300'
                }`}>
                  {getTypeIcon(template.type)}
                </div>
                <div>
                  <CardTitle className="text-base">{template.name}</CardTitle>
                  <CardDescription className="text-xs">
                    {CATEGORY_LABELS[template.category]}
                  </CardDescription>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEdit(template)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Modifier
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onDuplicate(template)}>
                    <Copy className="mr-2 h-4 w-4" />
                    Dupliquer
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onDelete(template)}
                    className="text-red-600"
                    disabled={template.isDefault}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Supprimer
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardHeader>

          <CardContent className="space-y-3">
            {/* Subject preview (email) */}
            {template.subject && (
              <div className="text-sm">
                <span className="text-gray-500">Objet: </span>
                <span className="font-medium truncate">{template.subject}</span>
              </div>
            )}

            {/* Body preview */}
            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3">
              {getPreviewText(template.body)}
            </p>

            {/* Status, Tone, Language and usage */}
            <div className="flex items-center flex-wrap gap-2 pt-2 border-t">
              {template.isActive ? (
                <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                  Actif
                </Badge>
              ) : (
                <Badge variant="secondary" className="bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                  Inactif
                </Badge>
              )}
              <Badge className={TONE_COLORS[template.tone]}>
                {TONE_LABELS[template.tone]}
              </Badge>
              <Badge variant="outline">
                {LANGUAGE_FLAGS[template.language]} {LANGUAGE_LABELS[template.language]}
              </Badge>
              <span className="text-xs text-gray-400 ml-auto">
                {template.usageCount} utilisation{template.usageCount !== 1 ? "s" : ""}
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
