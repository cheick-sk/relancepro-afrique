"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Link2,
  Mail,
  MessageSquare,
  Save,
  Send,
  Smartphone,
  AlertCircle,
  Check,
  Copy,
  Sparkles,
  FileText,
  Clock,
  Globe,
  Palette,
} from "lucide-react";
import { toast } from "sonner";
import {
  TEMPLATE_VARIABLES,
  replaceVariables,
  getCharacterInfo,
  validateVariables,
  VARIABLE_CATEGORIES,
} from "@/lib/templates/variables";
import {
  TemplateType,
  TemplateCategory,
  TemplateCreate,
  TemplateTone,
  TemplateLanguage,
  CATEGORY_LABELS,
  CATEGORY_DESCRIPTIONS,
  TONE_LABELS,
  TONE_DESCRIPTIONS,
  TONE_COLORS,
  LANGUAGE_LABELS,
  LANGUAGE_FLAGS,
} from "@/lib/templates/types";
import {
  getDefaultTemplatesByType,
  getInitialTemplatesForNewUser,
} from "@/lib/templates/default-templates";
import { TemplatePreview } from "./template-preview";
import { VariableInserter, VariableInserterCompact } from "./variable-inserter";

interface Template {
  id?: string;
  name: string;
  type: TemplateType;
  category: TemplateCategory;
  subject?: string | null;
  body: string;
  tone?: TemplateTone;
  language?: TemplateLanguage;
  isDefault?: boolean;
  isActive?: boolean;
  usageCount?: number;
}

interface TemplateEditorProps {
  template?: Template;
  onSave: (template: TemplateCreate) => Promise<void>;
  onTestSend?: (template: TemplateCreate) => Promise<void>;
  isLoading?: boolean;
}

export function TemplateEditor({ template, onSave, onTestSend, isLoading }: TemplateEditorProps) {
  const [name, setName] = useState(template?.name || "");
  const [type, setType] = useState<TemplateType>(template?.type || "email");
  const [category, setCategory] = useState<TemplateCategory>(template?.category as TemplateCategory || "reminder1");
  const [subject, setSubject] = useState(template?.subject || "");
  const [body, setBody] = useState(template?.body || "");
  const [tone, setTone] = useState<TemplateTone>(template?.tone || "formal");
  const [language, setLanguage] = useState<TemplateLanguage>(template?.language || "fr");
  const [isDefault, setIsDefault] = useState(template?.isDefault || false);
  const [saving, setSaving] = useState(false);
  const [autosaveStatus, setAutosaveStatus] = useState<"saved" | "saving" | "unsaved" | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const subjectRef = useRef<HTMLInputElement>(null);

  // Character count info
  const charInfo = getCharacterInfo(body, type);
  const subjectCharInfo = type === 'email' ? {
    count: subject.length,
    max: 78,
    warning: 60,
    isOverLimit: subject.length > 78,
    isNearLimit: subject.length > 60 && subject.length <= 78,
  } : null;

  // Variable validation
  const variableValidation = validateVariables(body);

  useEffect(() => {
    if (template) {
      setName(template.name);
      setType(template.type);
      setCategory(template.category as TemplateCategory);
      setSubject(template.subject || "");
      setBody(template.body);
      setTone(template.tone || "formal");
      setLanguage(template.language || "fr");
      setIsDefault(template.isDefault || false);
    }
  }, [template]);

  // Insert variable at cursor position
  const insertVariable = useCallback((variableKey: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setBody(prev => prev + `{${variableKey}}`);
      return;
    }

    const start = textarea.selectionStart ?? 0;
    const end = textarea.selectionEnd ?? 0;
    const variable = `{${variableKey}}`;
    const newContent = body.substring(0, start) + variable + body.substring(end);
    setBody(newContent);
    setAutosaveStatus("unsaved");

    // Reposition cursor after the variable
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + variable.length, start + variable.length);
    }, 0);
  }, [body]);

  // Insert variable in subject
  const insertVariableInSubject = useCallback((variableKey: string) => {
    const input = subjectRef.current;
    if (!input) {
      setSubject(prev => prev + `{${variableKey}}`);
      return;
    }

    const start = input.selectionStart ?? subject.length;
    const end = input.selectionEnd ?? subject.length;
    const variable = `{${variableKey}}`;
    const newSubject = subject.substring(0, start) + variable + subject.substring(end);
    setSubject(newSubject);
    setAutosaveStatus("unsaved");

    setTimeout(() => {
      input.focus();
      input.setSelectionRange(start + variable.length, start + variable.length);
    }, 0);
  }, [subject]);

  // Apply markdown formatting
  const applyFormat = useCallback((format: "bold" | "italic" | "underline" | "list" | "ordered" | "link") => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart ?? 0;
    const end = textarea.selectionEnd ?? 0;
    const selectedText = body.substring(start, end);
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

    const newContent = body.substring(0, start) + formattedText + body.substring(end);
    setBody(newContent);
    setAutosaveStatus("unsaved");
  }, [body]);

  // Load default template
  const loadDefaultTemplate = useCallback((templateCategory: TemplateCategory, templateTone: TemplateTone, templateLanguage: TemplateLanguage) => {
    const templates = getDefaultTemplatesByType(type, templateLanguage);
    const t = templates.find(d => d.category === templateCategory && d.tone === templateTone);
    if (t) {
      setCategory(templateCategory);
      setTone(templateTone);
      setLanguage(templateLanguage);
      setSubject(t.subject);
      setBody(t.body);
      setAutosaveStatus("unsaved");
    }
  }, [type]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Le nom du template est requis");
      return;
    }
    if (!body.trim()) {
      toast.error("Le contenu du template est requis");
      return;
    }
    if (type === "email" && !subject.trim()) {
      toast.error("L'objet de l'email est requis");
      return;
    }

    // Check for invalid variables
    const validation = validateVariables(body);
    if (validation.invalid.length > 0) {
      toast.error(`Variables invalides: ${validation.invalid.map(v => `{${v}}`).join(', ')}`);
      return;
    }

    setSaving(true);
    setAutosaveStatus("saving");
    try {
      await onSave({
        name,
        type,
        category,
        subject: type === "email" ? subject : undefined,
        body,
        tone,
        language,
        isDefault,
      });
      toast.success("Template enregistré avec succès");
      setAutosaveStatus("saved");
    } catch (error) {
      console.error("Error saving template:", error);
      toast.error("Erreur lors de l'enregistrement");
      setAutosaveStatus("unsaved");
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
        body,
        tone,
        language,
      });
      toast.success("Test envoyé avec succès");
    } catch (error) {
      console.error("Error sending test:", error);
      toast.error("Erreur lors de l'envoi du test");
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(body);
    toast.success("Contenu copié dans le presse-papiers");
  };

  return (
    <div className="space-y-4">
      {/* Autosave indicator */}
      {autosaveStatus && (
        <div className="flex items-center justify-end gap-2 text-xs">
          {autosaveStatus === "saving" && (
            <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
              <Clock className="mr-1 h-3 w-3 animate-pulse" />
              Enregistrement...
            </Badge>
          )}
          {autosaveStatus === "saved" && (
            <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
              <Check className="mr-1 h-3 w-3" />
              Enregistré
            </Badge>
          )}
          {autosaveStatus === "unsaved" && (
            <Badge variant="secondary" className="bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300">
              <AlertCircle className="mr-1 h-3 w-3" />
              Modifications non enregistrées
            </Badge>
          )}
        </div>
      )}

      {/* Basic Information */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="name">Nom du template</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setAutosaveStatus("unsaved");
            }}
            placeholder="Ex: Rappel 1 - Standard"
          />
        </div>
        <div className="space-y-2">
          <Label>Type</Label>
          <Select 
            value={type} 
            onValueChange={(v) => {
              setType(v as TemplateType);
              setAutosaveStatus("unsaved");
            }}
          >
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
              <SelectItem value="sms">
                <div className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4" />
                  SMS
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Catégorie</Label>
          <Select 
            value={category} 
            onValueChange={(v) => {
              setCategory(v as TemplateCategory);
              setAutosaveStatus("unsaved");
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  <div>
                    <div>{label}</div>
                    <div className="text-xs text-gray-500">{CATEGORY_DESCRIPTIONS[key as TemplateCategory]}</div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tone and Language */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Ton du message
          </Label>
          <Select 
            value={tone} 
            onValueChange={(v) => {
              setTone(v as TemplateTone);
              setAutosaveStatus("unsaved");
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(TONE_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  <div className="flex items-center gap-2">
                    <Badge className={TONE_COLORS[key as TemplateTone]}>
                      {label}
                    </Badge>
                    <span className="text-xs text-gray-500">
                      {TONE_DESCRIPTIONS[key as TemplateTone]}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Langue
          </Label>
          <Select 
            value={language} 
            onValueChange={(v) => {
              setLanguage(v as TemplateLanguage);
              setAutosaveStatus("unsaved");
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(LANGUAGE_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  <div className="flex items-center gap-2">
                    <span>{LANGUAGE_FLAGS[key as TemplateLanguage]}</span>
                    <span>{label}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Quick Load Templates */}
      <div className="flex flex-wrap items-center gap-2 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
        <span className="text-sm text-gray-500 flex items-center gap-1">
          <Sparkles className="h-4 w-4" />
          Charger un modèle :
        </span>
        <div className="flex flex-wrap gap-1">
          {getDefaultTemplatesByType(type, language).slice(0, 3).map((t) => (
            <Button
              key={`${t.category}-${t.tone}`}
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => loadDefaultTemplate(t.category, t.tone, t.language)}
            >
              {t.name}
            </Button>
          ))}
        </div>
      </div>

      {/* Subject (email only) */}
      {type === "email" && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="subject">Objet de l&apos;email</Label>
            <div className="flex items-center gap-2">
              <VariableInserterCompact onInsert={insertVariableInSubject} />
              {subjectCharInfo && (
                <span className={`text-xs ${subjectCharInfo.isOverLimit ? 'text-red-500' : subjectCharInfo.isNearLimit ? 'text-orange-500' : 'text-gray-400'}`}>
                  {subjectCharInfo.count}/{subjectCharInfo.max}
                </span>
              )}
            </div>
          </div>
          <Input
            ref={subjectRef}
            id="subject"
            value={subject}
            onChange={(e) => {
              setSubject(e.target.value);
              setAutosaveStatus("unsaved");
            }}
            placeholder="Ex: Rappel : Facture en attente de paiement"
            className={subjectCharInfo?.isOverLimit ? 'border-red-500' : ''}
          />
        </div>
      )}

      {/* Main Editor with Preview */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Editor Panel */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Contenu du message</Label>
            <div className="flex items-center gap-2">
              <VariableInserter onInsert={insertVariable} />
              <Button variant="ghost" size="sm" onClick={copyToClipboard}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Formatting Toolbar (for email) */}
          {type === 'email' && (
            <div className="flex items-center gap-1 p-2 border rounded-t-lg bg-gray-50 dark:bg-gray-900">
              <Button variant="ghost" size="sm" onClick={() => applyFormat("bold")} title="Gras">
                <Bold className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => applyFormat("italic")} title="Italique">
                <Italic className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => applyFormat("underline")} title="Souligné">
                <Underline className="h-4 w-4" />
              </Button>
              <div className="w-px h-4 bg-gray-300 dark:bg-gray-700 mx-1" />
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
          )}

          {/* Textarea */}
          <Textarea
            ref={textareaRef}
            value={body}
            onChange={(e) => {
              setBody(e.target.value);
              setAutosaveStatus("unsaved");
            }}
            placeholder="Rédigez votre template ici. Utilisez les variables {client_name}, {debt_amount}, etc."
            className={`min-h-[300px] font-mono text-sm ${type === 'email' ? 'rounded-t-none' : ''} ${charInfo.isOverLimit ? 'border-red-500' : ''}`}
          />

          {/* Character Count */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              {variableValidation.invalid.length > 0 ? (
                <Badge variant="destructive" className="text-xs">
                  <AlertCircle className="mr-1 h-3 w-3" />
                  Variables invalides: {variableValidation.invalid.join(', ')}
                </Badge>
              ) : (
                <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                  <Check className="mr-1 h-3 w-3" />
                  {variableValidation.valid.length} variables valides
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-4">
              {type === 'sms' && charInfo.segments && charInfo.segments > 1 && (
                <span className="text-orange-500">
                  {charInfo.segments} SMS
                </span>
              )}
              <span className={`${charInfo.isOverLimit ? 'text-red-500' : charInfo.isNearLimit ? 'text-orange-500' : 'text-gray-400'}`}>
                {charInfo.count} / {charInfo.max} caractères
              </span>
            </div>
          </div>
        </div>

        {/* Preview Panel */}
        <div className="space-y-2">
          <Label>Aperçu</Label>
          <TemplatePreview
            subject={type === 'email' ? subject : undefined}
            body={body}
            type={type}
          />
        </div>
      </div>

      {/* Options */}
      <div className="flex items-center justify-between rounded-lg border p-4">
        <div className="flex items-center gap-2">
          <Switch
            id="is-default"
            checked={isDefault}
            onCheckedChange={(checked) => {
              setIsDefault(checked);
              setAutosaveStatus("unsaved");
            }}
          />
          <Label htmlFor="is-default" className="cursor-pointer">
            Template par défaut pour {CATEGORY_LABELS[category]}
          </Label>
        </div>
        {template?.id && (
          <Badge variant="outline">
            <FileText className="mr-1 h-3 w-3" />
            Utilisé {template.usageCount || 0} fois
          </Badge>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-4 border-t">
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
  );
}
