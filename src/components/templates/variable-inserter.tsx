"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Variable,
  ChevronDown,
  User,
  FileText,
  Building2,
  Calendar,
  Info,
} from "lucide-react";
import {
  TEMPLATE_VARIABLES,
  VARIABLE_CATEGORIES,
} from "@/lib/templates/variables";

interface VariableInserterProps {
  onInsert: (variableKey: string) => void;
  disabled?: boolean;
  triggerClassName?: string;
}

export function VariableInserter({
  onInsert,
  disabled = false,
  triggerClassName,
}: VariableInserterProps) {
  const [open, setOpen] = useState(false);

  const getCategoryIcon = (icon: string) => {
    switch (icon) {
      case "user":
        return <User className="h-4 w-4" />;
      case "file-text":
        return <FileText className="h-4 w-4" />;
      case "building":
        return <Building2 className="h-4 w-4" />;
      case "calendar":
        return <Calendar className="h-4 w-4" />;
      default:
        return <Variable className="h-4 w-4" />;
    }
  };

  const handleInsert = (key: string) => {
    onInsert(key);
    setOpen(false);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          className={triggerClassName}
        >
          <Variable className="mr-2 h-4 w-4" />
          Insérer variable
          <ChevronDown className="ml-2 h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80" align="start">
        <DropdownMenuLabel className="flex items-center gap-2">
          <Variable className="h-4 w-4" />
          Variables disponibles
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <ScrollArea className="h-[400px]">
          {VARIABLE_CATEGORIES.map((category) => {
            const variables = TEMPLATE_VARIABLES.filter(
              (v) => v.category === category.key
            );
            
            return (
              <div key={category.key}>
                <DropdownMenuLabel className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 dark:bg-gray-900 -mx-1 px-3 py-2">
                  <span className={`p-1 rounded ${category.color}`}>
                    {getCategoryIcon(category.icon)}
                  </span>
                  <span className="flex-1">{category.label}</span>
                  <Badge variant="secondary" className="text-xs">
                    {variables.length}
                  </Badge>
                </DropdownMenuLabel>
                {variables.map((variable) => (
                  <DropdownMenuItem
                    key={variable.key}
                    onClick={() => handleInsert(variable.key)}
                    className="flex flex-col items-start gap-1 py-2 cursor-pointer"
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-medium">{variable.label}</span>
                      <code className="text-xs bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300 px-1.5 py-0.5 rounded font-mono">
                        {`{${variable.key}}`}
                      </code>
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      <Info className="h-3 w-3" />
                      {variable.description}
                    </span>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator className="my-1" />
              </div>
            );
          })}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Compact version for inline use
interface VariableInserterCompactProps {
  onInsert: (variableKey: string) => void;
  disabled?: boolean;
}

export function VariableInserterCompact({
  onInsert,
  disabled = false,
}: VariableInserterCompactProps) {
  const [open, setOpen] = useState(false);

  const handleInsert = (key: string) => {
    onInsert(key);
    setOpen(false);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          disabled={disabled}
          className="h-8 px-2"
        >
          <Variable className="h-4 w-4 mr-1" />
          Variables
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-72" align="start">
        <ScrollArea className="h-[350px]">
          {VARIABLE_CATEGORIES.map((category) => {
            const variables = TEMPLATE_VARIABLES.filter(
              (v) => v.category === category.key
            );

            return (
              <div key={category.key}>
                <DropdownMenuLabel className="text-xs text-gray-500">
                  {category.label}
                </DropdownMenuLabel>
                {variables.map((variable) => (
                  <DropdownMenuItem
                    key={variable.key}
                    onClick={() => handleInsert(variable.key)}
                    className="flex items-center justify-between"
                  >
                    <span className="text-sm">{variable.label}</span>
                    <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1 rounded">
                      {`{${variable.key}}`}
                    </code>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
              </div>
            );
          })}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Popover version for floating insertion
interface VariableInserterPopoverProps {
  onInsert: (variableKey: string) => void;
  children: React.ReactNode;
  disabled?: boolean;
}

export function VariableInserterPopover({
  onInsert,
  children,
  disabled = false,
}: VariableInserterPopoverProps) {
  const handleInsert = (key: string) => {
    onInsert(key);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={disabled}>
        {children}
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-72" align="start">
        <ScrollArea className="h-[300px]">
          {VARIABLE_CATEGORIES.map((category) => {
            const variables = TEMPLATE_VARIABLES.filter(
              (v) => v.category === category.key
            );

            return (
              <div key={category.key}>
                <DropdownMenuLabel className="text-xs text-gray-500">
                  {category.label}
                </DropdownMenuLabel>
                {variables.map((variable) => (
                  <DropdownMenuItem
                    key={variable.key}
                    onClick={() => handleInsert(variable.key)}
                    className="flex items-center justify-between"
                  >
                    <span className="text-sm">{variable.label}</span>
                    <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1 rounded">
                      {`{${variable.key}}`}
                    </code>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
              </div>
            );
          })}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
