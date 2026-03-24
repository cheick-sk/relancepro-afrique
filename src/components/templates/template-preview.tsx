"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Smartphone,
  Monitor,
  Sun,
  Moon,
  Mail,
  MessageSquare,
  Send,
} from "lucide-react";
import { TemplateType, PreviewData } from "@/lib/templates/types";
import { replaceVariables, SAMPLE_PREVIEW_DATA } from "@/lib/templates/variables";

interface TemplatePreviewProps {
  subject?: string;
  body: string;
  type: TemplateType;
  previewData?: Partial<PreviewData>;
  onSendTest?: () => void;
}

export function TemplatePreview({
  subject,
  body,
  type,
  previewData,
  onSendTest,
}: TemplatePreviewProps) {
  const [viewMode, setViewMode] = useState<"desktop" | "mobile">("desktop");
  const [theme, setTheme] = useState<"light" | "dark">("light");

  // Merge sample data with custom preview data
  const data = { ...SAMPLE_PREVIEW_DATA, ...previewData };

  // Replace variables in text
  const previewSubject = subject ? replaceVariables(subject, data) : undefined;
  const previewBody = replaceVariables(body, data);

  // Render email preview
  const renderEmailPreview = () => (
    <div className={`rounded-lg border ${theme === 'dark' ? 'bg-gray-900' : 'bg-white'}`}>
      {/* Email Header */}
      <div className={`border-b p-4 ${theme === 'dark' ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
        <div className="flex items-center gap-4 mb-3">
          <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center text-white font-medium">
            {data.company_name.charAt(0)}
          </div>
          <div className="flex-1">
            <div className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              {data.company_name}
            </div>
            <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
              à {data.client_email}
            </div>
          </div>
        </div>
        {previewSubject && (
          <h2 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            {previewSubject}
          </h2>
        )}
      </div>

      {/* Email Body */}
      <ScrollArea className={`${viewMode === 'mobile' ? 'h-[400px]' : 'h-[500px]'}`}>
        <div className={`p-6 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
          <div className="whitespace-pre-wrap text-sm leading-relaxed">
            {previewBody}
          </div>
        </div>
      </ScrollArea>
    </div>
  );

  // Render WhatsApp preview
  const renderWhatsAppPreview = () => (
    <div className={`rounded-lg overflow-hidden ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-100'}`}>
      {/* WhatsApp Header */}
      <div className="bg-green-600 text-white p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center text-white font-medium">
          {data.company_name.charAt(0)}
        </div>
        <div className="flex-1">
          <div className="font-medium">{data.company_name}</div>
          <div className="text-xs opacity-80">en ligne</div>
        </div>
        <div className="flex gap-2">
          <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 5v.01M12 12v.01M12 19v.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
        </div>
      </div>

      {/* WhatsApp Chat Background */}
      <div 
        className="p-4 space-y-3"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23d1d5db' fill-opacity='0.2'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          backgroundColor: theme === 'dark' ? '#1a1a1a' : '#e5ddd5',
        }}
      >
        {/* Message bubble */}
        <div className="flex justify-end">
          <div 
            className={`max-w-[80%] rounded-lg p-3 shadow ${
              theme === 'dark' 
                ? 'bg-green-800 text-white' 
                : 'bg-green-100 text-gray-800'
            }`}
          >
            <div className="whitespace-pre-wrap text-sm leading-relaxed">
              {previewBody}
            </div>
            <div className={`text-xs mt-2 flex justify-end items-center gap-1 ${
              theme === 'dark' ? 'text-green-300' : 'text-gray-500'
            }`}>
              14:32
              <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18 7l-1.41-1.41-6.34 6.34 1.41 1.41L18 7zm4.24-1.41L11.66 16.17 7.48 12l-1.41 1.41L11.66 19l12-12-1.42-1.41zM.41 13.41L6 19l1.41-1.41L1.83 12 .41 13.41z"/>
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* WhatsApp Input */}
      <div className={`p-3 flex items-center gap-2 ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-200'}`}>
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${theme === 'dark' ? 'bg-gray-700' : 'bg-white'}`}>
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div className={`flex-1 rounded-full px-4 py-2 ${theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-white text-gray-500'}`}>
          <span className="text-sm">Écrire un message</span>
        </div>
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${theme === 'dark' ? 'bg-gray-700' : 'bg-white'}`}>
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        </div>
      </div>
    </div>
  );

  // Render SMS preview
  const renderSmsPreview = () => (
    <div className={`rounded-lg overflow-hidden ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-100'}`}>
      {/* SMS Header */}
      <div className={`p-4 flex items-center gap-3 border-b ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white text-sm font-medium">
          {data.company_name.charAt(0)}
        </div>
        <div className="flex-1">
          <div className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            {data.company_name}
          </div>
          <div className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
            SMS • {data.client_phone}
          </div>
        </div>
      </div>

      {/* SMS Content */}
      <div className="p-4">
        <div className={`rounded-2xl p-4 shadow max-w-[85%] ${
          theme === 'dark' 
            ? 'bg-green-800 text-white' 
            : 'bg-green-100 text-gray-800'
        }`}>
          <div className="whitespace-pre-wrap text-sm leading-relaxed">
            {previewBody}
          </div>
          <div className={`text-xs mt-2 text-right ${theme === 'dark' ? 'text-green-300' : 'text-gray-500'}`}>
            14:32
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            {type === 'email' && <Mail className="h-4 w-4" />}
            {type === 'whatsapp' && <MessageSquare className="h-4 w-4" />}
            {type === 'sms' && <Smartphone className="h-4 w-4" />}
            Aperçu {type === 'email' ? 'Email' : type === 'whatsapp' ? 'WhatsApp' : 'SMS'}
          </CardTitle>
          
          <div className="flex items-center gap-2">
            {/* View mode toggle */}
            <ToggleGroup type="single" value={viewMode} onValueChange={(v) => v && setViewMode(v as "desktop" | "mobile")} size="sm">
              <ToggleGroupItem value="desktop" aria-label="Vue bureau">
                <Monitor className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="mobile" aria-label="Vue mobile">
                <Smartphone className="h-4 w-4" />
              </ToggleGroupItem>
            </ToggleGroup>

            {/* Theme toggle */}
            <ToggleGroup type="single" value={theme} onValueChange={(v) => v && setTheme(v as "light" | "dark")} size="sm">
              <ToggleGroupItem value="light" aria-label="Thème clair">
                <Sun className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="dark" aria-label="Thème sombre">
                <Moon className="h-4 w-4" />
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Preview container with device frame */}
        <div className={`mx-auto transition-all duration-300 ${
          viewMode === 'mobile' ? 'max-w-[320px]' : 'max-w-full'
        }`}>
          {/* Device frame for mobile */}
          {viewMode === 'mobile' && (
            <div className={`rounded-t-3xl p-2 ${
              theme === 'dark' ? 'bg-gray-800' : 'bg-gray-300'
            }`}>
              <div className="flex justify-center mb-2">
                <div className={`w-20 h-6 rounded-full ${theme === 'dark' ? 'bg-gray-900' : 'bg-white'}`}></div>
              </div>
            </div>
          )}

          {/* Preview content */}
          <div className={`${viewMode === 'mobile' ? 'rounded-b-3xl overflow-hidden' : ''}`}>
            {type === 'email' && renderEmailPreview()}
            {type === 'whatsapp' && renderWhatsAppPreview()}
            {type === 'sms' && renderSmsPreview()}
          </div>

          {/* Mobile bottom bar */}
          {viewMode === 'mobile' && (
            <div className={`rounded-b-3xl p-2 ${
              theme === 'dark' ? 'bg-gray-800' : 'bg-gray-300'
            }`}>
              <div className="flex justify-center">
                <div className={`w-24 h-1 rounded-full ${theme === 'dark' ? 'bg-gray-600' : 'bg-gray-400'}`}></div>
              </div>
            </div>
          )}
        </div>

        {/* Test send button */}
        {onSendTest && (
          <div className="mt-4 pt-4 border-t">
            <button 
              className="w-full flex items-center justify-center gap-2 py-2 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
              onClick={onSendTest}
            >
              <Send className="h-4 w-4" />
              Envoyer un test à mon email/téléphone
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
