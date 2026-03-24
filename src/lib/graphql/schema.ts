// GraphQL schema

import { gql } from "graphql-tag"

export const typeDefs = gql`
  type User {
    id: ID!
    email: String!
    name: String
    createdAt: String!
  }

  type Client {
    id: ID!
    name: String!
    email: String!
    phone: String
    createdAt: String!
  }

  type Debt {
    id: ID!
    amount: Float!
    status: String!
    dueDate: String!
    client: Client
  }

  type Query {
    me: User
    clients: [Client!]!
    debts: [Debt!]!
  }
`
