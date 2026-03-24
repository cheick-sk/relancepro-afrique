"use client";

import * as React from "react";
import { format, subDays, subMonths, startOfYear, endOfYear } from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { DateRange } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DateRangePickerProps {
  date: DateRange | undefined;
  onDateChange: (date: DateRange | undefined) => void;
  className?: string;
  align?: "start" | "center" | "end";
  showPresets?: boolean;
}

interface DatePreset {
  label: string;
  value: string;
  from: Date;
  to: Date;
}

export function DateRangePicker({
  date,
  onDateChange,
  className,
  align = "start",
  showPresets = true,
}: DateRangePickerProps) {
  const now = new Date();

  const presets: DatePreset[] = [
    {
      label: "7 derniers jours",
      value: "7d",
      from: subDays(now, 7),
      to: now,
    },
    {
      label: "30 derniers jours",
      value: "30d",
      from: subDays(now, 30),
      to: now,
    },
    {
      label: "90 derniers jours",
      value: "90d",
      from: subDays(now, 90),
      to: now,
    },
    {
      label: "6 derniers mois",
      value: "6m",
      from: subMonths(now, 6),
      to: now,
    },
    {
      label: "12 derniers mois",
      value: "12m",
      from: subMonths(now, 12),
      to: now,
    },
    {
      label: "Cette année",
      value: "year",
      from: startOfYear(now),
      to: endOfYear(now),
    },
  ];

  const handlePresetChange = (value: string) => {
    const preset = presets.find((p) => p.value === value);
    if (preset) {
      onDateChange({
        from: preset.from,
        to: preset.to,
      });
    }
  };

  const getActivePreset = () => {
    if (!date?.from || !date?.to) return "";
    return presets.find((preset) => {
      return (
        format(preset.from, "yyyy-MM-dd") === format(date.from!, "yyyy-MM-dd") &&
        format(preset.to, "yyyy-MM-dd") === format(date.to!, "yyyy-MM-dd")
      );
    })?.value || "";
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {showPresets && (
        <Select value={getActivePreset()} onValueChange={handlePresetChange}>
          <SelectTrigger className="w-[160px] h-9">
            <SelectValue placeholder="Raccourcis" />
          </SelectTrigger>
          <SelectContent>
            {presets.map((preset) => (
              <SelectItem key={preset.value} value={preset.value}>
                {preset.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal h-9",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "d MMM", { locale: fr })} -{" "}
                  {format(date.to, "d MMM yyyy", { locale: fr })}
                </>
              ) : (
                format(date.from, "d MMMM yyyy", { locale: fr })
              )
            ) : (
              <span>Sélectionner une période</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align={align}>
          <div className="p-3 border-b border-gray-100 dark:border-gray-800">
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8"
                onClick={() => onDateChange(undefined)}
              >
                Effacer
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8"
                onClick={() =>
                  onDateChange({
                    from: new Date(new Date().setHours(0, 0, 0, 0)),
                    to: new Date(),
                  })
                }
              >
                Aujourd&apos;hui
              </Button>
            </div>
          </div>
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={onDateChange}
            numberOfMonths={2}
            locale={fr}
          />
          <div className="p-3 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDateChange(undefined)}
            >
              Annuler
            </Button>
            <PopoverTrigger asChild>
              <Button
                size="sm"
                className="bg-orange-500 hover:bg-orange-600"
              >
                Appliquer
              </Button>
            </PopoverTrigger>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

// Simple date picker for single date selection
interface SimpleDatePickerProps {
  date: Date | undefined;
  onDateChange: (date: Date | undefined) => void;
  placeholder?: string;
  className?: string;
  align?: "start" | "center" | "end";
}

export function SimpleDatePicker({
  date,
  onDateChange,
  placeholder = "Sélectionner une date",
  className,
  align = "start",
}: SimpleDatePickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !date && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "d MMMM yyyy", { locale: fr }) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align={align}>
        <Calendar
          mode="single"
          selected={date}
          onSelect={onDateChange}
          initialFocus
          locale={fr}
        />
      </PopoverContent>
    </Popover>
  );
}

// Export date range type
export type { DateRange };
