'use client';

import { GoogleLogin, GoogleOAuthProvider } from '@react-oauth/google';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function GoogleSignIn({ clientId }: { clientId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  if (!clientId) {
    return <p className="error">Defina NEXT_PUBLIC_GOOGLE_CLIENT_ID para habilitar o login.</p>;
  }

  return (
    <GoogleOAuthProvider clientId={clientId}>
      <div className="row" style={{ justifyContent: 'center' }}>
        <GoogleLogin
          onSuccess={async ({ credential }) => {
            const response = await fetch('/api/session', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ idToken: credential }),
            });
            if (response.ok) {
              router.push('/');
              router.refresh();
              return;
            }
            const data = (await response.json().catch(() => null)) as { message?: string } | null;
            setError(data?.message ?? 'Não foi possível entrar');
          }}
          onError={() => setError('Falha no login com o Google')}
        />
      </div>
      {error && <p className="error">{error}</p>}
    </GoogleOAuthProvider>
  );
}
