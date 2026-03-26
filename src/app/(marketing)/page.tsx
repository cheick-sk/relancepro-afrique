import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  ArrowRight,
  Mail,
  MessageSquare,
  TrendingUp,
  Shield,
  BarChart3,
  CheckCircle2,
  Phone,
} from "lucide-react";

const features = [
  {
    icon: Mail,
    title: "Relances Email Automatisées",
    description: "Envoyez des rappels professionnels automatiques selon un calendrier intelligent.",
  },
  {
    icon: MessageSquare,
    title: "WhatsApp Business",
    description: "Communiquez directement via WhatsApp pour un contact plus personnel et efficace.",
  },
  {
    icon: Phone,
    title: "SMS & Appels Vocaux",
    description: "Relancez vos clients par SMS ou appels vocaux automatisés.",
  },
  {
    icon: TrendingUp,
    title: "Prédictions IA",
    description: "Anticipez les paiements grâce à notre intelligence artificielle prédictive.",
  },
  {
    icon: Shield,
    title: "Sécurité Renforcée",
    description: "Double authentification, chiffrement des données et audit complet.",
  },
  {
    icon: BarChart3,
    title: "Tableaux de Bord",
    description: "Suivez vos créances, paiements et performances en temps réel.",
  },
];

const pricingPlans = [
  {
    name: "Starter",
    price: "50 000",
    currency: "GNF",
    period: "/mois",
    description: "Pour les freelances et petites entreprises",
    features: [
      "Jusqu'à 10 clients",
      "50 relances/mois",
      "Email uniquement",
      "Support email",
    ],
    cta: "Commencer",
    popular: false,
  },
  {
    name: "Business",
    price: "150 000",
    currency: "GNF",
    period: "/mois",
    description: "Pour les PME en croissance",
    features: [
      "100 clients inclus",
      "Relances illimitées",
      "Email + WhatsApp + SMS",
      "Prédictions IA",
      "Support prioritaire",
    ],
    cta: "Essai gratuit",
    popular: true,
  },
  {
    name: "Enterprise",
    price: "500 000",
    currency: "GNF",
    period: "/mois",
    description: "Pour les grandes entreprises",
    features: [
      "Clients illimités",
      "Tous canaux de relance",
      "API complète",
      "Intégrations comptables",
      "Account manager dédié",
    ],
    cta: "Nous contacter",
    popular: false,
  },
];

const stats = [
  { value: "98%", label: "Taux de récupération" },
  { value: "2.5M", label: "GNF récupérés/mois" },
  { value: "500+", label: "Entreprises" },
  { value: "24/7", label: "Disponibilité" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 dark:from-gray-950 dark:via-gray-900 dark:to-orange-950/20">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur-md dark:bg-gray-900/80">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
              <span className="text-white font-bold text-lg">R</span>
            </div>
            <div>
              <h1 className="font-bold text-lg">RelancePro</h1>
              <p className="text-xs text-muted-foreground">Africa</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost">Connexion</Button>
            </Link>
            <Link href="/register">
              <Button className="bg-orange-500 hover:bg-orange-600">
                Essai gratuit
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <Badge className="mb-6 bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300">
          Conçu pour l&apos;Afrique
        </Badge>
        <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
          Récupérez vos impayés<br />automatiquement
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
          RelancePro Africa est la solution B2B qui automatise vos relances clients 
          et vous aide à récupérer vos créances. Simple, efficace, adapté à l&apos;Afrique.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/register">
            <Button size="lg" className="bg-orange-500 hover:bg-orange-600 text-lg px-8">
              Démarrer gratuitement
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button size="lg" variant="outline" className="text-lg px-8">
              Voir la démo
            </Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-16 max-w-4xl mx-auto">
          {stats.map((stat, index) => (
            <div key={index} className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-orange-600">{stat.value}</div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white dark:bg-gray-900/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Tout ce dont vous avez besoin
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Une suite complète d&apos;outils pour gérer efficacement vos créances clients
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-orange-600" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-white dark:bg-gray-900/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Tarifs adaptés à l&apos;Afrique
            </h2>
            <p className="text-lg text-muted-foreground">
              En GNF, XOF ou XAF - sans engagement
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {pricingPlans.map((plan, index) => (
              <Card
                key={index}
                className={`relative ${plan.popular ? 'border-orange-500 border-2' : ''}`}
              >
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-orange-500">
                    Populaire
                  </Badge>
                )}
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{plan.description}</p>
                  <div className="mb-6">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground"> {plan.currency}</span>
                    <span className="text-muted-foreground">{plan.period}</span>
                  </div>
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Link href="/register">
                    <Button
                      className={`w-full ${plan.popular ? 'bg-orange-500 hover:bg-orange-600' : ''}`}
                      variant={plan.popular ? 'default' : 'outline'}
                    >
                      {plan.cta}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <Card className="bg-gradient-to-r from-orange-500 to-amber-500 text-white border-0">
            <CardContent className="p-12 text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Prêt à récupérer vos impayés ?
              </h2>
              <p className="text-lg mb-8 text-white/90">
                Commencez gratuitement, sans carte bancaire.
              </p>
              <Link href="/register">
                <Button size="lg" variant="secondary" className="text-lg px-8">
                  Créer mon compte gratuit
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
                <span className="text-white font-bold">R</span>
              </div>
              <span className="font-bold">RelancePro Africa</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <Link href="/mentions-legales">Mentions légales</Link>
              <Link href="/cgv">CGV</Link>
              <Link href="/confidentialite">Confidentialité</Link>
            </div>
            <div className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} RelancePro Africa
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
