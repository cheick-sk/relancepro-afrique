'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Key,
  Copy,
  Check,
  Download,
  Loader2,
  AlertTriangle,
  RefreshCw,
  Eye,
  EyeOff,
} from 'lucide-react';
import { toast } from 'sonner';

interface BackupCodesDialogProps {
  trigger?: React.ReactNode;
  hasRecoveryCodes?: boolean;
  codesRemaining?: number;
  onCodesRegenerated?: (codes: string[]) => void;
}

export function BackupCodesDialog({
  trigger,
  hasRecoveryCodes = false,
  codesRemaining = 0,
  onCodesRegenerated,
}: BackupCodesDialogProps) {
  const [open, setOpen] = useState(false);
  const [codes, setCodes] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [revealing, setRevealing] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [password, setPassword] = useState('');
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);

  // Révéler les codes existants
  const revealCodes = async () => {
    setRevealing(true);
    try {
      const response = await fetch('/api/auth/2fa/backup-codes?reveal=true');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la récupération des codes');
      }

      setCodes(data.codes || []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erreur');
    } finally {
      setRevealing(false);
    }
  };

  // Régénérer les codes
  const regenerateCodes = async () => {
    if (!password) {
      toast.error('Veuillez entrer votre mot de passe');
      return;
    }

    setRegenerating(true);
    try {
      // D'abord vérifier le mot de passe via l'API de profil
      const verifyResponse = await fetch('/api/auth/verify-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (!verifyResponse.ok) {
        throw new Error('Mot de passe incorrect');
      }

      const response = await fetch('/api/auth/2fa/backup-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passwordVerified: true }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la régénération');
      }

      setCodes(data.codes);
      setShowRegenerateConfirm(false);
      setPassword('');
      toast.success('Nouveaux codes générés');
      
      if (onCodesRegenerated) {
        onCodesRegenerated(data.codes);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erreur');
    } finally {
      setRegenerating(false);
    }
  };

  // Copier un code
  const copyCode = async (code: string) => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Code copié');
  };

  // Copier tous les codes
  const copyAllCodes = async () => {
    if (!codes) return;
    await navigator.clipboard.writeText(codes.join('\n'));
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
    toast.success('Tous les codes copiés');
  };

  // Télécharger les codes
  const downloadCodes = () => {
    if (!codes) return;

    const content = `RelancePro Africa - Codes de récupération
==========================================

Ces codes vous permettent d'accéder à votre compte si vous perdez 
l'accès à votre application d'authentification.

Gardez ces codes en lieu sûr et ne les partagez jamais.

Date de génération: ${new Date().toLocaleDateString('fr-FR')}

Codes de récupération:
${codes.map((code, i) => `${i + 1}. ${code}`).join('\n')}

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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-2">
            <Key className="h-4 w-4" />
            Codes de récupération
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5 text-orange-500" />
            Codes de récupération
          </DialogTitle>
          <DialogDescription>
            Ces codes vous permettent d'accéder à votre compte si vous perdez votre appareil d'authentification.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Statut actuel */}
          {!codes && (
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Codes disponibles</p>
                  <p className="text-2xl font-bold text-orange-500">
                    {codesRemaining}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">
                    {hasRecoveryCodes 
                      ? 'Codes de récupération configurés'
                      : 'Aucun code configuré'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Affichage des codes */}
          {codes && codes.length > 0 && (
            <>
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Important</AlertTitle>
                <AlertDescription>
                  Chaque code ne peut être utilisé qu'une seule fois. Gardez-les en lieu sûr.
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-2 gap-2 p-4 bg-muted rounded-lg max-h-64 overflow-y-auto">
                {codes.map((code, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-background rounded font-mono text-sm"
                  >
                    <span>{code}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => copyCode(code)}
                    >
                      {copied ? (
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
                  size="sm"
                  className="flex-1"
                  onClick={copyAllCodes}
                >
                  {copiedAll ? (
                    <Check className="mr-2 h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="mr-2 h-4 w-4" />
                  )}
                  Copier tous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={downloadCodes}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Télécharger
                </Button>
              </div>
            </>
          )}

          {/* Formulaire de régénération */}
          {showRegenerateConfirm ? (
            <div className="space-y-4 p-4 border rounded-lg">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Attention</AlertTitle>
                <AlertDescription>
                  La régénération des codes invalidera tous les codes précédents.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="password">Confirmez votre mot de passe</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowRegenerateConfirm(false);
                    setPassword('');
                  }}
                >
                  Annuler
                </Button>
                <Button
                  className="flex-1 bg-orange-500 hover:bg-orange-600"
                  onClick={regenerateCodes}
                  disabled={regenerating || !password}
                >
                  {regenerating ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  Régénérer
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              {hasRecoveryCodes && !codes && (
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={revealCodes}
                  disabled={revealing}
                >
                  {revealing ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Eye className="mr-2 h-4 w-4" />
                  )}
                  Révéler les codes
                </Button>
              )}
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowRegenerateConfirm(true)}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                {hasRecoveryCodes ? 'Régénérer' : 'Générer des codes'}
              </Button>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
