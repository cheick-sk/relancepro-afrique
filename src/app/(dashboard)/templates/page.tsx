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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
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
  Languages,
  Clock,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TemplateEditor } from "@/components/templates/template-editor";
import { ToneBadge } from "@/components/templates/tone-selector";
import { MiniPreview } from "@/components/templates/template-preview";
import { toast } from "sonner";

interface Template {
  id: string;
  name: string;
  type: "email" | "whatsapp";
  category: string;
  subject: string | null;
  content: string;
  language: string;
  tone: string;
  isDefault: boolean;
  isActive: boolean;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

const categoryLabels: Record<string, string> = {
  reminder1: "1ère relance",
  reminder2: "2ème relance",
  reminder3: "3ème relance",
  custom: "Personnalisé",
};

const categoryColors: Record<string, string> = {
  reminder1: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  reminder2: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
  reminder3: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  custom: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
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
  const [languageFilter, setLanguageFilter] = useState<"all" | "fr" | "en">("all");

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

  const handleReset = async (templateId: string) => {
    try {
      const response = await fetch(`/api/templates/${templateId}/reset`, {
        method: "POST",
      });

      if (response.ok) {
        toast.success("Template réinitialisé");
        fetchTemplates();
      } else {
        toast.error("Erreur lors de la réinitialisation");
      }
    } catch (error) {
      console.error("Error resetting template:", error);
      toast.error("Erreur lors de la réinitialisation");
    }
  };

  // Filter templates
  const filteredTemplates = templates.filter((t) => {
    if (t.type !== activeTab) return false;
    if (languageFilter !== "all" && t.language !== languageFilter) return false;
    return true;
  });

  // Sort templates: default first, then by category
  const sortedTemplates = [...filteredTemplates].sort((a, b) => {
    if (a.isDefault && !b.isDefault) return -1;
    if (!a.isDefault && b.isDefault) return 1;
    const categoryOrder = { reminder1: 1, reminder2: 2, reminder3: 3, custom: 4 };
    return (categoryOrder[a.category as keyof typeof categoryOrder] || 5) - 
           (categoryOrder[b.category as keyof typeof categoryOrder] || 5);
  });

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <FileText className="h-6 w-6 text-orange-500" />
            Modèles de messages
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Créez et personnalisez vos modèles de relances
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={fetchTemplates} disabled={loading}>
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

      <Separator />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-0 pt-4">
        {/* Tabs and Filters */}
        <div className="flex items-center justify-between mb-4">
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
          </Tabs>

          <div className="flex items-center gap-2">
            <Button
              variant={languageFilter === "all" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setLanguageFilter("all")}
            >
              Tous
            </Button>
            <Button
              variant={languageFilter === "fr" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setLanguageFilter("fr")}
            >
              <Languages className="h-3 w-3 mr-1" />
              FR
            </Button>
            <Button
              variant={languageFilter === "en" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setLanguageFilter("en")}
            >
              <Languages className="h-3 w-3 mr-1" />
              EN
            </Button>
          </div>
        </div>

        {/* Templates Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : sortedTemplates.length === 0 ? (
          <Card className="flex-1">
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">Aucun template enregistré</p>
              <Button className="bg-orange-500 hover:bg-orange-600" onClick={handleCreate}>
                <Plus className="mr-2 h-4 w-4" />
                Créer un template
              </Button>
            </CardContent>
          </Card>
        ) : (
          <ScrollArea className="flex-1">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {sortedTemplates.map((template) => (
                <Card
                  key={template.id}
                  className={`relative group cursor-pointer hover:shadow-md transition-shadow ${
                    template.isDefault ? "ring-2 ring-orange-500" : ""
                  }`}
                  onClick={() => handleEdit(template)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base flex items-center gap-2 truncate">
                          {template.name}
                          {template.isDefault && (
                            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500 flex-shrink-0" />
                          )}
                        </CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className={categoryColors[template.category] || ""}>
                            {categoryLabels[template.category] || template.category}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {template.language === "fr" ? "FR" : "EN"}
                          </Badge>
                          <ToneBadge tone={template.tone as "formal" | "friendly" | "urgent" | "custom"} className="text-xs" />
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(template)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Modifier
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDuplicate(template)}>
                            <Copy className="mr-2 h-4 w-4" />
                            Dupliquer
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleReset(template.id)}>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Réinitialiser
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDelete(template)}
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
                    <MiniPreview
                      type={template.type}
                      content={template.content}
                      subject={template.subject || undefined}
                    />
                    <div className="flex items-center justify-between mt-3 pt-3 border-t">
                      <div className="flex items-center gap-2">
                        {template.isActive ? (
                          <Badge variant="secondary" className="bg-green-100 text-green-700">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Actif
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-gray-100 text-gray-600">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Inactif
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Utilisé {template.usageCount} fois
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-6xl h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {selectedTemplate ? "Modifier le template" : "Nouveau template"}
            </DialogTitle>
            <DialogDescription>
              Créez un modèle de message avec des variables dynamiques pour personnaliser vos relances.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-hidden">
            <TemplateEditor
              template={selectedTemplate || undefined}
              onSave={handleSave}
            />
          </div>
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
