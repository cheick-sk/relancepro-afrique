/**
 * GraphQL Schema for RelancePro Africa API
 * Type definitions for Client, Debt, Reminder, and related types
 */

// GraphQL schema as a string (for graphql.js or similar libraries)
export const typeDefs = `#graphql
  # =====================================================
  # Enums
  # =====================================================
  
  enum ClientStatus {
    active
    inactive
    blacklisted
  }
  
  enum RiskLevel {
    low
    medium
    high
  }
  
  enum DebtStatus {
    pending
    paid
    partial
    disputed
    cancelled
  }
  
  enum ReminderType {
    email
    whatsapp
  }
  
  enum ReminderStatus {
    pending
    sent
    failed
    delivered
    opened
  }
  
  enum ReminderTone {
    formal
    friendly
    urgent
  }
  
  # =====================================================
  # Types
  # =====================================================
  
  type Client {
    id: ID!
    name: String!
    email: String
    phone: String
    company: String
    address: String
    notes: String
    riskScore: Int
    riskLevel: RiskLevel
    status: ClientStatus!
    debtsCount: Int!
    totalDebt: Float!
    totalPaid: Float!
    createdAt: String!
    updatedAt: String!
    
    # Relations
    debts(limit: Int, offset: Int, status: DebtStatus): [Debt!]!
    reminders(limit: Int, offset: Int): [Reminder!]!
  }
  
  type Debt {
    id: ID!
    reference: String
    description: String
    amount: Float!
    currency: String!
    paidAmount: Float!
    remainingAmount: Float!
    status: DebtStatus!
    issueDate: String
    dueDate: String!
    paidDate: String
    daysOverdue: Int!
    autoRemindEnabled: Boolean!
    reminderCount: Int!
    lastReminderAt: String
    nextReminderAt: String
    paymentProbability: Float
    predictedPayDate: String
    createdAt: String!
    updatedAt: String!
    
    # Relations
    client: Client!
    reminders(limit: Int, offset: Int): [Reminder!]!
  }
  
  type Reminder {
    id: ID!
    type: ReminderType!
    subject: String
    message: String!
    tone: ReminderTone
    status: ReminderStatus!
    error: String
    sentAt: String
    deliveredAt: String
    openedAt: String
    responseReceived: Boolean!
    responseMessage: String
    respondedAt: String
    createdAt: String!
    
    # Relations
    client: Client!
    debt: Debt!
  }
  
  type Webhook {
    id: ID!
    name: String!
    url: String!
    events: [String!]!
    active: Boolean!
    lastTriggeredAt: String
    successCount: Int!
    failureCount: Int!
    createdAt: String!
    updatedAt: String!
  }
  
  type ApiKey {
    id: ID!
    name: String!
    keyPrefix: String!
    scopes: [String!]!
    rateLimit: Int!
    lastUsedAt: String
    usageCount: Int!
    active: Boolean!
    expiresAt: String
    createdAt: String!
  }
  
  type AnalyticsSummary {
    period: DateRange!
    clients: ClientStats!
    debts: DebtStats!
    reminders: ReminderStats!
    topDebtors: [TopDebtor!]!
  }
  
  type DateRange {
    startDate: String!
    endDate: String!
  }
  
  type ClientStats {
    total: Int!
    active: Int!
    new: Int!
  }
  
  type DebtStats {
    total: Int!
    pending: Int!
    paid: Int!
    partial: Int!
    overdue: Int!
    totalAmount: Float!
    paidAmount: Float!
    remainingAmount: Float!
    recoveryRate: Float!
  }
  
  type ReminderStats {
    total: Int!
    email: Int!
    whatsapp: Int!
    sent: Int!
    delivered: Int!
    failed: Int!
    deliveryRate: Float!
  }
  
  type TopDebtor {
    id: ID!
    name: String!
    company: String
    totalDebt: Float!
    totalPaid: Float!
    debtsCount: Int!
  }
  
  type PaginatedClients {
    items: [Client!]!
    total: Int!
    page: Int!
    perPage: Int!
    totalPages: Int!
    hasMore: Boolean!
  }
  
  type PaginatedDebts {
    items: [Debt!]!
    total: Int!
    page: Int!
    perPage: Int!
    totalPages: Int!
    hasMore: Boolean!
  }
  
  type PaginatedReminders {
    items: [Reminder!]!
    total: Int!
    page: Int!
    perPage: Int!
    totalPages: Int!
    hasMore: Boolean!
  }
  
  # =====================================================
  # Inputs
  # =====================================================
  
  input CreateClientInput {
    name: String!
    email: String
    phone: String
    company: String
    address: String
    notes: String
  }
  
  input UpdateClientInput {
    name: String
    email: String
    phone: String
    company: String
    address: String
    notes: String
    status: ClientStatus
  }
  
  input CreateDebtInput {
    clientId: ID!
    reference: String
    description: String
    amount: Float!
    currency: String
    dueDate: String!
    issueDate: String
    autoRemindEnabled: Boolean
  }
  
  input UpdateDebtInput {
    reference: String
    description: String
    amount: Float
    currency: String
    dueDate: String
    issueDate: String
    status: DebtStatus
    paidAmount: Float
    paidDate: String
    autoRemindEnabled: Boolean
  }
  
  input CreateReminderInput {
    debtId: ID!
    type: ReminderType!
    subject: String
    message: String
    tone: ReminderTone
  }
  
  input CreateWebhookInput {
    name: String!
    url: String!
    events: [String!]!
    active: Boolean
  }
  
  input ClientFilterInput {
    status: ClientStatus
    riskLevel: RiskLevel
    search: String
  }
  
  input DebtFilterInput {
    status: DebtStatus
    clientId: ID
    currency: String
    overdue: Boolean
  }
  
  input ReminderFilterInput {
    status: ReminderStatus
    type: ReminderType
    clientId: ID
    debtId: ID
  }
  
  input PaginationInput {
    page: Int = 1
    perPage: Int = 20
  }
  
  input DateRangeInput {
    startDate: String
    endDate: String
  }
  
  # =====================================================
  # Queries
  # =====================================================
  
  type Query {
    # Client queries
    client(id: ID!): Client
    clients(
      filter: ClientFilterInput
      pagination: PaginationInput
    ): PaginatedClients!
    
    # Debt queries
    debt(id: ID!): Debt
    debts(
      filter: DebtFilterInput
      pagination: PaginationInput
    ): PaginatedDebts!
    
    # Reminder queries
    reminder(id: ID!): Reminder
    reminders(
      filter: ReminderFilterInput
      pagination: PaginationInput
    ): PaginatedReminders!
    
    # Webhook queries
    webhooks(pagination: PaginationInput): [Webhook!]!
    webhook(id: ID!): Webhook
    
    # Analytics
    analytics(dateRange: DateRangeInput): AnalyticsSummary!
    
    # API Keys
    apiKeys: [ApiKey!]!
    apiKey(id: ID!): ApiKey
  }
  
  # =====================================================
  # Mutations
  # =====================================================
  
  type Mutation {
    # Client mutations
    createClient(input: CreateClientInput!): Client!
    updateClient(id: ID!, input: UpdateClientInput!): Client
    deleteClient(id: ID!): Boolean!
    
    # Debt mutations
    createDebt(input: CreateDebtInput!): Debt!
    updateDebt(id: ID!, input: UpdateDebtInput!): Debt
    deleteDebt(id: ID!): Boolean!
    
    # Reminder mutations
    createReminder(input: CreateReminderInput!): Reminder!
    
    # Webhook mutations
    createWebhook(input: CreateWebhookInput!): Webhook!
    deleteWebhook(id: ID!): Boolean!
    
    # API Key mutations
    createApiKey(
      name: String!
      scopes: [String!]!
      rateLimit: Int
      expiresAt: String
    ): ApiKeyWithSecret!
    revokeApiKey(id: ID!): Boolean!
  }
  
  # Special type that includes the secret (only returned on creation)
  type ApiKeyWithSecret {
    id: ID!
    name: String!
    key: String!
    keyPrefix: String!
    scopes: [String!]!
    rateLimit: Int!
    expiresAt: String
    createdAt: String!
  }
`

export default typeDefs
