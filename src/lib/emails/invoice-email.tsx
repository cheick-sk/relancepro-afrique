// Invoice email template

import React from "react"

interface InvoiceEmailProps {
  invoiceNumber: string
  clientName: string
  amount: number
  dueDate: string
  companyName: string
}

export default function InvoiceEmail({ invoiceNumber, clientName, amount, dueDate, companyName }: InvoiceEmailProps) {
  return (
    <div>
      <h1>Facture {invoiceNumber}</h1>
      <p>Bonjour {clientName},</p>
      <p>Veuillez trouver ci-joint votre facture d'un montant de {amount}.</p>
      <p>Date d'échéance: {dueDate}</p>
      <p>Cordialement,</p>
      <p>{companyName}</p>
    </div>
  )
}
