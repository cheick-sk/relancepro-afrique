export const resolvers = {
  Query: {
    clients: () => [],
    client: () => null,
    debts: () => [],
    debt: () => null,
    reminders: () => [],
  },
};

export function createContext({ req }: { req: unknown }): { userId?: string } {
  return {};
}
