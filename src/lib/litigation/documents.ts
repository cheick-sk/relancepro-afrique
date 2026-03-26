/**
 * Litigation Document Generation Library
 * Generates legal documents for contentieux cases
 */

import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

interface LitigationData {
  id: string
  reference: string
  type: string
  amount: number
  currency: string
  notes?: string | null
  filedAt?: Date | null
  client: {
    name: string
    company?: string | null
    email?: string | null
    phone?: string | null
    address?: string | null
  }
  debt?: {
    reference?: string | null
    amount: number
    currency: string
    dueDate: Date
    description?: string | null
  } | null
  parties?: Array<{
    type: string
    name: string
    company?: string | null
    address?: string | null
  }>
  profile?: {
    companyName?: string | null
    name?: string | null
    phone?: string | null
    email?: string | null
    address?: string | null
  }
}

const formatCurrency = (amount: number, currency: string) => {
  return new Intl.NumberFormat('fr-GN', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

const formatDateLong = (date: Date) => {
  return format(new Date(date), 'd MMMM yyyy', { locale: fr })
}

/**
 * Generate a formal demand letter (Mise en demeure)
 */
export function generateDemandLetter(litigation: LitigationData): string {
  const today = new Date()
  const plaintiff = litigation.parties?.find(p => p.type === 'plaintiff')
  const lawyer = litigation.parties?.find(p => p.type === 'lawyer')
  
  const senderName = lawyer?.name || litigation.profile?.companyName || litigation.profile?.name || '[Votre nom]'
  const senderCompany = lawyer?.company || litigation.profile?.companyName || ''
  const senderAddress = litigation.profile?.address || '[Votre adresse]'
  const senderPhone = litigation.profile?.phone || ''
  const senderEmail = litigation.profile?.email || ''

  const debtorName = litigation.client.company || litigation.client.name
  const debtorAddress = litigation.client.address || '[Adresse du débiteur]'

  const debtReference = litigation.debt?.reference || litigation.reference
  const debtAmount = litigation.debt?.amount || litigation.amount
  const debtDueDate = litigation.debt?.dueDate ? formatDateLong(litigation.debt.dueDate) : '[Date d\'échéance]'
  const debtDescription = litigation.debt?.description || litigation.notes || 'Créance impayée'

  return `
MISE EN DEMEURE
=====================================

${senderCompany ? senderCompany + '\n' : ''}${senderName}
${senderAddress}
${senderPhone ? 'Tél: ' + senderPhone + '\n' : ''}${senderEmail ? 'Email: ' + senderEmail : ''}

                                        Le ${formatDateLong(today)}

                                        À l'attention de:
                                        ${debtorName}
                                        ${debtorAddress}

                                        ${litigation.client.company ? 'M/Mme ' + litigation.client.name : ''}

OBJET: MISE EN DEMEURE DE PAIEMENT
Référence: ${litigation.reference}
${debtReference !== litigation.reference ? 'Facture/Référence: ' + debtReference : ''}

Madame, Monsieur,

Par la présente, nous vous mettons en demeure de procéder au règlement de la somme de ${formatCurrency(debtAmount, litigation.currency)}, 
dû au titre de: ${debtDescription}.

Cette créance, dont l'échéance était fixée au ${debtDueDate}, reste impayée malgré nos différentes relances.

CONFORMÉMENT AUX DISPOSITIONS DE L'ARTICLE 1231-6 DU CODE CIVIL, nous vous demandons de régler cette somme 
sous un délai de QUINZE (15) JOURS à compter de la réception de la présente mise en demeure.

À DÉFAUT DE PAIEMENT dans ce délai, nous serons contraints d'engager les procédures judiciaires nécessaires 
pour obtenir le recouvrement de cette créance, sans autre préavis et avec tous les frais et dépens à votre charge.

Nous vous prions de croire, Madame, Monsieur, en l'assurance de notre considération distinguée.

${lawyer ? `
Fait à ${senderAddress.split('\n')[0] || '[Ville]'}, le ${formatDateLong(today)}

${lawyer.name}
${lawyer.company || 'Avocat'}
` : `
Signature
`}
`
}

/**
 * Generate a court filing document (Assignation)
 */
export function generateCourtFiling(litigation: LitigationData): string {
  const today = new Date()
  const plaintiff = litigation.parties?.find(p => p.type === 'plaintiff')
  const defendant = litigation.parties?.find(p => p.type === 'defendant')
  const lawyer = litigation.parties?.find(p => p.type === 'lawyer')
  const court = litigation.parties?.find(p => p.type === 'court')

  const courtName = court?.name || '[Nom du Tribunal]'
  const courtAddress = court?.address || '[Adresse du Tribunal]'

  const plaintiffName = litigation.profile?.companyName || litigation.profile?.name || plaintiff?.name || '[Demandeur]'
  const plaintiffAddress = litigation.profile?.address || plaintiff?.address || '[Adresse du demandeur]'

  const defendantName = litigation.client.company || litigation.client.name
  const defendantAddress = litigation.client.address || '[Adresse du défendeur]'

  return `
ASSIGNATION
=====================================

DEVANT LE ${courtName.toUpperCase()}
${courtAddress}

${formatDateLong(today)}

ASSIGNATION À COMPARAÎTRE

DEMANDEUR:
${plaintiffName}
${plaintiffAddress}
${lawyer ? `\nReprésenté par: ${lawyer.name}${lawyer.company ? ', ' + lawyer.company : ''}` : ''}

DÉFENDEUR:
${defendantName}
${defendantAddress}
${litigation.client.company ? `\nReprésenté par: ${litigation.client.name}` : ''}

OBJET: RECOUVREMENT DE CRÉANCE
Référence dossier: ${litigation.reference}
${litigation.debt?.reference ? 'Référence facture: ' + litigation.debt.reference : ''}

MOTIFS DE LA DEMANDE:
----------------------
Le demandeur réclame au défendeur le paiement de la somme de ${formatCurrency(litigation.amount, litigation.currency)} 
au titre de: ${litigation.debt?.description || litigation.notes || 'Créance impayée'}.

${litigation.debt?.dueDate ? `Cette créance était exigible depuis le ${formatDateLong(litigation.debt.dueDate)}.` : ''}

Malgré plusieurs mises en demeure, le défendeur n'a pas procédé au paiement de sa dette.

PRÉTENTIONS:
------------
1. Condamner le défendeur à payer au demandeur la somme de ${formatCurrency(litigation.amount, litigation.currency)}
2. Condamner le défendeur aux dépens
3. Ordonner l'exécution provisoire
4. Toute autre mesure que le tribunal jugera appropriée

PIÈCES PRODUITES:
-----------------
1. Facture(s) justifiant la créance
2. Mises en demeure restées sans effet
3. Tous documents établissant la créance

Le défendeur est invité à comparaître à l'audience qui aura lieu le [DATE D'AUDIENCE] à [HEURE], 
au siège du ${courtName}.

Fait à ${courtAddress.split('\n')[0] || '[Ville]'}, le ${formatDateLong(today)}

${lawyer ? `
Pour le demandeur:
${lawyer.name}
${lawyer.company || 'Avocat'}
` : `
Le demandeur
`}
`
}

/**
 * Generate a legal notice (Avis/Notification)
 */
export function generateNotice(litigation: LitigationData, noticeType: 'hearing' | 'judgment' | 'execution' = 'hearing'): string {
  const today = new Date()
  const court = litigation.parties?.find(p => p.type === 'court')
  const bailiff = litigation.parties?.find(p => p.type === 'bailiff')

  const templates: Record<string, { title: string; content: string }> = {
    hearing: {
      title: 'AVIS D\'AUDIENCE',
      content: `
Vous êtes convoqué(e) à comparaître devant le ${court?.name || '[Tribunal]'} dans le cadre du dossier 
${litigation.reference} vous opposant à ${litigation.profile?.companyName || litigation.profile?.name || '[Demandeur]'}.

DATE: [DATE D'AUDIENCE]
HEURE: [HEURE]
LIEU: ${court?.address || '[Adresse du tribunal]'}

Il vous est demandé de vous présenter en personne ou par l'intermédiaire d'un avocat.
`
    },
    judgment: {
      title: 'AVIS DE JUGEMENT',
      content: `
Par jugement rendu le ${formatDateLong(today)}, le ${court?.name || '[Tribunal]'} a statué sur le dossier 
${litigation.reference}.

Il vous appartient de prendre connaissance de la décision auprès du greffe du tribunal.

Ce jugement peut faire l'objet d'un appel dans un délai d'un mois à compter de sa signification.
`
    },
    execution: {
      title: 'AVIS D\'EXÉCUTION',
      content: `
Conformément au jugement rendu dans le dossier ${litigation.reference}, nous vous informons que 
les procédures d'exécution vont être engagées pour le recouvrement de la somme de ${formatCurrency(litigation.amount, litigation.currency)}.

${bailiff ? `
Cette procédure sera diligentée par:
${bailiff.name}${bailiff.company ? ', ' + bailiff.company : ''}
${bailiff.address || ''}
` : ''}

Pour éviter les frais supplémentaires liés à l'exécution forcée, nous vous invitons à procéder 
au règlement dans un délai de HUIT (8) JOURS.
`
    }
  }

  const template = templates[noticeType]

  return `
${template.title}
=====================================

Dossier: ${litigation.reference}
Date: ${formatDateLong(today)}

Destinataire:
${litigation.client.company || litigation.client.name}
${litigation.client.address || ''}
${litigation.client.name && litigation.client.company ? '\nÀ l\'attention de: ' + litigation.client.name : ''}

${template.content}

${court?.name || 'Le Tribunal'}
`
}

/**
 * Generate a petition (Requête)
 */
export function generatePetition(litigation: LitigationData): string {
  const today = new Date()
  const lawyer = litigation.parties?.find(p => p.type === 'lawyer')
  const court = litigation.parties?.find(p => p.type === 'court')

  return `
REQUÊTE
=====================================

À L'ATTENTION DE MONSIEUR LE PRÉSIDENT DU ${court?.name?.toUpperCase() || 'TRIBUNAL'}

${formatDateLong(today)}

PARTIE REQUÉRANTE:
${litigation.profile?.companyName || litigation.profile?.name || '[Votre nom]'}
${litigation.profile?.address || '[Adresse]'}
${lawyer ? `\nAvocat: ${lawyer.name}${lawyer.company ? ', ' + lawyer.company : ''}` : ''}

PARTIE DÉFENDERESSE:
${litigation.client.company || litigation.client.name}
${litigation.client.address || ''}

OBJET: ORDONNANCE D'INJONCTION DE PAYER
Référence: ${litigation.reference}

EXPOSÉ DES FAITS:
-----------------
Le requérant dispose d'une créance certaine, liquide et exigible d'un montant de ${formatCurrency(litigation.amount, litigation.currency)} 
sur le défendeur, au titre de: ${litigation.debt?.description || litigation.notes || 'Créance impayée'}.

Cette créance résulte de: ${litigation.debt?.reference ? 'la facture n°' + litigation.debt.reference : 'la prestation fournie'}.

Le défendeur, malgré plusieurs mises en demeure, n'a pas procédé au paiement.

MOYENS:
-------
1. La créance est certaine: elle est incontestable et incontestée
2. La créance est liquide: son montant est déterminé
3. La créance est exigible: elle est arrivée à échéance

IL EST DEMANDÉ AU TRIBUNAL:
---------------------------
1. De rendre une ordonnance portant injonction de payer au profit du requérant contre le défendeur
2. De condamner le défendeur au paiement de ${formatCurrency(litigation.amount, litigation.currency)}
3. De condamner le défendeur aux dépens
4. D'ordonner l'exécution provisoire

Pièces jointes:
1. Facture(s)
2. Contrat(s) ou bon(s) de commande
3. Mise(s) en demeure
4. Preuves de livraison ou de prestation

Fait à ${litigation.profile?.address?.split('\n')[0] || '[Ville]'}, le ${formatDateLong(today)}

${lawyer ? `
Le requérant, représenté par:
${lawyer.name}
${lawyer.company || 'Avocat'}
` : `
Le requérant
`}
`
}

/**
 * Generate minutes (Procès-verbal)
 */
export function generateMinutes(litigation: LitigationData, eventType: string, details: string): string {
  const today = new Date()
  const bailiff = litigation.parties?.find(p => p.type === 'bailiff')

  return `
PROCÈS-VERBAL
=====================================

${eventType.toUpperCase()}
Dossier: ${litigation.reference}
Date: ${formatDateLong(today)}

${bailiff ? `
Huissier de justice: ${bailiff.name}${bailiff.company ? '\n' + bailiff.company : ''}
${bailiff.address || ''}
` : ''}

PARTIE CRÉANCIÈRE:
${litigation.profile?.companyName || litigation.profile?.name || '[Créancier]'}

PARTIE DÉBITRICE:
${litigation.client.company || litigation.client.name}
${litigation.client.address || ''}

COMpte-RENDU:
-------------
${details}

MONTANT CONCERNÉ: ${formatCurrency(litigation.amount, litigation.currency)}

Fait à ${litigation.client.address?.split('\n')[0] || '[Lieu]'}, le ${formatDateLong(today)}

${bailiff ? `
${bailiff.name}
Huissier de Justice
` : ''}
`
}

/**
 * Get document types available for generation
 */
export function getDocumentTypes(): Array<{ value: string; label: string; description: string }> {
  return [
    { value: 'demand_letter', label: 'Mise en demeure', description: 'Lettre de mise en demeure formelle' },
    { value: 'court_filing', label: 'Assignation', description: 'Acte introductif d\'instance' },
    { value: 'petition', label: 'Requête', description: 'Demande d\'ordonnance d\'injonction de payer' },
    { value: 'notice_hearing', label: 'Avis d\'audience', description: 'Notification de convocation' },
    { value: 'notice_judgment', label: 'Avis de jugement', description: 'Notification de décision' },
    { value: 'notice_execution', label: 'Avis d\'exécution', description: 'Notification de procédure d\'exécution' },
    { value: 'minutes', label: 'Procès-verbal', description: 'Compte-rendu d\'acte d\'huissier' }
  ]
}
