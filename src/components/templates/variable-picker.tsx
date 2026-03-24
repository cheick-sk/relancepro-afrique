"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  User,
  FileText,
  Building2,
  Settings,
  Search,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  Info,
} from "lucide-react";
import {
  templateVariables,
  variableCategories,
  TemplateVariable,
} from "@/lib/templates/variables";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";

interface VariablePickerProps {
  onVariableSelect?: (variable: string) => void;
  language?: "fr" | "en";
  className?: string;
  compact?: boolean;
}

const categoryIcons: Record<string, React.ReactNode> = {
  client: <User className="h-4 w-4" />,
  debt: <FileText className="h-4 w-4" />,
  company: <Building2 className="h-4 w-4" />,
  system: <Settings className="h-4 w-4" />,
};

export function VariablePicker({
  onVariableSelect,
  language = "fr",
  className,
  compact = false,
}: VariablePickerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [openCategories, setOpenCategories] = useState<string[]>(["client", "debt"]);
  const [copiedVariable, setCopiedVariable] = useState<string | null>(null);

  // Filter variables by search
  const filteredVariables = searchQuery
    ? templateVariables.filter(
        (v) =>
          v.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
          v.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          v.labelEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
          v.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : templateVariables;

  // Group by category
  const variablesByCategory = variableCategories.map((cat) => ({
    ...cat,
    variables: filteredVariables.filter((v) => v.category === cat.key),
  }));

  // Toggle category
  const toggleCategory = (categoryKey: string) => {
    setOpenCategories((prev) =>
      prev.includes(categoryKey)
        ? prev.filter((c) => c !== categoryKey)
        : [...prev, categoryKey]
    );
  };

  // Handle variable click
  const handleVariableClick = (variable: TemplateVariable) => {
    const variableText = `{{${variable.key}}}`;

    if (onVariableSelect) {
      onVariableSelect(variableText);
    } else {
      // Copy to clipboard
      navigator.clipboard.writeText(variableText);
      setCopiedVariable(variable.key);
      toast.success(`${variableText} copié`);
      setTimeout(() => setCopiedVariable(null), 2000);
    }
  };

  if (compact) {
    return (
      <div className={className}>
        <div className="relative mb-2">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Rechercher une variable..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
        <ScrollArea className="h-[300px]">
          <div className="space-y-1">
            {filteredVariables.map((variable) => (
              <Button
                key={variable.key}
                variant="ghost"
                size="sm"
                className="w-full justify-start h-auto py-2"
                onClick={() => handleVariableClick(variable)}
              >
                <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded mr-2">
                  {`{{${variable.key}}}`}
                </code>
                <span className="text-xs text-gray-500 truncate">
                  {language === "fr" ? variable.label : variable.labelEn}
                </span>
              </Button>
            ))}
          </div>
        </ScrollArea>
      </div>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="py-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Info className="h-4 w-4 text-orange-500" />
          Variables disponibles
        </CardTitle>
        <CardDescription className="text-xs">
          Cliquez sur une variable pour l&apos;insérer dans votre template
        </CardDescription>
      </CardHeader>
      <CardContent className="py-2">
        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Rechercher une variable..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-9"
          />
        </div>

        {/* Variable Categories */}
        <ScrollArea className="h-[350px] pr-2">
          <div className="space-y-2">
            {variablesByCategory.map((category) => (
              <Collapsible
                key={category.key}
                open={openCategories.includes(category.key)}
                onOpenChange={() => toggleCategory(category.key)}
              >
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start h-8 px-2"
                  >
                    {openCategories.includes(category.key) ? (
                      <ChevronDown className="h-4 w-4 mr-1" />
                    ) : (
                      <ChevronRight className="h-4 w-4 mr-1" />
                    )}
                    {categoryIcons[category.key]}
                    <span className="ml-2">
                      {language === "fr" ? category.label : category.labelEn}
                    </span>
                    <Badge variant="secondary" className="ml-auto text-xs">
                      {category.variables.length}
                    </Badge>
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pl-6 pt-1">
                  <div className="space-y-1">
                    {category.variables.map((variable) => (
                      <TooltipProvider key={variable.key}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full justify-start h-auto py-2 px-2"
                              onClick={() => handleVariableClick(variable)}
                            >
                              <code className="text-xs bg-orange-50 dark:bg-orange-950 text-orange-700 dark:text-orange-300 px-1.5 py-0.5 rounded font-mono">
                                {`{{${variable.key}}}`}
                              </code>
                              {copiedVariable === variable.key ? (
                                <Check className="h-3 w-3 ml-auto text-green-500" />
                              ) : (
                                <Copy className="h-3 w-3 ml-auto text-gray-400" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="right" className="max-w-xs">
                            <p className="font-medium">
                              {language === "fr" ? variable.label : variable.labelEn}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              {language === "fr" ? variable.description : variable.descriptionEn}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              Exemple: {variable.example}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

// Quick variable buttons for inline use
interface QuickVariableButtonsProps {
  onInsert: (variable: string) => void;
}

export function QuickVariableButtons({ onInsert }: QuickVariableButtonsProps) {
  const quickVariables = [
    { key: "clientName", label: "Nom" },
    { key: "amount", label: "Montant" },
    { key: "dueDate", label: "Échéance" },
    { key: "daysOverdue", label: "Retard" },
    { key: "reference", label: "Réf." },
  ];

  return (
    <div className="flex flex-wrap gap-1">
      {quickVariables.map((v) => (
        <Button
          key={v.key}
          variant="outline"
          size="sm"
          className="h-6 text-xs px-2"
          onClick={() => onInsert(`{{${v.key}}}`)}
        >
          {v.label}
        </Button>
      ))}
    </div>
  );
}
