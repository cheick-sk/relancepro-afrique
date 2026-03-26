'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Shield,
  Smartphone,
  Key,
  Copy,
  Check,
  AlertTriangle,
  Loader2,
  ArrowRight,
  Download,
  ArrowLeft,
} from 'lucide-react';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp';
import { toast } from 'sonner';

interface SetupData {
  qrCode: string;
  secret: string;
  manualEntryKey: string;
  recoveryCodes: string[];
}

interface TwoFactorSetupProps {
  onComplete?: () => void;
  onCancel?: () => void;
  showTitle?: boolean;
}

export function TwoFactorSetup({ onComplete, onCancel, showTitle = true }: TwoFactorSetupProps) {
  const router = useRouter();
  const [step, setStep] = useState<'intro' | 'setup' | 'verify' | 'recovery' | 'complete'>('intro');
  const [setupData, setSetupData] = useState<SetupData | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedAllCodes, setCopiedAllCodes] = useState(false);

  // Démarrer la configuration 2FA
  const startSetup = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/2fa/setup');

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erreur lors de l\'initialisation');
      }

      const data = await response.json();
      setSetupData(data);
      setStep('setup');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  // Vérifier le code et activer le 2FA
  const verifyAndEnable = async () => {
    if (verificationCode.length !== 6) {
      setError('Veuillez entrer un code à 6 chiffres');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/2fa/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: verificationCode }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Code invalide');
      }

      const data = await response.json();
      
      // Si le serveur a renvoyé de nouveaux codes, les utiliser
      if (data.recoveryCodes) {
        setSetupData(prev => prev ? { ...prev, recoveryCodes: data.recoveryCodes } : null);
      }
      
      setStep('recovery');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Code invalide');
    } finally {
      setLoading(false);
    }
  };

  // Copier un texte
  const copyToClipboard = async (text: string, type: 'code' | 'secret' | 'all') => {
    await navigator.clipboard.writeText(text);
    if (type === 'code') {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } else if (type === 'secret') {
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    } else {
      setCopiedAllCodes(true);
      setTimeout(() => setCopiedAllCodes(false), 2000);
    }
    toast.success('Copié dans le presse-papiers');
  };

  // Télécharger les codes de récupération
  const downloadRecoveryCodes = () => {
    if (!setupData?.recoveryCodes) return;

    const content = `RelancePro Africa - Codes de récupération
==========================================

Ces codes vous permettent d'accéder à votre compte si vous perdez 
l'accès à votre application d'authentification.

Gardez ces codes en lieu sûr et ne les partagez jamais.

Date de génération: ${new Date().toLocaleDateString('fr-FR')}

Codes de récupération:
${setupData.recoveryCodes.map((code, i) => `${i + 1}. ${code}`).join('\n')}

==========================================
IMPORTANT: Chaque code ne peut être utilisé qu'une seule fois.
`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'relancepro-backup-codes.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('Codes téléchargés');
  };

  // Terminer la configuration
  const finishSetup = () => {
    setStep('complete');
    if (onComplete) {
      onComplete();
    }
  };

  // Retour à l'étape précédente
  const goBack = () => {
    if (step === 'setup') {
      setStep('intro');
    } else if (step === 'verify') {
      setStep('setup');
    } else if (onCancel) {
      onCancel();
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto">
      {/* Intro Step */}
      {step === 'intro' && (
        <Card>
          {showTitle && (
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                <Shield className="h-8 w-8 text-orange-500" />
              </div>
              <CardTitle className="text-2xl">Authentification à deux facteurs</CardTitle>
              <CardDescription>
                Ajoutez une couche de sécurité supplémentaire à votre compte
              </CardDescription>
            </CardHeader>
          )}
          <CardContent className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Recommandé</AlertTitle>
              <AlertDescription>
                L'authentification à deux facteurs protège votre compte même si votre mot de passe est compromis.
              </AlertDescription>
            </Alert>

            <div className="space-y-3 text-sm text-muted-foreground">
              <div className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-medium text-orange-500">1</span>
                </div>
                <p>Téléchargez une application d'authentification comme Google Authenticator ou Authy</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-medium text-orange-500">2</span>
                </div>
                <p>Scannez le QR code avec l'application</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-medium text-orange-500">3</span>
                </div>
                <p>Entrez le code généré pour confirmer</p>
              </div>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2">
              {onCancel && (
                <Button variant="outline" onClick={onCancel} className="flex-1">
                  Annuler
                </Button>
              )}
              <Button
                onClick={startSetup}
                disabled={loading}
                className="flex-1 bg-orange-500 hover:bg-orange-600"
              >
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="mr-2 h-4 w-4" />
                )}
                Commencer
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Setup Step - QR Code */}
      {step === 'setup' && setupData && (
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Scannez le QR code</CardTitle>
            <CardDescription>
              Utilisez votre application d'authentification pour scanner ce code
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* QR Code */}
            <div className="flex justify-center">
              <div className="p-4 bg-white rounded-lg shadow-sm">
                <img
                  src={setupData.qrCode}
                  alt="QR Code pour 2FA"
                  className="w-48 h-48"
                />
              </div>
            </div>

            {/* Secret manuel */}
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">
                Ou entrez ce code manuellement :
              </Label>
              <div className="flex gap-2">
                <Input
                  value={setupData.manualEntryKey}
                  readOnly
                  className="font-mono text-center text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(setupData.secret, 'secret')}
                >
                  {copiedSecret ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={goBack} className="flex-1">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Retour
              </Button>
              <Button
                onClick={() => setStep('verify')}
                className="flex-1 bg-orange-500 hover:bg-orange-600"
              >
                Continuer
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Verify Step */}
      {step === 'verify' && (
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Vérification</CardTitle>
            <CardDescription>
              Entrez le code à 6 chiffres affiché dans votre application
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex justify-center">
              <InputOTP
                maxLength={6}
                value={verificationCode}
                onChange={(value) => setVerificationCode(value)}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={goBack} className="flex-1">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Retour
              </Button>
              <Button
                onClick={verifyAndEnable}
                disabled={loading || verificationCode.length !== 6}
                className="flex-1 bg-orange-500 hover:bg-orange-600"
              >
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Check className="mr-2 h-4 w-4" />
                )}
                Vérifier et activer
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recovery Codes Step */}
      {step === 'recovery' && setupData && (
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <Key className="h-8 w-8 text-amber-600" />
            </div>
            <CardTitle className="text-2xl">Codes de récupération</CardTitle>
            <CardDescription>
              Conservez ces codes en lieu sûr. Ils vous permettront d'accéder à votre compte si vous perdez votre appareil.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Important</AlertTitle>
              <AlertDescription>
                Ces codes ne seront affichés qu'une seule fois. Stockez-les de manière sécurisée.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-2 gap-2 p-4 bg-muted rounded-lg">
              {setupData.recoveryCodes.map((code, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 bg-background rounded font-mono text-sm"
                >
                  <span>{code}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => copyToClipboard(code, 'code')}
                  >
                    {copiedCode ? (
                      <Check className="h-3 w-3 text-green-500" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => copyToClipboard(setupData.recoveryCodes.join('\n'), 'all')}
              >
                {copiedAllCodes ? (
                  <Check className="mr-2 h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="mr-2 h-4 w-4" />
                )}
                Copier tous
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={downloadRecoveryCodes}
              >
                <Download className="mr-2 h-4 w-4" />
                Télécharger
              </Button>
            </div>

            <Button onClick={finishSetup} className="w-full bg-orange-500 hover:bg-orange-600">
              J'ai sauvegardé mes codes
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Complete Step */}
      {step === 'complete' && (
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <Shield className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl">Configuration terminée !</CardTitle>
            <CardDescription>
              L'authentification à deux facteurs est maintenant activée sur votre compte
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-center gap-2">
              <Badge variant="outline" className="bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800">
                <Check className="mr-1 h-3 w-3" />
                2FA Activé
              </Badge>
            </div>

            <Alert>
              <Smartphone className="h-4 w-4" />
              <AlertTitle>Prochaines connexions</AlertTitle>
              <AlertDescription>
                À chaque connexion, vous devrez entrer un code depuis votre application d'authentification.
              </AlertDescription>
            </Alert>

            <Button
              onClick={() => router.push('/dashboard')}
              className="w-full bg-orange-500 hover:bg-orange-600"
            >
              Retour au tableau de bord
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
