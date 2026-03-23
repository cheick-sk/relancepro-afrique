'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Shield,
  Loader2,
  Key,
  ArrowRight,
  AlertTriangle,
  Smartphone,
} from 'lucide-react';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp';

interface TwoFactorVerifyProps {
  email: string;
  onVerify: (data: { 
    success: boolean; 
    user?: any;
    trustedDeviceToken?: string;
  }) => void;
  onCancel?: () => void;
}

export function TwoFactorVerify({ email, onVerify, onCancel }: TwoFactorVerifyProps) {
  const [mode, setMode] = useState<'totp' | 'recovery'>('totp');
  const [code, setCode] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [rememberDevice, setRememberDevice] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = async () => {
    if (mode === 'totp' && code.length !== 6) {
      setError('Veuillez entrer un code à 6 chiffres');
      return;
    }

    if (mode === 'recovery' && recoveryCode.length < 8) {
      setError('Veuillez entrer un code de récupération valide');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          code: mode === 'totp' ? code : undefined,
          recoveryCode: mode === 'recovery' ? recoveryCode : undefined,
          rememberDevice,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Code invalide');
        return;
      }

      onVerify(data);
    } catch (err) {
      setError('Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
          <Shield className="h-8 w-8 text-orange-500" />
        </div>
        <CardTitle className="text-2xl">Vérification en deux étapes</CardTitle>
        <CardDescription>
          {mode === 'totp' 
            ? 'Entrez le code depuis votre application d\'authentification'
            : 'Entrez l\'un de vos codes de récupération'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {mode === 'totp' ? (
          <>
            {/* TOTP Code Input */}
            <div className="flex justify-center">
              <InputOTP
                maxLength={6}
                value={code}
                onChange={(value) => setCode(value)}
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

            {/* Remember Device */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="remember-device"
                checked={rememberDevice}
                onCheckedChange={(checked) => setRememberDevice(checked as boolean)}
              />
              <label
                htmlFor="remember-device"
                className="text-sm text-muted-foreground cursor-pointer"
              >
                Se souvenir de cet appareil pendant 30 jours
              </label>
            </div>

            <Alert>
              <Smartphone className="h-4 w-4" />
              <AlertDescription className="text-sm">
                Ouvrez Google Authenticator, Authy ou votre application d'authentification pour obtenir votre code.
              </AlertDescription>
            </Alert>
          </>
        ) : (
          <>
            {/* Recovery Code Input */}
            <div className="space-y-2">
              <Label htmlFor="recovery-code">Code de récupération</Label>
              <Input
                id="recovery-code"
                type="text"
                placeholder="XXXX-XXXX"
                value={recoveryCode}
                onChange={(e) => setRecoveryCode(e.target.value.toUpperCase())}
                className="font-mono text-center text-lg tracking-wider"
                maxLength={9}
              />
              <p className="text-xs text-muted-foreground">
                Entrez l'un des codes de récupération que vous avez sauvegardés lors de la configuration du 2FA.
              </p>
            </div>

            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Attention</AlertTitle>
              <AlertDescription>
                Chaque code de récupération ne peut être utilisé qu'une seule fois.
              </AlertDescription>
            </Alert>
          </>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Button
            onClick={handleVerify}
            disabled={loading || (mode === 'totp' ? code.length !== 6 : recoveryCode.length < 8)}
            className="w-full bg-orange-500 hover:bg-orange-600"
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ArrowRight className="mr-2 h-4 w-4" />
            )}
            Vérifier
          </Button>

          {mode === 'totp' ? (
            <Button
              variant="link"
              className="w-full text-muted-foreground"
              onClick={() => setMode('recovery')}
            >
              <Key className="mr-2 h-4 w-4" />
              Utiliser un code de récupération
            </Button>
          ) : (
            <Button
              variant="link"
              className="w-full text-muted-foreground"
              onClick={() => setMode('totp')}
            >
              <Shield className="mr-2 h-4 w-4" />
              Utiliser le code de l'application
            </Button>
          )}

          {onCancel && (
            <Button
              variant="ghost"
              className="w-full"
              onClick={onCancel}
            >
              Annuler
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
