"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef, useState } from "react";
import Link from "next/link";
import {
  Mail,
  MessageCircle,
  Bot,
  Coins,
  FileSpreadsheet,
  CreditCard,
  Check,
  ChevronDown,
  Menu,
  X,
  ArrowRight,
  Play,
  Star,
  Shield,
  Zap,
  Globe,
  Phone,
  MapPin,
  Facebook,
  Twitter,
  Linkedin,
  Instagram,
  Moon,
  Sun,
  Sparkles,
  TrendingUp,
  Users,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { AIChatbot } from "@/components/chatbot/ai-chatbot";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Animation variants
const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 },
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const scaleIn = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1 },
  transition: { duration: 0.5 },
};

// Feature card component
function FeatureCard({
  icon: Icon,
  title,
  description,
  delay = 0,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ y: -5, transition: { duration: 0.2 } }}
    >
      <Card className="h-full bg-gradient-to-br from-white to-orange-50/30 dark:from-gray-900 dark:to-orange-950/20 border-orange-100 dark:border-orange-900/30 hover:border-orange-300 dark:hover:border-orange-700 transition-all duration-300 hover:shadow-lg hover:shadow-orange-100 dark:hover:shadow-orange-900/20">
        <CardHeader>
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center mb-4 shadow-lg shadow-orange-200 dark:shadow-orange-900/30">
            <Icon className="w-7 h-7 text-white" />
          </div>
          <CardTitle className="text-xl text-gray-900 dark:text-white">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <CardDescription className="text-gray-600 dark:text-gray-400 text-base leading-relaxed">
            {description}
          </CardDescription>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Pricing card component
function PricingCard({
  name,
  price,
  currency,
  description,
  features,
  popular = false,
  delay = 0,
}: {
  name: string;
  price: string;
  currency: string;
  description: string;
  features: string[];
  popular?: boolean;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ y: -5, transition: { duration: 0.2 } }}
      className="relative"
    >
      {popular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
          <Badge className="bg-gradient-to-r from-orange-500 to-amber-500 text-white px-4 py-1 shadow-lg">
            <Sparkles className="w-3 h-3 mr-1" />
            Populaire
          </Badge>
        </div>
      )}
      <Card
        className={`h-full relative overflow-hidden ${
          popular
            ? "bg-gradient-to-br from-orange-500 to-amber-600 text-white border-2 border-orange-400 shadow-2xl shadow-orange-200 dark:shadow-orange-900/30"
            : "bg-white dark:bg-gray-900 border-orange-100 dark:border-orange-900/30"
        }`}
      >
        <CardHeader className="text-center pb-4">
          <CardTitle
            className={`text-2xl font-bold ${popular ? "text-white" : "text-gray-900 dark:text-white"}`}
          >
            {name}
          </CardTitle>
          <CardDescription
            className={`text-sm ${popular ? "text-orange-100" : "text-gray-600 dark:text-gray-400"}`}
          >
            {description}
          </CardDescription>
          <div className="mt-4">
            <span className={`text-5xl font-bold ${popular ? "text-white" : "text-orange-500"}`}>
              {price}
            </span>
            <span className={`text-lg ml-1 ${popular ? "text-orange-100" : "text-gray-500"}`}>
              {currency}/mois
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="space-y-3">
            {features.map((feature, index) => (
              <li key={index} className="flex items-start gap-3">
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    popular ? "bg-white/20" : "bg-orange-100 dark:bg-orange-900/30"
                  }`}
                >
                  <Check className={`w-3 h-3 ${popular ? "text-white" : "text-orange-500"}`} />
                </div>
                <span
                  className={`text-sm ${
                    popular ? "text-orange-50" : "text-gray-600 dark:text-gray-400"
                  }`}
                >
                  {feature}
                </span>
              </li>
            ))}
          </ul>
          <Button
            className={`w-full mt-6 ${
              popular
                ? "bg-white text-orange-600 hover:bg-orange-50 shadow-lg"
                : "bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:from-orange-600 hover:to-amber-600 shadow-lg shadow-orange-200 dark:shadow-orange-900/30"
            }`}
            size="lg"
          >
            Commencer
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Testimonial card
function TestimonialCard({
  name,
  role,
  company,
  content,
  delay = 0,
}: {
  name: string;
  role: string;
  company: string;
  content: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
    >
      <Card className="h-full bg-white dark:bg-gray-900 border-orange-100 dark:border-orange-900/30 hover:shadow-lg transition-all duration-300">
        <CardContent className="pt-6">
          <div className="flex gap-1 mb-4">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-5 h-5 fill-orange-400 text-orange-400" />
            ))}
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-6 italic">&ldquo;{content}&rdquo;</p>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white font-bold text-lg">
              {name[0]}
            </div>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white">{name}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {role}, {company}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currency, setCurrency] = useState("GNF");
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });

  const heroY = useTransform(scrollYProgress, [0, 1], [0, 150]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  const currencies: Record<string, { symbol: string; rate: number }> = {
    GNF: { symbol: "FG", rate: 1 },
    XOF: { symbol: "FCFA", rate: 0.058 },
    XAF: { symbol: "FCFA", rate: 0.058 },
    USD: { symbol: "$", rate: 0.00011 },
    EUR: { symbol: "€", rate: 0.000095 },
  };

  const formatPrice = (basePrice: number) => {
    const converted = Math.round(basePrice * currencies[currency].rate);
    return converted.toLocaleString("fr-FR");
  };

  const features = [
    {
      icon: Mail,
      title: "Relances Email Automatisées",
      description:
        "Envoyez automatiquement des rappels par email personnalisés selon des scénarios intelligents adaptés à chaque client.",
    },
    {
      icon: MessageCircle,
      title: "WhatsApp Business",
      description:
        "Atteignez vos clients là où ils sont avec des relances via WhatsApp, le canal préféré en Afrique.",
    },
    {
      icon: Bot,
      title: "IA Intelligente",
      description:
        "Notre IA analyse le comportement de paiement et adapte automatiquement le ton et le timing des relances.",
    },
    {
      icon: Coins,
      title: "Multi-Devises",
      description:
        "Gérez des créances en GNF, XOF, XAF, USD, EUR et plus. Conversion automatique et rapports unifiés.",
    },
    {
      icon: FileSpreadsheet,
      title: "Exports PDF & Excel",
      description:
        "Générez des rapports professionnels et exportez vos données pour votre comptabilité en un clic.",
    },
    {
      icon: CreditCard,
      title: "Paiement Paystack",
      description:
        "Intégration native avec Paystack pour permettre à vos clients de payer directement depuis la relance.",
    },
  ];

  const pricingPlans = [
    {
      name: "Starter",
      basePrice: 50000,
      description: "Pour les petites entreprises",
      features: [
        "Jusqu'à 100 clients",
        "500 relances/mois",
        "Email automatisé",
        "Rapports basiques",
        "Support email",
      ],
    },
    {
      name: "Business",
      basePrice: 150000,
      description: "Pour les PME en croissance",
      popular: true,
      features: [
        "Jusqu'à 1 000 clients",
        "Relances illimitées",
        "Email & WhatsApp",
        "IA Smart Reminders",
        "Exports PDF/Excel",
        "Intégration Paystack",
        "Support prioritaire",
      ],
    },
    {
      name: "Enterprise",
      basePrice: 500000,
      description: "Pour les grandes entreprises",
      features: [
        "Clients illimités",
        "Relances illimitées",
        "Tous les canaux",
        "IA avancée personnalisée",
        "API dédiée",
        "Account manager",
        "SLA garanti",
      ],
    },
  ];

  const testimonials = [
    {
      name: "Amadou Diallo",
      role: "Directeur Financier",
      company: "Tech Solutions Guinée",
      content:
        "Depuis que nous utilisons RelancePro, nos délais de paiement ont diminué de 40%. L'automatisation WhatsApp est un game-changer.",
    },
    {
      name: "Fatou Koné",
      role: "CEO",
      company: "Boutique Afrique",
      content:
        "Simple à utiliser et très efficace. Nous avons récupéré plus de 50 millions GNF d'impayés en 3 mois.",
    },
    {
      name: "Ibrahim Touré",
      role: "Responsable Recouvrement",
      company: "Global Services CI",
      content:
        "L'IA comprend vraiment le contexte africain. Nos clients apprécient le ton adapté des relances.",
    },
  ];

  const faqs = [
    {
      question: "Comment fonctionne la période d'essai ?",
      answer:
        "Vous bénéficiez de 14 jours d'essai gratuit avec toutes les fonctionnalités Business. Aucune carte bancaire requise pour commencer.",
    },
    {
      question: "Puis-je annuler mon abonnement à tout moment ?",
      answer:
        "Oui, vous pouvez annuler votre abonnement à tout moment sans frais cachés. Votre accès reste actif jusqu'à la fin de la période facturée.",
    },
    {
      question: "L'IA est-elle vraiment efficace pour les relances ?",
      answer:
        "Notre IA analyse les patterns de paiement, le contexte culturel et l'historique client pour adapter le ton et le timing optimal. En moyenne, nos clients voient une amélioration de 35% du taux de recouvrement.",
    },
    {
      question: "Quels moyens de paiement acceptez-vous ?",
      answer:
        "Nous acceptons les paiements par Mobile Money (Orange Money, MTN Money), carte bancaire, et virement bancaire via Paystack.",
    },
    {
      question: "Mes données sont-elles sécurisées ?",
      answer:
        "Absolument. Vos données sont chiffrées en transit et au repos, hébergées sur des serveurs sécurisés conformes aux standards internationaux (RGPD, ISO 27001).",
    },
    {
      question: "Proposez-vous une formation pour mon équipe ?",
      answer:
        "Oui, nous offrons des sessions de formation gratuites pour les plans Business et Enterprise. Un onboarding personnalisé est inclus pour faciliter la prise en main.",
    },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      {/* Navigation */}
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5 }}
        className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-gray-950/80 backdrop-blur-lg border-b border-orange-100 dark:border-orange-900/30"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-200 dark:shadow-orange-900/30">
                <MessageCircle className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">
                RelancePro
              </span>
            </Link>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center gap-8">
              <a
                href="#fonctionnalites"
                className="text-gray-600 dark:text-gray-400 hover:text-orange-500 dark:hover:text-orange-400 transition-colors"
              >
                Fonctionnalités
              </a>
              <a
                href="#tarifs"
                className="text-gray-600 dark:text-gray-400 hover:text-orange-500 dark:hover:text-orange-400 transition-colors"
              >
                Tarifs
              </a>
              <a
                href="#temoignages"
                className="text-gray-600 dark:text-gray-400 hover:text-orange-500 dark:hover:text-orange-400 transition-colors"
              >
                Témoignages
              </a>
              <a
                href="#faq"
                className="text-gray-600 dark:text-gray-400 hover:text-orange-500 dark:hover:text-orange-400 transition-colors"
              >
                FAQ
              </a>
            </div>

            {/* CTA Buttons */}
            <div className="hidden md:flex items-center gap-3">
              <Link href="/login">
                <Button variant="ghost" className="text-gray-600 dark:text-gray-400">
                  Se connecter
                </Button>
              </Link>
              <Link href="/register">
                <Button className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-lg shadow-orange-200 dark:shadow-orange-900/30">
                  Essai gratuit
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-900/20"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6 text-gray-600 dark:text-gray-400" />
              ) : (
                <Menu className="w-6 h-6 text-gray-600 dark:text-gray-400" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white dark:bg-gray-950 border-t border-orange-100 dark:border-orange-900/30"
          >
            <div className="px-4 py-4 space-y-4">
              <a
                href="#fonctionnalites"
                className="block text-gray-600 dark:text-gray-400 hover:text-orange-500"
              >
                Fonctionnalités
              </a>
              <a href="#tarifs" className="block text-gray-600 dark:text-gray-400 hover:text-orange-500">
                Tarifs
              </a>
              <a
                href="#temoignages"
                className="block text-gray-600 dark:text-gray-400 hover:text-orange-500"
              >
                Témoignages
              </a>
              <a href="#faq" className="block text-gray-600 dark:text-gray-400 hover:text-orange-500">
                FAQ
              </a>
              <div className="pt-4 space-y-2">
                <Link href="/login" className="block">
                  <Button variant="outline" className="w-full">
                    Se connecter
                  </Button>
                </Link>
                <Link href="/register" className="block">
                  <Button className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white">
                    Essai gratuit
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </motion.nav>

      {/* Hero Section */}
      <section
        ref={heroRef}
        className="relative min-h-screen flex items-center pt-16 overflow-hidden"
      >
        {/* Background Elements */}
        <div className="absolute inset-0 bg-gradient-to-br from-orange-50 via-white to-amber-50 dark:from-gray-950 dark:via-gray-900 dark:to-orange-950/20" />
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-orange-100/50 to-transparent dark:from-orange-900/10" />

        {/* Animated Background Shapes */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            animate={{
              x: [0, 30, 0],
              y: [0, -30, 0],
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute top-20 right-20 w-72 h-72 bg-orange-200/30 dark:bg-orange-500/10 rounded-full blur-3xl"
          />
          <motion.div
            animate={{
              x: [0, -20, 0],
              y: [0, 20, 0],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute bottom-20 left-20 w-96 h-96 bg-amber-200/30 dark:bg-amber-500/10 rounded-full blur-3xl"
          />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7 }}
              style={{ y: heroY, opacity: heroOpacity }}
            >
              <Badge className="mb-6 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800">
                <Sparkles className="w-3 h-3 mr-1" />
                Nouveau : Intégration WhatsApp Business
              </Badge>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white leading-tight mb-6">
                Récupérez vos impayés{" "}
                <span className="bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">
                  automatiquement
                </span>
              </h1>

              <p className="text-xl text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
                La solution SaaS de relance automatisée conçue pour les entreprises africaines.
                Email, WhatsApp et IA pour un recouvrement efficace de vos créances.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <Link href="/register">
                  <Button
                    size="lg"
                    className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-xl shadow-orange-200 dark:shadow-orange-900/30 text-lg px-8 py-6"
                  >
                    <Play className="w-5 h-5 mr-2" />
                    Démarrer l'essai gratuit
                  </Button>
                </Link>
                <a href="#tarifs">
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-2 border-orange-300 dark:border-orange-700 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 text-lg px-8 py-6"
                  >
                    Voir les tarifs
                  </Button>
                </a>
              </div>

              {/* Trust Badges */}
              <div className="flex flex-wrap items-center gap-6 text-sm text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-green-500" />
                  <span>Sécurisé</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-500" />
                  <span>14 jours essai</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-orange-500" />
                  <span>500+ entreprises</span>
                </div>
              </div>
            </motion.div>

            {/* Right Content - Hero Illustration */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="relative"
            >
              <div className="relative">
                {/* Main Card */}
                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl shadow-orange-200/50 dark:shadow-orange-900/30 p-6 border border-orange-100 dark:border-orange-900/30"
                >
                  {/* Dashboard Preview */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        Tableau de bord
                      </h3>
                      <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        +35% ce mois
                      </Badge>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 rounded-xl p-3 text-center">
                        <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                          2.5M
                        </p>
                        <p className="text-xs text-gray-500">GNF récupérés</p>
                      </div>
                      <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-3 text-center">
                        <p className="text-2xl font-bold text-green-600 dark:text-green-400">87%</p>
                        <p className="text-xs text-gray-500">Taux succès</p>
                      </div>
                      <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-xl p-3 text-center">
                        <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">156</p>
                        <p className="text-xs text-gray-500">Relances</p>
                      </div>
                    </div>

                    {/* Recent Activity */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-3 p-2 rounded-lg bg-gray-50 dark:bg-gray-800">
                        <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                          <Check className="w-4 h-4 text-green-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            Paiement reçu
                          </p>
                          <p className="text-xs text-gray-500">Mamadou Diallo - 250 000 GNF</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-2 rounded-lg bg-gray-50 dark:bg-gray-800">
                        <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                          <MessageCircle className="w-4 h-4 text-orange-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            WhatsApp envoyé
                          </p>
                          <p className="text-xs text-gray-500">Fatou Koné - Rappel J+7</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Floating Cards */}
                <motion.div
                  animate={{ x: [0, 10, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute -top-4 -right-4 bg-white dark:bg-gray-800 rounded-xl shadow-xl p-3 border border-orange-100 dark:border-orange-900/30"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                      <TrendingUp className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Recouvrement</p>
                      <p className="font-bold text-green-600">+45%</p>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  animate={{ x: [0, -10, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                  className="absolute -bottom-4 -left-4 bg-white dark:bg-gray-800 rounded-xl shadow-xl p-3 border border-orange-100 dark:border-orange-900/30"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                      <Bot className="w-4 h-4 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">IA Active</p>
                      <p className="font-bold text-orange-600">Optimisée</p>
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <a href="#fonctionnalites" className="flex flex-col items-center text-gray-400">
            <span className="text-sm mb-2">Découvrir</span>
            <ChevronDown className="w-6 h-6" />
          </a>
        </motion.div>
      </section>

      {/* Features Section */}
      <section id="fonctionnalites" className="py-24 bg-gray-50 dark:bg-gray-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <Badge className="mb-4 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800">
              Fonctionnalités
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Tout ce dont vous avez besoin pour{" "}
              <span className="bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">
                récupérer vos créances
              </span>
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Une suite complète d&apos;outils conçus pour maximiser votre taux de recouvrement
              tout en préservant la relation client.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <FeatureCard key={index} {...feature} delay={index * 0.1} />
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="tarifs" className="py-24 bg-white dark:bg-gray-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <Badge className="mb-4 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800">
              Tarifs
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Des tarifs adaptés à{" "}
              <span className="bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">
                votre croissance
              </span>
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-8">
              Commencez gratuitement, évoluez selon vos besoins.
            </p>

            {/* Currency Selector */}
            <div className="flex items-center justify-center gap-3">
              <span className="text-gray-600 dark:text-gray-400">Afficher en :</span>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="w-32 border-orange-200 dark:border-orange-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GNF">GNF (FG)</SelectItem>
                  <SelectItem value="XOF">XOF (FCFA)</SelectItem>
                  <SelectItem value="XAF">XAF (FCFA)</SelectItem>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 items-start">
            {pricingPlans.map((plan, index) => (
              <PricingCard
                key={index}
                name={plan.name}
                price={formatPrice(plan.basePrice)}
                currency={currencies[currency].symbol}
                description={plan.description}
                features={plan.features}
                popular={plan.popular}
                delay={index * 0.1}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="temoignages" className="py-24 bg-gray-50 dark:bg-gray-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <Badge className="mb-4 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800">
              Témoignages
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Ils nous font{" "}
              <span className="bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">
                confiance
              </span>
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Découvrez comment RelancePro aide les entreprises africaines à améliorer leur
              trésorerie.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <TestimonialCard key={index} {...testimonial} delay={index * 0.1} />
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-24 bg-white dark:bg-gray-950">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <Badge className="mb-4 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800">
              FAQ
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Questions{" "}
              <span className="bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">
                fréquentes
              </span>
            </h2>
          </motion.div>

          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <AccordionItem
                  value={`item-${index}`}
                  className="bg-white dark:bg-gray-900 rounded-xl border border-orange-100 dark:border-orange-900/30 px-6"
                >
                  <AccordionTrigger className="text-left text-gray-900 dark:text-white hover:text-orange-500 dark:hover:text-orange-400">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-gray-600 dark:text-gray-400">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              </motion.div>
            ))}
          </Accordion>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-r from-orange-500 to-amber-500 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }} />
        </div>

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
              Prêt à récupérer vos impayés ?
            </h2>
            <p className="text-xl text-orange-100 mb-8 max-w-2xl mx-auto">
              Rejoignez plus de 500 entreprises africaines qui font confiance à RelancePro pour
              automatiser leur recouvrement.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register">
                <Button
                  size="lg"
                  className="bg-white text-orange-600 hover:bg-orange-50 shadow-xl text-lg px-8 py-6"
                >
                  <Zap className="w-5 h-5 mr-2" />
                  Démarrer maintenant
                </Button>
              </Link>
              <a href="mailto:contact@relancepro.africa">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-2 border-white text-white hover:bg-white/10 text-lg px-8 py-6"
                >
                  <Mail className="w-5 h-5 mr-2" />
                  Nous contacter
                </Button>
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 dark:bg-gray-950 text-gray-400 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
            {/* Logo & Description */}
            <div className="lg:col-span-1">
              <Link href="/" className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
                  <MessageCircle className="w-6 h-6 text-white" />
                </div>
                <span className="text-xl font-bold text-white">RelancePro</span>
              </Link>
              <p className="text-gray-400 mb-4">
                La solution de relance automatisée conçue pour les entreprises africaines.
              </p>
              <div className="flex gap-4">
                <a
                  href="#"
                  className="w-10 h-10 rounded-full bg-gray-800 hover:bg-orange-500 flex items-center justify-center transition-colors"
                >
                  <Facebook className="w-5 h-5" />
                </a>
                <a
                  href="#"
                  className="w-10 h-10 rounded-full bg-gray-800 hover:bg-orange-500 flex items-center justify-center transition-colors"
                >
                  <Twitter className="w-5 h-5" />
                </a>
                <a
                  href="#"
                  className="w-10 h-10 rounded-full bg-gray-800 hover:bg-orange-500 flex items-center justify-center transition-colors"
                >
                  <Linkedin className="w-5 h-5" />
                </a>
                <a
                  href="#"
                  className="w-10 h-10 rounded-full bg-gray-800 hover:bg-orange-500 flex items-center justify-center transition-colors"
                >
                  <Instagram className="w-5 h-5" />
                </a>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="text-white font-semibold mb-4">Liens rapides</h3>
              <ul className="space-y-2">
                <li>
                  <a href="#fonctionnalites" className="hover:text-orange-400 transition-colors">
                    Fonctionnalités
                  </a>
                </li>
                <li>
                  <a href="#tarifs" className="hover:text-orange-400 transition-colors">
                    Tarifs
                  </a>
                </li>
                <li>
                  <a href="#temoignages" className="hover:text-orange-400 transition-colors">
                    Témoignages
                  </a>
                </li>
                <li>
                  <a href="#faq" className="hover:text-orange-400 transition-colors">
                    FAQ
                  </a>
                </li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h3 className="text-white font-semibold mb-4">Contact</h3>
              <ul className="space-y-2">
                <li className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-orange-400" />
                  <a href="mailto:contact@relancepro.africa" className="hover:text-orange-400 transition-colors">
                    contact@relancepro.africa
                  </a>
                </li>
                <li className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-orange-400" />
                  <a href="tel:+224622000000" className="hover:text-orange-400 transition-colors">
                    +224 622 00 00 00
                  </a>
                </li>
                <li className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-orange-400 mt-1" />
                  <span>Conakry, Guinée</span>
                </li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h3 className="text-white font-semibold mb-4">Légal</h3>
              <ul className="space-y-2">
                <li>
                  <a href="#" className="hover:text-orange-400 transition-colors">
                    Conditions Générales (CGV)
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-orange-400 transition-colors">
                    Politique de confidentialité
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-orange-400 transition-colors">
                    Mentions légales
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-orange-400 transition-colors">
                    Politique cookies
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm">
              © {new Date().getFullYear()} RelancePro Africa. Tous droits réservés.
            </p>
            <div className="flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1">
                <Globe className="w-4 h-4 text-orange-400" />
                Disponible en Afrique
              </span>
              <span className="flex items-center gap-1">
                <Shield className="w-4 h-4 text-green-400" />
                Données sécurisées
              </span>
            </div>
          </div>
        </div>
      </footer>

      {/* AI Chatbot */}
      <AIChatbot />
    </div>
  );
}
