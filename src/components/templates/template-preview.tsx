"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Mail,
  MessageSquare,
  Smartphone,
  Monitor,
  Tablet,
  Copy,
  Check,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { replaceVariables, getSampleTemplateData } from "@/lib/templates/variables";
import { toast } from "sonner";

interface TemplatePreviewProps {
  type: "email" | "whatsapp";
  subject?: string;
  content: string;
  className?: string;
}

export function TemplatePreview({ type, subject, content, className }: TemplatePreviewProps) {
  const [deviceView, setDeviceView] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Replace variables with sample data
  const sampleData = getSampleTemplateData();
  const previewContent = replaceVariables(content, sampleData, "GNF");
  const previewSubject = subject ? replaceVariables(subject, sampleData, "GNF") : "";

  // Copy to clipboard
  const handleCopy = async () => {
    const textToCopy = type === "email" ? `Subject: ${previewSubject}\n\n${previewContent}` : previewContent;
    await navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    toast.success("Copié dans le presse-papiers");
    setTimeout(() => setCopied(false), 2000);
  };

  if (type === "email") {
    return (
      <Card className={className}>
        <CardHeader className="py-3 flex flex-row items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Mail className="h-4 w-4 text-orange-500" />
            Aperçu Email
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className="flex items-center border rounded-md">
              <Button
                variant={deviceView === "desktop" ? "secondary" : "ghost"}
                size="sm"
                className="h-7 w-7 p-0 rounded-r-none"
                onClick={() => setDeviceView("desktop")}
              >
                <Monitor className="h-3 w-3" />
              </Button>
              <Button
                variant={deviceView === "tablet" ? "secondary" : "ghost"}
                size="sm"
                className="h-7 w-7 p-0 rounded-none border-x"
                onClick={() => setDeviceView("tablet")}
              >
                <Tablet className="h-3 w-3" />
              </Button>
              <Button
                variant={deviceView === "mobile" ? "secondary" : "ghost"}
                size="sm"
                className="h-7 w-7 p-0 rounded-l-none"
                onClick={() => setDeviceView("mobile")}
              >
                <Smartphone className="h-3 w-3" />
              </Button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setIsFullscreen(!isFullscreen)}
            >
              {isFullscreen ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2"
              onClick={handleCopy}
            >
              {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
            </Button>
          </div>
        </CardHeader>
        <CardContent className={`p-0 ${isFullscreen ? "fixed inset-0 z-50 bg-background p-4" : ""}`}>
          <div
            className={`mx-auto bg-white border rounded-lg overflow-hidden shadow-sm transition-all duration-300 ${
              deviceView === "desktop"
                ? "w-full max-w-2xl"
                : deviceView === "tablet"
                ? "w-full max-w-md"
                : "w-full max-w-xs"
            }`}
          >
            {/* Email Header */}
            <div className="bg-gray-50 border-b px-4 py-3">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="text-xs">
                  Nouveau message
                </Badge>
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 w-12">De:</span>
                  <span className="font-medium">{sampleData.companyName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 w-12">À:</span>
                  <span className="font-medium">{sampleData.clientEmail}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 w-12">Objet:</span>
                  <span className="font-medium text-orange-600">{previewSubject}</span>
                </div>
              </div>
            </div>

            {/* Email Body */}
            <div className="p-4 bg-white">
              <div className="prose prose-sm max-w-none">
                <div className="whitespace-pre-wrap text-gray-700 text-sm leading-relaxed">
                  {previewContent}
                </div>
              </div>

              {/* Email Signature */}
              <div className="mt-6 pt-4 border-t">
                <p className="text-sm text-gray-600">
                  <strong>{sampleData.companyName}</strong>
                </p>
                {sampleData.companyPhone && (
                  <p className="text-xs text-gray-500 mt-1">
                    📞 {sampleData.companyPhone}
                  </p>
                )}
                {sampleData.companyEmail && (
                  <p className="text-xs text-gray-500">
                    ✉️ {sampleData.companyEmail}
                  </p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // WhatsApp Preview
  return (
    <Card className={className}>
      <CardHeader className="py-3 flex flex-row items-center justify-between">
        <CardTitle className="text-sm flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-green-500" />
          Aperçu WhatsApp
        </CardTitle>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            onClick={handleCopy}
          >
            {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {/* Phone Mockup */}
        <div className="flex justify-center p-4 bg-gray-100">
          <div className="relative bg-gray-900 rounded-[2.5rem] p-2 shadow-xl" style={{ width: "280px" }}>
            {/* Phone Notch */}
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-24 h-6 bg-gray-900 rounded-b-xl z-10" />
            
            {/* Phone Screen */}
            <div className="bg-gray-800 rounded-[2rem] overflow-hidden">
              {/* WhatsApp Header */}
              <div className="bg-green-600 px-4 py-3 flex items-center gap-3">
                <div className="flex items-center gap-2 flex-1">
                  <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-xs font-bold text-gray-600">
                    {sampleData.companyName?.charAt(0)}
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">{sampleData.companyName}</p>
                    <p className="text-green-200 text-xs">en ligne</p>
                  </div>
                </div>
              </div>

              {/* WhatsApp Chat Background */}
              <div
                className="p-3 space-y-2"
                style={{
                  height: "320px",
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23d1d5db' fill-opacity='0.15'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                  backgroundColor: "#e5ddd5",
                }}
              >
                {/* Message Bubble */}
                <div className="flex justify-end">
                  <div className="bg-green-100 rounded-lg rounded-br-none px-3 py-2 max-w-[90%] shadow-sm">
                    <p className="text-gray-800 text-sm whitespace-pre-wrap leading-relaxed">
                      {previewContent}
                    </p>
                    <div className="flex items-center justify-end gap-1 mt-1">
                      <span className="text-xs text-gray-500">
                        {new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      <svg className="w-4 h-4 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* WhatsApp Input */}
              <div className="bg-gray-100 px-3 py-2 flex items-center gap-2">
                <div className="flex-1 bg-white rounded-full px-4 py-2 text-sm text-gray-400">
                  Écrire un message...
                </div>
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Mini preview for list views
interface MiniPreviewProps {
  type: "email" | "whatsapp";
  content: string;
  subject?: string;
}

export function MiniPreview({ type, content, subject }: MiniPreviewProps) {
  const sampleData = getSampleTemplateData();
  const previewContent = replaceVariables(content, sampleData, "GNF");
  const truncatedContent = previewContent.substring(0, 100) + (previewContent.length > 100 ? "..." : "");

  return (
    <div className="text-xs text-gray-500 mt-1">
      {type === "email" && subject && (
        <p className="font-medium text-gray-700 truncate">{subject}</p>
      )}
      <p className="line-clamp-2">{truncatedContent}</p>
    </div>
  );
}
