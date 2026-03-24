// Voice call scripts

export const IVR_MENUS = {
  main: {
    greeting: "Bienvenue chez RelancePro Africa",
    options: [
      { key: "1", label: "Payer maintenant" },
      { key: "2", label: "Demander un délai" },
      { key: "3", label: "Parler à un agent" },
    ],
  },
}

export function generateIVRTwiML(menu: keyof typeof IVR_MENUS): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather numDigits="1">
    <Say>${IVR_MENUS[menu].greeting}</Say>
    ${IVR_MENUS[menu].options.map(o => `<Say>Appuyez sur ${o.key} pour ${o.label}</Say>`).join("\n")}
  </Gather>
</Response>`
}
