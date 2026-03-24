// Email service

export async function sendEmail(to: string, subject: string, body: string): Promise<{ success: boolean }> {
  console.log(`Sending email to ${to}: ${subject}`)
  return { success: true }
}
