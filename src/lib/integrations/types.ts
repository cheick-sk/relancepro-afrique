// Integration types

export type IntegrationType = "quickbooks" | "xero" | "sage" | "export"
export type ConnectionStatus = "connected" | "disconnected" | "error" | "pending"

export interface FieldMapping {
  source: string
  target: string
}

export const INTEGRATIONS: Record<IntegrationType, { name: string; description: string }> = {
  quickbooks: { name: "QuickBooks", description: "Synchronisation avec QuickBooks" },
  xero: { name: "Xero", description: "Synchronisation avec Xero" },
  sage: { name: "Sage", description: "Synchronisation avec Sage" },
  export: { name: "Export", description: "Export des données" },
}
