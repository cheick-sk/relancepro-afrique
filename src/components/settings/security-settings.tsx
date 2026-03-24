'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Shield,
  ShieldCheck,
  ShieldOff,
  Key,
  Smartphone,
  Monitor,
  Tablet,
  MapPin,
  Clock,
  Loader2,
  AlertTriangle,
  Trash2,
  LogOut,
  RefreshCw,
  ExternalLink,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';
import { TwoFactorSetup } from '@/components/auth/two-factor-setup';
import { BackupCodesDialog } from '@/components/auth/backup-codes-dialog';

interface Session {
  id: string;
  token: string;
  userAgent: string;
  ip: string;
  device: string;
  browser: string;
  os: string;
  country: string;
  city: string;
  lastActive: string;
  createdAt: string;
  expiresAt: string;
  isTrusted: boolean;
  isRevoked: boolean;
  isCurrent: boolean;
}

interface TwoFactorStatus {
  enabled: boolean;
  hasRecoveryCodes: boolean;
  codesRemaining: number;
  configuredAt?: string;
}

export function SecuritySettings() {
  const router = useRouter();
  const { data: session } = useSession();
  
  const [twoFactorStatus, setTwoFactorStatus] = useState<TwoFactorStatus | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSetup, setShowSetup] = useState(false);
  const [showDisableDialog, setShowDisableDialog] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [disabling, setDisabling] = useState(false);
  const [revokingSession, setRevokingSession] = useState<string | null>(null);

  // Charger les données
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statusRes, sessionsRes] = await Promise.all([
        fetch('/api/auth/2fa/setup'),
        fetch('/api/auth/sessions'),
      ]);

      if (statusRes.ok) {
        const statusData = await statusRes.json();
        setTwoFactorStatus(statusData);
      }

      if (sessionsRes.ok) {
        const sessionsData = await sessionsRes.json();
        setSessions(sessionsData.sessions || []);
      }
    } catch (error) {
      console.error('Error loading security data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Désactiver le 2FA
  const handleDisable2FA = async () => {
    if (!disablePassword) {
      toast.error('Mot de passe requis');
      return;
    }

    setDisabling(true);
    try {
      const response = await fetch('/api/auth/2fa/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: disablePassword,
          code: twoFactorStatus?.enabled ? disableCode : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur');
      }

      toast.success('Authentification à deux facteurs désactivée');
      setShowDisableDialog(false);
      setDisablePassword('');
      setDisableCode('');
      loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erreur');
    } finally {
      setDisabling(false);
    }
  };

  // Révoquer une session
  const handleRevokeSession = async (sessionId: string) => {
    setRevokingSession(sessionId);
    try {
      const response = await fetch(`/api/auth/sessions?id=${sessionId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Erreur');
      }

      toast.success('Session révoquée');
      loadData();
    } catch (error) {
      toast.error('Erreur lors de la révocation');
    } finally {
      setRevokingSession(null);
    }
  };

  // Révoquer toutes les autres sessions
  const handleRevokeOtherSessions = async () => {
    try {
      const response = await fetch('/api/auth/sessions?revokeAll=true', {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Erreur');
      }

      toast.success('Autres sessions révoquées');
      loadData();
    } catch (error) {
      toast.error('Erreur');
    }
  };

  // Obtenir l'icône de l'appareil
  const getDeviceIcon = (device: string) => {
    switch (device?.toLowerCase()) {
      case 'mobile':
        return <Smartphone className="h-4 w-4" />;
      case 'tablet':
        return <Tablet className="h-4 w-4" />;
      default:
        return <Monitor className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 2FA Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-orange-500" />
            Authentification à deux facteurs
          </CardTitle>
          <CardDescription>
            Ajoutez une couche de sécurité supplémentaire à votre compte
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {twoFactorStatus?.enabled ? (
            <>
              <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="h-8 w-8 text-green-600" />
                  <div>
                    <p className="font-medium text-green-800 dark:text-green-200">
                      2FA Activé
                    </p>
                    <p className="text-sm text-green-600 dark:text-green-400">
                      {twoFactorStatus.codesRemaining} codes de récupération restants
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <BackupCodesDialog
                    hasRecoveryCodes={twoFactorStatus.hasRecoveryCodes}
                    codesRemaining={twoFactorStatus.codesRemaining}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDisableDialog(true)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <ShieldOff className="mr-2 h-4 w-4" />
                    Désactiver
                  </Button>
                </div>
              </div>

              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Gardez vos codes de récupération en lieu sûr. Ils vous permettront d'accéder à votre compte si vous perdez votre appareil d'authentification.
                </AlertDescription>
              </Alert>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <ShieldOff className="h-8 w-8 text-muted-foreground" />
                  <div>
                    <p className="font-medium">2FA Désactivé</p>
                    <p className="text-sm text-muted-foreground">
                      Protégez votre compte avec l'authentification à deux facteurs
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => setShowSetup(true)}
                  className="bg-orange-500 hover:bg-orange-600"
                >
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  Activer
                </Button>
              </div>

              <Alert>
                <Shield className="h-4 w-4" />
                <AlertTitle>Recommandé</AlertTitle>
                <AlertDescription>
                  L'authentification à deux facteurs protège votre compte même si votre mot de passe est compromis.
                </AlertDescription>
              </Alert>
            </>
          )}
        </CardContent>
      </Card>

      {/* Sessions Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Monitor className="h-5 w-5 text-orange-500" />
                Sessions actives
              </CardTitle>
              <CardDescription>
                Gérez les appareils connectés à votre compte
              </CardDescription>
            </div>
            {sessions.filter(s => !s.isCurrent && !s.isRevoked).length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRevokeOtherSessions}
                className="text-red-600"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Déconnecter les autres
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {sessions.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                Aucune session active
              </p>
            ) : (
              sessions.map((s) => (
                <div
                  key={s.id}
                  className={`flex items-center justify-between p-4 rounded-lg border ${
                    s.isCurrent
                      ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800'
                      : s.isRevoked
                      ? 'bg-muted/50 opacity-60'
                      : 'bg-muted/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-background rounded-lg">
                      {getDeviceIcon(s.device)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">
                          {s.browser || 'Navigateur'} sur {s.os || 'Système'}
                        </p>
                        {s.isCurrent && (
                          <Badge variant="outline" className="text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800">
                            Session actuelle
                          </Badge>
                        )}
                        {s.isTrusted && (
                          <Badge variant="outline" className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800">
                            <Check className="mr-1 h-3 w-3" />
                            Appareil de confiance
                          </Badge>
                        )}
                        {s.isRevoked && (
                          <Badge variant="outline" className="text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800">
                            Révoquée
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                        {s.ip && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {s.ip}
                          </span>
                        )}
                        {s.lastActive && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(s.lastActive).toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {!s.isCurrent && !s.isRevoked && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRevokeSession(s.id)}
                      disabled={revokingSession === s.id}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      {revokingSession === s.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Setup Dialog */}
      {showSetup && (
        <Dialog open={showSetup} onOpenChange={setShowSetup}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Configuration du 2FA</DialogTitle>
              <DialogDescription>
                Suivez les étapes pour activer l'authentification à deux facteurs
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <TwoFactorSetup
                showTitle={false}
                onComplete={() => {
                  setShowSetup(false);
                  loadData();
                }}
                onCancel={() => setShowSetup(false)}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Disable Dialog */}
      <Dialog open={showDisableDialog} onOpenChange={setShowDisableDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">Désactiver le 2FA</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir désactiver l'authentification à deux facteurs ?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Cela rendra votre compte moins sécurisé. Si vous perdez l'accès à votre compte, il sera plus difficile de le récupérer.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="disable-password">Mot de passe</Label>
              <Input
                id="disable-password"
                type="password"
                value={disablePassword}
                onChange={(e) => setDisablePassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="disable-code">Code 2FA (optionnel)</Label>
              <Input
                id="disable-code"
                type="text"
                value={disableCode}
                onChange={(e) => setDisableCode(e.target.value)}
                placeholder="000000"
                maxLength={6}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDisableDialog(false);
                setDisablePassword('');
                setDisableCode('');
              }}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleDisable2FA}
              disabled={disabling || !disablePassword}
            >
              {disabling ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ShieldOff className="mr-2 h-4 w-4" />
              )}
              Désactiver
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
