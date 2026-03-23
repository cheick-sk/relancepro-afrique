"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Settings as SettingsIcon,
  Save,
  Loader2,
  MessageSquare,
  Phone,
  DollarSign,
  RefreshCw,
  CheckCircle,
  XCircle,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { AFRICAN_COUNTRIES } from "@/lib/sms/types";

interface SMSSettings {
  twilioAccountSid: string;
  twilioAuthToken: string;
  twilioPhoneNumber: string;
  twilioEnabled: boolean;
  africastalkingApiKey: string;
  africastalkingUsername: string;
  africastalkingSenderId: string;
  africastalkingEnabled: boolean;
  defaultProvider: string;
  senderIdEnabled: boolean;
  customSenderId: string;
  monthlySmsLimit: number;
  monthlySmsUsed: number;
}

interface ProviderBalance {
  provider: string;
  balance: number;
  currency: string;
  lastUpdated: string;
}

export default function SMSSettingsPage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [checkingBalance, setCheckingBalance] = useState(false);
  const [settings, setSettings] = useState<SMSSettings>({
    twilioAccountSid: "",
    twilioAuthToken: "",
    twilioPhoneNumber: "",
    twilioEnabled: false,
    africastalkingApiKey: "",
    africastalkingUsername: "",
    africastalkingSenderId: "",
    africastalkingEnabled: false,
    defaultProvider: "auto",
    senderIdEnabled: false,
    customSenderId: "",
    monthlySmsLimit: 1000,
    monthlySmsUsed: 0,
  });
  const [balances, setBalances] = useState<ProviderBalance[]>([]);
  const [showTwilioToken, setShowTwilioToken] = useState(false);
  const [showATKey, setShowATKey] = useState(false);

  // Load settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch("/api/settings/sms");
        if (response.ok) {
          const data = await response.json();
          setSettings({
            ...settings,
            ...data,
          });
        }
      } catch (error) {
        console.error("Error fetching SMS settings:", error);
      }
    };

    if (session) {
      fetchSettings();
    }
  }, [session]);

  // Load balances
  const fetchBalances = async () => {
    setCheckingBalance(true);
    try {
      const response = await fetch("/api/sms/balance");
      if (response.ok) {
        const data = await response.json();
        setBalances(data.balances || []);
      }
    } catch (error) {
      console.error("Error fetching balances:", error);
    } finally {
      setCheckingBalance(false);
    }
  };

  // Save settings
  const handleSave = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/settings/sms", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        toast.success("Paramètres SMS enregistrés");
      } else {
        toast.error("Erreur lors de l'enregistrement");
      }
    } catch (error) {
      console.error("Error saving SMS settings:", error);
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setLoading(false);
    }
  };

  // Test connection
  const testConnection = async (provider: 'twilio' | 'africastalking') => {
    try {
      const response = await fetch("/api/sms/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        toast.success(`Connexion ${provider === 'twilio' ? 'Twilio' : "Africa's Talking"} réussie !`);
      } else {
        toast.error(data.error || "Erreur de connexion");
      }
    } catch (error) {
      toast.error("Erreur de connexion");
    }
  };

  // Usage percentage
  const usagePercent = (settings.monthlySmsUsed / settings.monthlySmsLimit) * 100;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-orange-500" />
            Configuration SMS & Vocal
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Configurez vos fournisseurs SMS et les paramètres d'appel vocal
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={fetchBalances}
            disabled={checkingBalance}
          >
            {checkingBalance ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Actualiser les soldes
          </Button>
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
      </div>

      {/* Provider Balances */}
      {balances.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {balances.map((balance) => (
            <Card key={balance.provider}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">
                      {balance.provider === 'twilio' ? 'Twilio' : "Africa's Talking"}
                    </p>
                    <p className="text-2xl font-bold">
                      {balance.balance.toLocaleString()} {balance.currency}
                    </p>
                  </div>
                  <Badge variant={balance.balance > 10 ? "default" : "destructive"}>
                    {balance.balance > 10 ? (
                      <CheckCircle className="h-3 w-3 mr-1" />
                    ) : (
                      <XCircle className="h-3 w-3 mr-1" />
                    )}
                    {balance.balance > 10 ? 'Actif' : 'Solde faible'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Monthly Usage */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Utilisation mensuelle</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>{settings.monthlySmsUsed} / {settings.monthlySmsLimit} SMS</span>
              <span className="text-gray-500">{usagePercent.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${
                  usagePercent > 90 ? 'bg-red-500' : usagePercent > 70 ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(usagePercent, 100)}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Settings Tabs */}
      <Tabs defaultValue="twilio" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
          <TabsTrigger value="twilio" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            <span className="hidden sm:inline">Twilio</span>
          </TabsTrigger>
          <TabsTrigger value="africastalking" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            <span className="hidden sm:inline">Africa's Talking</span>
          </TabsTrigger>
          <TabsTrigger value="pricing" className="gap-2">
            <DollarSign className="h-4 w-4" />
            <span className="hidden sm:inline">Tarifs</span>
          </TabsTrigger>
        </TabsList>

        {/* Twilio Tab */}
        <TabsContent value="twilio">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Configuration Twilio</CardTitle>
                  <CardDescription>
                    Connectez votre compte Twilio pour les SMS et appels vocaux
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={settings.twilioEnabled}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, twilioEnabled: checked })
                    }
                  />
                  <Label>{settings.twilioEnabled ? 'Activé' : 'Désactivé'}</Label>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="twilioAccountSid">Account SID</Label>
                  <Input
                    id="twilioAccountSid"
                    value={settings.twilioAccountSid}
                    onChange={(e) =>
                      setSettings({ ...settings, twilioAccountSid: e.target.value })
                    }
                    placeholder="ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="twilioAuthToken">Auth Token</Label>
                  <div className="relative">
                    <Input
                      id="twilioAuthToken"
                      type={showTwilioToken ? "text" : "password"}
                      value={settings.twilioAuthToken}
                      onChange={(e) =>
                        setSettings({ ...settings, twilioAuthToken: e.target.value })
                      }
                      placeholder="Votre auth token"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowTwilioToken(!showTwilioToken)}
                    >
                      {showTwilioToken ? "Cacher" : "Voir"}
                    </Button>
                  </div>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="twilioPhoneNumber">Numéro Twilio</Label>
                  <Input
                    id="twilioPhoneNumber"
                    value={settings.twilioPhoneNumber}
                    onChange={(e) =>
                      setSettings({ ...settings, twilioPhoneNumber: e.target.value })
                    }
                    placeholder="+1234567890"
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    variant="outline"
                    onClick={() => testConnection('twilio')}
                    disabled={!settings.twilioAccountSid || !settings.twilioAuthToken}
                  >
                    Tester la connexion
                  </Button>
                </div>
              </div>
              <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  <strong>Note :</strong> Obtenir vos identifiants sur{" "}
                  <a
                    href="https://www.twilio.com/console"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline inline-flex items-center gap-1"
                  >
                    twilio.com/console <ExternalLink className="h-3 w-3" />
                  </a>
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Africa's Talking Tab */}
        <TabsContent value="africastalking">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Configuration Africa's Talking</CardTitle>
                  <CardDescription>
                    Connectez votre compte Africa's Talking pour les SMS en Afrique
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={settings.africastalkingEnabled}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, africastalkingEnabled: checked })
                    }
                  />
                  <Label>{settings.africastalkingEnabled ? 'Activé' : 'Désactivé'}</Label>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="atApiKey">API Key</Label>
                  <div className="relative">
                    <Input
                      id="atApiKey"
                      type={showATKey ? "text" : "password"}
                      value={settings.africastalkingApiKey}
                      onChange={(e) =>
                        setSettings({ ...settings, africastalkingApiKey: e.target.value })
                      }
                      placeholder="Votre clé API"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowATKey(!showATKey)}
                    >
                      {showATKey ? "Cacher" : "Voir"}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="atUsername">Username</Label>
                  <Input
                    id="atUsername"
                    value={settings.africastalkingUsername}
                    onChange={(e) =>
                      setSettings({ ...settings, africastalkingUsername: e.target.value })
                    }
                    placeholder="sandbox ou votre username"
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="atSenderId">Sender ID (optionnel)</Label>
                  <Input
                    id="atSenderId"
                    value={settings.africastalkingSenderId}
                    onChange={(e) =>
                      setSettings({ ...settings, africastalkingSenderId: e.target.value })
                    }
                    placeholder="Votre nom d'expéditeur"
                    maxLength={11}
                  />
                  <p className="text-xs text-gray-500">Max 11 caractères alphanumériques</p>
                </div>
                <div className="flex items-end">
                  <Button
                    variant="outline"
                    onClick={() => testConnection('africastalking')}
                    disabled={!settings.africastalkingApiKey || !settings.africastalkingUsername}
                  >
                    Tester la connexion
                  </Button>
                </div>
              </div>
              <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                <p className="text-sm text-green-700 dark:text-green-300">
                  <strong>Note :</strong> Utilisez "sandbox" comme username pour les tests.{" "}
                  <a
                    href="https://account.africastalking.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline inline-flex items-center gap-1"
                  >
                    Obtenir vos identifiants <ExternalLink className="h-3 w-3" />
                  </a>
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pricing Tab */}
        <TabsContent value="pricing">
          <div className="space-y-6">
            {/* SMS Pricing */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Tarifs SMS
                </CardTitle>
                <CardDescription>
                  Prix estimés par SMS selon le pays
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pays</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead className="text-right">Prix/SMS (GNF)</TableHead>
                      <TableHead className="text-right">Prix/SMS (USD)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {AFRICAN_COUNTRIES.map((country) => (
                      <TableRow key={country.code}>
                        <TableCell className="font-medium">
                          {country.flag} {country.name}
                        </TableCell>
                        <TableCell>{country.dialCode}</TableCell>
                        <TableCell className="text-right">~{country.smsCost} FG</TableCell>
                        <TableCell className="text-right">
                          ~{(country.smsCost / 10000).toFixed(3)} $
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Voice Pricing */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-5 w-5" />
                  Tarifs Appels Vocaux
                </CardTitle>
                <CardDescription>
                  Prix estimés par minute selon le pays
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pays</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead className="text-right">Prix/min (GNF)</TableHead>
                      <TableHead className="text-right">Prix/min (USD)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {AFRICAN_COUNTRIES.map((country) => (
                      <TableRow key={country.code}>
                        <TableCell className="font-medium">
                          {country.flag} {country.name}
                        </TableCell>
                        <TableCell>{country.dialCode}</TableCell>
                        <TableCell className="text-right">~{country.voiceCost} FG</TableCell>
                        <TableCell className="text-right">
                          ~{(country.voiceCost / 10000).toFixed(2)} $
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Notes */}
            <Card className="bg-yellow-50 dark:bg-yellow-950/30">
              <CardContent className="p-4">
                <div className="flex gap-3">
                  <div className="text-yellow-600 dark:text-yellow-400">
                    <SettingsIcon className="h-5 w-5" />
                  </div>
                  <div className="text-sm text-yellow-800 dark:text-yellow-200">
                    <p className="font-medium">Notes importantes:</p>
                    <ul className="mt-2 list-disc list-inside space-y-1">
                      <li>Les prix sont des estimations et peuvent varier selon le fournisseur</li>
                      <li>Les SMS sont facturés par segment (160 caractères max)</li>
                      <li>Les caractères spéciaux peuvent réduire la limite à 70 caractères</li>
                      <li>Les appels vocaux sont facturés à la minute entamée</li>
                      <li>Consultez les tarifs exacts sur les consoles Twilio et Africa's Talking</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Provider Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Paramètres généraux</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Fournisseur par défaut</Label>
              <select
                value={settings.defaultProvider}
                onChange={(e) =>
                  setSettings({ ...settings, defaultProvider: e.target.value })
                }
                className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-800"
              >
                <option value="auto">Automatique (recommandé)</option>
                <option value="twilio">Twilio</option>
                <option value="africastalking">Africa's Talking</option>
              </select>
              <p className="text-xs text-gray-500">
                Le mode automatique sélectionne le meilleur fournisseur selon le pays
              </p>
            </div>
            <div className="space-y-2">
              <Label>Limite mensuelle SMS</Label>
              <Input
                type="number"
                value={settings.monthlySmsLimit}
                onChange={(e) =>
                  setSettings({ ...settings, monthlySmsLimit: parseInt(e.target.value) || 1000 })
                }
                min={100}
                max={100000}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
