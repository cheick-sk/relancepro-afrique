// Service IA pour automatisation des relances, support, onboarding
// Utilise z-ai-web-dev-sdk pour les fonctionnalités IA

import ZAI from 'z-ai-web-dev-sdk';
import { Debt, Client, Profile } from "@/types";
import { formatCurrencyAmount, getDefaultCurrency } from "@/lib/config";

// =====================================================
// TYPES
// =====================================================

interface AIContext {
  profile: Profile;
  client?: Client;
  debt?: Debt;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
  language?: 'fr' | 'en';
}

interface AIResponse {
  message: string;
  action?: {
    type: "send_reminder" | "schedule_reminder" | "update_client" | "create_debt";
    data?: Record<string, unknown>;
  };
  suggestions?: string[];
}

interface ReminderResult {
  subject: string;
  message: string;
  tone: "formal" | "friendly" | "urgent";
  whatsappMessage?: string;
}

interface PaymentPrediction {
  probability: number; // 0-100
  confidence: "low" | "medium" | "high";
  factors: string[];
  recommendation: string;
  predictedDate?: string;
}

interface RiskAnalysis {
  riskLevel: "low" | "medium" | "high" | "critical";
  score: number; // 0-100
  factors: string[];
  insights: string[];
  recommendations: string[];
}

interface ActionSuggestion {
  priority: "high" | "medium" | "low";
  action: string;
  reason: string;
  expectedOutcome: string;
  debtId?: string;
  clientId?: string;
}

// =====================================================
// ZAI INSTANCE HELPER
// =====================================================

let zaiInstance: Awaited<ReturnType<typeof ZAI.create>> | null = null;

async function getZAI() {
  if (!zaiInstance) {
    zaiInstance = await ZAI.create();
  }
  return zaiInstance;
}

// =====================================================
// SYSTEM PROMPTS
// =====================================================

const AI_SYSTEM_PROMPT_FR = `Tu es l'assistant IA de RelancePro Africa, une plateforme de gestion des créances et relances clients en Afrique.

Tes responsabilités:
1. RELANCES AUTOMATIQUES: Générer des messages de relance professionnels et adaptés au contexte africain
2. SUPPORT CLIENT: Répondre aux questions des utilisateurs sur l'utilisation de la plateforme
3. ONBOARDING: Guider les nouveaux utilisateurs
4. ANALYSE: Prédire les probabilités de paiement et analyser les risques

Règles:
- Toujours répondre en français (ou anglais si demandé)
- Être professionnel mais chaleureux
- Adapter le ton selon le type de client (formel pour entreprises, décontracté pour petits commerçants)
- Proposer des solutions pratiques
- Respecter les délais légaux et coutumes locales
- Contexte: Afrique de l'Ouest, Franc Guinéen (GNF) comme devise par défaut

Quand tu génères des messages de relance:
- Pour les entreprises: utilise un ton formel et professionnel
- Pour les particuliers/petits commerçants: utilise un ton amical et chaleureux
- Pour les cas urgents (retard > 30 jours): utilise un ton ferme mais respectueux`;

const AI_SYSTEM_PROMPT_EN = `You are the AI assistant for RelancePro Africa, a debt collection and client reminder platform in Africa.

Your responsibilities:
1. AUTOMATIC REMINDERS: Generate professional reminder messages adapted to the African context
2. CUSTOMER SUPPORT: Answer user questions about using the platform
3. ONBOARDING: Guide new users
4. ANALYSIS: Predict payment probabilities and analyze risks

Rules:
- Always respond in English (or French if requested)
- Be professional but warm
- Adapt the tone according to the client type (formal for companies, casual for small merchants)
- Propose practical solutions
- Respect legal deadlines and local customs
- Context: West Africa, Guinean Franc (GNF) as default currency

When generating reminder messages:
- For companies: use a formal and professional tone
- For individuals/small merchants: use a friendly and warm tone
- For urgent cases (overdue > 30 days): use a firm but respectful tone`;

// =====================================================
// GENERATE AI REMINDER
// =====================================================

export async function generateAIReminder(
  client: Client,
  debt: Debt,
  reminderNumber: 1 | 2 | 3,
  tone?: "formal" | "friendly" | "urgent",
  language: 'fr' | 'en' = 'fr'
): Promise<ReminderResult> {
  const zai = await getZAI();
  
  const daysOverdue = Math.ceil(
    (Date.now() - new Date(debt.dueDate).getTime()) / (1000 * 60 * 60 * 24)
  );
  
  const amount = formatCurrencyAmount(debt.amount - debt.paidAmount, debt.currency || getDefaultCurrency());
  const totalAmount = formatCurrencyAmount(debt.amount, debt.currency || getDefaultCurrency());
  const paidAmount = debt.paidAmount > 0 ? formatCurrencyAmount(debt.paidAmount, debt.currency || getDefaultCurrency()) : null;
  const dueDate = new Date(debt.dueDate).toLocaleDateString(language === 'fr' ? "fr-FR" : "en-US");
  
  // Determine optimal tone
  let selectedTone = tone;
  if (!selectedTone) {
    if (client.company) {
      selectedTone = "formal";
    } else {
      selectedTone = "friendly";
    }
    if (daysOverdue > 30 || reminderNumber === 3) {
      selectedTone = "urgent";
    }
  }

  const systemPrompt = language === 'fr' ? AI_SYSTEM_PROMPT_FR : AI_SYSTEM_PROMPT_EN;
  
  const prompt = language === 'fr' 
    ? `Génère un message de relance ${reminderNumber === 1 ? 'première' : reminderNumber === 2 ? 'deuxième' : 'troisième et dernière'} pour:

CLIENT: ${client.name}
${client.company ? `ENTREPRISE: ${client.company}` : ''}
EMAIL: ${client.email || 'Non fourni'}
TÉLÉPHONE: ${client.phone || 'Non fourni'}

CRÉANCE:
- Référence: ${debt.reference || 'N/A'}
- Montant total: ${totalAmount}
- Montant dû: ${amount}
${paidAmount ? `- Déjà payé: ${paidAmount}` : ''}
- Date d'échéance: ${dueDate}
- Jours de retard: ${daysOverdue}

TON REQUIS: ${selectedTone === 'formal' ? 'Formel et professionnel' : selectedTone === 'friendly' ? 'Amical et chaleureux' : 'Urgent et ferme'}

Génère:
1. Un sujet d'email professionnel
2. Un message email complet
3. Une version WhatsApp plus courte et directe

Réponds en JSON avec la structure:
{
  "subject": "Sujet de l'email",
  "message": "Message email complet",
  "whatsappMessage": "Message WhatsApp court",
  "tone": "${selectedTone}"
}`
    : `Generate a ${reminderNumber === 1 ? 'first' : reminderNumber === 2 ? 'second' : 'third and final'} reminder message for:

CLIENT: ${client.name}
${client.company ? `COMPANY: ${client.company}` : ''}
EMAIL: ${client.email || 'Not provided'}
PHONE: ${client.phone || 'Not provided'}

DEBT:
- Reference: ${debt.reference || 'N/A'}
- Total amount: ${totalAmount}
- Amount due: ${amount}
${paidAmount ? `- Already paid: ${paidAmount}` : ''}
- Due date: ${dueDate}
- Days overdue: ${daysOverdue}

REQUIRED TONE: ${selectedTone === 'formal' ? 'Formal and professional' : selectedTone === 'friendly' ? 'Friendly and warm' : 'Urgent and firm'}

Generate:
1. A professional email subject
2. A complete email message
3. A shorter, direct WhatsApp version

Respond in JSON with the structure:
{
  "subject": "Email subject",
  "message": "Complete email message",
  "whatsappMessage": "Short WhatsApp message",
  "tone": "${selectedTone}"
}`;

  try {
    const completion = await zai.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 1000
    });

    const response = completion.choices[0]?.message?.content;
    
    if (response) {
      // Try to parse JSON response
      try {
        // Extract JSON from the response (handle markdown code blocks)
        let jsonStr = response;
        const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
          jsonStr = jsonMatch[1];
        }
        
        const parsed = JSON.parse(jsonStr.trim());
        return {
          subject: parsed.subject || `Relance - ${debt.reference || 'Créance'}`,
          message: parsed.message,
          tone: selectedTone,
          whatsappMessage: parsed.whatsappMessage
        };
      } catch {
        // If JSON parsing fails, use the response as the message
        return {
          subject: `Relance - ${debt.reference || 'Créance'}`,
          message: response,
          tone: selectedTone
        };
      }
    }
  } catch (error) {
    console.error("AI reminder generation error:", error);
  }

  // Fallback to template-based generation
  return generateFallbackReminder(client, debt, reminderNumber, selectedTone, language);
}

// =====================================================
// FALLBACK REMINDER TEMPLATES
// =====================================================

function generateFallbackReminder(
  client: Client,
  debt: Debt,
  reminderNumber: 1 | 2 | 3,
  tone: "formal" | "friendly" | "urgent",
  language: 'fr' | 'en'
): ReminderResult {
  const daysOverdue = Math.ceil(
    (Date.now() - new Date(debt.dueDate).getTime()) / (1000 * 60 * 60 * 24)
  );
  
  const amount = formatCurrencyAmount(debt.amount - debt.paidAmount, debt.currency || getDefaultCurrency());
  const dueDate = new Date(debt.dueDate).toLocaleDateString(language === 'fr' ? "fr-FR" : "en-US");

  const templates: Record<number, Record<string, ReminderResult>> = {
    1: {
      formal: {
        subject: language === 'fr' 
          ? `Rappel de facture ${debt.reference || ""} - ${amount}`
          : `Invoice Reminder ${debt.reference || ""} - ${amount}`,
        message: language === 'fr'
          ? `Cher(e) ${client.name},\n\nNous espérons que vous allez bien.\n\nNous vous rappelons que la facture ${debt.reference || `référence ${debt.id.slice(0, 6)}`} d'un montant de ${amount}, dont l'échéance était le ${dueDate}, n'a pas encore été réglée.\n\nNous vous prions de bien vouloir régulariser cette situation dans les meilleurs délais.\n\nPour toute question, n'hésitez pas à nous contacter.\n\nCordialement,\nL'équipe RelancePro Africa`
          : `Dear ${client.name},\n\nWe hope this message finds you well.\n\nWe would like to remind you that invoice ${debt.reference || `reference ${debt.id.slice(0, 6)}`} for the amount of ${amount}, due on ${dueDate}, has not yet been paid.\n\nPlease settle this matter at your earliest convenience.\n\nFor any questions, please do not hesitate to contact us.\n\nBest regards,\nThe RelancePro Africa Team`,
        tone: "formal"
      },
      friendly: {
        subject: language === 'fr' ? `Petit rappel amical 💛` : `Friendly reminder 💛`,
        message: language === 'fr'
          ? `Bonjour ${client.name} !\n\nJ'espère que tout va bien de votre côté !\n\nJe me permets de vous rappeler que la facture ${debt.reference || ""} de ${amount} arrive à échéance.\n\nN'hésitez pas si vous avez des questions !\n\nBonne journée 🌞`
          : `Hello ${client.name}!\n\nHope everything is going well on your end!\n\nJust a friendly reminder about invoice ${debt.reference || ""} for ${amount} that is now due.\n\nFeel free to reach out if you have any questions!\n\nHave a great day 🌞`,
        tone: "friendly"
      },
      urgent: {
        subject: language === 'fr' 
          ? `⚠️ RAPPEL URGENT - Facture ${debt.reference || ""}`
          : `⚠️ URGENT REMINDER - Invoice ${debt.reference || ""}`,
        message: language === 'fr'
          ? `${client.name},\n\nCette facture de ${amount} est en retard de ${daysOverdue} jours.\n\nMerci de régulariser votre situation dans les plus brefs délais.\n\nCordialement,\nRelancePro Africa`
          : `${client.name},\n\nThis invoice for ${amount} is ${daysOverdue} days overdue.\n\nPlease settle this matter as soon as possible.\n\nBest regards,\nRelancePro Africa`,
        tone: "urgent"
      }
    },
    2: {
      formal: {
        subject: language === 'fr'
          ? `DEUXIÈME RAPPEL - Facture ${debt.reference || ""} - ${amount}`
          : `SECOND REMINDER - Invoice ${debt.reference || ""} - ${amount}`,
        message: language === 'fr'
          ? `${client.name},\n\nMalgré notre précédent rappel, nous n'avons pas reçu le paiement de la facture ${debt.reference || ""} d'un montant de ${amount}.\n\nCette créance est en retard de ${daysOverdue} jours.\n\nNous vous prions de régulariser cette situation dans les 7 jours.\n\nCordialement,\nRelancePro Africa`
          : `${client.name},\n\nDespite our previous reminder, we have not received payment for invoice ${debt.reference || ""} in the amount of ${amount}.\n\nThis debt is ${daysOverdue} days overdue.\n\nPlease settle this within 7 days.\n\nBest regards,\nRelancePro Africa`,
        tone: "formal"
      },
      friendly: {
        subject: language === 'fr' ? `Deuxième petit rappel 📋` : `Second gentle reminder 📋`,
        message: language === 'fr'
          ? `Re-bonjour ${client.name} !\n\nJe reviens vers vous concernant la facture de ${amount}.\n\nLe paiement est maintenant en retard de ${daysOverdue} jours.\n\nSi vous rencontrez des difficultés, parlons-en !\n\nÀ bientôt,\nL'équipe RelancePro Africa 🌟`
          : `Hello again ${client.name}!\n\nFollowing up on the invoice for ${amount}.\n\nPayment is now ${daysOverdue} days overdue.\n\nIf you're having difficulties, let's talk about it!\n\nBest,\nThe RelancePro Africa Team 🌟`,
        tone: "friendly"
      },
      urgent: {
        subject: language === 'fr'
          ? `⚠️ 2ème RAPPEL URGENT - ${daysOverdue} jours de retard`
          : `⚠️ 2nd URGENT REMINDER - ${daysOverdue} days overdue`,
        message: language === 'fr'
          ? `${client.name},\n\nVotre facture de ${amount} a maintenant ${daysOverdue} jours de retard.\n\nMerci de régler dans les 48h ou de nous contacter pour un arrangement.\n\nRelancePro Africa`
          : `${client.name},\n\nYour invoice for ${amount} is now ${daysOverdue} days overdue.\n\nPlease settle within 48 hours or contact us to arrange a payment plan.\n\nRelancePro Africa`,
        tone: "urgent"
      }
    },
    3: {
      formal: {
        subject: language === 'fr'
          ? `DERNIER AVERTISSEMENT - Facture ${debt.reference || ""}`
          : `FINAL NOTICE - Invoice ${debt.reference || ""}`,
        message: language === 'fr'
          ? `${client.name},\n\nCONSTAT: Créance de ${amount} en retard de ${daysOverdue} jours\nRÉFÉRENCE: ${debt.reference || debt.id}\n\nC'est notre troisième et dernier rappel. Sans règlement sous 7 jours, le dossier sera transmis au recouvrement.\n\nPour éviter ces mesures, contactez-nous IMMÉDIATEMENT.\n\nCordialement,\nDirection des Recouvrements\nRelancePro Africa`
          : `${client.name},\n\nNOTICE: Debt of ${amount} is ${daysOverdue} days overdue\nREFERENCE: ${debt.reference || debt.id}\n\nThis is our third and final reminder. Without payment within 7 days, the file will be transferred to collections.\n\nTo avoid these measures, contact us IMMEDIATELY.\n\nBest regards,\nCollections Department\nRelancePro Africa`,
        tone: "formal"
      },
      friendly: {
        subject: language === 'fr' ? `🚨 Dernier rappel avant action` : `🚨 Final reminder before action`,
        message: language === 'fr'
          ? `${client.name},\n\nJe suis désolé d'en arriver là, mais la facture de ${amount} a maintenant ${daysOverdue} jours de retard.\n\nC'est mon dernier message avant de transmettre le dossier.\n\nSi vous avez un problème, appelez-moi directement !\n\nÀ vite,\nL'équipe RelancePro Africa`
          : `${client.name},\n\nI'm sorry it has come to this, but the invoice for ${amount} is now ${daysOverdue} days overdue.\n\nThis is my last message before transferring the file.\n\nIf you have a problem, call me directly!\n\nBest,\nThe RelancePro Africa Team`,
        tone: "friendly"
      },
      urgent: {
        subject: language === 'fr'
          ? `🚨 DERNIER AVERTISSEMENT - ACTION IMMÉDIATE REQUISE`
          : `🚨 FINAL WARNING - IMMEDIATE ACTION REQUIRED`,
        message: language === 'fr'
          ? `${client.name},\n\nMONTANT DÛ: ${amount}\nRETARD: ${daysOverdue} jours\n\nSANS PAIEMENT SOUS 48H:\n→ Transmission au recouvrement\n→ Frais supplémentaires\n→ Procédures légales\n\nAPPELEZ MAINTENANT!\n\nRelancePro Africa`
          : `${client.name},\n\nAMOUNT DUE: ${amount}\nOVERDUE: ${daysOverdue} days\n\nWITHOUT PAYMENT IN 48H:\n→ Transfer to collections\n→ Additional fees\n→ Legal proceedings\n\nCALL NOW!\n\nRelancePro Africa`,
        tone: "urgent"
      }
    }
  };

  return templates[reminderNumber][tone];
}

// =====================================================
// PREDICT PAYMENT PROBABILITY
// =====================================================

export async function predictPaymentProbability(
  debt: Debt,
  client: Client,
  language: 'fr' | 'en' = 'fr'
): Promise<PaymentPrediction> {
  const zai = await getZAI();
  
  const daysOverdue = Math.ceil(
    (Date.now() - new Date(debt.dueDate).getTime()) / (1000 * 60 * 60 * 24)
  );
  
  const amount = formatCurrencyAmount(debt.amount - debt.paidAmount, debt.currency || getDefaultCurrency());
  const paidPercentage = (debt.paidAmount / debt.amount) * 100;

  const systemPrompt = language === 'fr' ? AI_SYSTEM_PROMPT_FR : AI_SYSTEM_PROMPT_EN;
  
  const prompt = language === 'fr'
    ? `Analyse la probabilité de paiement pour cette créance et réponds en JSON:

CLIENT: ${client.name}
${client.company ? `ENTREPRISE: ${client.company}` : 'Particulier'}
STATUT CLIENT: ${client.status}
SCORE DE RISQUE: ${client.riskScore || 'Non calculé'}

CRÉANCE:
- Montant dû: ${amount}
- Jours de retard: ${daysOverdue}
- Relances envoyées: ${debt.reminderCount}
- Pourcentage payé: ${paidPercentage.toFixed(1)}%

Historique de paiement basé sur:
- Délai moyen de paiement dans la région: 15-30 jours
- Taux de recouvrement moyen Afrique: 65%
- Taux de réponse aux relances: ${debt.reminderCount > 0 ? '40%' : 'N/A'}

Réponds en JSON:
{
  "probability": <nombre 0-100>,
  "confidence": "low|medium|high",
  "factors": ["facteur1", "facteur2", ...],
  "recommendation": "recommandation détaillée",
  "predictedDate": "date estimée de paiement ou null"
}`
    : `Analyze the payment probability for this debt and respond in JSON:

CLIENT: ${client.name}
${client.company ? `COMPANY: ${client.company}` : 'Individual'}
CLIENT STATUS: ${client.status}
RISK SCORE: ${client.riskScore || 'Not calculated'}

DEBT:
- Amount due: ${amount}
- Days overdue: ${daysOverdue}
- Reminders sent: ${debt.reminderCount}
- Percentage paid: ${paidPercentage.toFixed(1)}%

Payment history based on:
- Average payment delay in the region: 15-30 days
- Average recovery rate in Africa: 65%
- Reminder response rate: ${debt.reminderCount > 0 ? '40%' : 'N/A'}

Respond in JSON:
{
  "probability": <number 0-100>,
  "confidence": "low|medium|high",
  "factors": ["factor1", "factor2", ...],
  "recommendation": "detailed recommendation",
  "predictedDate": "estimated payment date or null"
}`;

  try {
    const completion = await zai.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 500
    });

    const response = completion.choices[0]?.message?.content;
    
    if (response) {
      try {
        let jsonStr = response;
        const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
          jsonStr = jsonMatch[1];
        }
        
        const parsed = JSON.parse(jsonStr.trim());
        return {
          probability: Math.max(0, Math.min(100, parsed.probability || 50)),
          confidence: parsed.confidence || "medium",
          factors: parsed.factors || [],
          recommendation: parsed.recommendation || "",
          predictedDate: parsed.predictedDate
        };
      } catch {
        // Fall through to fallback
      }
    }
  } catch (error) {
    console.error("Payment prediction error:", error);
  }

  // Fallback calculation
  return calculateFallbackProbability(debt, client);
}

function calculateFallbackProbability(debt: Debt, client: Client): PaymentPrediction {
  let probability = 70; // Base probability
  const factors: string[] = [];
  
  const daysOverdue = Math.ceil(
    (Date.now() - new Date(debt.dueDate).getTime()) / (1000 * 60 * 60 * 24)
  );
  
  // Adjust based on days overdue
  if (daysOverdue > 60) {
    probability -= 30;
    factors.push("Retard supérieur à 60 jours");
  } else if (daysOverdue > 30) {
    probability -= 20;
    factors.push("Retard supérieur à 30 jours");
  } else if (daysOverdue > 14) {
    probability -= 10;
    factors.push("Retard supérieur à 14 jours");
  }
  
  // Adjust based on reminder count
  if (debt.reminderCount >= 3) {
    probability -= 20;
    factors.push("3 relances sans paiement complet");
  } else if (debt.reminderCount >= 2) {
    probability -= 10;
    factors.push("2 relances envoyées");
  }
  
  // Adjust based on partial payment
  const paidPercentage = (debt.paidAmount / debt.amount) * 100;
  if (paidPercentage > 50) {
    probability += 15;
    factors.push("Plus de 50% déjà payé");
  } else if (paidPercentage > 0) {
    probability += 10;
    factors.push("Paiement partiel effectué");
  }
  
  // Adjust based on client status
  if (client.status === "inactive") {
    probability -= 15;
    factors.push("Client inactif");
  } else if (client.status === "blacklisted") {
    probability -= 40;
    factors.push("Client sur liste noire");
  }
  
  // Adjust based on contact info
  if (!client.email && !client.phone) {
    probability -= 25;
    factors.push("Aucun moyen de contact");
  } else if (client.email && client.phone) {
    probability += 5;
    factors.push("Email et téléphone disponibles");
  }
  
  probability = Math.max(5, Math.min(95, probability));
  
  let confidence: "low" | "medium" | "high" = "medium";
  if (debt.reminderCount === 0) confidence = "low";
  if (paidPercentage > 0 || debt.reminderCount >= 2) confidence = "high";
  
  return {
    probability,
    confidence,
    factors,
    recommendation: probability > 60 
      ? "Continuer les relances standard. Paiement probable sous 15 jours."
      : probability > 30
      ? "Intensifier les relances. Envisager une négociation."
      : "Risque élevé. Envisager le transfert au recouvrement."
  };
}

// =====================================================
// ANALYZE CLIENT RISK
// =====================================================

export async function analyzeClientRisk(
  client: Client,
  debts: Debt[],
  language: 'fr' | 'en' = 'fr'
): Promise<RiskAnalysis> {
  const zai = await getZAI();
  
  const totalDebt = debts.reduce((sum, d) => sum + d.amount, 0);
  const totalPaid = debts.reduce((sum, d) => sum + d.paidAmount, 0);
  const pendingDebts = debts.filter(d => d.status === 'pending' || d.status === 'partial');
  const overdueDebts = debts.filter(d => new Date(d.dueDate) < new Date() && d.status !== 'paid');
  const totalReminders = debts.reduce((sum, d) => sum + d.reminderCount, 0);
  
  const systemPrompt = language === 'fr' ? AI_SYSTEM_PROMPT_FR : AI_SYSTEM_PROMPT_EN;
  
  const prompt = language === 'fr'
    ? `Analyse le risque de ce client et fournis une analyse détaillée en JSON:

CLIENT: ${client.name}
${client.company ? `ENTREPRISE: ${client.company}` : 'Particulier'}
STATUT: ${client.status}
SCORE ACTUEL: ${client.riskScore || 'Non calculé'}

STATISTIQUES:
- Nombre total de créances: ${debts.length}
- Créances en cours: ${pendingDebts.length}
- Créances en retard: ${overdueDebts.length}
- Montant total: ${formatCurrencyAmount(totalDebt, 'GNF')}
- Montant payé: ${formatCurrencyAmount(totalPaid, 'GNF')}
- Taux de paiement: ${totalDebt > 0 ? ((totalPaid / totalDebt) * 100).toFixed(1) : 0}%
- Relances totales envoyées: ${totalReminders}

Moyens de contact:
- Email: ${client.email || 'Non fourni'}
- Téléphone: ${client.phone || 'Non fourni'}

Réponds en JSON:
{
  "riskLevel": "low|medium|high|critical",
  "score": <nombre 0-100>,
  "factors": ["facteur1", "facteur2", ...],
  "insights": ["analyse1", "analyse2", ...],
  "recommendations": ["recommandation1", "recommandation2", ...]
}`
    : `Analyze this client's risk and provide a detailed analysis in JSON:

CLIENT: ${client.name}
${client.company ? `COMPANY: ${client.company}` : 'Individual'}
STATUS: ${client.status}
CURRENT SCORE: ${client.riskScore || 'Not calculated'}

STATISTICS:
- Total debts: ${debts.length}
- Pending debts: ${pendingDebts.length}
- Overdue debts: ${overdueDebts.length}
- Total amount: ${formatCurrencyAmount(totalDebt, 'GNF')}
- Amount paid: ${formatCurrencyAmount(totalPaid, 'GNF')}
- Payment rate: ${totalDebt > 0 ? ((totalPaid / totalDebt) * 100).toFixed(1) : 0}%
- Total reminders sent: ${totalReminders}

Contact methods:
- Email: ${client.email || 'Not provided'}
- Phone: ${client.phone || 'Not provided'}

Respond in JSON:
{
  "riskLevel": "low|medium|high|critical",
  "score": <number 0-100>,
  "factors": ["factor1", "factor2", ...],
  "insights": ["insight1", "insight2", ...],
  "recommendations": ["recommendation1", "recommendation2", ...]
}`;

  try {
    const completion = await zai.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 600
    });

    const response = completion.choices[0]?.message?.content;
    
    if (response) {
      try {
        let jsonStr = response;
        const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
          jsonStr = jsonMatch[1];
        }
        
        const parsed = JSON.parse(jsonStr.trim());
        return {
          riskLevel: parsed.riskLevel || "medium",
          score: Math.max(0, Math.min(100, parsed.score || 50)),
          factors: parsed.factors || [],
          insights: parsed.insights || [],
          recommendations: parsed.recommendations || []
        };
      } catch {
        // Fall through to fallback
      }
    }
  } catch (error) {
    console.error("Client risk analysis error:", error);
  }

  // Fallback calculation
  return calculateFallbackRisk(client, debts);
}

function calculateFallbackRisk(client: Client, debts: Debt[]): RiskAnalysis {
  let score = 0;
  const factors: string[] = [];
  const insights: string[] = [];
  const recommendations: string[] = [];
  
  const overdueDebts = debts.filter(d => new Date(d.dueDate) < new Date() && d.status !== 'paid');
  const totalDebt = debts.reduce((sum, d) => sum + d.amount, 0);
  const totalPaid = debts.reduce((sum, d) => sum + d.paidAmount, 0);
  const paymentRate = totalDebt > 0 ? (totalPaid / totalDebt) * 100 : 0;
  
  // Overdue debts factor
  if (overdueDebts.length > 3) {
    score += 30;
    factors.push(`${overdueDebts.length} créances en retard`);
  } else if (overdueDebts.length > 1) {
    score += 20;
    factors.push("Plusieurs créances en retard");
  } else if (overdueDebts.length === 1) {
    score += 10;
    factors.push("Une créance en retard");
  }
  
  // Payment rate factor
  if (paymentRate < 20) {
    score += 30;
    factors.push("Taux de paiement très faible");
  } else if (paymentRate < 50) {
    score += 20;
    factors.push("Taux de paiement faible");
  } else if (paymentRate < 80) {
    score += 10;
    factors.push("Taux de paiement modéré");
  } else {
    insights.push("Bon historique de paiement");
  }
  
  // Contact info factor
  if (!client.email && !client.phone) {
    score += 25;
    factors.push("Aucun moyen de contact");
    recommendations.push("Rechercher les coordonnées du client");
  }
  
  // Status factor
  if (client.status === "blacklisted") {
    score += 40;
    factors.push("Client sur liste noire");
    recommendations.push("Éviter les nouvelles créances pour ce client");
  } else if (client.status === "inactive") {
    score += 15;
    factors.push("Client inactif");
    recommendations.push("Vérifier si le client est toujours en activité");
  }
  
  // Generate insights
  if (score > 50) {
    insights.push("Ce client présente un risque élevé de non-paiement");
    recommendations.push("Envisager un acompte avant nouvelle prestation");
  } else if (score > 25) {
    insights.push("Ce client présente un risque modéré");
    recommendations.push("Suivre de près les échéances");
  } else {
    insights.push("Ce client présente un risque faible");
  }
  
  let riskLevel: "low" | "medium" | "high" | "critical";
  if (score >= 70) {
    riskLevel = "critical";
  } else if (score >= 50) {
    riskLevel = "high";
  } else if (score >= 25) {
    riskLevel = "medium";
  } else {
    riskLevel = "low";
  }
  
  return {
    riskLevel,
    score: Math.min(100, score),
    factors,
    insights,
    recommendations
  };
}

// =====================================================
// SUGGEST BEST ACTION
// =====================================================

export async function suggestBestAction(
  debts: Debt[],
  clients: Client[],
  language: 'fr' | 'en' = 'fr'
): Promise<ActionSuggestion[]> {
  const zai = await getZAI();
  
  // Prepare summary data
  const overdueDebts = debts.filter(d => new Date(d.dueDate) < new Date() && d.status !== 'paid');
  const highValueDebts = debts.filter(d => d.amount > 500000 && d.status !== 'paid');
  const urgentDebts = debts.filter(d => {
    const daysOverdue = Math.ceil((Date.now() - new Date(d.dueDate).getTime()) / (1000 * 60 * 60 * 24));
    return daysOverdue > 30 && d.status !== 'paid';
  });
  
  const totalPending = debts
    .filter(d => d.status !== 'paid')
    .reduce((sum, d) => sum + (d.amount - d.paidAmount), 0);
  
  const systemPrompt = language === 'fr' ? AI_SYSTEM_PROMPT_FR : AI_SYSTEM_PROMPT_EN;
  
  const prompt = language === 'fr'
    ? `En tant qu'expert en recouvrement de créances, suggère les 5 meilleures actions prioritaires pour maximiser le recouvrement.

SITUATION ACTUELLE:
- Créances totales: ${debts.length}
- Créances en retard: ${overdueDebts.length}
- Créances à fort montant (>500k): ${highValueDebts.length}
- Créances urgentes (>30 jours): ${urgentDebts.length}
- Montant total en attente: ${formatCurrencyAmount(totalPending, 'GNF')}
- Nombre de clients: ${clients.length}

DÉTAILS DES CRÉANCES PRIORITAIRES:
${overdueDebts.slice(0, 5).map(d => {
  const daysOverdue = Math.ceil((Date.now() - new Date(d.dueDate).getTime()) / (1000 * 60 * 60 * 24));
  const client = clients.find(c => c.id === d.clientId);
  return `- ${client?.name || 'Client'}: ${formatCurrencyAmount(d.amount - d.paidAmount, d.currency || 'GNF')} (${daysOverdue} jours de retard, ${d.reminderCount} relances)`;
}).join('\n')}

Réponds en JSON avec un tableau:
{
  "actions": [
    {
      "priority": "high|medium|low",
      "action": "description de l'action",
      "reason": "raison de cette priorité",
      "expectedOutcome": "résultat attendu"
    }
  ]
}`
    : `As a debt collection expert, suggest the 5 best priority actions to maximize recovery.

CURRENT SITUATION:
- Total debts: ${debts.length}
- Overdue debts: ${overdueDebts.length}
- High value debts (>500k): ${highValueDebts.length}
- Urgent debts (>30 days): ${urgentDebts.length}
- Total pending amount: ${formatCurrencyAmount(totalPending, 'GNF')}
- Number of clients: ${clients.length}

DETAILS OF PRIORITY DEBTS:
${overdueDebts.slice(0, 5).map(d => {
  const daysOverdue = Math.ceil((Date.now() - new Date(d.dueDate).getTime()) / (1000 * 60 * 60 * 24));
  const client = clients.find(c => c.id === d.clientId);
  return `- ${client?.name || 'Client'}: ${formatCurrencyAmount(d.amount - d.paidAmount, d.currency || 'GNF')} (${daysOverdue} days overdue, ${d.reminderCount} reminders)`;
}).join('\n')}

Respond in JSON with an array:
{
  "actions": [
    {
      "priority": "high|medium|low",
      "action": "action description",
      "reason": "reason for this priority",
      "expectedOutcome": "expected outcome"
    }
  ]
}`;

  try {
    const completion = await zai.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt }
      ],
      temperature: 0.5,
      max_tokens: 800
    });

    const response = completion.choices[0]?.message?.content;
    
    if (response) {
      try {
        let jsonStr = response;
        const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
          jsonStr = jsonMatch[1];
        }
        
        const parsed = JSON.parse(jsonStr.trim());
        if (parsed.actions && Array.isArray(parsed.actions)) {
          return parsed.actions.slice(0, 5).map((a: ActionSuggestion, index: number) => {
            // Try to match with a debt
            const debt = overdueDebts[index];
            return {
              priority: a.priority || "medium",
              action: a.action,
              reason: a.reason,
              expectedOutcome: a.expectedOutcome,
              debtId: debt?.id,
              clientId: debt?.clientId
            };
          });
        }
      } catch {
        // Fall through to fallback
      }
    }
  } catch (error) {
    console.error("Best action suggestion error:", error);
  }

  // Fallback suggestions
  return generateFallbackSuggestions(overdueDebts, highValueDebts, urgentDebts, clients, language);
}

function generateFallbackSuggestions(
  overdueDebts: Debt[],
  highValueDebts: Debt[],
  urgentDebts: Debt[],
  clients: Client[],
  language: 'fr' | 'en'
): ActionSuggestion[] {
  const suggestions: ActionSuggestion[] = [];
  
  // High priority: Urgent debts
  if (urgentDebts.length > 0) {
    const debt = urgentDebts[0];
    const client = clients.find(c => c.id === debt.clientId);
    suggestions.push({
      priority: "high",
      action: language === 'fr' 
        ? `Envoyer une relance urgente à ${client?.name || 'client'} pour ${formatCurrencyAmount(debt.amount - debt.paidAmount, debt.currency || 'GNF')}`
        : `Send urgent reminder to ${client?.name || 'client'} for ${formatCurrencyAmount(debt.amount - debt.paidAmount, debt.currency || 'GNF')}`,
      reason: language === 'fr'
        ? "Créance en retard de plus de 30 jours nécessitant une attention immédiate"
        : "Debt overdue by more than 30 days requiring immediate attention",
      expectedOutcome: language === 'fr'
        ? "Réponse client sous 48h ou plan de paiement"
        : "Client response within 48h or payment plan",
      debtId: debt.id,
      clientId: debt.clientId
    });
  }
  
  // High priority: High value debts
  if (highValueDebts.length > 0 && !suggestions.find(s => s.debtId === highValueDebts[0].id)) {
    const debt = highValueDebts[0];
    const client = clients.find(c => c.id === debt.clientId);
    suggestions.push({
      priority: "high",
      action: language === 'fr'
        ? `Contacter ${client?.name || 'client'} par téléphone pour négocier un paiement`
        : `Contact ${client?.name || 'client'} by phone to negotiate payment`,
      reason: language === 'fr'
        ? "Montant élevé nécessitant une approche personnalisée"
        : "High amount requiring personalized approach",
      expectedOutcome: language === 'fr'
        ? "Engagement de paiement sous 7 jours"
        : "Payment commitment within 7 days",
      debtId: debt.id,
      clientId: debt.clientId
    });
  }
  
  // Medium priority: Regular overdue follow-up
  if (overdueDebts.length > 2) {
    suggestions.push({
      priority: "medium",
      action: language === 'fr'
        ? `Envoyer des relances groupées aux ${overdueDebts.length} clients en retard`
        : `Send batch reminders to ${overdueDebts.length} overdue clients`,
      reason: language === 'fr'
        ? "Optimisation du temps de recouvrement"
        : "Optimizing collection time",
      expectedOutcome: language === 'fr'
        ? "30% de taux de réponse attendu"
        : "30% response rate expected"
    });
  }
  
  // Medium priority: Payment plans
  const partialDebts = overdueDebts.filter(d => d.paidAmount > 0);
  if (partialDebts.length > 0) {
    suggestions.push({
      priority: "medium",
      action: language === 'fr'
        ? `Proposer des échéanciers de paiement aux ${partialDebts.length} clients ayant payé partiellement`
        : `Propose payment schedules to ${partialDebts.length} clients with partial payments`,
      reason: language === 'fr'
        ? "Ces clients ont montré une volonté de payer"
        : "These clients have shown willingness to pay",
      expectedOutcome: language === 'fr'
        ? "Finalisation du paiement sous 30 jours"
        : "Payment completion within 30 days"
    });
  }
  
  // Low priority: Prevention
  if (overdueDebts.length > 5) {
    suggestions.push({
      priority: "low",
      action: language === 'fr'
        ? "Mettre en place des rappels automatiques avant échéance"
        : "Set up automatic reminders before due dates",
      reason: language === 'fr'
        ? "Prévention des retards futurs"
        : "Preventing future delays",
      expectedOutcome: language === 'fr'
        ? "Réduction de 20% des retards futurs"
        : "20% reduction in future delays"
    });
  }
  
  return suggestions.slice(0, 5);
}

// =====================================================
// SUPPORT CHATBOT
// =====================================================

export async function handleSupportChat(
  userMessage: string,
  context: AIContext
): Promise<AIResponse> {
  const zai = await getZAI();
  const language = context.language || context.profile.preferredLanguage as 'fr' | 'en' || 'fr';
  
  const systemPrompt = language === 'fr' ? AI_SYSTEM_PROMPT_FR : AI_SYSTEM_PROMPT_EN;
  
  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: systemPrompt }
  ];
  
  // Add conversation history for context
  if (context.history && context.history.length > 0) {
    for (const msg of context.history.slice(-10)) {
      messages.push(msg);
    }
  }
  
  // Add current user message with context
  let contextMessage = userMessage;
  if (context.client) {
    contextMessage += `\n\n[Contexte: Client actuel: ${context.client.name}]`;
  }
  if (context.debt) {
    contextMessage += `\n[Contexte: Créance: ${formatCurrencyAmount(context.debt.amount, context.debt.currency || 'GNF')}]`;
  }
  
  messages.push({ role: "user", content: contextMessage });

  try {
    const completion = await zai.chat.completions.create({
      messages,
      temperature: 0.7,
      max_tokens: 800
    });

    const response = completion.choices[0]?.message?.content;
    
    if (response) {
      // Generate relevant suggestions based on the conversation
      const suggestions = generateSuggestions(userMessage, language);
      
      return {
        message: response,
        suggestions
      };
    }
  } catch (error) {
    console.error("Support chat error:", error);
  }

  // Fallback responses
  return generateFallbackResponse(userMessage, language);
}

function generateSuggestions(userMessage: string, language: 'fr' | 'en'): string[] {
  const lowerMessage = userMessage.toLowerCase();
  
  if (lowerMessage.includes('client') || lowerMessage.includes('ajout')) {
    return language === 'fr' 
      ? ["Ajouter un client", "Comment modifier un client", "Voir mes clients"]
      : ["Add a client", "How to edit a client", "View my clients"];
  }
  
  if (lowerMessage.includes('relance') || lowerMessage.includes('rappel')) {
    return language === 'fr'
      ? ["Envoyer une relance", "Configurer les relances auto", "Voir l'historique"]
      : ["Send a reminder", "Configure auto reminders", "View history"];
  }
  
  if (lowerMessage.includes('rapport') || lowerMessage.includes('stat')) {
    return language === 'fr'
      ? ["Voir les rapports", "Exporter en PDF", "Analyser mes données"]
      : ["View reports", "Export to PDF", "Analyze my data"];
  }
  
  if (lowerMessage.includes('prix') || lowerMessage.includes('abonnement') || lowerMessage.includes('tarif')) {
    return language === 'fr'
      ? ["Voir les tarifs", "Souscrire à Business", "Contacter pour Entreprise"]
      : ["View pricing", "Subscribe to Business", "Contact for Enterprise"];
  }
  
  return language === 'fr'
    ? ["Ajouter un client", "Envoyer une relance", "Voir mes rapports", "Autre question"]
    : ["Add a client", "Send a reminder", "View my reports", "Other question"];
}

function generateFallbackResponse(userMessage: string, language: 'fr' | 'en'): AIResponse {
  const lowerMessage = userMessage.toLowerCase();
  
  if (lowerMessage.includes('comment') && lowerMessage.includes('ajout')) {
    return {
      message: language === 'fr'
        ? `Pour ajouter un client, voici les étapes :

1️⃣ Allez dans l'onglet "Clients" dans le menu latéral
2️⃣ Cliquez sur "Nouveau client"
3️⃣ Remplissez les informations :
   - Nom complet (obligatoire)
   - Email et/ou WhatsApp (au moins un des deux)
   - Entreprise (optionnel)
4️⃣ Cliquez sur "Créer"

Une fois le client ajouté, vous pourrez lui associer des créances.`
        : `To add a client, here are the steps:

1️⃣ Go to the "Clients" tab in the side menu
2️⃣ Click on "New client"
3️⃣ Fill in the information:
   - Full name (required)
   - Email and/or WhatsApp (at least one)
   - Company (optional)
4️⃣ Click "Create"

Once the client is added, you can associate debts with them.`,
      suggestions: generateSuggestions(userMessage, language)
    };
  }
  
  if (lowerMessage.includes('relance') && (lowerMessage.includes('comment') || lowerMessage.includes('automatique'))) {
    return {
      message: language === 'fr'
        ? `🎯 Le système de relances automatiques fonctionne ainsi :

**Configuration automatique :**
- 1ère relance : 3 jours après l'échéance
- 2ème relance : 7 jours après l'échéance
- 3ème relance : 14 jours après l'échéance

**Canaux utilisés :**
- 📧 Email si le client a une adresse email
- 💬 WhatsApp si le client a un numéro

**Personnalisation :**
Vous pouvez modifier ces paramètres dans "Paramètres" > "Relances".`
        : `🎯 The automatic reminder system works as follows:

**Automatic configuration:**
- 1st reminder: 3 days after due date
- 2nd reminder: 7 days after due date
- 3rd reminder: 14 days after due date

**Channels used:**
- 📧 Email if client has an email address
- 💬 WhatsApp if client has a number

**Customization:**
You can modify these parameters in "Settings" > "Reminders".`,
      suggestions: generateSuggestions(userMessage, language)
    };
  }
  
  if (lowerMessage.includes('prix') || lowerMessage.includes('tarif') || lowerMessage.includes('abonnement')) {
    return {
      message: language === 'fr'
        ? `💰 Nos offres pour RelancePro Africa :

**🌟 STARTER - 50 000 FG/mois**
- 10 clients maximum
- Relances Email illimitées
- WhatsApp : 50/mois
- Assistant IA basique

**⭐ BUSINESS - 150 000 FG/mois** (Populaire)
- 100 clients
- Email + WhatsApp illimités
- Export PDF/Excel
- Assistant IA avancé

**👑 ENTREPRISE - 500 000 FG/mois**
- Clients illimités
- Tout inclus + API Webhooks
- Support dédié 24/7`
        : `💰 Our offers for RelancePro Africa:

**🌟 STARTER - 50,000 FG/month**
- Maximum 10 clients
- Unlimited Email reminders
- WhatsApp: 50/month
- Basic AI assistant

**⭐ BUSINESS - 150,000 FG/month** (Popular)
- 100 clients
- Unlimited Email + WhatsApp
- PDF/Excel export
- Advanced AI assistant

**👑 ENTERPRISE - 500,000 FG/month**
- Unlimited clients
- Everything included + API Webhooks
- Dedicated 24/7 support`,
      suggestions: generateSuggestions(userMessage, language)
    };
  }
  
  return {
    message: language === 'fr'
      ? `Je suis là pour vous aider ! 🤖

Je peux vous assister pour :
- 📝 Ajouter des clients et créances
- 📤 Envoyer des relances
- 📊 Consulter vos rapports
- 💰 Gérer votre abonnement
- ⚙️ Configurer vos paramètres

Que souhaitez-vous faire ?`
      : `I'm here to help! 🤖

I can assist you with:
- 📝 Adding clients and debts
- 📤 Sending reminders
- 📊 Viewing your reports
- 💰 Managing your subscription
- ⚙️ Configuring your settings

What would you like to do?`,
    suggestions: generateSuggestions(userMessage, language)
  };
}

// =====================================================
// ONBOARDING
// =====================================================

export async function generateOnboardingSteps(profile: Profile): Promise<Array<{
  id: string;
  title: string;
  description: string;
  completed: boolean;
  action?: string;
}>> {
  const language = profile.preferredLanguage as 'fr' | 'en' || 'fr';
  
  return [
    {
      id: "welcome",
      title: language === 'fr' ? "Bienvenue sur RelancePro Africa ! 🎉" : "Welcome to RelancePro Africa! 🎉",
      description: language === 'fr' 
        ? "Découvrez comment automatiser vos relances clients"
        : "Discover how to automate your client reminders",
      completed: false,
      action: "/dashboard"
    },
    {
      id: "add-client",
      title: language === 'fr' ? "Ajoutez votre premier client" : "Add your first client",
      description: language === 'fr'
        ? "Commencez par ajouter un client à relancer"
        : "Start by adding a client to remind",
      completed: false,
      action: "/clients"
    },
    {
      id: "create-debt",
      title: language === 'fr' ? "Créez votre première créance" : "Create your first debt",
      description: language === 'fr'
        ? "Enregistrez une facture impayée"
        : "Record an unpaid invoice",
      completed: false,
      action: "/debts"
    },
    {
      id: "send-reminder",
      title: language === 'fr' ? "Envoyez une relance" : "Send a reminder",
      description: language === 'fr'
        ? "Testez l'envoi d'une relance Email ou WhatsApp"
        : "Test sending an Email or WhatsApp reminder",
      completed: false,
      action: "/debts"
    },
    {
      id: "configure-settings",
      title: language === 'fr' ? "Personnalisez vos paramètres" : "Customize your settings",
      description: language === 'fr'
        ? "Configurez vos signatures et templates"
        : "Configure your signatures and templates",
      completed: false,
      action: "/settings"
    },
    {
      id: "subscribe",
      title: language === 'fr' ? "Passez à l'offre supérieure" : "Upgrade your plan",
      description: language === 'fr'
        ? "Débloquez toutes les fonctionnalités"
        : "Unlock all features",
      completed: profile.subscriptionStatus === "active",
      action: "/subscription"
    }
  ];
}

// =====================================================
// PREDICT BEST SEND TIME
// =====================================================

export function predictBestSendTime(client: Client): Date {
  const now = new Date();
  // Optimal hours for West Africa (9h-12h and 14h-17h)
  const optimalHours = [9, 10, 11, 14, 15, 16];
  
  const currentHour = now.getHours();
  
  // Find next optimal hour
  const nextOptimalHour = optimalHours.find(h => h > currentHour) || optimalHours[0];
  
  const sendTime = new Date(now);
  if (nextOptimalHour <= currentHour) {
    // Postpone to next day
    sendTime.setDate(sendTime.getDate() + 1);
  }
  sendTime.setHours(nextOptimalHour, 0, 0, 0);
  
  return sendTime;
}

// =====================================================
// ANALYZE PAYMENT RISK (Simple version)
// =====================================================

export function analyzePaymentRisk(debt: Debt, client: Client): {
  risk: "low" | "medium" | "high";
  score: number;
  factors: string[];
} {
  const factors: string[] = [];
  let score = 0;
  
  const daysOverdue = Math.ceil(
    (Date.now() - new Date(debt.dueDate).getTime()) / (1000 * 60 * 60 * 24)
  );
  
  if (daysOverdue > 30) {
    score += 30;
    factors.push("Retard supérieur à 30 jours");
  } else if (daysOverdue > 14) {
    score += 20;
    factors.push("Retard supérieur à 14 jours");
  } else if (daysOverdue > 7) {
    score += 10;
    factors.push("Retard supérieur à 7 jours");
  }
  
  if (debt.reminderCount >= 3) {
    score += 25;
    factors.push("3 relances sans réponse");
  } else if (debt.reminderCount >= 2) {
    score += 15;
    factors.push("2 relances sans réponse");
  }
  
  if (!client.email && !client.phone) {
    score += 20;
    factors.push("Aucun moyen de contact");
  }
  
  if (debt.amount > 1000000) {
    score += 15;
    factors.push("Montant élevé");
  }
  
  let risk: "low" | "medium" | "high";
  if (score >= 50) {
    risk = "high";
  } else if (score >= 25) {
    risk = "medium";
  } else {
    risk = "low";
  }
  
  return { risk, score, factors };
}

// =====================================================
// EXPORTS
// =====================================================

const aiService = {
  generateAIReminder,
  predictPaymentProbability,
  analyzeClientRisk,
  suggestBestAction,
  handleSupportChat,
  generateOnboardingSteps,
  predictBestSendTime,
  analyzePaymentRisk,
  generateSmartReminder: generateAIReminder, // Alias for backward compatibility
};

export default aiService;
