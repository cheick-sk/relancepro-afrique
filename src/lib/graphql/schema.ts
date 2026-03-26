export const typeDefs = `
  type Query {
    clients: [Client]
    client(id: ID!): Client
    debts: [Debt]
    debt(id: ID!): Debt
    reminders: [Reminder]
  }

  type Client {
    id: ID!
    name: String!
    email: String!
    phone: String
    status: String
    createdAt: String
  }

  type Debt {
    id: ID!
    amount: Float!
    clientId: String!
    status: String
    dueDate: String
    createdAt: String
  }

  type Reminder {
    id: ID!
    type: String!
    clientId: String!
    sentAt: String
    status: String
  }
`;
