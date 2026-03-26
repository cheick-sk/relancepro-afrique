# 🚀 Guide de Déploiement - RelancePro Africa

## ✅ Prérequis

- [ ] Compte Render (https://render.com)
- [ ] Compte GitHub connecté à Render
- [ ] Repository: `cheick-sk/relancepro-afrique`

---

## 📋 Étapes de Déploiement

### 1. Créer le Blueprint Render

1. Allez sur https://dashboard.render.com
2. Cliquez sur **New** → **Blueprint**
3. Sélectionnez le repository `cheick-sk/relancepro-afrique`
4. Cliquez sur **Connect**

### 2. Services créés automatiquement

| Service | Type | Plan | Région |
|---------|------|------|--------|
| relancepro-africa | Web (Docker) | Starter | Oregon |
| relancepro-db | PostgreSQL | Starter | Oregon |
| relancepro-reminders | Cron | Starter | Oregon |
| relancepro-predictions | Cron | Starter | Oregon |
| relancepro-reports | Cron | Starter | Oregon |
| relancepro-cleanup | Cron | Starter | Oregon |

### 3. Configurer les variables d'environnement (Optionnel)

Après le déploiement, ajoutez ces clés dans le dashboard:

| Variable | Service | Description |
|----------|---------|-------------|
| RESEND_API_KEY | Resend | Envoi d'emails |
| PAYSTACK_SECRET_KEY | Paystack | Paiements Africa |
| PAYSTACK_PUBLIC_KEY | Paystack | Paiements Africa |
| WHATSAPP_API_KEY | Whapi.cloud | Messages WhatsApp |
| TWILIO_ACCOUNT_SID | Twilio | SMS/Appels |
| TWILIO_AUTH_TOKEN | Twilio | SMS/Appels |
| TWILIO_PHONE_NUMBER | Twilio | Numéro SMS |

---

## 🌍 URLs de Production

- **Application**: https://relancepro-africa.onrender.com
- **API Health**: https://relancepro-africa.onrender.com/api/health
- **Documentation API**: https://relancepro-africa.onrender.com/api-docs

---

## 🔧 Résolution de Problèmes

### Build Failure
1. Vérifiez les logs dans le dashboard Render
2. Assurez-vous que le Dockerfile est à jour
3. Vérifiez les variables d'environnement

### Database Connection Error
1. Vérifiez que la base PostgreSQL est créée
2. Les variables DATABASE_URL sont auto-configurées

### 502 Bad Gateway
1. Attendez 2-3 minutes que le service démarre
2. Vérifiez le health check endpoint

---

## 📊 Monitoring

- **Logs**: Dashboard → relancepro-africa → Logs
- **Metrics**: Dashboard → relancepro-africa → Metrics
- **Events**: Dashboard → relancepro-africa → Events

---

## 💰 Coûts Estimés (Plan Starter)

| Service | Coût/mois |
|---------|-----------|
| Web Service | Gratuit (veille après 15min) |
| PostgreSQL | Gratuit (1GB stockage) |
| Cron Jobs | Gratuit |
| **Total** | **$0/mois** |

Pour production 24/7: Plan Standard (~$7/mois)

---

## ✨ Fonctionnalités

- ✅ Authentification sécurisée (NextAuth.js)
- ✅ Gestion des clients et créances
- ✅ Relances automatiques (Email, WhatsApp, SMS)
- ✅ Prédictions IA de paiement
- ✅ Tableau de bord analytique
- ✅ Portail client
- ✅ API REST complète
- ✅ Support multi-devises (GNF, XOF, XAF, EUR, USD)

---

**Dernière mise à jour**: Mars 2026
