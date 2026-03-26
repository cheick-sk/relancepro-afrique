"use client";

import { createContext, useContext, useState, ReactNode, useCallback, useEffect } from "react";
import { soundManager } from "@/lib/sounds";

export interface Notification {
  id: string;
  type: "success" | "warning" | "error" | "info";
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
  actionUrl?: string;
  actionLabel?: string;
  soundEnabled?: boolean;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  soundEnabled: boolean;
  addNotification: (notification: Omit<Notification, "id" | "read" | "createdAt">) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
  toggleSound: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

function loadNotifications(): Notification[] {
  if (typeof window === "undefined") return [];
  const saved = localStorage.getItem("notifications");
  if (!saved) return [];
  try {
    const parsed = JSON.parse(saved);
    return parsed.map((n: Notification) => ({
      ...n,
      createdAt: new Date(n.createdAt),
    }));
  } catch {
    return [];
  }
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  // Initialize with loaded notifications directly
  const [notifications, setNotifications] = useState<Notification[]>(() => loadNotifications());
  const [soundEnabled, setSoundEnabled] = useState(() => {
    if (typeof window === "undefined") return true;
    const saved = localStorage.getItem("notificationSoundEnabled");
    return saved !== "false";
  });

  useEffect(() => {
    localStorage.setItem("notificationSoundEnabled", String(soundEnabled));
  }, [soundEnabled]);

  const addNotification = useCallback(
    (notification: Omit<Notification, "id" | "read" | "createdAt">) => {
      const newNotification: Notification = {
        ...notification,
        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        read: false,
        createdAt: new Date(),
      };
      
      // Jouer un son selon le type de notification
      if (soundEnabled && notification.soundEnabled !== false) {
        switch (notification.type) {
          case "success":
            soundManager.play("success");
            break;
          case "error":
            soundManager.play("error");
            break;
          case "warning":
            soundManager.play("warning");
            break;
          default:
            soundManager.play("notification");
        }
      }
      
      setNotifications((prev) => {
        const updated = [newNotification, ...prev].slice(0, 50);
        localStorage.setItem("notifications", JSON.stringify(updated));
        return updated;
      });
    },
    [soundEnabled]
  );

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) => {
      const updated = prev.map((n) => (n.id === id ? { ...n, read: true } : n));
      localStorage.setItem("notifications", JSON.stringify(updated));
      return updated;
    });
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => {
      const updated = prev.map((n) => ({ ...n, read: true }));
      localStorage.setItem("notifications", JSON.stringify(updated));
      return updated;
    });
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => {
      const updated = prev.filter((n) => n.id !== id);
      localStorage.setItem("notifications", JSON.stringify(updated));
      return updated;
    });
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
    localStorage.removeItem("notifications");
  }, []);

  const toggleSound = useCallback(() => {
    setSoundEnabled((prev) => !prev);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        soundEnabled,
        addNotification,
        markAsRead,
        markAllAsRead,
        removeNotification,
        clearAll,
        toggleSound,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
}
