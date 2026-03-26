'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { TwoFactorVerify } from '@/components/auth/two-factor-verify';
import { Loader2 } from 'lucide-react';

function TwoFactorPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';
  
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Si pas d'email, rediriger vers login
    if (!email) {
      router.push('/login');
    }
  }, [email, router]);

  const handleVerify = async (data: { 
    success: boolean; 
    user?: any;
    trustedDeviceToken?: string;
  }) => {
    if (!data.success || !data.user) {
      return;
    }

    setLoading(true);

    try {
      // Créer la session avec NextAuth
      const result = await signIn('credentials', {
        email,
        password: '', // Déjà vérifié
        twoFactorCode: 'verified',
        isTwoFactorVerification: 'true',
        redirect: false,
      });

      if (result?.error) {
        console.error('Session creation error:', result.error);
        router.push('/login?error=SessionError');
        return;
      }

      // Rediriger vers le dashboard ou l'URL demandée
      router.push(callbackUrl);
    } catch (error) {
      console.error('Login error:', error);
      router.push('/login?error=UnknownError');
    }
  };

  const handleCancel = () => {
    router.push('/login');
  };

  if (!email) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <div className="w-full max-w-md">
        {loading ? (
          <div className="flex flex-col items-center justify-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
            <p className="text-muted-foreground">Connexion en cours...</p>
          </div>
        ) : (
          <TwoFactorVerify
            email={email}
            onVerify={handleVerify}
            onCancel={handleCancel}
          />
        )}
      </div>
    </div>
  );
}

export default function TwoFactorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    }>
      <TwoFactorPageContent />
    </Suspense>
  );
}
