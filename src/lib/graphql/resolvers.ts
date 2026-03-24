// GraphQL resolvers

import { db } from "@/lib/db"

export const resolvers = {
  Query: {
    me: async (_: any, __: any, context: any) => {
      return context.user
    },
    clients: async (_: any, __: any, context: any) => {
      return db.client.findMany({ where: { userId: context.user.id } })
    },
    debts: async (_: any, __: any, context: any) => {
      return db.debt.findMany({ where: { userId: context.user.id }, include: { client: true } })
    },
  },
}

export function createContext({ req }: { req: any }) {
  return { user: null }
}
