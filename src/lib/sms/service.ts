// SMS service utilities

export function validateAfricanPhone(phone: string): boolean {
  // Basic validation - check if it starts with + and has valid length
  const cleaned = phone.replace(/[\s-]/g, "")
  return /^\+?(221|225|223|226|229|228|227|224|237|234|233|254|27|212|216|213|20)\d{7,12}$/.test(cleaned)
}

export function estimateSMSCost(message: string): number {
  const length = message.length
  const hasUnicode = /[^\x00-\x7F]/.test(message)
  
  // SMS segments
  const segmentSize = hasUnicode ? 70 : 160
  const segments = Math.ceil(length / segmentSize)
  
  // Cost per segment in XOF
  return segments * 25
}

export function selectBestProvider(): "twilio" | "africastalking" {
  return "africastalking"
}

export async function sendSMS(to: string, message: string): Promise<{ success: boolean; messageId?: string }> {
  // Placeholder implementation
  return { success: true, messageId: `msg_${Date.now()}` }
}

export async function sendBulkSMS(phones: string[], message: string): Promise<{ success: number; failed: number }> {
  return { success: phones.length, failed: 0 }
}

export async function sendVoiceCall(to: string, message: string): Promise<{ success: boolean; callId?: string }> {
  return { success: true, callId: `call_${Date.now()}` }
}

export function estimateVoiceCost(message: string): number {
  // Estimate based on message length
  const duration = Math.ceil(message.length / 15) // ~15 chars per second
  return duration * 50 // 50 XOF per second
}

export function generateVoiceScript(debtorName: string, amount: string, dueDate: string): string {
  return `Bonjour ${debtorName}, nous vous rappelons que votre facture de ${amount} échéant le ${dueDate} est en attente de paiement. Merci de régulariser votre situation dans les meilleurs délais.`
}

export async function getAllBalances(): Promise<{ twilio?: number; africastalking?: number }> {
  return { twilio: 0, africastalking: 0 }
}
