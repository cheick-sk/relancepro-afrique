export async function processAutomaticReminders(): Promise<{ processed: number; errors: number }> {
  console.log('Processing automatic reminders');
  return { processed: 0, errors: 0 };
}

export async function processDueReminders(): Promise<{ processed: number; failed: number }> {
  console.log('Processing due reminders');
  return { processed: 0, failed: 0 };
}
