// Push notification configuration

import { NotificationType, NotificationPreferences } from "./service"

export interface PushPayload {
  title: string
  body: string
  icon?: string
  badge?: string
  data?: any
}

export function getVapidConfig(): { publicKey: string } {
  return {
    publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "",
  }
}

export function createPushPayload(notification: NotificationType, data?: any): PushPayload {
  return {
    title: notification.title,
    body: notification.body,
    data,
  }
}

export function isInQuietHours(preferences: NotificationPreferences): boolean {
  return false
}

export const NOTIFICATION_TYPE_CONFIG: Record<string, { icon: string; sound: string }> = {
  payment_received: { icon: "💰", sound: "default" },
  reminder_sent: { icon: "📧", sound: "default" },
  new_debt: { icon: "📄", sound: "default" },
}
