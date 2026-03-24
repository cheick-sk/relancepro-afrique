"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Link2,
  Eye,
  Code,
  Mail,
  MessageSquare,
  Save,
  Send,
  Undo,
  Redo,
  Type,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Highlighter,
  RotateCcw,
  FileText,
  Languages,
} from "lucide-react";
import { toast } from "sonner";
import { VariablePicker, QuickVariableButtons } from "./variable-picker";
import { TemplatePreview } from "./template-preview";
import { ToneSelector, ToneSettings, ToneBadge } from "./tone-selector";
import {
  replaceVariables,
  getSampleTemplateData,
  templateVariables,
} from "@/lib/templates/variables";
import { getDefaultTemplate } from "@/lib/templates/default-templates";

// Re-export variables for backward compatibility
export { templateVariables as TEMPLATE_VARIABLES } from "@/lib/templates/variables";

interface Template {
  id?: string;
  name: string;
  type: "email" | "whatsapp";
  category: string;
  subject?: string;
  content: string;
  language?: string;
  tone?: string;
  isDefault?: boolean;
  isActive?: boolean;
  usageCount?: number;
}

interface TemplateEditorProps {
  template?: Template;
  onSave: (template: Template) => Promise<void>;
  onTestSend?: (template: Template) => Promise<void>;
  isLoading?: boolean;
  defaultLanguage?: "fr" | "en";
  companyName?: string;
}

export function TemplateEditor({
  template,
  onSave,
  onTestSend,
  isLoading,
  defaultLanguage = "fr",
  companyName = "Mon Entreprise",
}: TemplateEditorProps) {
  const [name, setName] = useState(template?.name || "");
  const [type, setType] = useState<"email" | "whatsapp">(template?.type || "email");
  const [category, setCategory] = useState(template?.category || "reminder1");
  const [language, setLanguage] = useState<"fr" | "en">(
    (template?.language as "fr" | "en") || defaultLanguage
  );
  const [subject, setSubject] = useState(template?.subject || "");
  const [content, setContent] = useState(template?.content || "");
  const [toneSettings, setToneSettings] = useState<ToneSettings>({
    type: (template?.tone as ToneSettings["type"]) || "formal",
    greetingStyle: "formal",
    urgencyLevel: 5,
  });
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const undoStack = useRef<string[]>([template?.content || ""]);
  const redoStack = useRef<string[]>([]);

  // Track changes
  useEffect(() => {
    const hasContentChanges =
      content !== (template?.content || "") ||
      subject !== (template?.subject || "") ||
      name !== (template?.name || "");
    setHasChanges(hasContentChanges);
  }, [content, subject, name, template]);

  // Load template when it changes
  useEffect(() => {
    if (template) {
      setName(template.name);
      setType(template.type as "email" | "whatsapp");
      setCategory(template.category);
      setLanguage((template.language as "fr" | "en") || defaultLanguage);
      setSubject(template.subject || "");
      setContent(template.content);
      setToneSettings({
        type: (template.tone as ToneSettings["type"]) || "formal",
        greetingStyle: "formal",
        urgencyLevel: 5,
      });
      undoStack.current = [template.content || ""];
      redoStack.current = [];
    }
  }, [template, defaultLanguage]);

  // Insert variable at cursor position
  const insertVariable = useCallback((variable: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      // Append to end if textarea not found
      setContent((prev) => prev + variable);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newContent = content.substring(0, start) + variable + content.substring(end);
    setContent(newContent);

    // Save to undo stack
    undoStack.current.push(newContent);
    redoStack.current = [];

    // Reposition cursor after variable
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + variable.length, start + variable.length);
    }, 0);
  }, [content]);

  // Apply text formatting
  const applyFormat = useCallback(
    (format: "bold" | "italic" | "underline" | "list" | "ordered" | "link" | "highlight") => {
      const textarea = textareaRef.current;
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
        case "highlight":
          formattedText = `==${selectedText}==`;
          break;
      }

      const newContent = content.substring(0, start) + formattedText + content.substring(end);
      setContent(newContent);

      // Save to undo stack
      undoStack.current.push(newContent);
      redoStack.current = [];
    },
    [content]
  );

  // Undo/Redo
  const handleUndo = useCallback(() => {
    if (undoStack.current.length > 1) {
      const current = undoStack.current.pop()!;
      redoStack.current.push(current);
      const previous = undoStack.current[undoStack.current.length - 1];
      setContent(previous);
    }
  }, []);

  const handleRedo = useCallback(() => {
    if (redoStack.current.length > 0) {
      const next = redoStack.current.pop()!;
      undoStack.current.push(next);
      setContent(next);
    }
  }, []);

  // Load default template
  const loadDefaultTemplate = useCallback(
    (templateCategory: "reminder1" | "reminder2" | "reminder3") => {
      const defaultTemplate = getDefaultTemplate(
        type,
        templateCategory,
        language,
        toneSettings.type
      );

      if (defaultTemplate) {
        setCategory(templateCategory);
        setSubject(defaultTemplate.subject || "");
        setContent(defaultTemplate.content);
        setName(defaultTemplate.name);

        // Save to undo stack
        undoStack.current.push(defaultTemplate.content);
        redoStack.current = [];
      }
    },
    [type, language, toneSettings.type]
  );

  // Reset to default
  const handleReset = useCallback(() => {
    loadDefaultTemplate(category as "reminder1" | "reminder2" | "reminder3");
    toast.success("Template réinitialisé");
  }, [category, loadDefaultTemplate]);

  // Save template
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
        language,
        tone: toneSettings.type,
        isDefault: template?.isDefault,
        isActive: template?.isActive,
        usageCount: template?.usageCount,
      });
      toast.success("Template enregistré avec succès");
      setHasChanges(false);
    } catch (error) {
      console.error("Error saving template:", error);
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  // Test send
  const handleTestSend = async () => {
    if (!onTestSend) return;

    try {
      await onTestSend({
        name,
        type,
        category,
        subject: type === "email" ? subject : undefined,
        content,
        language,
        tone: toneSettings.type,
      });
      toast.success("Test envoyé avec succès");
    } catch (error) {
      console.error("Error sending test:", error);
      toast.error("Erreur lors de l'envoi du test");
    }
  };

  // Get preview content with replaced variables
  const previewContent = replaceVariables(content, getSampleTemplateData(), "GNF");
  const previewSubject = subject ? replaceVariables(subject, getSampleTemplateData(), "GNF") : "";

  return (
    <div className="h-full flex flex-col">
      {/* Header Actions */}
      <div className="flex items-center justify-between pb-4 border-b mb-4">
        <div className="flex items-center gap-2">
          {hasChanges && (
            <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">
              Modifications non enregistrées
            </Badge>
          )}
          {template?.usageCount !== undefined && template.usageCount > 0 && (
            <Badge variant="outline">
              Utilisé {template.usageCount} fois
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Réinitialiser
          </Button>
          {onTestSend && (
            <Button variant="outline" size="sm" onClick={handleTestSend} disabled={isLoading || saving}>
              <Send className="mr-2 h-4 w-4" />
              Tester
            </Button>
          )}
          <Button
            className="bg-orange-500 hover:bg-orange-600"
            size="sm"
            onClick={handleSave}
            disabled={isLoading || saving}
          >
            <Save className="mr-2 h-4 w-4" />
            Enregistrer
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-h-0">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          {/* Left Panel - Editor */}
          <ResizablePanel defaultSize={60} minSize={40}>
            <div className="h-full flex flex-col pr-2">
              {/* Basic Info */}
              <div className="grid gap-4 md:grid-cols-4 mb-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-xs">Nom du template</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Rappel 1 - Standard"
                    className="h-8"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Type</Label>
                  <Select value={type} onValueChange={(v) => setType(v as "email" | "whatsapp")}>
                    <SelectTrigger className="h-8">
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
                  <Label className="text-xs">Catégorie</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="reminder1">Rappel 1</SelectItem>
                      <SelectItem value="reminder2">Rappel 2</SelectItem>
                      <SelectItem value="reminder3">Rappel 3</SelectItem>
                      <SelectItem value="custom">Personnalisé</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Langue</Label>
                  <Select value={language} onValueChange={(v) => setLanguage(v as "fr" | "en")}>
                    <SelectTrigger className="h-8">
                      <Languages className="h-4 w-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fr">Français</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Quick Templates */}
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <span className="text-xs text-gray-500">Charger un modèle:</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs text-orange-600"
                  onClick={() => loadDefaultTemplate("reminder1")}
                >
                  Rappel 1
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs text-orange-600"
                  onClick={() => loadDefaultTemplate("reminder2")}
                >
                  Rappel 2
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs text-orange-600"
                  onClick={() => loadDefaultTemplate("reminder3")}
                >
                  Rappel 3
                </Button>
                <ToneBadge tone={toneSettings.type} className="ml-auto" />
              </div>

              {/* Subject (Email only) */}
              {type === "email" && (
                <div className="space-y-2 mb-3">
                  <Label htmlFor="subject" className="text-xs">Objet de l&apos;email</Label>
                  <Input
                    id="subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Ex: Rappel : Facture en attente de paiement"
                    className="h-8"
                  />
                </div>
              )}

              {/* Quick Variables */}
              <div className="mb-3">
                <Label className="text-xs text-gray-500 mb-1 block">Variables rapides</Label>
                <QuickVariableButtons onInsert={insertVariable} />
              </div>

              {/* Editor Tabs */}
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "edit" | "preview")} className="flex-1 flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <TabsList className="h-8">
                    <TabsTrigger value="edit" className="h-7 text-xs">
                      <Code className="h-3 w-3 mr-1" />
                      Éditer
                    </TabsTrigger>
                    <TabsTrigger value="preview" className="h-7 text-xs">
                      <Eye className="h-3 w-3 mr-1" />
                      Prévisualiser
                    </TabsTrigger>
                  </TabsList>

                  {/* Formatting Toolbar */}
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={handleUndo} title="Annuler">
                      <Undo className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={handleRedo} title="Rétablir">
                      <Redo className="h-3 w-3" />
                    </Button>
                    <div className="w-px h-4 bg-gray-300 mx-1" />
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => applyFormat("bold")} title="Gras">
                      <Bold className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => applyFormat("italic")} title="Italique">
                      <Italic className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => applyFormat("underline")} title="Souligné">
                      <Underline className="h-3 w-3" />
                    </Button>
                    <div className="w-px h-4 bg-gray-300 mx-1" />
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => applyFormat("list")} title="Liste">
                      <List className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => applyFormat("ordered")} title="Liste numérotée">
                      <ListOrdered className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => applyFormat("link")} title="Lien">
                      <Link2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                <TabsContent value="edit" className="flex-1 mt-0">
                  <Textarea
                    ref={textareaRef}
                    id="template-content"
                    value={content}
                    onChange={(e) => {
                      setContent(e.target.value);
                      undoStack.current.push(e.target.value);
                    }}
                    placeholder="Rédigez votre template ici. Utilisez les variables {{clientName}}, {{amount}}, etc."
                    className="flex-1 min-h-[200px] font-mono text-sm resize-none"
                  />
                </TabsContent>

                <TabsContent value="preview" className="flex-1 mt-0">
                  <ScrollArea className="h-full">
                    <Card className="bg-gray-50 dark:bg-gray-900 border-0">
                      <CardContent className="p-4">
                        {type === "email" && (
                          <div className="mb-4 pb-4 border-b">
                            <p className="text-xs text-gray-500">Objet :</p>
                            <p className="font-medium">{previewSubject}</p>
                          </div>
                        )}
                        <div className="whitespace-pre-wrap text-sm">
                          {previewContent}
                        </div>
                      </CardContent>
                    </Card>
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Right Panel - Variables & Tone & Preview */}
          <ResizablePanel defaultSize={40} minSize={30}>
            <div className="h-full flex flex-col pl-2 gap-4">
              {/* Template Preview */}
              <TemplatePreview
                type={type}
                subject={subject}
                content={content}
                className="flex-shrink-0"
              />

              {/* Variable Picker */}
              <VariablePicker
                onVariableSelect={insertVariable}
                language={language}
                className="flex-1 min-h-0"
              />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}
