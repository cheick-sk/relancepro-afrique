// Behavioral analysis for AI-powered features

interface PaymentPattern {
  averageDelay: number
  preferredChannel: "email" | "sms" | "whatsapp"
  preferredTime: string
  reliabilityScore: number
}

interface ClientBehavior {
  paymentPatterns: PaymentPattern
  communicationPreferences: {
    bestChannel: string
    bestTime: string
    responseRate: number
  }
}

export function analyzePaymentPatterns(paymentHistory: any[]): PaymentPattern {
  // Simple implementation
  const delays = paymentHistory.map(p => p.delay || 0)
  const averageDelay = delays.length > 0 
    ? delays.reduce((a, b) => a + b, 0) / delays.length 
    : 0
  
  return {
    averageDelay,
    preferredChannel: "email",
    preferredTime: "09:00",
    reliabilityScore: Math.max(0, 100 - averageDelay * 2),
  }
}

export function detectAnomalies(currentBehavior: ClientBehavior, historicalData: any[]): string[] {
  const anomalies: string[] = []
  
  // Simple anomaly detection
  if (currentBehavior.paymentPatterns.averageDelay > 30) {
    anomalies.push("Délai de paiement anormalement élevé")
  }
  
  return anomalies
}

export function getOptimalReminderTime(clientId: string): string {
  // Default to business hours
  return "09:00"
}

export function getPreferredChannel(clientId: string): "email" | "sms" | "whatsapp" {
  return "email"
}
