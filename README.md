# RelancePro Africa 🌍

Plateforme SaaS B2B d'automatisation de relances clients pour les entreprises africaines.

## 🚀 Fonctionnalités

### Core Features
- **Relances automatisées** par Email et WhatsApp
- **IA intelligente** pour personnaliser les messages de relance
- **Multi-devises** : 35+ devises africaines (GNF par défaut)
- **Multi-langues** : Français et Anglais
- **Export PDF/Excel** des rapports et données

### Gestion
- Gestion des clients et créances
- Tableau de bord analytique
- Prédiction de paiement par IA
- Analyse de risque client

### Business
- Intégration Paystack pour les paiements africains
- Mode démo 7 jours (5 clients, 10 emails, 5 WhatsApp)
- 3 plans d'abonnement : Starter, Business, Enterprise
- API Webhooks pour intégrations

## 📦 Tech Stack

- **Framework** : Next.js 16 avec App Router
- **Language** : TypeScript
- **Styling** : Tailwind CSS + shadcn/ui
- **Database** : PostgreSQL (Supabase, Neon, etc.)
- **ORM** : Prisma
- **Auth** : NextAuth.js
- **Email** : Resend
- **WhatsApp** : Whapi.cloud
- **Paiements** : Paystack
- **IA** : z-ai-web-dev-sdk

## 🛠️ Installation

### Prérequis
- Node.js 18+ ou Bun
- PostgreSQL (Supabase, Neon, Railway, etc.)
- Comptes : Paystack, Resend, Whapi.cloud

### 1. Cloner le projet

```bash
git clone https://github.com/cheick-sk/relancepro-afrique.git
cd relancepro-afrique
bun install
```

### 2. Configuration environnement

```bash
cp .env.example .env.local
```

Éditer `.env.local` avec vos clés :

```env
# Base de données PostgreSQL
DATABASE_URL="postgresql://user:password@host:5432/relancepro?schema=public"

# NextAuth
NEXTAUTH_SECRET="votre-secret-tres-securise"
NEXTAUTH_URL="https://votre-domaine.com"

# Paystack
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY="pk_live_xxxxx"
PAYSTACK_SECRET_KEY="sk_live_xxxxx"

# Resend (Emails)
RESEND_API_KEY="re_xxxxx"
RESEND_FROM_EMAIL="noreply@votre-domaine.com"

# WhatsApp (Whapi.cloud)
WHAPI_API_KEY="votre-cle-whapi"
```

### 3. Initialiser la base de données

```bash
bun run db:generate
bun run db:push
```

### 4. Lancer en développement

```bash
bun run dev
```

## 🚀 Déploiement Production

### Render (Recommandé pour PostgreSQL)

Le projet inclut un fichier `render.yaml` pour déploiement automatique.

1. Connecter le repo GitHub à Render
2. Créer un nouveau Blueprint
3. Render créera automatiquement :
   - Web Service (application)
   - PostgreSQL Database
   - Cron Jobs (relances, rapports, nettoyage)
4. Configurer les variables d'environnement dans le dashboard

### Vercel (Alternative)

1. Connecter le repo GitHub à Vercel
2. Configurer les variables d'environnement
3. Déployer
4. Ajouter une base PostgreSQL externe (Supabase, Neon)

### Variables d'environnement requises

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | URL PostgreSQL |
| `NEXTAUTH_SECRET` | Secret pour JWT (générer avec `openssl rand -base64 32`) |
| `NEXTAUTH_URL` | URL de production |
| `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` | Clé publique Paystack |
| `PAYSTACK_SECRET_KEY` | Clé secrète Paystack |
| `RESEND_API_KEY` | Clé API Resend |
| `RESEND_FROM_EMAIL` | Email expéditeur |
| `WHAPI_API_KEY` | Clé API Whapi.cloud |

### Base de données

Options recommandées :
- **Supabase** : PostgreSQL gratuit avec auth intégrée
- **Neon** : PostgreSQL serverless
- **Railway** : PostgreSQL + hébergement

## 💰 Tarification

| Plan | Prix (GNF) | Clients | WhatsApp | Fonctionnalités |
|------|------------|---------|----------|-----------------|
| **Starter** | 50 000 FG/mois | 10 | 50/mois | Email illimité, PDF, IA basique |
| **Business** | 150 000 FG/mois | 100 | Illimité | + Excel, IA avancée, Rapports |
| **Enterprise** | 500 000 FG/mois | Illimité | Illimité | + API, Webhooks, Support 24/7 |

## 📁 Structure du projet

```
src/
├── app/
│   ├── (auth)/          # Pages auth (login, register)
│   ├── (dashboard)/     # Dashboard et pages protégées
│   ├── (legal)/         # CGV, Confidentialité
│   └── api/             # API Routes
├── components/
│   ├── ui/              # shadcn/ui components
│   ├── shared/          # Composants partagés
│   ├── chatbot/         # Chatbot IA
│   ├── demo/            # Composants mode démo
│   └── notifications/   # Système de notifications
├── lib/
│   ├── services/        # Services (email, whatsapp, ai, export)
│   ├── i18n/            # Internationalisation
│   └── auth/            # Configuration NextAuth
├── hooks/               # Hooks React personnalisés
└── types/               # Types TypeScript
```

## 🔧 Configuration des services

### Paystack (Paiements)

1. Créer un compte sur [paystack.com](https://paystack.com)
2. Obtenir les clés API dans Settings > API Keys
3. Configurer les webhooks pour `/api/paystack/webhook`

### Resend (Emails)

1. Créer un compte sur [resend.com](https://resend.com)
2. Vérifier votre domaine
3. Obtenir la clé API

### Whapi.cloud (WhatsApp)

1. Créer un compte sur [whapi.cloud](https://whapi.cloud)
2. Connecter votre numéro WhatsApp Business
3. Obtenir la clé API

## 🤖 Fonctionnalités IA

L'IA utilise `z-ai-web-dev-sdk` pour :

- **Génération de relances** : Messages personnalisés selon le client et le ton
- **Prédiction de paiement** : Probabilité de recouvrement
- **Analyse de risque** : Score de risque par client
- **Chatbot support** : Aide et onboarding

## 🌐 Internationalisation

Langues supportées :
- 🇫🇷 Français (défaut)
- 🇬🇧 English

Devises supportées : GNF, XOF, XAF, NGN, GHS, KES, ZAR, EUR, USD, et plus...

## 📄 Licence

Propriétaire - Tous droits réservés

## 👥 Contact

- **Email** : contact@relancepro.africa
- **Téléphone** : +224 620 00 00 00
- **Site** : https://relancepro.africa
