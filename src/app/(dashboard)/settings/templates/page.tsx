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
  Download,
  Upload,
  Sparkles,
  Info,
} from "lucide-react";
import { TemplateEditor } from "@/components/templates/template-editor";
import { TemplateList } from "@/components/templates/template-list";
import { toast } from "sonner";
import { 
  TemplateType, 
  TemplateCategory, 
  TemplateCreate,
  DEFAULT_EMAIL_TEMPLATES, 
  DEFAULT_WHATSAPP_TEMPLATES,
} from "@/lib/templates/types";
import { TEMPLATE_VARIABLES } from "@/lib/templates/variables";

interface Template {
  id: string;
  name: string;
  type: TemplateType;
  category: TemplateCategory;
  subject: string | null;
  body: string;
  isDefault: boolean;
  isActive: boolean;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

export default function TemplatesSettingsPage() {
  const { data: session } = useSession();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<Template | null>(null);
  const [activeTab, setActiveTab] = useState<TemplateType>("email");
  const [initializing, setInitializing] = useState(false);

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

  // Initialize default templates if none exist
  const initializeDefaultTemplates = async () => {
    if (templates.length > 0) return;
    
    setInitializing(true);
    try {
      // Create default email templates
      for (const template of DEFAULT_EMAIL_TEMPLATES) {
        await fetch("/api/templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...template,
            isDefault: true,
          }),
        });
      }

      // Create default WhatsApp templates
      for (const template of DEFAULT_WHATSAPP_TEMPLATES) {
        await fetch("/api/templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...template,
            isDefault: true,
          }),
        });
      }

      toast.success("Templates par défaut créés avec succès");
      fetchTemplates();
    } catch (error) {
      console.error("Error initializing templates:", error);
      toast.error("Erreur lors de la création des templates par défaut");
    } finally {
      setInitializing(false);
    }
  };

  const handleCreate = () => {
    setSelectedTemplate(null);
    setEditDialogOpen(true);
  };

  const handleEdit = (template: Template) => {
    setSelectedTemplate(template);
    setEditDialogOpen(true);
  };

  const handleDelete = (template: Template) => {
    if (template.isDefault) {
      toast.error("Les templates par défaut ne peuvent pas être supprimés. Dupliquez-les pour créer une copie modifiable.");
      return;
    }
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
          isDefault: false,
          isActive: true,
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

      {/* Info Card */}
      <Card className="bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-orange-600 dark:text-orange-400 mt-0.5" />
            <div>
              <h3 className="font-medium text-orange-800 dark:text-orange-200">
                Variables de personnalisation
              </h3>
              <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                Utilisez les variables entre accolades pour personnaliser vos messages. 
                Les variables seront automatiquement remplacées par les données du client et de la créance.
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                {TEMPLATE_VARIABLES.slice(0, 6).map((v) => (
                  <Badge 
                    key={v.key} 
                    variant="secondary" 
                    className="bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300"
                  >
                    {`{${v.key}}`} - {v.label}
                  </Badge>
                ))}
                <Badge variant="outline" className="text-orange-600">
                  +{TEMPLATE_VARIABLES.length - 6} autres
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TemplateType)}>
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
          {filteredTemplates.length === 0 && !loading ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">Aucun template email enregistré</p>
                <div className="flex gap-2 justify-center">
                  <Button 
                    variant="outline" 
                    onClick={initializeDefaultTemplates}
                    disabled={initializing}
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    Créer les templates par défaut
                  </Button>
                  <Button className="bg-orange-500 hover:bg-orange-600" onClick={handleCreate}>
                    <Plus className="mr-2 h-4 w-4" />
                    Créer un template
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <TemplateList
              templates={filteredTemplates}
              loading={loading}
              activeType={activeTab}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onDuplicate={handleDuplicate}
            />
          )}
        </TabsContent>

        <TabsContent value="whatsapp" className="mt-4">
          {filteredTemplates.length === 0 && !loading ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">Aucun template WhatsApp enregistré</p>
                <div className="flex gap-2 justify-center">
                  <Button 
                    variant="outline" 
                    onClick={initializeDefaultTemplates}
                    disabled={initializing}
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    Créer les templates par défaut
                  </Button>
                  <Button className="bg-orange-500 hover:bg-orange-600" onClick={handleCreate}>
                    <Plus className="mr-2 h-4 w-4" />
                    Créer un template
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <TemplateList
              templates={filteredTemplates}
              loading={loading}
              activeType={activeTab}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onDuplicate={handleDuplicate}
            />
          )}
        </TabsContent>
      </Tabs>

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
