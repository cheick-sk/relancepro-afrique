/**
 * GraphQL Resolvers for RelancePro Africa API
 * Query and mutation resolvers with authentication middleware
 */

import { db } from '@/lib/db'
import { 
  authenticateRequest,
  hasScope,
  createApiKey,
  revokeApiKey,
  type AuthenticatedApiKey,
  type ApiScope,
} from '@/lib/api/auth'
import { sendEmail } from '@/lib/services/email'
import { sendWhatsApp } from '@/lib/services/whatsapp'
import { NextRequest } from 'next/server'

// =====================================================
// Context Type
// =====================================================

export interface GraphQLContext {
  apiKey: AuthenticatedApiKey
  request?: NextRequest
}

// =====================================================
// Authentication Middleware
// =====================================================

export async function createContext(request: NextRequest): Promise<GraphQLContext | null> {
  const authResult = await authenticateRequest(request)
  
  if (!authResult.authenticated || !authResult.apiKey) {
    return null
  }
  
  return {
    apiKey: authResult.apiKey,
    request,
  }
}

export function requireAuth(context: GraphQLContext | null): GraphQLContext {
  if (!context) {
    throw new Error('Unauthorized: Authentication required')
  }
  return context
}

export function requireScopeAccess(context: GraphQLContext, scope: ApiScope): void {
  if (!hasScope(context.apiKey, scope)) {
    throw new Error(`Forbidden: Missing required scope '${scope}'`)
  }
}

// =====================================================
// Helper Functions
// =====================================================

function calculateDaysOverdue(dueDate: Date, status: string): number {
  if (status !== 'pending') return 0
  const now = new Date()
  return dueDate < now 
    ? Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
    : 0
}

// =====================================================
// Query Resolvers
// =====================================================

export const queryResolvers = {
  // Client queries
  async client(_: unknown, { id }: { id: string }, context: GraphQLContext | null) {
    const ctx = requireAuth(context)
    requireScopeAccess(ctx, 'clients:read')
    
    const client = await db.client.findFirst({
      where: { id, profileId: ctx.apiKey.profileId },
      include: {
        _count: { select: { debts: true } },
        debts: {
          select: { amount: true, paidAmount: true },
          where: { status: { in: ['pending', 'partial'] } },
        },
      },
    })
    
    if (!client) return null
    
    return {
      ...client,
      debtsCount: client._count.debts,
      totalDebt: client.debts.reduce((sum, d) => sum + d.amount, 0),
      totalPaid: client.debts.reduce((sum, d) => sum + d.paidAmount, 0),
    }
  },
  
  async clients(
    _: unknown,
    { filter, pagination }: { filter?: { status?: string; riskLevel?: string; search?: string }; pagination?: { page?: number; perPage?: number } },
    context: GraphQLContext | null
  ) {
    const ctx = requireAuth(context)
    requireScopeAccess(ctx, 'clients:read')
    
    const page = pagination?.page || 1
    const perPage = Math.min(pagination?.perPage || 20, 100)
    const offset = (page - 1) * perPage
    
    const where: Record<string, unknown> = {
      profileId: ctx.apiKey.profileId,
    }
    
    if (filter?.status) where.status = filter.status
    if (filter?.riskLevel) where.riskLevel = filter.riskLevel
    if (filter?.search) {
      where.OR = [
        { name: { contains: filter.search } },
        { email: { contains: filter.search } },
        { phone: { contains: filter.search } },
      ]
    }
    
    const [total, clients] = await Promise.all([
      db.client.count({ where }),
      db.client.findMany({
        where,
        skip: offset,
        take: perPage,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { debts: true } },
          debts: {
            select: { amount: true, paidAmount: true },
            where: { status: { in: ['pending', 'partial'] } },
          },
        },
      }),
    ])
    
    return {
      items: clients.map(c => ({
        ...c,
        debtsCount: c._count.debts,
        totalDebt: c.debts.reduce((sum, d) => sum + d.amount, 0),
        totalPaid: c.debts.reduce((sum, d) => sum + d.paidAmount, 0),
      })),
      total,
      page,
      perPage,
      totalPages: Math.ceil(total / perPage),
      hasMore: page < Math.ceil(total / perPage),
    }
  },
  
  // Debt queries
  async debt(_: unknown, { id }: { id: string }, context: GraphQLContext | null) {
    const ctx = requireAuth(context)
    requireScopeAccess(ctx, 'debts:read')
    
    const debt = await db.debt.findFirst({
      where: { id, profileId: ctx.apiKey.profileId },
      include: { client: true },
    })
    
    if (!debt) return null
    
    return {
      ...debt,
      remainingAmount: debt.amount - debt.paidAmount,
      daysOverdue: calculateDaysOverdue(debt.dueDate, debt.status),
    }
  },
  
  async debts(
    _: unknown,
    { filter, pagination }: { filter?: { status?: string; clientId?: string; currency?: string; overdue?: boolean }; pagination?: { page?: number; perPage?: number } },
    context: GraphQLContext | null
  ) {
    const ctx = requireAuth(context)
    requireScopeAccess(ctx, 'debts:read')
    
    const page = pagination?.page || 1
    const perPage = Math.min(pagination?.perPage || 20, 100)
    const offset = (page - 1) * perPage
    
    const where: Record<string, unknown> = {
      profileId: ctx.apiKey.profileId,
    }
    
    if (filter?.status) where.status = filter.status
    if (filter?.clientId) where.clientId = filter.clientId
    if (filter?.currency) where.currency = filter.currency
    if (filter?.overdue) {
      where.status = 'pending'
      where.dueDate = { lt: new Date() }
    }
    
    const [total, debts] = await Promise.all([
      db.debt.count({ where }),
      db.debt.findMany({
        where,
        skip: offset,
        take: perPage,
        orderBy: { createdAt: 'desc' },
        include: { client: true },
      }),
    ])
    
    return {
      items: debts.map(d => ({
        ...d,
        remainingAmount: d.amount - d.paidAmount,
        daysOverdue: calculateDaysOverdue(d.dueDate, d.status),
      })),
      total,
      page,
      perPage,
      totalPages: Math.ceil(total / perPage),
      hasMore: page < Math.ceil(total / perPage),
    }
  },
  
  // Reminder queries
  async reminder(_: unknown, { id }: { id: string }, context: GraphQLContext | null) {
    const ctx = requireAuth(context)
    requireScopeAccess(ctx, 'reminders:read')
    
    return db.reminder.findFirst({
      where: { id, profileId: ctx.apiKey.profileId },
      include: { client: true, debt: true },
    })
  },
  
  async reminders(
    _: unknown,
    { filter, pagination }: { filter?: { status?: string; type?: string; clientId?: string; debtId?: string }; pagination?: { page?: number; perPage?: number } },
    context: GraphQLContext | null
  ) {
    const ctx = requireAuth(context)
    requireScopeAccess(ctx, 'reminders:read')
    
    const page = pagination?.page || 1
    const perPage = Math.min(pagination?.perPage || 20, 100)
    const offset = (page - 1) * perPage
    
    const where: Record<string, unknown> = {
      profileId: ctx.apiKey.profileId,
    }
    
    if (filter?.status) where.status = filter.status
    if (filter?.type) where.type = filter.type
    if (filter?.clientId) where.clientId = filter.clientId
    if (filter?.debtId) where.debtId = filter.debtId
    
    const [total, reminders] = await Promise.all([
      db.reminder.count({ where }),
      db.reminder.findMany({
        where,
        skip: offset,
        take: perPage,
        orderBy: { createdAt: 'desc' },
        include: { client: true, debt: true },
      }),
    ])
    
    return {
      items: reminders,
      total,
      page,
      perPage,
      totalPages: Math.ceil(total / perPage),
      hasMore: page < Math.ceil(total / perPage),
    }
  },
  
  // Webhook queries
  async webhooks(_: unknown, { pagination }: { pagination?: { page?: number; perPage?: number } }, context: GraphQLContext | null) {
    const ctx = requireAuth(context)
    requireScopeAccess(ctx, 'webhooks:manage')
    
    const page = pagination?.page || 1
    const perPage = Math.min(pagination?.perPage || 20, 100)
    const offset = (page - 1) * perPage
    
    const webhooks = await db.webhook.findMany({
      where: { profileId: ctx.apiKey.profileId },
      skip: offset,
      take: perPage,
      orderBy: { createdAt: 'desc' },
    })
    
    return webhooks.map(w => ({
      ...w,
      events: JSON.parse(w.events),
    }))
  },
  
  async webhook(_: unknown, { id }: { id: string }, context: GraphQLContext | null) {
    const ctx = requireAuth(context)
    requireScopeAccess(ctx, 'webhooks:manage')
    
    const webhook = await db.webhook.findFirst({
      where: { id, profileId: ctx.apiKey.profileId },
    })
    
    if (!webhook) return null
    
    return {
      ...webhook,
      events: JSON.parse(webhook.events),
    }
  },
  
  // Analytics query
  async analytics(_: unknown, { dateRange }: { dateRange?: { startDate?: string; endDate?: string } }, context: GraphQLContext | null) {
    const ctx = requireAuth(context)
    requireScopeAccess(ctx, 'analytics:read')
    
    let startDate = dateRange?.startDate ? new Date(dateRange.startDate) : new Date()
    let endDate = dateRange?.endDate ? new Date(dateRange.endDate) : new Date()
    
    if (!dateRange?.startDate) {
      startDate.setDate(startDate.getDate() - 30)
    }
    
    startDate.setHours(0, 0, 0, 0)
    endDate.setHours(23, 59, 59, 999)
    
    const [
      totalClients,
      activeClients,
      newClients,
      debts,
      reminders,
      overdueDebts,
    ] = await Promise.all([
      db.client.count({ where: { profileId: ctx.apiKey.profileId } }),
      db.client.count({ where: { profileId: ctx.apiKey.profileId, status: 'active' } }),
      db.client.count({
        where: {
          profileId: ctx.apiKey.profileId,
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
      db.debt.findMany({
        where: {
          profileId: ctx.apiKey.profileId,
          createdAt: { gte: startDate, lte: endDate },
        },
        select: { amount: true, paidAmount: true, status: true },
      }),
      db.reminder.findMany({
        where: {
          profileId: ctx.apiKey.profileId,
          createdAt: { gte: startDate, lte: endDate },
        },
        select: { type: true, status: true },
      }),
      db.debt.count({
        where: {
          profileId: ctx.apiKey.profileId,
          status: 'pending',
          dueDate: { lt: new Date() },
        },
      }),
    ])
    
    const totalDebtAmount = debts.reduce((sum, d) => sum + d.amount, 0)
    const totalPaidAmount = debts.reduce((sum, d) => sum + d.paidAmount, 0)
    const recoveryRate = totalDebtAmount > 0 ? (totalPaidAmount / totalDebtAmount) * 100 : 0
    
    const topDebtors = await db.client.findMany({
      where: { profileId: ctx.apiKey.profileId, status: 'active' },
      include: {
        debts: {
          where: { status: { in: ['pending', 'partial'] } },
          select: { amount: true, paidAmount: true },
        },
      },
      take: 5,
    })
    
    return {
      period: { startDate, endDate },
      clients: {
        total: totalClients,
        active: activeClients,
        new: newClients,
      },
      debts: {
        total: debts.length,
        pending: debts.filter(d => d.status === 'pending').length,
        paid: debts.filter(d => d.status === 'paid').length,
        partial: debts.filter(d => d.status === 'partial').length,
        overdue: overdueDebts,
        totalAmount: totalDebtAmount,
        paidAmount: totalPaidAmount,
        remainingAmount: totalDebtAmount - totalPaidAmount,
        recoveryRate,
      },
      reminders: {
        total: reminders.length,
        email: reminders.filter(r => r.type === 'email').length,
        whatsapp: reminders.filter(r => r.type === 'whatsapp').length,
        sent: reminders.filter(r => r.status === 'sent').length,
        delivered: reminders.filter(r => r.status === 'delivered').length,
        failed: reminders.filter(r => r.status === 'failed').length,
        deliveryRate: reminders.length > 0 
          ? (reminders.filter(r => r.status === 'delivered').length / reminders.length) * 100 
          : 0,
      },
      topDebtors: topDebtors
        .map(c => ({
          id: c.id,
          name: c.name,
          company: c.company,
          totalDebt: c.debts.reduce((sum, d) => sum + d.amount, 0),
          totalPaid: c.debts.reduce((sum, d) => sum + d.paidAmount, 0),
          debtsCount: c.debts.length,
        }))
        .filter(c => c.totalDebt > 0)
        .sort((a, b) => (b.totalDebt - b.totalPaid) - (a.totalDebt - a.totalPaid)),
    }
  },
  
  // API Key queries
  async apiKeys(_: unknown, __: unknown, context: GraphQLContext | null) {
    const ctx = requireAuth(context)
    
    const keys = await db.apiKey.findMany({
      where: { profileId: ctx.apiKey.profileId },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        scopes: true,
        rateLimit: true,
        lastUsedAt: true,
        usageCount: true,
        active: true,
        expiresAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })
    
    return keys.map(k => ({
      ...k,
      scopes: JSON.parse(k.scopes),
    }))
  },
  
  async apiKey(_: unknown, { id }: { id: string }, context: GraphQLContext | null) {
    const ctx = requireAuth(context)
    
    const key = await db.apiKey.findFirst({
      where: { id, profileId: ctx.apiKey.profileId },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        scopes: true,
        rateLimit: true,
        lastUsedAt: true,
        usageCount: true,
        active: true,
        expiresAt: true,
        createdAt: true,
      },
    })
    
    if (!key) return null
    
    return {
      ...key,
      scopes: JSON.parse(key.scopes),
    }
  },
}

// =====================================================
// Mutation Resolvers
// =====================================================

export const mutationResolvers = {
  // Client mutations
  async createClient(_: unknown, { input }: { input: { name: string; email?: string; phone?: string; company?: string; address?: string; notes?: string } }, context: GraphQLContext | null) {
    const ctx = requireAuth(context)
    requireScopeAccess(ctx, 'clients:write')
    
    const client = await db.client.create({
      data: {
        profileId: ctx.apiKey.profileId,
        name: input.name,
        email: input.email,
        phone: input.phone,
        company: input.company,
        address: input.address,
        notes: input.notes,
      },
      include: {
        _count: { select: { debts: true } },
      },
    })
    
    return {
      ...client,
      debtsCount: client._count.debts,
      totalDebt: 0,
      totalPaid: 0,
    }
  },
  
  async updateClient(_: unknown, { id, input }: { id: string; input: Record<string, unknown> }, context: GraphQLContext | null) {
    const ctx = requireAuth(context)
    requireScopeAccess(ctx, 'clients:write')
    
    const existing = await db.client.findFirst({
      where: { id, profileId: ctx.apiKey.profileId },
    })
    
    if (!existing) return null
    
    return db.client.update({
      where: { id },
      data: {
        name: input.name as string | undefined,
        email: input.email as string | null | undefined,
        phone: input.phone as string | null | undefined,
        company: input.company as string | null | undefined,
        address: input.address as string | null | undefined,
        notes: input.notes as string | null | undefined,
        status: input.status as string | undefined,
      },
    })
  },
  
  async deleteClient(_: unknown, { id }: { id: string }, context: GraphQLContext | null) {
    const ctx = requireAuth(context)
    requireScopeAccess(ctx, 'clients:write')
    
    const existing = await db.client.findFirst({
      where: { id, profileId: ctx.apiKey.profileId },
      include: { _count: { select: { debts: true } } },
    })
    
    if (!existing) return false
    if (existing._count.debts > 0) {
      throw new Error('Cannot delete client with existing debts')
    }
    
    await db.client.delete({ where: { id } })
    return true
  },
  
  // Debt mutations
  async createDebt(_: unknown, { input }: { input: { clientId: string; reference?: string; description?: string; amount: number; currency?: string; dueDate: string; issueDate?: string; autoRemindEnabled?: boolean } }, context: GraphQLContext | null) {
    const ctx = requireAuth(context)
    requireScopeAccess(ctx, 'debts:write')
    
    const client = await db.client.findFirst({
      where: { id: input.clientId, profileId: ctx.apiKey.profileId },
    })
    
    if (!client) {
      throw new Error('Client not found')
    }
    
    const debt = await db.debt.create({
      data: {
        clientId: input.clientId,
        profileId: ctx.apiKey.profileId,
        reference: input.reference,
        description: input.description,
        amount: input.amount,
        currency: input.currency || 'GNF',
        dueDate: new Date(input.dueDate),
        issueDate: input.issueDate ? new Date(input.issueDate) : null,
        autoRemindEnabled: input.autoRemindEnabled !== false,
      },
      include: { client: true },
    })
    
    return {
      ...debt,
      remainingAmount: debt.amount - debt.paidAmount,
      daysOverdue: 0,
    }
  },
  
  async updateDebt(_: unknown, { id, input }: { id: string; input: Record<string, unknown> }, context: GraphQLContext | null) {
    const ctx = requireAuth(context)
    requireScopeAccess(ctx, 'debts:write')
    
    const existing = await db.debt.findFirst({
      where: { id, profileId: ctx.apiKey.profileId },
    })
    
    if (!existing) return null
    
    const debt = await db.debt.update({
      where: { id },
      data: {
        reference: input.reference as string | undefined,
        description: input.description as string | undefined,
        amount: input.amount as number | undefined,
        currency: input.currency as string | undefined,
        dueDate: input.dueDate ? new Date(input.dueDate as string) : undefined,
        status: input.status as string | undefined,
        paidAmount: input.paidAmount as number | undefined,
        paidDate: input.paidDate ? new Date(input.paidDate as string) : null,
        autoRemindEnabled: input.autoRemindEnabled as boolean | undefined,
      },
      include: { client: true },
    })
    
    return {
      ...debt,
      remainingAmount: debt.amount - debt.paidAmount,
      daysOverdue: calculateDaysOverdue(debt.dueDate, debt.status),
    }
  },
  
  async deleteDebt(_: unknown, { id }: { id: string }, context: GraphQLContext | null) {
    const ctx = requireAuth(context)
    requireScopeAccess(ctx, 'debts:write')
    
    const existing = await db.debt.findFirst({
      where: { id, profileId: ctx.apiKey.profileId },
    })
    
    if (!existing) return false
    
    await db.debt.delete({ where: { id } })
    return true
  },
  
  // Reminder mutation
  async createReminder(_: unknown, { input }: { input: { debtId: string; type: string; subject?: string; message?: string; tone?: string } }, context: GraphQLContext | null) {
    const ctx = requireAuth(context)
    requireScopeAccess(ctx, 'reminders:write')
    
    const debt = await db.debt.findFirst({
      where: { id: input.debtId, profileId: ctx.apiKey.profileId },
      include: { client: true },
    })
    
    if (!debt) {
      throw new Error('Debt not found')
    }
    
    const reminder = await db.reminder.create({
      data: {
        debtId: debt.id,
        clientId: debt.clientId,
        profileId: ctx.apiKey.profileId,
        type: input.type,
        subject: input.subject,
        message: input.message,
        tone: input.tone || 'formal',
        status: 'pending',
      },
      include: { client: true, debt: true },
    })
    
    try {
      if (input.type === 'email' && debt.client.email) {
        await sendEmail({
          to: debt.client.email,
          subject: reminder.subject || `Reminder - Invoice ${debt.reference || debt.id}`,
          html: `<p>${reminder.message || 'Payment reminder'}</p>`,
          profileId: ctx.apiKey.profileId,
        })
      } else if (input.type === 'whatsapp' && debt.client.phone) {
        await sendWhatsApp({
          to: debt.client.phone,
          message: reminder.message || 'Payment reminder',
          profileId: ctx.apiKey.profileId,
        })
      }
      
      await db.reminder.update({
        where: { id: reminder.id },
        data: { status: 'sent', sentAt: new Date() },
      })
      
      await db.debt.update({
        where: { id: debt.id },
        data: {
          reminderCount: { increment: 1 },
          lastReminderAt: new Date(),
        },
      })
      
    } catch (error) {
      await db.reminder.update({
        where: { id: reminder.id },
        data: { status: 'failed', error: String(error) },
      })
    }
    
    return db.reminder.findUnique({
      where: { id: reminder.id },
      include: { client: true, debt: true },
    })
  },
  
  // Webhook mutations
  async createWebhook(_: unknown, { input }: { input: { name: string; url: string; events: string[]; active?: boolean } }, context: GraphQLContext | null) {
    const ctx = requireAuth(context)
    requireScopeAccess(ctx, 'webhooks:manage')
    
    const crypto = await import('crypto')
    const secret = crypto.randomBytes(32).toString('hex')
    
    const webhook = await db.webhook.create({
      data: {
        profileId: ctx.apiKey.profileId,
        name: input.name,
        url: input.url,
        secret,
        events: JSON.stringify(input.events),
        active: input.active !== false,
      },
    })
    
    return {
      ...webhook,
      events: JSON.parse(webhook.events),
    }
  },
  
  async deleteWebhook(_: unknown, { id }: { id: string }, context: GraphQLContext | null) {
    const ctx = requireAuth(context)
    requireScopeAccess(ctx, 'webhooks:manage')
    
    const existing = await db.webhook.findFirst({
      where: { id, profileId: ctx.apiKey.profileId },
    })
    
    if (!existing) return false
    
    await db.webhook.delete({ where: { id } })
    return true
  },
  
  // API Key mutations
  async createApiKey(
    _: unknown,
    { name, scopes, rateLimit, expiresAt }: { name: string; scopes: string[]; rateLimit?: number; expiresAt?: string },
    context: GraphQLContext | null
  ) {
    const ctx = requireAuth(context)
    
    const result = await createApiKey(
      ctx.apiKey.profileId,
      name,
      scopes as ApiScope[],
      rateLimit || 100,
      expiresAt ? new Date(expiresAt) : undefined
    )
    
    return {
      id: result.id,
      name,
      key: result.key,
      keyPrefix: result.keyPrefix,
      scopes,
      rateLimit: rateLimit || 100,
      expiresAt,
      createdAt: new Date().toISOString(),
    }
  },
  
  async revokeApiKey(_: unknown, { id }: { id: string }, context: GraphQLContext | null) {
    const ctx = requireAuth(context)
    return revokeApiKey(id, ctx.apiKey.profileId)
  },
}

// =====================================================
// Field Resolvers
// =====================================================

export const fieldResolvers = {
  Client: {
    async debts(parent: { id: string }, { limit, offset, status }: { limit?: number; offset?: number; status?: string }, context: GraphQLContext | null) {
      const ctx = requireAuth(context)
      requireScopeAccess(ctx, 'debts:read')
      
      return db.debt.findMany({
        where: {
          clientId: parent.id,
          profileId: ctx.apiKey.profileId,
          status,
        },
        take: limit || 10,
        skip: offset || 0,
        orderBy: { createdAt: 'desc' },
      })
    },
    
    async reminders(parent: { id: string }, { limit, offset }: { limit?: number; offset?: number }, context: GraphQLContext | null) {
      const ctx = requireAuth(context)
      requireScopeAccess(ctx, 'reminders:read')
      
      return db.reminder.findMany({
        where: {
          clientId: parent.id,
          profileId: ctx.apiKey.profileId,
        },
        take: limit || 10,
        skip: offset || 0,
        orderBy: { createdAt: 'desc' },
      })
    },
  },
  
  Debt: {
    async reminders(parent: { id: string }, { limit, offset }: { limit?: number; offset?: number }, context: GraphQLContext | null) {
      const ctx = requireAuth(context)
      requireScopeAccess(ctx, 'reminders:read')
      
      return db.reminder.findMany({
        where: {
          debtId: parent.id,
          profileId: ctx.apiKey.profileId,
        },
        take: limit || 10,
        skip: offset || 0,
        orderBy: { createdAt: 'desc' },
      })
    },
  },
}

// Export combined resolvers
export const resolvers = {
  Query: queryResolvers,
  Mutation: mutationResolvers,
  ...fieldResolvers,
}

export default resolvers
