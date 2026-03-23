"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  FileText,
  Mail,
  MessageSquare,
  Smartphone,
  MoreVertical,
  Pencil,
  Trash2,
  Copy,
  Star,
  Lock,
  Search,
  Grid3X3,
  List,
  Filter,
} from "lucide-react";
import {
  TemplateType,
  TemplateCategory,
  TemplateTone,
  TemplateLanguage,
  CATEGORY_LABELS,
  TYPE_LABELS,
  TONE_LABELS,
  TONE_COLORS,
  LANGUAGE_LABELS,
  LANGUAGE_FLAGS,
} from "@/lib/templates/types";
import { replaceVariables } from "@/lib/templates/variables";

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

interface TemplateListProps {
  templates: Template[];
  loading: boolean;
  activeType: TemplateType;
  onEdit: (template: Template) => void;
  onDelete: (template: Template) => void;
  onDuplicate: (template: Template) => void;
}

export function TemplateList({
  templates,
  loading,
  activeType,
  onEdit,
  onDelete,
  onDuplicate,
}: TemplateListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [toneFilter, setToneFilter] = useState<TemplateTone | "all">("all");
  const [languageFilter, setLanguageFilter] = useState<TemplateLanguage | "all">("all");

  // Filter templates
  const filteredTemplates = templates.filter((template) => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = 
      template.name.toLowerCase().includes(searchLower) ||
      template.subject?.toLowerCase().includes(searchLower) ||
      template.body.toLowerCase().includes(searchLower) ||
      CATEGORY_LABELS[template.category].toLowerCase().includes(searchLower);
    
    const matchesTone = toneFilter === "all" || template.tone === toneFilter;
    const matchesLanguage = languageFilter === "all" || template.language === languageFilter;

    return matchesSearch && matchesTone && matchesLanguage;
  });

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

  // Get preview text (first 100 chars with variables replaced)
  const getPreviewText = (body: string) => {
    const preview = replaceVariables(body);
    return preview.substring(0, 100) + (preview.length > 100 ? "..." : "");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search, Filters and View Toggle */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Rechercher un template..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        {/* Tone Filter */}
        <Select value={toneFilter} onValueChange={(v) => setToneFilter(v as TemplateTone | "all")}>
          <SelectTrigger className="w-36">
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

        {/* Language Filter */}
        <Select value={languageFilter} onValueChange={(v) => setLanguageFilter(v as TemplateLanguage | "all")}>
          <SelectTrigger className="w-36">
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

        {/* View Toggle */}
        <div className="flex items-center border rounded-lg">
          <Button
            variant={viewMode === "grid" ? "secondary" : "ghost"}
            size="sm"
            className="rounded-r-none"
            onClick={() => setViewMode("grid")}
          >
            <Grid3X3 className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "secondary" : "ghost"}
            size="sm"
            className="rounded-l-none"
            onClick={() => setViewMode("list")}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Results count */}
      {(searchQuery || toneFilter !== "all" || languageFilter !== "all") && (
        <p className="text-sm text-gray-500">
          {filteredTemplates.length} template{filteredTemplates.length !== 1 ? "s" : ""} trouvé{filteredTemplates.length !== 1 ? "s" : ""}
          {toneFilter !== "all" && ` (ton: ${TONE_LABELS[toneFilter as TemplateTone]})`}
          {languageFilter !== "all" && ` (langue: ${LANGUAGE_LABELS[languageFilter as TemplateLanguage]})`}
        </p>
      )}

      {/* Empty state */}
      {filteredTemplates.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-2">
              {searchQuery || toneFilter !== "all" || languageFilter !== "all"
                ? "Aucun template ne correspond à vos critères"
                : "Aucun template enregistré"}
            </p>
            {(searchQuery || toneFilter !== "all" || languageFilter !== "all") && (
              <div className="flex gap-2 justify-center">
                <Button variant="link" onClick={() => setSearchQuery("")}>
                  Effacer la recherche
                </Button>
                <Button variant="link" onClick={() => { setToneFilter("all"); setLanguageFilter("all"); }}>
                  Réinitialiser les filtres
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Grid View */}
      {viewMode === "grid" && filteredTemplates.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredTemplates.map((template) => (
            <Card
              key={template.id}
              className={`relative group hover:shadow-md transition-shadow ${
                !template.isActive ? "opacity-60" : ""
              }`}
            >
              {/* Default badge */}
              {template.isDefault && (
                <div className="absolute -top-2 -right-2">
                  <Badge className="bg-yellow-500 hover:bg-yellow-600">
                    <Star className="h-3 w-3 mr-1 fill-current" />
                    Par défaut
                  </Badge>
                </div>
              )}

              <div className="p-4 space-y-3">
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
                      <h4 className="font-medium">{template.name}</h4>
                      <p className="text-xs text-gray-500">
                        {CATEGORY_LABELS[template.category]}
                      </p>
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
                        {template.isDefault && <Lock className="ml-auto h-3 w-3" />}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

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
                    {LANGUAGE_FLAGS[template.language]}
                  </Badge>
                  <span className="text-xs text-gray-400 ml-auto">
                    {template.usageCount} util.
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* List View */}
      {viewMode === "list" && filteredTemplates.length > 0 && (
        <div className="border rounded-lg divide-y">
          {filteredTemplates.map((template) => (
            <div
              key={template.id}
              className={`flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors ${
                !template.isActive ? "opacity-60" : ""
              }`}
            >
              {/* Type icon */}
              <div className={`p-2 rounded-lg ${
                template.type === 'email' 
                  ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300'
                  : template.type === 'whatsapp'
                  ? 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300'
                  : 'bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-300'
              }`}>
                {getTypeIcon(template.type)}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium truncate">{template.name}</h4>
                  {template.isDefault && (
                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300">
                      <Star className="h-3 w-3 mr-1 fill-current" />
                      Par défaut
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-gray-500 truncate">
                  {template.subject ? `Objet: ${template.subject}` : getPreviewText(template.body)}
                </p>
              </div>

              {/* Category */}
              <Badge variant="outline" className="hidden sm:flex">
                {CATEGORY_LABELS[template.category]}
              </Badge>

              {/* Tone */}
              <Badge className={TONE_COLORS[template.tone]}>
                {TONE_LABELS[template.tone]}
              </Badge>

              {/* Language */}
              <Badge variant="outline">
                {LANGUAGE_FLAGS[template.language]}
              </Badge>

              {/* Status */}
              {template.isActive ? (
                <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 hidden sm:flex">
                  Actif
                </Badge>
              ) : (
                <Badge variant="secondary" className="bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hidden sm:flex">
                  Inactif
                </Badge>
              )}

              {/* Usage */}
              <span className="text-sm text-gray-400 w-16 text-right hidden sm:block">
                {template.usageCount} util.
              </span>

              {/* Actions */}
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
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onDelete(template)}
                    className="text-red-600"
                    disabled={template.isDefault}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Supprimer
                    {template.isDefault && <Lock className="ml-auto h-3 w-3" />}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
