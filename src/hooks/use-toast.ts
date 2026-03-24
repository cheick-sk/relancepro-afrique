"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

type ToastVariant = "default" | "destructive" | "success"

interface Toast {
  id: string
  title?: string
  description?: string
  variant?: ToastVariant
}

interface ToastContextType {
  toasts: Toast[]
  toast: (toast: Omit<Toast, "id">) => void
  dismiss: (id: string) => void
}

const ToastContext = React.createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  return React.createElement(React.Fragment, null, children)
}

export function ToastViewport(props: React.HTMLAttributes<HTMLDivElement>) {
  return React.createElement("div", { ...props })
}

export function useToast() {
  return {
    toasts: [] as Toast[],
    toast: (toast: Omit<Toast, "id">) => {
      console.log("Toast:", toast)
    },
    dismiss: (id: string) => {},
  }
}

export type { Toast }
