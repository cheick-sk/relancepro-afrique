"use client";

import { cn } from "@/lib/utils";
import { Bot, User } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import ReactMarkdown from "react-markdown";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface ChatMessageProps {
  message: Message;
  onQuickAction?: (action: string) => void;
  suggestedActions?: string[];
}

export function ChatMessage({
  message,
  onQuickAction,
  suggestedActions,
}: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <div
      className={cn(
        "flex w-full gap-3 mb-4",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-sm",
          isUser
            ? "bg-gradient-to-br from-blue-500 to-blue-600"
            : "bg-gradient-to-br from-orange-500 to-amber-500"
        )}
      >
        {isUser ? (
          <User className="w-4 h-4 text-white" />
        ) : (
          <Bot className="w-4 h-4 text-white" />
        )}
      </div>

      {/* Message Content */}
      <div
        className={cn(
          "flex flex-col max-w-[80%]",
          isUser ? "items-end" : "items-start"
        )}
      >
        <div
          className={cn(
            "rounded-2xl px-4 py-3 shadow-sm",
            isUser
              ? "bg-blue-500 text-white rounded-tr-sm"
              : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-tl-sm"
          )}
        >
          <div
            className={cn(
              "prose prose-sm max-w-none",
              isUser
                ? "prose-invert"
                : "dark:prose-invert prose-p:text-gray-700 dark:prose-p:text-gray-300"
            )}
          >
            <ReactMarkdown
              components={{
                p: ({ children }) => (
                  <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>
                ),
                ul: ({ children }) => (
                  <ul className="list-disc list-inside mb-2 space-y-1">
                    {children}
                  </ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal list-inside mb-2 space-y-1">
                    {children}
                  </ol>
                ),
                li: ({ children }) => <li className="text-sm">{children}</li>,
                strong: ({ children }) => (
                  <strong className="font-semibold">{children}</strong>
                ),
                code: ({ children }) => (
                  <code className="bg-gray-200 dark:bg-gray-700 px-1 py-0.5 rounded text-xs">
                    {children}
                  </code>
                ),
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        </div>

        {/* Timestamp */}
        <span
          className={cn(
            "text-xs text-gray-400 dark:text-gray-500 mt-1",
            isUser ? "text-right" : "text-left"
          )}
        >
          {format(message.timestamp, "HH:mm", { locale: fr })}
        </span>

        {/* Quick Action Buttons */}
        {!isUser && suggestedActions && suggestedActions.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {suggestedActions.map((action, index) => (
              <button
                key={index}
                onClick={() => onQuickAction?.(action)}
                className="px-3 py-1.5 text-xs font-medium rounded-full border border-orange-200 dark:border-orange-800 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors"
              >
                {action}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
