"use client";

import { useState, useCallback, useEffect } from "react";
import { Message } from "@/components/chatbot/chat-message";

interface UseAIChatOptions {
  apiEndpoint?: string;
  welcomeMessage?: string;
  suggestedActions?: string[];
}

interface ChatResponse {
  message: string;
  suggestedActions?: string[];
}

export function useAIChat(options: UseAIChatOptions = {}) {
  const {
    apiEndpoint = "/api/ai/chat",
    welcomeMessage = "Bonjour ! Je suis l'assistant RelancePro Africa. Comment puis-je vous aider aujourd'hui ?",
    suggestedActions = [
      "Comment ajouter un client ?",
      "Comment envoyer une relance ?",
      "Quels sont les tarifs ?",
      "Parler à un humain",
    ],
  } = options;

  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize with welcome message
  useEffect(() => {
    if (!isInitialized) {
      setMessages([
        {
          id: "welcome",
          role: "assistant",
          content: welcomeMessage,
          timestamp: new Date(),
        },
      ]);
      setIsInitialized(true);
    }
  }, [isInitialized, welcomeMessage]);

  // Send message function
  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isLoading) return;

      setError(null);

      // Add user message
      const userMessage: Message = {
        id: `user-${Date.now()}`,
        role: "user",
        content: content.trim(),
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);

      try {
        const response = await fetch(apiEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: content.trim(),
          }),
        });

        if (!response.ok) {
          // If unauthorized (not logged in), show a friendly message
          if (response.status === 401) {
            const assistantMessage: Message = {
              id: `assistant-${Date.now()}`,
              role: "assistant",
              content:
                "Je suis là pour vous aider ! Pour accéder à toutes les fonctionnalités de RelancePro, vous pouvez [créer un compte gratuit](/register) ou [vous connecter](/login).\n\nEn attendant, n'hésitez pas à me poser vos questions sur la plateforme !",
              timestamp: new Date(),
            };
            setMessages((prev) => [...prev, assistantMessage]);
            return;
          }
          throw new Error("Erreur lors de l'envoi du message");
        }

        const data: ChatResponse = await response.json();

        // Add assistant message
        const assistantMessage: Message = {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: data.message,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, assistantMessage]);
      } catch (err) {
        console.error("Chat error:", err);
        setError("Une erreur est survenue. Veuillez réessayer.");

        // Add error message as assistant message
        const errorMessage: Message = {
          id: `error-${Date.now()}`,
          role: "assistant",
          content:
            "Désolé, une erreur est survenue lors du traitement de votre demande. Veuillez réessayer ou contacter notre support si le problème persiste.",
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
      }
    },
    [apiEndpoint, isLoading]
  );

  // Clear chat history
  const clearHistory = useCallback(() => {
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content: welcomeMessage,
        timestamp: new Date(),
      },
    ]);
    setError(null);
  }, [welcomeMessage]);

  // Handle quick action click
  const handleQuickAction = useCallback(
    (action: string) => {
      sendMessage(action);
    },
    [sendMessage]
  );

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearHistory,
    handleQuickAction,
    suggestedActions,
  };
}
