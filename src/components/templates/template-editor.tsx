"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Link2,
  Eye,
  Code,
  Variable,
  Mail,
  MessageSquare,
  Save,
  Send,
  Undo,
  Redo,
} from "lucide-react";
import { toast } from "sonner";

// Variables disponibles pour les templates
export const TEMPLATE_VARIABLES = [
  { key: "client_name", label: "Nom du client", example: "Jean Dupont" },
  { key: "client_company", label: "Entreprise du client", example: "ACME SARL" },
  { key: "amount", label: "Montant dû", example: "1 500 000 GNF" },
  { key: "remaining_amount", label: "Montant restant", example: "1 200 000 GNF" },
  { key: "paid_amount", label: "Montant payé", example: "300 000 GNF" },
  { key: "due_date", label: "Date d'échéance", example: "15 janvier 2025" },
  { key: "days_overdue", label: "Jours de retard", example: "45" },
  { key: "reference", label: "Référence", example: "FAC-2025-001" },
  { key: "description", label: "Description", example: "Prestation de consulting" },
  { key: "company_name", label: "Votre entreprise", example: "Ma Société" },
  { key: "current_date", label: "Date actuelle", example: "20 janvier 2025" },
];

interface Template {
  id?: string;
  name: string;
  type: "email" | "whatsapp";
  category: string;
  subject?: string;
  content: string;
  isDefault?: boolean;
  isActive?: boolean;
}

interface TemplateEditorProps {
  template?: Template;
  onSave: (template: Template) => Promise<void>;
  onTestSend?: (template: Template) => Promise<void>;
  isLoading?: boolean;
}

export function TemplateEditor({ template, onSave, onTestSend, isLoading }: TemplateEditorProps) {
  const [name, setName] = useState(template?.name || "");
  const [type, setType] = useState<"email" | "whatsapp">(template?.type || "email");
  const [category, setCategory] = useState(template?.category || "reminder1");
  const [subject, setSubject] = useState(template?.subject || "");
  const [content, setContent] = useState(template?.content || "");
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (template) {
      setName(template.name);
      setType(template.type as "email" | "whatsapp");
      setCategory(template.category);
      setSubject(template.subject || "");
      setContent(template.content);
    }
  }, [template]);

  // Insérer une variable dans le contenu
  const insertVariable = (variableKey: string) => {
    const textarea = document.getElementById("template-content") as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const variable = `{${variableKey}}`;
    const newContent = content.substring(0, start) + variable + content.substring(end);
    setContent(newContent);

    // Repositionner le curseur après la variable
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + variable.length, start + variable.length);
    }, 0);
  };

  // Remplacer les variables par leurs exemples pour la prévisualisation
  const getPreviewContent = (text: string) => {
    let preview = text;
    TEMPLATE_VARIABLES.forEach((v) => {
      const regex = new RegExp(`\\{${v.key}\\}`, "g");
      preview = preview.replace(regex, v.example);
    });
    return preview;
  };

  // Appliquer un formatage simple (Markdown-like)
  const applyFormat = (format: "bold" | "italic" | "underline" | "list" | "ordered" | "link") => {
    const textarea = document.getElementById("template-content") as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    let formattedText = selectedText;

    switch (format) {
      case "bold":
        formattedText = `**${selectedText}**`;
        break;
      case "italic":
        formattedText = `*${selectedText}*`;
        break;
      case "underline":
        formattedText = `__${selectedText}__`;
        break;
      case "list":
        formattedText = `\n- ${selectedText}`;
        break;
      case "ordered":
        formattedText = `\n1. ${selectedText}`;
        break;
      case "link":
        formattedText = `[${selectedText}](url)`;
        break;
    }

    const newContent = content.substring(0, start) + formattedText + content.substring(end);
    setContent(newContent);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Le nom du template est requis");
      return;
    }
    if (!content.trim()) {
      toast.error("Le contenu du template est requis");
      return;
    }
    if (type === "email" && !subject.trim()) {
      toast.error("L'objet de l'email est requis");
      return;
    }

    setSaving(true);
    try {
      await onSave({
        id: template?.id,
        name,
        type,
        category,
        subject: type === "email" ? subject : undefined,
        content,
        isDefault: template?.isDefault,
        isActive: template?.isActive,
      });
      toast.success("Template enregistré avec succès");
    } catch (error) {
      console.error("Error saving template:", error);
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  const handleTestSend = async () => {
    if (!onTestSend) return;
    
    try {
      await onTestSend({
        name,
        type,
        category,
        subject: type === "email" ? subject : undefined,
        content,
      });
      toast.success("Test envoyé avec succès");
    } catch (error) {
      console.error("Error sending test:", error);
      toast.error("Erreur lors de l'envoi du test");
    }
  };

  // Templates par défaut
  const loadDefaultTemplate = (templateType: "reminder1" | "reminder2" | "reminder3") => {
    const templates: Record<string, { subject: string; content: string }> = {
      reminder1: {
        subject: "Rappel : Facture {reference} en attente de paiement",
        content: `Bonjour {client_name},

Nous espérons que vous allez bien.

Nous vous rappelons que la facture {reference} d'un montant de {amount} est arrivée à échéance le {due_date}.

Nous vous prions de bien vouloir procéder au paiement dans les meilleurs délais.

En cas de difficulté ou pour toute question, n'hésitez pas à nous contacter.

Cordialement,
{company_name}`,
      },
      reminder2: {
        subject: "Deuxième rappel : Facture {reference} - Action requise",
        content: `Bonjour {client_name},

Malgré notre précédent rappel, nous n'avons toujours pas reçu le paiement de la facture {reference} d'un montant de {remaining_amount}.

Cette facture est en retard de {days_overdue} jours.

Nous vous invitons à régulariser cette situation dans les plus brefs délais pour éviter d'éventuels frais de retard.

Merci de votre compréhension.

Cordialement,
{company_name}`,
      },
      reminder3: {
        subject: "Dernier rappel : Facture {reference} - Urgent",
        content: `Bonjour {client_name},

Nous vous contactons pour la troisième fois concernant la facture {reference} d'un montant de {remaining_amount}, en retard de {days_overdue} jours.

À défaut de règlement sous 7 jours, nous serons contraints de procéder à des actions de recouvrement.

Nous restons à votre disposition pour trouver une solution amiable.

Cordialement,
{company_name}`,
      },
    };

    const t = templates[templateType];
    setCategory(templateType);
    setSubject(t.subject);
    setContent(t.content);
  };

  return (
    <div className="space-y-4">
      {/* Informations de base */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="name">Nom du template</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Rappel 1 - Standard"
          />
        </div>
        <div className="space-y-2">
          <Label>Type</Label>
          <Select value={type} onValueChange={(v) => setType(v as "email" | "whatsapp")}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="email">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email
                </div>
              </SelectItem>
              <SelectItem value="whatsapp">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  WhatsApp
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Catégorie</Label>
          <Select value={category} onValueChange={(v) => setCategory(v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="reminder1">Rappel 1 (1ère relance)</SelectItem>
              <SelectItem value="reminder2">Rappel 2 (2ème relance)</SelectItem>
              <SelectItem value="reminder3">Rappel 3 (Dernière relance)</SelectItem>
              <SelectItem value="custom">Personnalisé</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Charger un template par défaut */}
      <div className="flex gap-2">
        <span className="text-sm text-gray-500">Charger un modèle :</span>
        <Button
          variant="link"
          size="sm"
          className="h-auto p-0 text-orange-600"
          onClick={() => loadDefaultTemplate("reminder1")}
        >
          Rappel 1
        </Button>
        <Button
          variant="link"
          size="sm"
          className="h-auto p-0 text-orange-600"
          onClick={() => loadDefaultTemplate("reminder2")}
        >
          Rappel 2
        </Button>
        <Button
          variant="link"
          size="sm"
          className="h-auto p-0 text-orange-600"
          onClick={() => loadDefaultTemplate("reminder3")}
        >
          Rappel 3
        </Button>
      </div>

      {/* Objet (email uniquement) */}
      {type === "email" && (
        <div className="space-y-2">
          <Label htmlFor="subject">Objet de l&apos;email</Label>
          <Input
            id="subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Ex: Rappel : Facture en attente de paiement"
          />
        </div>
      )}

      {/* Variables disponibles */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Variable className="h-4 w-4" />
            Variables disponibles
          </CardTitle>
          <CardDescription className="text-xs">
            Cliquez sur une variable pour l&apos;insérer dans le texte
          </CardDescription>
        </CardHeader>
        <CardContent className="py-2">
          <div className="flex flex-wrap gap-2">
            {TEMPLATE_VARIABLES.map((v) => (
              <Button
                key={v.key}
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => insertVariable(v.key)}
              >
                {v.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Éditeur avec tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "edit" | "preview")}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="edit" className="flex items-center gap-1">
              <Code className="h-4 w-4" />
              Éditer
            </TabsTrigger>
            <TabsTrigger value="preview" className="flex items-center gap-1">
              <Eye className="h-4 w-4" />
              Prévisualiser
            </TabsTrigger>
          </TabsList>

          {/* Barre d'outils */}
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => applyFormat("bold")} title="Gras">
              <Bold className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => applyFormat("italic")} title="Italique">
              <Italic className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => applyFormat("underline")} title="Souligné">
              <Underline className="h-4 w-4" />
            </Button>
            <div className="w-px h-4 bg-gray-300 mx-1" />
            <Button variant="ghost" size="sm" onClick={() => applyFormat("list")} title="Liste">
              <List className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => applyFormat("ordered")} title="Liste numérotée">
              <ListOrdered className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => applyFormat("link")} title="Lien">
              <Link2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <TabsContent value="edit" className="mt-4">
          <Textarea
            id="template-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Rédigez votre template ici. Utilisez les variables {client_name}, {amount}, etc."
            className="min-h-[300px] font-mono text-sm"
          />
        </TabsContent>

        <TabsContent value="preview" className="mt-4">
          <Card className="bg-gray-50 dark:bg-gray-900">
            <CardContent className="p-4">
              {type === "email" && (
                <div className="mb-4 pb-4 border-b">
                  <p className="text-sm text-gray-500">Objet :</p>
                  <p className="font-medium">{getPreviewContent(subject)}</p>
                </div>
              )}
              <div className="whitespace-pre-wrap text-sm">
                {getPreviewContent(content)}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Actions */}
      <div className="flex justify-between pt-4 border-t">
        <div className="flex gap-2">
          {template?.id && (
            <Badge variant="outline">
              Utilisé {template?.isDefault ? "0" : "0"} fois
            </Badge>
          )}
        </div>
        <div className="flex gap-2">
          {onTestSend && (
            <Button variant="outline" onClick={handleTestSend} disabled={isLoading || saving}>
              <Send className="mr-2 h-4 w-4" />
              Tester l&apos;envoi
            </Button>
          )}
          <Button
            className="bg-orange-500 hover:bg-orange-600"
            onClick={handleSave}
            disabled={isLoading || saving}
          >
            <Save className="mr-2 h-4 w-4" />
            Enregistrer
          </Button>
        </div>
      </div>
    </div>
  );
}
