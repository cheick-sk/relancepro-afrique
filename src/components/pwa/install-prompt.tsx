"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { usePWA } from "@/hooks/use-pwa";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Download,
  X,
  Smartphone,
  Wifi,
  Bell,
  Zap,
  Shield,
  ArrowRight,
  Check,
} from "lucide-react";

// Helper function to check if prompt was dismissed
function getIsDismissed(key: string, maxHours: number): boolean {
  if (typeof window === "undefined") return false;
  const dismissedTime = localStorage.getItem(key);
  if (dismissedTime) {
    const hoursSinceDismissed =
      (Date.now() - parseInt(dismissedTime)) / (1000 * 60 * 60);
    return hoursSinceDismissed < maxHours;
  }
  return false;
}

interface InstallPromptProps {
  // Callback quand l'app est installée
  onInstalled?: () => void;
  // Callback quand le prompt est dismissé
  onDismissed?: () => void;
  // Délai avant d'afficher le prompt (en ms)
  delay?: number;
  // Afficher automatiquement
  autoShow?: boolean;
}

export function InstallPrompt({
  onInstalled,
  onDismissed,
  delay = 3000,
  autoShow = true,
}: InstallPromptProps) {
  const { canInstall, isInstalled, installApp } = usePWA();
  const [isOpen, setIsOpen] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  
  // Initialize dismissed state from localStorage
  const dismissedInitially = useMemo(() => getIsDismissed("pwa-install-dismissed", 168), []);
  const [dismissed, setDismissed] = useState(dismissedInitially);

  // Afficher le prompt après un délai
  useEffect(() => {
    if (autoShow && canInstall && !isInstalled && !dismissed) {
      const timer = setTimeout(() => setIsOpen(true), delay);
      return () => clearTimeout(timer);
    }
  }, [canInstall, isInstalled, dismissed, delay, autoShow]);

  const handleInstall = useCallback(async () => {
    setIsInstalling(true);
    
    try {
      const installed = await installApp();
      
      if (installed) {
        setIsOpen(false);
        onInstalled?.();
      }
    } finally {
      setIsInstalling(false);
    }
  }, [installApp, onInstalled]);

  const handleDismiss = useCallback(() => {
    setIsOpen(false);
    setDismissed(true);
    localStorage.setItem("pwa-install-dismissed", Date.now().toString());
    onDismissed?.();
  }, [onDismissed]);

  // Ne rien afficher si déjà installé ou pas installable
  if (isInstalled || !canInstall) {
    return null;
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent side="bottom" className="h-auto rounded-t-2xl">
        <SheetHeader className="text-left pb-2">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-lg">
              <Download className="h-7 w-7 text-white" />
            </div>
            <div>
              <SheetTitle className="text-xl">Installer RelancePro</SheetTitle>
              <SheetDescription className="text-sm">
                Ajoutez l&apos;application à votre écran d&apos;accueil
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="py-4 space-y-4">
          {/* Benefits */}
          <div className="grid grid-cols-2 gap-3">
            <BenefitItem
              icon={Zap}
              title="Accès rapide"
              description="Lancez l'app en un clic"
            />
            <BenefitItem
              icon={Wifi}
              title="Hors ligne"
              description="Fonctionne sans internet"
            />
            <BenefitItem
              icon={Bell}
              title="Notifications"
              description="Alertes en temps réel"
            />
            <BenefitItem
              icon={Shield}
              title="Sécurisé"
              description="Données protégées"
            />
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button
              size="lg"
              className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white"
              onClick={handleInstall}
              disabled={isInstalling}
            >
              {isInstalling ? (
                <>
                  <div className="h-5 w-5 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Installation...
                </>
              ) : (
                <>
                  <Download className="h-5 w-5 mr-2" />
                  Installer
                </>
              )}
            </Button>
            <Button
              size="lg"
              variant="ghost"
              className="sm:w-auto"
              onClick={handleDismiss}
            >
              Plus tard
            </Button>
          </div>

          {/* Instructions iOS */}
          <p className="text-xs text-muted-foreground text-center">
            Sur iOS : Appuyez sur Partager {">"} Sur l&apos;écran d&apos;accueil
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// Composant pour afficher un bénéfice
function BenefitItem({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl bg-orange-50 dark:bg-orange-950/30">
      <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-900/50 flex items-center justify-center flex-shrink-0">
        <Icon className="h-4 w-4 text-orange-600 dark:text-orange-400" />
      </div>
      <div>
        <p className="font-medium text-sm text-gray-900 dark:text-white">{title}</p>
        <p className="text-xs text-gray-600 dark:text-gray-400">{description}</p>
      </div>
    </div>
  );
}

// Composant bouton d'installation compact
export function InstallButton({
  className,
  variant = "default",
  size = "default",
}: {
  className?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
}) {
  const { canInstall, isInstalled, installApp } = usePWA();
  const [isInstalling, setIsInstalling] = useState(false);

  if (isInstalled || !canInstall) {
    return null;
  }

  const handleInstall = async () => {
    setIsInstalling(true);
    try {
      await installApp();
    } finally {
      setIsInstalling(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={handleInstall}
      disabled={isInstalling}
    >
      {isInstalling ? (
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        <>
          <Download className="h-4 w-4 mr-2" />
          Installer
        </>
      )}
    </Button>
  );
}

// Bannière d'installation pour le haut de page
export function InstallBanner() {
  const { canInstall, isInstalled, installApp } = usePWA();
  const [visible, setVisible] = useState(false);
  
  // Initialize dismissed state from localStorage
  const dismissedInitially = useMemo(() => getIsDismissed("pwa-banner-dismissed", 24), []);
  const [dismissed, setDismissed] = useState(dismissedInitially);

  useEffect(() => {
    if (canInstall && !isInstalled && !dismissed) {
      const timer = setTimeout(() => setVisible(true), 5000);
      return () => clearTimeout(timer);
    }
  }, [canInstall, isInstalled, dismissed]);

  const handleDismiss = () => {
    setVisible(false);
    setDismissed(true);
    localStorage.setItem("pwa-banner-dismissed", Date.now().toString());
  };

  if (!visible || isInstalled || !canInstall) {
    return null;
  }

  return (
    <div className="fixed top-16 left-0 right-0 z-40 bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-2">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Smartphone className="h-5 w-5 flex-shrink-0" />
            <p className="text-sm font-medium">
              Installez RelancePro pour un accès rapide et hors ligne
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              className="bg-white text-orange-600 hover:bg-orange-50"
              onClick={installApp}
            >
              Installer
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-white hover:bg-white/20"
              onClick={handleDismiss}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Carte d'installation pour les paramètres
export function InstallCard() {
  const { canInstall, isInstalled, installApp } = usePWA();
  const [isInstalling, setIsInstalling] = useState(false);

  const handleInstall = async () => {
    setIsInstalling(true);
    try {
      await installApp();
    } finally {
      setIsInstalling(false);
    }
  };

  return (
    <Card className="border-orange-200 dark:border-orange-900">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
            <Smartphone className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
              Application mobile
            </h3>
            {isInstalled ? (
              <div className="mt-2 flex items-center gap-2 text-green-600 dark:text-green-400">
                <Check className="h-4 w-4" />
                <span className="text-sm">Application installée</span>
              </div>
            ) : canInstall ? (
              <>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Installez l&apos;application pour un accès rapide et les fonctionnalités hors ligne.
                </p>
                <Button
                  size="sm"
                  className="mt-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white"
                  onClick={handleInstall}
                  disabled={isInstalling}
                >
                  {isInstalling ? (
                    <>
                      <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Installation...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Installer l&apos;application
                    </>
                  )}
                </Button>
              </>
            ) : (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                L&apos;application peut être installée depuis le menu de votre navigateur.
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default InstallPrompt;
