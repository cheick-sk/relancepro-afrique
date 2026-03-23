"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  AlertCircle,
  Clock,
  Users,
  Mail,
  MessageSquare,
  ArrowRight,
  Crown,
} from "lucide-react";

interface DemoUsage {
  clients: number;
  emailReminders: number;
  whatsappReminders: number;
  daysRemaining: number;
  isExpired: boolean;
}

interface DemoBannerProps {
  usage: DemoUsage;
  isExpired?: boolean;
}

export function DemoBanner({ usage, isExpired = false }: DemoBannerProps) {
  const [isVisible, setIsVisible] = useState(true);

  // Don't render if not visible
  if (!isVisible) return null;

  // Demo limits
  const limits = {
    clients: 5,
    emailReminders: 10,
    whatsappReminders: 5,
  };

  // Calculate percentages
  const clientsPercent = Math.min((usage.clients / limits.clients) * 100, 100);
  const emailPercent = Math.min((usage.emailReminders / limits.emailReminders) * 100, 100);
  const whatsappPercent = Math.min((usage.whatsappReminders / limits.whatsappReminders) * 100, 100);

  // Check if any limit is near (80%+)
  const isNearLimit = clientsPercent >= 80 || emailPercent >= 80 || whatsappPercent >= 80;

  if (isExpired) {
    return (
      <div className="bg-gradient-to-r from-red-500 to-red-600 text-white">
        <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div>
                <p className="font-semibold">Période d&apos;essai expirée</p>
                <p className="text-sm text-red-100">
                  Votre période d&apos;essai de 7 jours est terminée. Souscrivez à un plan pour continuer.
                </p>
              </div>
            </div>
            <Link href="/subscription">
              <Button className="bg-white text-red-600 hover:bg-red-50 shrink-0">
                <Crown className="h-4 w-4 mr-2" />
                Choisir un plan
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gradient-to-r ${isNearLimit ? 'from-amber-500 to-orange-500' : 'from-blue-500 to-indigo-500'} text-white`}>
      <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Left side - Days remaining */}
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 bg-white/20 rounded-full p-2">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold">
                Mode Démonstration
              </p>
              <p className="text-sm text-white/90">
                {usage.daysRemaining} jour{usage.daysRemaining > 1 ? 's' : ''} restant{usage.daysRemaining > 1 ? 's' : ''} sur votre essai gratuit
              </p>
            </div>
          </div>

          {/* Center - Usage stats */}
          <div className="flex flex-wrap items-center gap-4 lg:gap-6">
            {/* Clients */}
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-white/80" />
              <div className="flex flex-col">
                <span className="text-xs text-white/80">Clients</span>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${usage.clients >= limits.clients ? 'text-red-200' : ''}`}>
                    {usage.clients}/{limits.clients}
                  </span>
                  <Progress 
                    value={clientsPercent} 
                    className="w-16 h-1.5 bg-white/30 [&>div]:bg-white" 
                  />
                </div>
              </div>
            </div>

            {/* Email reminders */}
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-white/80" />
              <div className="flex flex-col">
                <span className="text-xs text-white/80">Emails</span>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${usage.emailReminders >= limits.emailReminders ? 'text-red-200' : ''}`}>
                    {usage.emailReminders}/{limits.emailReminders}
                  </span>
                  <Progress 
                    value={emailPercent} 
                    className="w-16 h-1.5 bg-white/30 [&>div]:bg-white" 
                  />
                </div>
              </div>
            </div>

            {/* WhatsApp reminders */}
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-white/80" />
              <div className="flex flex-col">
                <span className="text-xs text-white/80">WhatsApp</span>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${usage.whatsappReminders >= limits.whatsappReminders ? 'text-red-200' : ''}`}>
                    {usage.whatsappReminders}/{limits.whatsappReminders}
                  </span>
                  <Progress 
                    value={whatsappPercent} 
                    className="w-16 h-1.5 bg-white/30 [&>div]:bg-white" 
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right side - CTA */}
          <Link href="/subscription" className="shrink-0">
            <Button className="bg-white text-blue-600 hover:bg-blue-50 shadow-lg">
              <Crown className="h-4 w-4 mr-2" />
              Passer au plan payant
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

// Simplified inline banner for tighter spaces
export function DemoBannerInline({ usage, isExpired = false }: DemoBannerProps) {
  if (isExpired) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-red-700">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm font-medium">Essai expiré</span>
        </div>
        <Link href="/subscription">
          <Button size="sm" variant="destructive">
            S&apos;abonner
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center justify-between">
      <div className="flex items-center gap-2 text-blue-700">
        <Clock className="h-4 w-4" />
        <span className="text-sm">
          <span className="font-medium">Mode démo:</span> {usage.daysRemaining} jour{usage.daysRemaining > 1 ? 's' : ''} restant{usage.daysRemaining > 1 ? 's' : ''}
        </span>
      </div>
      <Link href="/subscription">
        <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
          Passer au payant
        </Button>
      </Link>
    </div>
  );
}

// Hook to fetch demo usage
export function useDemoUsage() {
  const [usage, setUsage] = useState<DemoUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsage = async () => {
      try {
        const response = await fetch('/api/demo/usage');
        if (!response.ok) {
          throw new Error('Failed to fetch demo usage');
        }
        const data = await response.json();
        setUsage(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchUsage();
  }, []);

  return { usage, loading, error };
}
