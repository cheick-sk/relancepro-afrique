"use client";

import { useEffect, useState } from "react";
import { DemoBanner } from "@/components/demo/demo-banner";
import { Loader2 } from "lucide-react";

interface DemoUsage {
  clients: number;
  emailReminders: number;
  whatsappReminders: number;
  daysRemaining: number;
  isExpired: boolean;
  inDemoMode: boolean;
  demoActive: boolean;
}

export function DemoBannerWrapper() {
  const [usage, setUsage] = useState<DemoUsage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDemoUsage = async () => {
      try {
        const response = await fetch("/api/demo/usage");
        if (response.ok) {
          const data = await response.json();
          setUsage(data);
        }
      } catch (error) {
        console.error("Failed to fetch demo usage:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDemoUsage();
  }, []);

  // Don't show anything while loading
  if (loading) {
    return null;
  }

  // Don't show banner if not in demo mode
  if (!usage || !usage.inDemoMode) {
    return null;
  }

  return (
    <DemoBanner
      usage={{
        clients: usage.clients,
        emailReminders: usage.emailReminders,
        whatsappReminders: usage.whatsappReminders,
        daysRemaining: usage.daysRemaining,
        isExpired: usage.isExpired,
      }}
      isExpired={usage.isExpired}
    />
  );
}
