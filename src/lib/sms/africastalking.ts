// AfricasTalking SMS integration

export function handleWebhook(body: any): { success: boolean } {
  return { success: true }
}

export function handleVoiceWebhook(body: any): { response: string } {
  return { response: "" }
}
