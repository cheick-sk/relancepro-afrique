export const config = {
  appName: "RelancePro Afrique",
  defaultCurrency: "GNF",
  currencies: ["GNF", "XOF", "XAF", "USD", "EUR"],
  pricing: {
    starter: { price: 50000, clients: 10, whatsapp: 50 },
    business: { price: 150000, clients: 100, whatsapp: 500 },
    enterprise: { price: 500000, clients: -1, whatsapp: -1 },
  },
  supportedCountries: [
    { code: "GN", name: "Guinée", phoneCode: "+224", currency: "GNF" },
    { code: "CI", name: "Côte d'Ivoire", phoneCode: "+225", currency: "XOF" },
    { code: "SN", name: "Sénégal", phoneCode: "+221", currency: "XOF" },
    { code: "ML", name: "Mali", phoneCode: "+223", currency: "XOF" },
    { code: "BF", name: "Burkina Faso", phoneCode: "+226", currency: "XOF" },
    { code: "CM", name: "Cameroun", phoneCode: "+237", currency: "XAF" },
  ],
};

export function formatCurrencyAmount(amount: number, currency: string = "GNF"): string {
  return new Intl.NumberFormat("fr-GN", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 0,
  }).format(amount);
}

export function getFormattedPrice(priceInFG: number): string {
  return formatCurrencyAmount(priceInFG, "GNF");
}

export function getDefaultCurrency(): string {
  return config.defaultCurrency;
}
