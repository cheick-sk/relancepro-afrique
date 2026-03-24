// WhatsApp service

export async function sendReminder(phone: string, message: string): Promise<{ success: boolean }> {
  console.log(`Sending WhatsApp to ${phone}: ${message}`)
  return { success: true }
}

export function sendWhatsApp(to: string, message: string): Promise<{ success: boolean }> {
  return sendReminder(to, message)
}

export function sendCustomWhatsAppMessage(phone: string, message: string): Promise<{ success: boolean }> {
  return sendReminder(phone, message)
}
