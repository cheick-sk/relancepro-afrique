// Type definitions

export interface Debt {
  id: string
  amount: number
  currency: string
  status: "PENDING" | "PAID" | "OVERDUE" | "CANCELLED"
  dueDate: Date
  clientId: string
  client?: Client
  createdAt: Date
  updatedAt: Date
}

export interface Client {
  id: string
  name: string
  email: string
  phone?: string
  address?: string
  status: "ACTIVE" | "INACTIVE"
  creditScore?: number
  createdAt: Date
  updatedAt: Date
}

export interface User {
  id: string
  email: string
  name?: string
  role: string
  createdAt: Date
}

export interface Reminder {
  id: string
  type: "EMAIL" | "SMS" | "WHATSAPP"
  status: "PENDING" | "SENT" | "FAILED"
  debtId: string
  sentAt?: Date
  createdAt: Date
}

export interface Template {
  id: string
  name: string
  type: "EMAIL" | "SMS" | "WHATSAPP"
  category: string
  content: string
  createdAt: Date
}

export interface Invoice {
  id: string
  invoiceNumber: string
  amount: number
  status: "DRAFT" | "PENDING" | "PAID" | "OVERDUE"
  clientId: string
  dueDate: Date
  createdAt: Date
}
