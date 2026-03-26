import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import { render } from "@react-email/render";
import * as React from "react";

interface PortalInvitationEmailProps {
  clientName: string;
  creditorName: string;
  portalUrl: string;
  expiresAt: Date;
  isSingleUse: boolean;
  language?: "fr" | "en";
}

export function PortalInvitationEmail({
  clientName,
  creditorName,
  portalUrl,
  expiresAt,
  isSingleUse,
  language = "fr",
}: PortalInvitationEmailProps) {
  const isFrench = language === "fr";

  const formatDate = (date: Date) => {
    return date.toLocaleDateString(language === "fr" ? "fr-FR" : "en-US", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const translations = {
    fr: {
      preview: `Accédez à vos factures - ${creditorName}`,
      greeting: `Bonjour ${clientName},`,
      intro: `${creditorName} vous invite à consulter vos factures et effectuer vos paiements en ligne via notre portail sécurisé.`,
      buttonText: "Accéder au portail",
      features: {
        title: "Ce que vous pouvez faire:",
        items: [
          "Consulter toutes vos factures",
          "Voir votre historique de paiements",
          "Effectuer des paiements en ligne sécurisés",
          "Contacter votre créancier",
        ],
      },
      singleUseWarning: "Ce lien est à usage unique. Il ne sera plus valide après votre première visite.",
      expiry: `Ce lien est valide jusqu'au ${formatDate(expiresAt)}.`,
      fallback: "Si le bouton ne fonctionne pas, copiez-collez ce lien dans votre navigateur:",
      footer: {
        platform: "RelancePro Africa - Plateforme de gestion des créances",
        sentBy: `Ce message a été envoyé par ${creditorName} via RelancePro.`,
      },
    },
    en: {
      preview: `Access your invoices - ${creditorName}`,
      greeting: `Hello ${clientName},`,
      intro: `${creditorName} invites you to view your invoices and make online payments through our secure portal.`,
      buttonText: "Access Portal",
      features: {
        title: "What you can do:",
        items: [
          "View all your invoices",
          "See your payment history",
          "Make secure online payments",
          "Contact your creditor",
        ],
      },
      singleUseWarning: "This is a single-use link. It will no longer be valid after your first visit.",
      expiry: `This link is valid until ${formatDate(expiresAt)}.`,
      fallback: "If the button doesn't work, copy and paste this link into your browser:",
      footer: {
        platform: "RelancePro Africa - Debt Management Platform",
        sentBy: `This message was sent by ${creditorName} via RelancePro.`,
      },
    },
  };

  const t = translations[isFrench ? "fr" : "en"];

  return (
    <Html>
      <Head />
      <Preview>{t.preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Heading style={logo}>
              Relance<span style={logoOrange}>Pro</span> Africa
            </Heading>
          </Section>

          {/* Content */}
          <Section style={content}>
            <Text style={greeting}>{t.greeting}</Text>
            
            <Text style={paragraph}>{t.intro}</Text>

            {/* CTA Button */}
            <Section style={buttonContainer}>
              <Button style={button} href={portalUrl}>
                {t.buttonText}
              </Button>
            </Section>

            {/* Features */}
            <Section style={infoBox}>
              <Text style={infoTitle}>{t.features.title}</Text>
              <ul style={featureList}>
                {t.features.items.map((item, index) => (
                  <li key={index} style={featureItem}>
                    {item}
                  </li>
                ))}
              </ul>
            </Section>

            {/* Warning for single-use */}
            {isSingleUse ? (
              <Section style={warningBox}>
                <Text style={warningText}>
                  ⚠️ {t.singleUseWarning}
                </Text>
              </Section>
            ) : (
              <Text style={expiryText}>
                📅 {t.expiry}
              </Text>
            )}

            {/* Fallback link */}
            <Text style={fallbackText}>{t.fallback}</Text>
            <Link style={linkStyle} href={portalUrl}>
              {portalUrl}
            </Link>
          </Section>

          <Hr style={divider} />

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>{t.footer.platform}</Text>
            <Text style={footerText}>{t.footer.sentBy}</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// Styles
const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "20px 0 48px",
  marginBottom: "64px",
  borderRadius: "8px",
  maxWidth: "600px",
};

const header = {
  padding: "32px 48px",
  borderBottom: "2px solid #f97316",
  textAlign: "center" as const,
};

const logo = {
  fontSize: "28px",
  fontWeight: "bold",
  color: "#1f2937",
  margin: "0",
};

const logoOrange = {
  color: "#f97316",
};

const content = {
  padding: "32px 48px",
};

const greeting = {
  fontSize: "16px",
  lineHeight: "26px",
  color: "#374151",
  margin: "0 0 16px",
};

const paragraph = {
  fontSize: "16px",
  lineHeight: "26px",
  color: "#374151",
  margin: "0 0 24px",
};

const buttonContainer = {
  textAlign: "center" as const,
  margin: "32px 0",
};

const button = {
  backgroundColor: "#f97316",
  borderRadius: "8px",
  color: "#fff",
  fontSize: "16px",
  fontWeight: "bold",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "15px 30px",
};

const infoBox = {
  backgroundColor: "#f3f4f6",
  borderRadius: "8px",
  padding: "20px",
  margin: "24px 0",
};

const infoTitle = {
  fontSize: "14px",
  fontWeight: "bold",
  color: "#374151",
  margin: "0 0 12px",
};

const featureList = {
  margin: "0",
  paddingLeft: "20px",
};

const featureItem = {
  fontSize: "14px",
  lineHeight: "24px",
  color: "#4b5563",
  margin: "8px 0",
};

const warningBox = {
  backgroundColor: "#fef3c7",
  borderLeft: "4px solid #f59e0b",
  borderRadius: "4px",
  padding: "16px",
  margin: "24px 0",
};

const warningText = {
  fontSize: "14px",
  color: "#92400e",
  margin: "0",
};

const expiryText = {
  fontSize: "14px",
  color: "#6b7280",
  margin: "16px 0",
};

const fallbackText = {
  fontSize: "14px",
  color: "#6b7280",
  margin: "24px 0 8px",
};

const linkStyle = {
  color: "#f97316",
  fontSize: "14px",
  wordBreak: "break-all" as const,
};

const divider = {
  borderColor: "#e5e7eb",
  margin: "0 48px",
};

const footer = {
  textAlign: "center" as const,
  padding: "24px 48px",
};

const footerText = {
  fontSize: "12px",
  color: "#9ca3af",
  margin: "4px 0",
};

// Export helper function to render the email
export function renderPortalInvitationEmail(props: PortalInvitationEmailProps): string {
  return render(<PortalInvitationEmail {...props} />);
}
