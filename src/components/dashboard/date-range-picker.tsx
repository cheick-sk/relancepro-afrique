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
}

type PresetKey = "7jours" | "30jours" | "90jours" | "annee" | "custom";

interface Preset {
  label: string;
  getValue: () => DateRange;
}

const presets: Record<PresetKey, Preset> = {
  "7jours": {
    label: "7 jours",
    getValue: () => ({
      from: subDays(new Date(), 7),
      to: new Date(),
    }),
  },
  "30jours": {
    label: "30 jours",
    getValue: () => ({
      from: subDays(new Date(), 30),
      to: new Date(),
    }),
  },
  "90jours": {
    label: "90 jours",
    getValue: () => ({
      from: subDays(new Date(), 90),
      to: new Date(),
    }),
  },
  annee: {
    label: "Cette année",
    getValue: () => ({
      from: startOfYear(new Date()),
      to: endOfYear(new Date()),
    }),
  },
  custom: {
    label: "Personnalisé",
    getValue: () => ({
      from: subDays(new Date(), 30),
      to: new Date(),
    }),
  },
};

export function DateRangePicker({
  date,
  onDateChange,
  className,
}: DateRangePickerProps) {
  const [selectedPreset, setSelectedPreset] = React.useState<PresetKey>("30jours");
  const [isCustomOpen, setIsCustomOpen] = React.useState(false);

  const handlePresetChange = (value: PresetKey) => {
    setSelectedPreset(value);
    if (value !== "custom") {
      onDateChange(presets[value].getValue());
      setIsCustomOpen(false);
    } else {
      setIsCustomOpen(true);
    }
  };

  const handleCustomDateSelect = (range: DateRange | undefined) => {
    onDateChange(range);
    if (range?.from && range?.to) {
      setSelectedPreset("custom");
    }
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Select value={selectedPreset} onValueChange={handlePresetChange}>
        <SelectTrigger className="w-[140px] bg-white dark:bg-gray-800">
          <SelectValue placeholder="Sélectionner une période" />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(presets).map(([key, preset]) => (
            <SelectItem key={key} value={key}>
              {preset.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {selectedPreset === "custom" && (
        <Popover open={isCustomOpen} onOpenChange={setIsCustomOpen}>
          <PopoverTrigger asChild>
            <Button
              id="date"
              variant="outline"
              className={cn(
                "w-[260px] justify-start text-left font-normal bg-white dark:bg-gray-800",
                !date && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date?.from ? (
                date.to ? (
                  <>
                    {format(date.from, "dd MMM yyyy", { locale: fr })} -{" "}
                    {format(date.to, "dd MMM yyyy", { locale: fr })}
                  </>
                ) : (
                  format(date.from, "dd MMM yyyy", { locale: fr })
                )
              ) : (
                <span>Sélectionner une période</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={date?.from}
              selected={date}
              onSelect={handleCustomDateSelect}
              numberOfMonths={2}
              locale={fr}
            />
            <div className="flex items-center justify-end gap-2 p-3 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsCustomOpen(false);
                  setSelectedPreset("30jours");
                  onDateChange(presets["30jours"].getValue());
                }}
              >
                Annuler
              </Button>
              <Button
                size="sm"
                onClick={() => setIsCustomOpen(false)}
                className="bg-orange-500 hover:bg-orange-600"
              >
                Appliquer
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}

export function DateRangePickerSimple({
  date,
  onDateChange,
  className,
}: DateRangePickerProps) {
  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant="outline"
            className={cn(
              "w-[260px] justify-start text-left font-normal bg-white dark:bg-gray-800",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "dd MMM yyyy", { locale: fr })} -{" "}
                  {format(date.to, "dd MMM yyyy", { locale: fr })}
                </>
              ) : (
                format(date.from, "dd MMM yyyy", { locale: fr })
              )
            ) : (
              <span>Sélectionner une période</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={onDateChange}
            numberOfMonths={2}
            locale={fr}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
