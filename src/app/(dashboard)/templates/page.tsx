"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FileText,
  Plus,
  RefreshCw,
  Mail,
  MessageSquare,
  Star,
  MoreVertical,
  Pencil,
  Trash2,
  Download,
  Upload,
  Copy,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TemplateEditor, TEMPLATE_VARIABLES } from "@/components/templates/template-editor";
import { toast } from "sonner";

interface Template {
  id: string;
  name: string;
  type: "email" | "whatsapp";
  category: string;
  subject: string | null;
  content: string;
  isDefault: boolean;
  isActive: boolean;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

const categoryLabels: Record<string, string> = {
  reminder1: "Rappel 1",
  reminder2: "Rappel 2",
  reminder3: "Rappel 3",
  custom: "Personnalisé",
};

export default function TemplatesPage() {
  const { data: session } = useSession();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<Template | null>(null);
  const [activeTab, setActiveTab] = useState<"email" | "whatsapp">("email");

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
        toast.error("Erreur lors de la suppression");
      }
    } catch (error) {
      console.error("Error deleting template:", error);
      toast.error("Erreur lors de la suppression");
    } finally {
      setDeleteDialogOpen(false);
      setTemplateToDelete(null);
    }
  };

  const handleSave = async (template: Partial<Template>) => {
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
          ...template,
          name: `${template.name} (copie)`,
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

  const filteredTemplates = templates.filter((t) => t.type === activeTab);

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
          <Button variant="outline" onClick={fetchTemplates}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Actualiser
          </Button>
          <Button variant="outline" onClick={handleImport}>
            <Upload className="mr-2 h-4 w-4" />
            Importer
          </Button>
          <Button variant="outline" onClick={handleExport} disabled={templates.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Exporter
          </Button>
          <Button className="bg-orange-500 hover:bg-orange-600" onClick={handleCreate}>
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
            {TEMPLATE_VARIABLES.slice(0, 8).map((v) => (
              <Badge key={v.key} variant="secondary" className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                {`{${v.key}}`}
              </Badge>
            ))}
            <Badge variant="outline" className="text-blue-600">
              +{TEMPLATE_VARIABLES.length - 8} autres
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "email" | "whatsapp")}>
        <TabsList>
          <TabsTrigger value="email" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Email ({templates.filter((t) => t.type === "email").length})
          </TabsTrigger>
          <TabsTrigger value="whatsapp" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            WhatsApp ({templates.filter((t) => t.type === "whatsapp").length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="email" className="mt-4">
          <TemplatesGrid
            templates={filteredTemplates}
            loading={loading}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onDuplicate={handleDuplicate}
          />
        </TabsContent>

        <TabsContent value="whatsapp" className="mt-4">
          <TemplatesGrid
            templates={filteredTemplates}
            loading={loading}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onDuplicate={handleDuplicate}
          />
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedTemplate ? "Modifier le template" : "Nouveau template"}
            </DialogTitle>
            <DialogDescription>
              Créez un modèle de message avec des variables dynamiques pour personnaliser vos relances.
            </DialogDescription>
          </DialogHeader>
          <TemplateEditor
            template={selectedTemplate || undefined}
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
}

function TemplatesGrid({ templates, loading, onEdit, onDelete, onDuplicate }: TemplatesGridProps) {
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
          <p className="text-gray-500 mb-4">Aucun template enregistré</p>
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
        <Card key={template.id} className="relative group">
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  {template.name}
                  {template.isDefault && (
                    <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                  )}
                </CardTitle>
                <CardDescription className="text-xs">
                  {categoryLabels[template.category] || template.category}
                </CardDescription>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
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
                  <DropdownMenuItem
                    onClick={() => onDelete(template)}
                    className="text-red-600"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Supprimer
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardHeader>
          <CardContent>
            {template.subject && (
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 truncate">
                {template.subject}
              </p>
            )}
            <p className="text-sm text-gray-500 line-clamp-3">
              {template.content.substring(0, 150)}...
            </p>
            <div className="flex items-center gap-2 mt-3">
              {template.isActive ? (
                <Badge variant="secondary" className="bg-green-100 text-green-700">
                  Actif
                </Badge>
              ) : (
                <Badge variant="secondary" className="bg-gray-100 text-gray-600">
                  Inactif
                </Badge>
              )}
              <span className="text-xs text-gray-400">
                Utilisé {template.usageCount} fois
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
