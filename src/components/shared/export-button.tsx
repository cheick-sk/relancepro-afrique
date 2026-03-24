"use client";

// =====================================================
// RELANCEPRO AFRICA - Export Button Component
// Composant bouton d'export avec dropdown PDF/Excel
// =====================================================

import { useState } from "react";
import { Download, FileText, FileSpreadsheet, Loader2, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { ExportType } from "@/lib/services/export";

// =====================================================
// TYPES
// =====================================================

export interface ExportButtonProps {
  /** Type of data to export */
  type: ExportType;
  /** Optional filters to apply to the export */
  filters?: Record<string, unknown>;
  /** Optional date range filter */
  dateRange?: { start: Date; end: Date };
  /** Optional locale override */
  locale?: "fr" | "en";
  /** Optional currency override */
  currency?: string;
  /** Optional company name for the export */
  companyName?: string;
  /** Button variant */
  variant?: "default" | "outline" | "secondary" | "ghost";
  /** Button size */
  size?: "default" | "sm" | "lg";
  /** Whether to show "Export All" option (for Excel only) */
  showExportAll?: boolean;
  /** Custom button text */
  buttonText?: string;
  /** Whether the button is disabled */
  disabled?: boolean;
  /** Additional class names */
  className?: string;
  /** Callback when export starts */
  onExportStart?: (format: "pdf" | "excel") => void;
  /** Callback when export succeeds */
  onExportSuccess?: (format: "pdf" | "excel") => void;
  /** Callback when export fails */
  onExportError?: (format: "pdf" | "excel", error: string) => void;
}

// =====================================================
// TRANSLATIONS
// =====================================================

const translations = {
  fr: {
    export: "Exporter",
    exportAs: "Exporter en",
    pdfDocument: "Document PDF",
    excelSpreadsheet: "Feuille Excel",
    pdfDescription: "Format PDF professionnel",
    excelDescription: "Format Excel éditable",
    exportAll: "Tout exporter",
    exportAllDescription: "Toutes les données en un fichier",
    loading: "Génération...",
    success: {
      pdf: "PDF généré avec succès",
      excel: "Fichier Excel généré avec succès",
    },
    error: {
      pdf: "Erreur lors de la génération du PDF",
      excel: "Erreur lors de la génération du fichier Excel",
      unauthorized: "Vous devez être connecté pour exporter",
    },
  },
  en: {
    export: "Export",
    exportAs: "Export as",
    pdfDocument: "PDF Document",
    excelSpreadsheet: "Excel Spreadsheet",
    pdfDescription: "Professional PDF format",
    excelDescription: "Editable Excel format",
    exportAll: "Export All",
    exportAllDescription: "All data in one file",
    loading: "Generating...",
    success: {
      pdf: "PDF generated successfully",
      excel: "Excel file generated successfully",
    },
    error: {
      pdf: "Error generating PDF",
      excel: "Error generating Excel file",
      unauthorized: "You must be logged in to export",
    },
  },
};

// =====================================================
// COMPONENT
// =====================================================

export function ExportButton({
  type,
  filters,
  dateRange,
  locale = "fr",
  currency,
  companyName,
  variant = "outline",
  size = "default",
  showExportAll = false,
  buttonText,
  disabled = false,
  className,
  onExportStart,
  onExportSuccess,
  onExportError,
}: ExportButtonProps) {
  const [isLoading, setIsLoading] = useState<"pdf" | "excel" | null>(null);
  const t = translations[locale];

  /**
   * Handle export action
   */
  const handleExport = async (format: "pdf" | "excel", exportAll = false) => {
    setIsLoading(format);
    onExportStart?.(format);

    try {
      const endpoint = format === "pdf" ? "/api/export/pdf" : "/api/export/excel";

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: exportAll ? "all" : type,
          filters,
          locale,
          currency,
          companyName,
          dateRange: dateRange
            ? {
                start: dateRange.start.toISOString(),
                end: dateRange.end.toISOString(),
              }
            : undefined,
          exportAll,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 401) {
          throw new Error(t.error.unauthorized);
        }
        throw new Error(errorData.error || t.error[format]);
      }

      // Get the file blob
      const blob = await response.blob();

      // Get filename from Content-Disposition header or generate one
      const contentDisposition = response.headers.get("Content-Disposition");
      let filename = `relancepro_${type}_${new Date().toISOString().split("T")[0]}.${format === "pdf" ? "pdf" : "xlsx"}`;
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1];
        }
      }

      // Create download link and trigger download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      // Show success toast
      toast.success(t.success[format]);
      onExportSuccess?.(format);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t.error[format];
      toast.error(errorMessage);
      onExportError?.(format, errorMessage);
    } finally {
      setIsLoading(null);
    }
  };

  const isDisabled = disabled || isLoading !== null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={size}
          disabled={isDisabled}
          className={cn("gap-2", className)}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {t.loading}
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              {buttonText || t.export}
              <ChevronDown className="h-3 w-3 opacity-50" />
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>{t.exportAs}</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* PDF Export Option */}
        <DropdownMenuItem
          onClick={() => handleExport("pdf")}
          disabled={isDisabled}
          className="cursor-pointer"
        >
          <FileText className="h-4 w-4 text-red-500" />
          <div className="flex flex-col">
            <span className="font-medium">{t.pdfDocument}</span>
            <span className="text-xs text-muted-foreground">
              {t.pdfDescription}
            </span>
          </div>
        </DropdownMenuItem>

        {/* Excel Export Option */}
        <DropdownMenuItem
          onClick={() => handleExport("excel")}
          disabled={isDisabled}
          className="cursor-pointer"
        >
          <FileSpreadsheet className="h-4 w-4 text-green-600" />
          <div className="flex flex-col">
            <span className="font-medium">{t.excelSpreadsheet}</span>
            <span className="text-xs text-muted-foreground">
              {t.excelDescription}
            </span>
          </div>
        </DropdownMenuItem>

        {/* Export All Option (Excel only) */}
        {showExportAll && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => handleExport("excel", true)}
              disabled={isDisabled}
              className="cursor-pointer"
            >
              <Download className="h-4 w-4 text-blue-500" />
              <div className="flex flex-col">
                <span className="font-medium">{t.exportAll}</span>
                <span className="text-xs text-muted-foreground">
                  {t.exportAllDescription}
                </span>
              </div>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// =====================================================
// EXPORT UTILITIES
// =====================================================

/**
 * Simple function to trigger a direct export without dropdown
 */
export async function directExport(
  type: ExportType,
  format: "pdf" | "excel",
  options?: {
    filters?: Record<string, unknown>;
    dateRange?: { start: Date; end: Date };
    locale?: "fr" | "en";
    currency?: string;
    companyName?: string;
  }
): Promise<void> {
  const endpoint = format === "pdf" ? "/api/export/pdf" : "/api/export/excel";
  const locale = options?.locale || "fr";

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      type,
      filters: options?.filters,
      locale,
      currency: options?.currency,
      companyName: options?.companyName,
      dateRange: options?.dateRange
        ? {
            start: options.dateRange.start.toISOString(),
            end: options.dateRange.end.toISOString(),
          }
        : undefined,
    }),
  });

  if (!response.ok) {
    throw new Error(`Export failed: ${response.statusText}`);
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `relancepro_${type}_${new Date().toISOString().split("T")[0]}.${format === "pdf" ? "pdf" : "xlsx"}`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

export default ExportButton;
