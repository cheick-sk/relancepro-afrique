"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Settings as SettingsIcon,
  User,
  Mail,
  MessageSquare,
  Bell,
  Save,
  Loader2,
  BellRing,
  Clock,
  Shield,
} from "lucide-react";
import { toast } from "sonner";
import { PushPermission } from "@/components/notifications/push-permission";
import { NotificationSettings } from "@/components/notifications/notification-settings";
import { AutomationSettings } from "@/components/settings/automation-settings";
import { SecuritySettings } from "@/components/settings/security-settings";

interface UserSettings {
  name: string;
  companyName: string;
  phone: string;
  emailSignature: string;
  emailSenderName: string;
  whatsappBusinessName: string;
  autoRemindEnabled: boolean;
  reminderDay1: number;
  reminderDay2: number;
  reminderDay3: number;
}

export default function SettingsPage() {
  const { data: session, update } = useSession();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<UserSettings>({
    name: "",
    companyName: "",
    phone: "",
    emailSignature: "",
    emailSenderName: "",
    whatsappBusinessName: "",
    autoRemindEnabled: true,
    reminderDay1: 3,
    reminderDay2: 7,
    reminderDay3: 14,
  });

  useEffect(() => {
    // Charger les paramètres
    const fetchSettings = async () => {
      try {
        const response = await fetch("/api/settings");
        if (response.ok) {
          const data = await response.json();
          setSettings({
            name: data.profile?.name || "",
            companyName: data.profile?.companyName || "",
            phone: data.profile?.phone || "",
            emailSignature: data.settings?.emailSignature || "",
            emailSenderName: data.settings?.emailSenderName || "",
            whatsappBusinessName: data.settings?.whatsappBusinessName || "",
            autoRemindEnabled: data.settings?.autoRemindEnabled ?? true,
            reminderDay1: data.settings?.reminderDay1 || 3,
            reminderDay2: data.settings?.reminderDay2 || 7,
            reminderDay3: data.settings?.reminderDay3 || 14,
          });
        }
      } catch (error) {
        console.error("Error fetching settings:", error);
      }
    };

    if (session) {
      fetchSettings();
    }
  }, [session]);

  const handleSave = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        toast.success("Paramètres enregistrés");
        await update();
      } else {
        toast.error("Erreur lors de l'enregistrement");
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <SettingsIcon className="h-6 w-6 text-orange-500" />
            Paramètres
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Configurez votre compte et vos préférences
          </p>
        </div>
        <Button
          className="bg-orange-500 hover:bg-orange-600"
          onClick={handleSave}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Enregistrer
        </Button>
      </div>

      {/* Settings Tabs */}
      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-7 lg:w-auto lg:inline-grid">
          <TabsTrigger value="profile" className="gap-2">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Profil</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Sécurité</span>
          </TabsTrigger>
          <TabsTrigger value="email" className="gap-2">
            <Mail className="h-4 w-4" />
            <span className="hidden sm:inline">Email</span>
          </TabsTrigger>
          <TabsTrigger value="whatsapp" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            <span className="hidden sm:inline">WhatsApp</span>
          </TabsTrigger>
          <TabsTrigger value="automation" className="gap-2">
            <Clock className="h-4 w-4" />
            <span className="hidden sm:inline">Automatisation</span>
          </TabsTrigger>
          <TabsTrigger value="reminders" className="gap-2">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Relances</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <BellRing className="h-4 w-4" />
            <span className="hidden sm:inline">Notifications</span>
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Informations personnelles</CardTitle>
              <CardDescription>
                Ces informations apparaîtront sur vos relances
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Nom complet</Label>
                  <Input
                    id="name"
                    value={settings.name}
                    onChange={(e) =>
                      setSettings({ ...settings, name: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyName">Nom de l&apos;entreprise</Label>
                  <Input
                    id="companyName"
                    value={settings.companyName}
                    onChange={(e) =>
                      setSettings({ ...settings, companyName: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Téléphone professionnel</Label>
                <Input
                  id="phone"
                  value={settings.phone}
                  onChange={(e) =>
                    setSettings({ ...settings, phone: e.target.value })
                  }
                  placeholder="+221 77 123 45 67"
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={session?.user?.email || ""} disabled />
                <p className="text-xs text-gray-500">
                  L&apos;email ne peut pas être modifié
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security">
          <SecuritySettings />
        </TabsContent>

        {/* Email Tab */}
        <TabsContent value="email">
          <Card>
            <CardHeader>
              <CardTitle>Configuration Email</CardTitle>
              <CardDescription>
                Personnalisez vos relances par email
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="emailSenderName">Nom de l&apos;expéditeur</Label>
                <Input
                  id="emailSenderName"
                  value={settings.emailSenderName}
                  onChange={(e) =>
                    setSettings({ ...settings, emailSenderName: e.target.value })
                  }
                  placeholder="Mon Entreprise"
                />
                <p className="text-xs text-gray-500">
                  Affiché comme expéditeur des emails
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="emailSignature">Signature email</Label>
                <Textarea
                  id="emailSignature"
                  value={settings.emailSignature}
                  onChange={(e) =>
                    setSettings({ ...settings, emailSignature: e.target.value })
                  }
                  rows={4}
                  placeholder="Cordialement,&#10;Jean Dupont&#10;Mon Entreprise&#10;Tél: +221 77 123 45 67"
                />
              </div>
              <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  <strong>Note :</strong> Les emails sont envoyés via Resend. 
                  Configurez votre clé API dans les variables d&apos;environnement.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* WhatsApp Tab */}
        <TabsContent value="whatsapp">
          <Card>
            <CardHeader>
              <CardTitle>Configuration WhatsApp</CardTitle>
              <CardDescription>
                Paramètres pour l&apos;envoi via WhatsApp Business
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="whatsappBusinessName">Nom commercial</Label>
                <Input
                  id="whatsappBusinessName"
                  value={settings.whatsappBusinessName}
                  onChange={(e) =>
                    setSettings({ ...settings, whatsappBusinessName: e.target.value })
                  }
                  placeholder="Mon Entreprise"
                />
              </div>
              <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                <p className="text-sm text-green-700 dark:text-green-300">
                  <strong>Intégration Whapi.cloud :</strong> Les messages WhatsApp 
                  sont envoyés via l&apos;API Whapi.cloud. Configurez votre clé API 
                  dans les variables d&apos;environnement.
                </p>
              </div>
              <div className="text-sm text-gray-500">
                <p>Pour configurer WhatsApp :</p>
                <ol className="list-decimal list-inside mt-2 space-y-1">
                  <li>Créez un compte sur whapi.cloud</li>
                  <li>Connectez votre numéro WhatsApp Business</li>
                  <li>Copiez la clé API dans vos variables d&apos;environnement</li>
                </ol>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Automation Tab */}
        <TabsContent value="automation">
          <AutomationSettings />
        </TabsContent>

        {/* Reminders Tab */}
        <TabsContent value="reminders">
          <Card>
            <CardHeader>
              <CardTitle>Paramètres de relance</CardTitle>
              <CardDescription>
                Configurez le comportement des relances automatiques
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Relances automatiques</p>
                  <p className="text-sm text-gray-500">
                    Envoyer automatiquement des relances aux dates programmées
                  </p>
                </div>
                <Switch
                  checked={settings.autoRemindEnabled}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, autoRemindEnabled: checked })
                  }
                />
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">Intervalle des relances</h4>
                <p className="text-sm text-gray-500">
                  Nombre de jours après l&apos;échéance pour chaque relance
                </p>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>1ère relance</Label>
                    <Select
                      value={settings.reminderDay1.toString()}
                      onValueChange={(v) =>
                        setSettings({ ...settings, reminderDay1: parseInt(v) })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 5, 7].map((d) => (
                          <SelectItem key={d} value={d.toString()}>
                            J+{d}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>2ème relance</Label>
                    <Select
                      value={settings.reminderDay2.toString()}
                      onValueChange={(v) =>
                        setSettings({ ...settings, reminderDay2: parseInt(v) })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[5, 7, 10, 14].map((d) => (
                          <SelectItem key={d} value={d.toString()}>
                            J+{d}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>3ème relance</Label>
                    <Select
                      value={settings.reminderDay3.toString()}
                      onValueChange={(v) =>
                        setSettings({ ...settings, reminderDay3: parseInt(v) })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[10, 14, 21, 30].map((d) => (
                          <SelectItem key={d} value={d.toString()}>
                            J+{d}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" id="notifications">
          <div className="space-y-6">
            <PushPermission />
            <NotificationSettings />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
