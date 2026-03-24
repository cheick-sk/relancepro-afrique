"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Briefcase,
  Smile,
  AlertTriangle,
  Settings2,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";

export type ToneType = "formal" | "friendly" | "urgent" | "custom";

export interface ToneSettings {
  type: ToneType;
  greetingStyle: "formal" | "casual" | "none";
  urgencyLevel: number; // 1-10
  customPhrases?: {
    greeting?: string;
    closing?: string;
    callToAction?: string;
  };
}

interface ToneSelectorProps {
  value: ToneSettings;
  onChange: (settings: ToneSettings) => void;
  onPreviewTone?: (settings: ToneSettings) => void;
  language?: "fr" | "en";
  className?: string;
}

const toneOptions: { value: ToneType; label: string; labelEn: string; description: string; descriptionEn: string; icon: React.ReactNode; color: string }[] = [
  {
    value: "formal",
    label: "Formel",
    labelEn: "Formal",
    description: "Ton professionnel et respectueux",
    descriptionEn: "Professional and respectful tone",
    icon: <Briefcase className="h-4 w-4" />,
    color: "text-blue-600",
  },
  {
    value: "friendly",
    label: "Amical",
    labelEn: "Friendly",
    description: "Ton chaleureux et compréhensif",
    descriptionEn: "Warm and understanding tone",
    icon: <Smile className="h-4 w-4" />,
    color: "text-green-600",
  },
  {
    value: "urgent",
    label: "Urgent",
    labelEn: "Urgent",
    description: "Ton ferme et pressant",
    descriptionEn: "Firm and pressing tone",
    icon: <AlertTriangle className="h-4 w-4" />,
    color: "text-red-600",
  },
  {
    value: "custom",
    label: "Personnalisé",
    labelEn: "Custom",
    description: "Créez votre propre style",
    descriptionEn: "Create your own style",
    icon: <Settings2 className="h-4 w-4" />,
    color: "text-purple-600",
  },
];

const greetingOptions = [
  { value: "formal", label: "Bonjour [Nom]," },
  { value: "casual", label: "Salut [Nom]," },
  { value: "none", label: "Pas de salutation" },
];

export function ToneSelector({
  value,
  onChange,
  onPreviewTone,
  language = "fr",
  className,
}: ToneSelectorProps) {
  const [showCustomSettings, setShowCustomSettings] = useState(false);

  const handleToneChange = (tone: ToneType) => {
    onChange({ ...value, type: tone });
  };

  const selectedTone = toneOptions.find((t) => t.value === value.type);

  return (
    <Card className={className}>
      <CardHeader className="py-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-orange-500" />
          Ton du message
        </CardTitle>
        <CardDescription className="text-xs">
          Choisissez le ton qui correspond à votre message
        </CardDescription>
      </CardHeader>
      <CardContent className="py-2 space-y-4">
        {/* Tone Selection */}
        <RadioGroup
          value={value.type}
          onValueChange={(v) => handleToneChange(v as ToneType)}
          className="grid grid-cols-2 gap-2"
        >
          {toneOptions.map((tone) => (
            <Label
              key={tone.value}
              htmlFor={tone.value}
              className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                value.type === tone.value
                  ? "border-orange-500 bg-orange-50 dark:bg-orange-950"
                  : "hover:bg-gray-50 dark:hover:bg-gray-900"
              }`}
            >
              <RadioGroupItem value={tone.value} id={tone.value} className="sr-only" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className={tone.color}>{tone.icon}</span>
                  <span className="font-medium text-sm">
                    {language === "fr" ? tone.label : tone.labelEn}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {language === "fr" ? tone.description : tone.descriptionEn}
                </p>
              </div>
              {value.type === tone.value && (
                <Badge variant="secondary" className="bg-orange-100 text-orange-700 text-xs">
                  Actif
                </Badge>
              )}
            </Label>
          ))}
        </RadioGroup>

        {/* Tone Preview */}
        {selectedTone && onPreviewTone && (
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => onPreviewTone(value)}
          >
            Voir l&apos;aperçu du ton
          </Button>
        )}

        {/* Custom Settings */}
        <Collapsible open={showCustomSettings} onOpenChange={setShowCustomSettings}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-between"
            >
              <span>Paramètres avancés</span>
              {showCustomSettings ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 pt-4">
            {/* Greeting Style */}
            <div className="space-y-2">
              <Label className="text-xs">Style de salutation</Label>
              <Select
                value={value.greetingStyle}
                onValueChange={(v) =>
                  onChange({ ...value, greetingStyle: v as "formal" | "casual" | "none" })
                }
              >
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {greetingOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Urgency Level */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Niveau d&apos;urgence</Label>
                <Badge variant="outline" className="text-xs">
                  {value.urgencyLevel}/10
                </Badge>
              </div>
              <Slider
                value={[value.urgencyLevel]}
                onValueChange={([v]) => onChange({ ...value, urgencyLevel: v })}
                min={1}
                max={10}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>Doux</span>
                <span>Modéré</span>
                <span>Pressant</span>
              </div>
            </div>

            {/* Custom Phrases (for custom tone) */}
            {value.type === "custom" && (
              <div className="space-y-3 pt-2 border-t">
                <Label className="text-xs font-medium">Phrases personnalisées</Label>
                
                <div className="space-y-2">
                  <Label className="text-xs text-gray-500">Salutation</Label>
                  <Input
                    placeholder="Ex: Cher client,"
                    value={value.customPhrases?.greeting || ""}
                    onChange={(e) =>
                      onChange({
                        ...value,
                        customPhrases: {
                          ...value.customPhrases,
                          greeting: e.target.value,
                        },
                      })
                    }
                    className="h-8"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-gray-500">Appel à l&apos;action</Label>
                  <Input
                    placeholder="Ex: Merci de régler cette facture rapidement"
                    value={value.customPhrases?.callToAction || ""}
                    onChange={(e) =>
                      onChange({
                        ...value,
                        customPhrases: {
                          ...value.customPhrases,
                          callToAction: e.target.value,
                        },
                      })
                    }
                    className="h-8"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-gray-500">Formule de politesse</Label>
                  <Textarea
                    placeholder="Ex: Dans l'attente de votre retour..."
                    value={value.customPhrases?.closing || ""}
                    onChange={(e) =>
                      onChange({
                        ...value,
                        customPhrases: {
                          ...value.customPhrases,
                          closing: e.target.value,
                        },
                      })
                    }
                    className="h-16 resize-none"
                  />
                </div>
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}

// Mini tone badge for display
interface ToneBadgeProps {
  tone: ToneType;
  className?: string;
}

export function ToneBadge({ tone, className }: ToneBadgeProps) {
  const toneInfo = toneOptions.find((t) => t.value === tone);
  if (!toneInfo) return null;

  return (
    <Badge
      variant="secondary"
      className={`gap-1 ${toneInfo.color} ${className}`}
    >
      {toneInfo.icon}
      {toneInfo.label}
    </Badge>
  );
}

// Tone preview example
interface TonePreviewExampleProps {
  tone: ToneType;
  clientName?: string;
}

export function TonePreviewExample({ tone, clientName = "Monsieur Dupont" }: TonePreviewExampleProps) {
  const examples: Record<ToneType, { greeting: string; body: string; closing: string }> = {
    formal: {
      greeting: `Bonjour ${clientName},`,
      body: "Nous vous rappelons que la facture {{reference}} d'un montant de {{amount}} est arrivée à échéance.",
      closing: "Nous vous prions de bien vouloir procéder au paiement dans les meilleurs délais.\n\nCordialement,",
    },
    friendly: {
      greeting: `Salut ${clientName} !`,
      body: "J'espère que tu vas bien ! Je voulais juste te rappeler la facture {{reference}} de {{amount}} qui est arrivée à échéance.",
      closing: "Si tu as des questions, n'hésite pas !\n\nÀ bientôt,",
    },
    urgent: {
      greeting: `${clientName},`,
      body: "⚠️ URGENT : La facture {{reference}} de {{amount}} est en retard de {{daysOverdue}} jours.",
      closing: "Merci de régulariser cette situation dans les 48h.",
    },
    custom: {
      greeting: "Message personnalisé",
      body: "Contenu selon vos paramètres personnalisés.",
      closing: "Formule de politesse personnalisée.",
    },
  };

  const example = examples[tone];

  return (
    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 text-sm space-y-2">
      <p className="font-medium">{example.greeting}</p>
      <p className="text-gray-600 dark:text-gray-400">{example.body}</p>
      <p className="text-gray-500 dark:text-gray-500 text-xs">{example.closing}</p>
    </div>
  );
}
