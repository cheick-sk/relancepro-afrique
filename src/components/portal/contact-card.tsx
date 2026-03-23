"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Phone, 
  Mail, 
  MessageCircle, 
  Building2,
  Clock,
  Globe
} from "lucide-react";

interface ContactCardProps {
  creditor: {
    name: string;
    phone: string | null;
    email: string;
  };
}

export function ContactCard({ creditor }: ContactCardProps) {
  const handleWhatsApp = () => {
    if (creditor.phone) {
      // Format phone number (remove spaces, dashes, etc.)
      const formattedPhone = creditor.phone.replace(/[\s-]/g, "");
      // Open WhatsApp with pre-filled message
      const message = encodeURIComponent(
        `Bonjour, je vous contacte depuis le portail de paiement.`
      );
      window.open(`https://wa.me/${formattedPhone}?text=${message}`, "_blank");
    }
  };

  const handleCall = () => {
    if (creditor.phone) {
      window.location.href = `tel:${creditor.phone}`;
    }
  };

  const handleEmail = () => {
    const subject = encodeURIComponent("Question concernant mes factures");
    const body = encodeURIComponent(
      `Bonjour,\n\nJe vous contacte concernant mes factures sur le portail de paiement.\n\nCordialement`
    );
    window.location.href = `mailto:${creditor.email}?subject=${subject}&body=${body}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Building2 className="w-5 h-5 text-orange-500" />
          Contactez votre créancier
        </CardTitle>
        <CardDescription>
          Besoin d&apos;aide? Contactez directement {creditor.name}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Creditor Info */}
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
          <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
            <Building2 className="w-6 h-6 text-orange-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 truncate">{creditor.name}</p>
            <p className="text-sm text-gray-500 truncate">{creditor.email}</p>
          </div>
        </div>

        {/* Contact Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* WhatsApp Button */}
          {creditor.phone && (
            <Button
              variant="outline"
              className="h-auto py-3 flex flex-col items-center gap-1 border-green-200 hover:bg-green-50 hover:border-green-300"
              onClick={handleWhatsApp}
            >
              <MessageCircle className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium text-green-700">WhatsApp</span>
            </Button>
          )}

          {/* Call Button */}
          {creditor.phone && (
            <Button
              variant="outline"
              className="h-auto py-3 flex flex-col items-center gap-1 hover:bg-blue-50"
              onClick={handleCall}
            >
              <Phone className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium">Appeler</span>
            </Button>
          )}

          {/* Email Button */}
          <Button
            variant="outline"
            className="h-auto py-3 flex flex-col items-center gap-1 hover:bg-orange-50"
            onClick={handleEmail}
          >
            <Mail className="w-5 h-5 text-orange-600" />
            <span className="text-sm font-medium">Email</span>
          </Button>
        </div>

        {/* Business Hours */}
        <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
          <Clock className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Heures de bureau</p>
            <p className="text-blue-600">Lundi - Vendredi: 8h00 - 18h00</p>
            <p className="text-blue-600">Samedi: 9h00 - 13h00</p>
          </div>
        </div>

        {/* Quick Tips */}
        <div className="pt-3 border-t border-gray-200">
          <p className="text-xs text-gray-500 flex items-start gap-2">
            <Globe className="w-4 h-4 flex-shrink-0" />
            <span>
              Pour une réponse rapide, privilégiez WhatsApp. 
              Nous répondons généralement sous 24h ouvrées.
            </span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
