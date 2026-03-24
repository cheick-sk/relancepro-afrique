"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle,
  X,
  Minimize2,
  Maximize2,
  Bot,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatMessage, Message } from "./chat-message";
import { ChatInput } from "./chat-input";
import { useAIChat } from "@/hooks/use-ai-chat";
import { cn } from "@/lib/utils";

// Storage key for persistence
const CHATBOT_STATE_KEY = "relancepro-chatbot-open";

// Helper function to get initial state from localStorage
function getInitialOpenState(): boolean {
  if (typeof window === "undefined") return false;
  const savedState = localStorage.getItem(CHATBOT_STATE_KEY);
  return savedState === "true";
}

// Helper function to get initial mobile state
function getInitialMobileState(): boolean {
  if (typeof window === "undefined") return false;
  return window.innerWidth < 768;
}

export function AIChatbot() {
  const [isOpen, setIsOpen] = useState(getInitialOpenState);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMobile, setIsMobile] = useState(getInitialMobileState);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Handle resize for mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Save state when changed
  useEffect(() => {
    localStorage.setItem(CHATBOT_STATE_KEY, String(isOpen));
  }, [isOpen]);

  const {
    messages,
    isLoading,
    sendMessage,
    clearHistory,
    handleQuickAction,
    suggestedActions,
  } = useAIChat({
    welcomeMessage:
      "👋 Bienvenue sur RelancePro Africa !\n\nJe suis votre assistant virtuel. Je peux vous aider avec :\n\n• **L'onboarding** et la configuration de votre compte\n• **L'utilisation** de la plateforme\n• **Le dépannage** technique\n• **Les explications** des fonctionnalités\n\nComment puis-je vous aider aujourd'hui ?",
    suggestedActions: [
      "Comment ajouter un client ?",
      "Comment envoyer une relance ?",
      "Quels sont les tarifs ?",
      "Parler à un humain",
    ],
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const toggleChat = () => {
    if (isOpen && !isMinimized) {
      setIsMinimized(true);
    } else {
      setIsOpen(!isOpen);
      setIsMinimized(false);
    }
  };

  const openChat = () => {
    setIsOpen(true);
    setIsMinimized(false);
  };

  const closeChat = () => {
    setIsOpen(false);
    setIsMinimized(false);
  };

  // Animation variants
  const buttonVariants = {
    initial: { scale: 0, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    hover: { scale: 1.05 },
    tap: { scale: 0.95 },
  };

  const chatWindowVariants = {
    initial: { opacity: 0, y: 20, scale: 0.95 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: 20, scale: 0.95 },
  };

  return (
    <>
      {/* Floating Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            variants={buttonVariants}
            initial="initial"
            animate="animate"
            exit="initial"
            whileHover="hover"
            whileTap="tap"
            onClick={openChat}
            className={cn(
              "fixed z-50 flex items-center justify-center",
              "w-14 h-14 rounded-full shadow-2xl",
              "bg-gradient-to-r from-orange-500 to-amber-500",
              "hover:from-orange-600 hover:to-amber-600",
              "transition-all duration-300",
              "bottom-6 right-6",
              "md:bottom-8 md:right-8"
            )}
          >
            <MessageCircle className="w-6 h-6 text-white" />

            {/* Pulse Animation */}
            <span className="absolute inset-0 rounded-full bg-orange-500 animate-ping opacity-25" />

            {/* Notification Badge */}
            <span
              className={cn(
                "absolute -top-1 -right-1 w-5 h-5 rounded-full",
                "bg-red-500 text-white text-xs font-bold",
                "flex items-center justify-center",
                "shadow-lg"
              )}
            >
              <Sparkles className="w-3 h-3" />
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            variants={chatWindowVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className={cn(
              "fixed z-50 bg-white dark:bg-gray-900 shadow-2xl flex flex-col",
              // Mobile: full screen overlay
              isMobile
                ? "inset-0 rounded-none"
                : cn(
                    "bottom-6 right-6 rounded-2xl overflow-hidden",
                    "w-[380px] h-[600px] max-h-[80vh]",
                    "border border-gray-200 dark:border-gray-700",
                    isMinimized ? "h-auto" : ""
                  ),
              "md:bottom-8 md:right-8"
            )}
          >
            {/* Header */}
            <div
              className={cn(
                "flex items-center justify-between px-4 py-3",
                "bg-gradient-to-r from-orange-500 to-amber-500",
                "text-white"
              )}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Assistant RelancePro</h3>
                  <p className="text-xs text-orange-100">
                    En ligne • Répond en quelques secondes
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {/* Clear History */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={clearHistory}
                  className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/20"
                  title="Effacer l'historique"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>

                {/* Minimize/Maximize */}
                {!isMobile && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleChat}
                    className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/20"
                  >
                    <Minimize2 className="w-4 h-4" />
                  </Button>
                )}

                {/* Close */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={closeChat}
                  className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/20"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Chat Content */}
            {!isMinimized && (
              <>
                {/* Messages */}
                <ScrollArea className="flex-1 p-4 bg-gray-50 dark:bg-gray-800/50">
                  <div className="space-y-1">
                    {messages.map((message, index) => (
                      <ChatMessage
                        key={message.id}
                        message={message}
                        onQuickAction={handleQuickAction}
                        suggestedActions={
                          index === 0 && message.role === "assistant"
                            ? suggestedActions
                            : undefined
                        }
                      />
                    ))}

                    {/* Typing Indicator */}
                    {isLoading && (
                      <div className="flex items-start gap-3 mb-4">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-sm">
                          <Bot className="w-4 h-4 text-white" />
                        </div>
                        <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.1s]" />
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                          </div>
                        </div>
                      </div>
                    )}

                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                {/* Input */}
                <ChatInput
                  onSend={sendMessage}
                  isLoading={isLoading}
                  placeholder="Posez votre question..."
                />
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
