import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Text,
  Row,
  Column,
} from '@react-email/components'
import * as React from 'react'

interface InvoiceItem {
  description: string
  quantity: number
  unitPrice: number
  total: number
}

interface InvoiceEmailProps {
  invoiceNumber: string
  clientName: string
  companyName: string
  total: number
  currency: string
  dueDate: Date
  paymentLink: string
  items: InvoiceItem[]
}

export default function InvoiceEmail({
  invoiceNumber,
  clientName,
  companyName,
  total,
  currency,
  dueDate,
  paymentLink,
  items = [],
}: InvoiceEmailProps) {
  const formatCurrency = (amount: number, curr: string) => {
    const symbols: Record<string, string> = {
      'GNF': 'GNF',
      'XOF': 'CFA',
      'XAF': 'FCFA',
      'EUR': '€',
      'USD': '$',
    }
    const symbol = symbols[curr] || curr
    if (['GNF', 'XOF', 'XAF'].includes(curr)) {
      return `${symbol} ${amount.toLocaleString('fr-FR')}`
    }
    return `${symbol} ${amount.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}`
  }
  
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })
  }
  
  const subtotal = items.reduce((sum, item) => sum + item.total, 0)
  
  return (
    <Html>
      <Head />
      <Preview>
        Facture {invoiceNumber} de {companyName} - {formatCurrency(total, currency)}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Row>
              <Column>
                <Heading style={headerTitle}>{companyName}</Heading>
              </Column>
              <Column style={{ textAlign: 'right' }}>
                <Text style={headerLabel}>FACTURE</Text>
                <Text style={headerNumber}>{invoiceNumber}</Text>
              </Column>
            </Row>
          </Section>
          
          {/* Greeting */}
          <Section style={section}>
            <Heading style={greeting}>Bonjour {clientName},</Heading>
            <Text style={paragraph}>
              Veuillez trouver ci-joint votre facture <strong>{invoiceNumber}</strong> d&apos;un montant de{' '}
              <strong>{formatCurrency(total, currency)}</strong>.
            </Text>
            <Text style={paragraph}>
              Date d&apos;échéance : <strong>{formatDate(dueDate)}</strong>
            </Text>
          </Section>
          
          {/* Items Table */}
          {items.length > 0 && (
            <Section style={tableSection}>
              <Row style={tableHeader}>
                <Column style={{ ...tableHeaderCell, width: '50%' }}>Description</Column>
                <Column style={{ ...tableHeaderCell, width: '15%', textAlign: 'center' }}>Qté</Column>
                <Column style={{ ...tableHeaderCell, width: '17.5%', textAlign: 'right' }}>Prix unit.</Column>
                <Column style={{ ...tableHeaderCell, width: '17.5%', textAlign: 'right' }}>Total</Column>
              </Row>
              {items.map((item, index) => (
                <Row key={index} style={tableRow}>
                  <Column style={{ ...tableCell, width: '50%' }}>{item.description}</Column>
                  <Column style={{ ...tableCell, width: '15%', textAlign: 'center' }}>
                    {item.quantity}
                  </Column>
                  <Column style={{ ...tableCell, width: '17.5%', textAlign: 'right' }}>
                    {formatCurrency(item.unitPrice, currency)}
                  </Column>
                  <Column style={{ ...tableCell, width: '17.5%', textAlign: 'right', fontWeight: 500 }}>
                    {formatCurrency(item.total, currency)}
                  </Column>
                </Row>
              ))}
              <Row style={tableFooter}>
                <Column style={{ width: '82.5%' }}></Column>
                <Column style={{ ...tableFooterCell, width: '17.5%' }}>
                  <Text style={totalLabel}>Total TTC</Text>
                  <Text style={totalAmount}>{formatCurrency(total, currency)}</Text>
                </Column>
              </Row>
            </Section>
          )}
          
          {/* Payment Button */}
          <Section style={buttonSection}>
            <Button style={button} href={paymentLink}>
              Payer maintenant
            </Button>
          </Section>
          
          <Hr style={hr} />
          
          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              Cette facture a été générée par <strong>RelancePro Africa</strong>.
            </Text>
            <Text style={footerText}>
              Pour toute question concernant cette facture, veuillez contacter {companyName}.
            </Text>
            <Text style={footerLink}>
              <a href="https://relancepro.africa" style={link}>
                relancepro.africa
              </a>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
}

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '0',
  maxWidth: '600px',
  borderRadius: '8px',
  overflow: 'hidden',
  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
}

const header = {
  backgroundColor: '#ea580c',
  padding: '32px 40px',
}

const headerTitle = {
  color: '#ffffff',
  fontSize: '24px',
  fontWeight: '700',
  margin: '0',
}

const headerLabel = {
  color: 'rgba(255, 255, 255, 0.8)',
  fontSize: '12px',
  textTransform: 'uppercase' as const,
  letterSpacing: '1px',
  margin: '0',
}

const headerNumber = {
  color: '#ffffff',
  fontSize: '20px',
  fontWeight: '700',
  margin: '4px 0 0 0',
}

const section = {
  padding: '32px 40px',
}

const greeting = {
  color: '#1f2937',
  fontSize: '24px',
  fontWeight: '600',
  margin: '0 0 16px 0',
}

const paragraph = {
  color: '#4b5563',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '0 0 12px 0',
}

const tableSection = {
  padding: '0 40px 32px 40px',
}

const tableHeader = {
  backgroundColor: '#f9fafb',
}

const tableHeaderCell = {
  color: '#6b7280',
  fontSize: '12px',
  fontWeight: '600',
  textTransform: 'uppercase' as const,
  padding: '12px 16px',
  borderBottom: '1px solid #e5e7eb',
}

const tableRow = {
  borderBottom: '1px solid #f3f4f6',
}

const tableCell = {
  color: '#374151',
  fontSize: '14px',
  padding: '12px 16px',
}

const tableFooter = {
  backgroundColor: '#f9fafb',
}

const tableFooterCell = {
  padding: '16px',
  textAlign: 'right' as const,
}

const totalLabel = {
  color: '#6b7280',
  fontSize: '12px',
  margin: '0 0 4px 0',
}

const totalAmount = {
  color: '#ea580c',
  fontSize: '18px',
  fontWeight: '700',
  margin: '0',
}

const buttonSection = {
  padding: '0 40px 32px 40px',
  textAlign: 'center' as const,
}

const button = {
  backgroundColor: '#ea580c',
  borderRadius: '6px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '14px 32px',
}

const hr = {
  borderColor: '#e5e7eb',
  margin: '0',
}

const footer = {
  padding: '32px 40px',
  textAlign: 'center' as const,
}

const footerText = {
  color: '#6b7280',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '0 0 8px 0',
}

const footerLink = {
  margin: '16px 0 0 0',
}

const link = {
  color: '#ea580c',
  textDecoration: 'none',
}
