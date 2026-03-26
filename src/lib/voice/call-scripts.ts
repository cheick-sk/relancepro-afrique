export const IVR_MENUS = {
  main: {
    greeting: 'Bienvenue chez RelancePro Afrique.',
    options: [
      { key: '1', label: 'Pour payer votre facture', action: 'payment' },
      { key: '2', label: 'Pour parler à un conseiller', action: 'support' },
      { key: '3', label: 'Pour écouter votre solde', action: 'balance' },
    ],
  },
  payment: {
    greeting: 'Vous avez choisi de payer votre facture.',
    options: [],
  },
};

export function generateIVRTwiML(menuId: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>${IVR_MENUS.main.greeting}</Say>
  <Gather numDigits="1">
    ${IVR_MENUS.main.options.map(opt => `<Say>Appuyez sur ${opt.key} ${opt.label}</Say>`).join('\n    ')}
  </Gather>
</Response>`;
}

export function generateVoiceScript(type: string, data: Record<string, string>): string {
  return `Bonjour ${data.clientName || ''}, nous vous appelons concernant votre facture.`;
}
