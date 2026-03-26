"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Link2,
  Copy,
  Mail,
  MessageCircle,
  Clock,
  Eye,
  Trash2,
  ExternalLink,
  CheckCircle,
  XCircle,
  RefreshCw,
  Send,
} from "lucide-react";

interface PortalToken {
  id: string;
  clientId: string;
  token: string;
  expiresAt: string;
  singleUse: boolean;
  usedAt: string | null;
  accessedAt: string | null;
  accessedCount: number;
  accessIps: string | null;
  createdBy: string | null;
  note: string | null;
  createdAt: string;
}

interface Client {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
}

interface SharePortalProps {
  client: Client;
}

export function SharePortal({ client }: SharePortalProps) {
  const [open, setOpen] = useState(false);
  const [tokens, setTokens] = useState<PortalToken[]>([]);
  const [loading, setLoading] = useState(false);
  const [expiresInDays, setExpiresInDays] = useState("30");
  const [singleUse, setSingleUse] = useState(false);
  const [note, setNote] = useState("");
  const [deleteTokenId, setDeleteTokenId] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      fetchTokens();
    }
  }, [open, client.id]);

  const fetchTokens = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/portal-tokens?clientId=${client.id}`);
      const result = await response.json();
      if (result.success) {
        setTokens(result.data);
      }
    } catch (error) {
      console.error("Error fetching tokens:", error);
      toast.error("Erreur lors du chargement des tokens");
    } finally {
      setLoading(false);
    }
  };

  const generateToken = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/portal-tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: client.id,
          expiresInDays: parseInt(expiresInDays),
          singleUse,
          note: note || undefined,
        }),
      });

      const result = await response.json();
      if (result.success) {
        toast.success("Lien généré avec succès");
        fetchTokens();
        setNote("");
      } else {
        toast.error(result.error || "Erreur lors de la génération");
      }
    } catch (error) {
      console.error("Error generating token:", error);
      toast.error("Erreur lors de la génération du token");
    } finally {
      setLoading(false);
    }
  };

  const revokeToken = async (tokenId: string) => {
    try {
      const response = await fetch(`/api/portal-tokens?tokenId=${tokenId}`, {
        method: "DELETE",
      });

      const result = await response.json();
      if (result.success) {
        toast.success("Token révoqué");
        fetchTokens();
      } else {
        toast.error(result.error || "Erreur lors de la révocation");
      }
    } catch (error) {
      console.error("Error revoking token:", error);
      toast.error("Erreur lors de la révocation");
    } finally {
      setDeleteTokenId(null);
    }
  };

  const getPortalUrl = (token: string) => {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
    return `${baseUrl}/portal/${token}`;
  };

  const copyToClipboard = async (token: string) => {
    const url = getPortalUrl(token);
    try {
      await navigator.clipboard.writeText(url);
      setCopiedToken(token);
      toast.success("Lien copié!");
      setTimeout(() => setCopiedToken(null), 2000);
    } catch {
      toast.error("Erreur lors de la copie");
    }
  };

  const shareViaEmail = (token: string) => {
    const url = getPortalUrl(token);
    const subject = encodeURIComponent(`Accédez à vos factures - ${client.name}`);
    const body = encodeURIComponent(`
Bonjour ${client.name},

Consultez vos factures et effectuez vos paiements en ligne:

${url}

Ce lien est valide jusqu'au ${new Date(tokens.find(t => t.token === token)?.expiresAt || "").toLocaleDateString("fr-FR")}.

Pour toute question, contactez-nous.

Cordialement
    `);
    window.open(`mailto:${client.email}?subject=${subject}&body=${body}`);
  };

  const shareViaWhatsApp = (token: string) => {
    const url = getPortalUrl(token);
    const text = encodeURIComponent(
      `Bonjour ${client.name}, consultez vos factures: ${url}`
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  const isUsed = (token: PortalToken) => {
    return token.singleUse && token.usedAt;
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <Link2 className="w-4 h-4 mr-2" />
            Portail
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="w-5 h-5 text-orange-500" />
              Portail client
            </DialogTitle>
            <DialogDescription>
              Générez un lien sécurisé pour {client.name} afin de consulter ses factures et effectuer des paiements.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Generate New Token */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Générer un nouveau lien</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Durée de validité</Label>
                    <Select value={expiresInDays} onValueChange={setExpiresInDays}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7">7 jours</SelectItem>
                        <SelectItem value="14">14 jours</SelectItem>
                        <SelectItem value="30">30 jours</SelectItem>
                        <SelectItem value="60">60 jours</SelectItem>
                        <SelectItem value="90">90 jours</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      Usage unique
                      <Switch
                        checked={singleUse}
                        onCheckedChange={setSingleUse}
                      />
                    </Label>
                    <p className="text-xs text-gray-500">
                      Le lien sera désactivé après le premier accès
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Note (optionnel)</Label>
                  <Input
                    placeholder="Ex: Lien envoyé par email le..."
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                </div>

                <Button
                  onClick={generateToken}
                  disabled={loading}
                  className="w-full bg-orange-500 hover:bg-orange-600"
                >
                  {loading ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Link2 className="w-4 h-4 mr-2" />
                  )}
                  Générer le lien
                </Button>
              </CardContent>
            </Card>

            {/* Existing Tokens */}
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900">Liens existants</h3>
              
              {loading && tokens.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                  Chargement...
                </div>
              ) : tokens.length === 0 ? (
                <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                  <Link2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>Aucun lien généré</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {tokens.map((token) => (
                    <Card
                      key={token.id}
                      className={`${
                        isExpired(token.expiresAt) || isUsed(token)
                          ? "opacity-60"
                          : ""
                      }`}
                    >
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-mono text-sm truncate">
                                ...{token.token.slice(-8)}
                              </span>
                              {isExpired(token.expiresAt) ? (
                                <Badge variant="secondary" className="bg-red-100 text-red-800">
                                  <XCircle className="w-3 h-3 mr-1" />
                                  Expiré
                                </Badge>
                              ) : isUsed(token) ? (
                                <Badge variant="secondary" className="bg-gray-100 text-gray-800">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Utilisé
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="bg-green-100 text-green-800">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Actif
                                </Badge>
                              )}
                              {token.singleUse && (
                                <Badge variant="outline">Usage unique</Badge>
                              )}
                            </div>
                            
                            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                Expire le {formatDate(token.expiresAt)}
                              </div>
                              {token.accessedCount > 0 && (
                                <div className="flex items-center gap-1">
                                  <Eye className="w-3 h-3" />
                                  {token.accessedCount} accès
                                </div>
                              )}
                              {token.note && (
                                <span className="text-gray-400">
                                  Note: {token.note}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {!isExpired(token.expiresAt) && !isUsed(token) && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => copyToClipboard(token.token)}
                                >
                                  {copiedToken === token.token ? (
                                    <CheckCircle className="w-4 h-4" />
                                  ) : (
                                    <Copy className="w-4 h-4" />
                                  )}
                                </Button>
                                {client.email && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => shareViaEmail(token.token)}
                                  >
                                    <Mail className="w-4 h-4" />
                                  </Button>
                                )}
                                {client.phone && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => shareViaWhatsApp(token.token)}
                                  >
                                    <MessageCircle className="w-4 h-4" />
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => window.open(getPortalUrl(token.token), "_blank")}
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-500 hover:text-red-600 hover:bg-red-50"
                              onClick={() => setDeleteTokenId(token.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTokenId} onOpenChange={() => setDeleteTokenId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Révoquer le lien?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le client ne pourra plus accéder au portail via ce lien.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTokenId && revokeToken(deleteTokenId)}
              className="bg-red-600 hover:bg-red-700"
            >
              Révoquer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
