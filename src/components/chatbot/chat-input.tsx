"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading?: boolean;
  disabled?: boolean;
  placeholder?: string;
  maxLength?: number;
}

export function ChatInput({
  onSend,
  isLoading = false,
  disabled = false,
  placeholder = "Tapez votre message...",
  maxLength = 500,
}: ChatInputProps) {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, [message]);

  const handleSend = () => {
    if (message.trim() && !isLoading && !disabled) {
      onSend(message.trim());
      setMessage("");
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const characterCount = message.length;
  const isOverLimit = characterCount > maxLength;

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
      <div className="flex items-end gap-2">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled || isLoading}
            rows={1}
            className={cn(
              "w-full resize-none rounded-xl border px-4 py-3 pr-16 text-sm",
              "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700",
              "focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500",
              "placeholder:text-gray-400 dark:placeholder:text-gray-500",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "transition-all duration-200"
            )}
            style={{ maxHeight: "120px" }}
          />

          {/* Character Count */}
          <div
            className={cn(
              "absolute right-3 bottom-3 text-xs",
              isOverLimit
                ? "text-red-500"
                : "text-gray-400 dark:text-gray-500"
            )}
          >
            {characterCount}/{maxLength}
          </div>
        </div>

        {/* Send Button */}
        <Button
          onClick={handleSend}
          disabled={
            !message.trim() || isLoading || disabled || isOverLimit
          }
          className={cn(
            "flex-shrink-0 w-11 h-11 rounded-xl p-0",
            "bg-gradient-to-r from-orange-500 to-amber-500",
            "hover:from-orange-600 hover:to-amber-600",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "shadow-lg shadow-orange-200 dark:shadow-orange-900/30",
            "transition-all duration-200"
          )}
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin text-white" />
          ) : (
            <Send className="w-5 h-5 text-white" />
          )}
        </Button>
      </div>

      {/* Typing Indicator */}
      {isLoading && (
        <div className="flex items-center gap-2 mt-2 text-xs text-gray-500 dark:text-gray-400">
          <Loader2 className="w-3 h-3 animate-spin" />
          <span>L'assistant rédige une réponse...</span>
        </div>
      )}
    </div>
  );
}
