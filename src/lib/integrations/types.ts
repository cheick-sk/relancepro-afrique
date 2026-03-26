export type IntegrationType = 'quickbooks' | 'xero' | 'sage' | 'wave' | 'freshbooks';
export type ConnectionStatus = 'connected' | 'disconnected' | 'expired' | 'error';

export interface Integration {
  id: string;
  type: IntegrationType;
  name: string;
  description: string;
  icon: string;
  status: ConnectionStatus;
  lastSync?: Date;
  fields: string[];
}

export interface FieldMapping {
  localField: string;
  remoteField: string;
}

export const INTEGRATIONS: Record<IntegrationType, Omit<Integration, 'status' | 'lastSync'>> = {
  quickbooks: {
    id: 'quickbooks',
    type: 'quickbooks',
    name: 'QuickBooks',
    description: 'Synchronisation avec QuickBooks',
    icon: 'quickbooks',
    fields: ['clients', 'invoices', 'payments'],
  },
  xero: {
    id: 'xero',
    type: 'xero',
    name: 'Xero',
    description: 'Synchronisation avec Xero',
    icon: 'xero',
    fields: ['clients', 'invoices', 'payments'],
  },
  sage: {
    id: 'sage',
    type: 'sage',
    name: 'Sage',
    description: 'Synchronisation avec Sage',
    icon: 'sage',
    fields: ['clients', 'invoices', 'payments'],
  },
  wave: {
    id: 'wave',
    type: 'wave',
    name: 'Wave',
    description: 'Synchronisation avec Wave',
    icon: 'wave',
    fields: ['clients', 'invoices'],
  },
  freshbooks: {
    id: 'freshbooks',
    type: 'freshbooks',
    name: 'FreshBooks',
    description: 'Synchronisation avec FreshBooks',
    icon: 'freshbooks',
    fields: ['clients', 'invoices', 'payments'],
  },
};
