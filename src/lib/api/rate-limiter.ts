export function getApiUsageStats(keyId: string): {
  totalRequests: number;
  requestsToday: number;
  averageResponseTime: number;
} {
  return {
    totalRequests: 0,
    requestsToday: 0,
    averageResponseTime: 0,
  };
}
