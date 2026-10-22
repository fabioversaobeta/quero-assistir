import { GoogleSignin, isSuccessResponse } from '@react-native-google-signin/google-signin';
import type { UserDto } from '@quero-assistir/contracts';
import * as SecureStore from 'expo-secure-store';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { config } from '@/core/config';
import { ApiClient } from '@/data/api-client';
import type { LibraryStore } from '@/data/library-store';
import { LocalLibraryStore } from '@/data/local-library-store';
import { RemoteLibraryStore } from '@/data/remote-library-store';

const TOKEN_KEY = 'qa.token';
const USER_KEY = 'qa.user';

interface SessionValue {
  ready: boolean;
  user: UserDto | null;
  api: ApiClient;
  /** Biblioteca ativa: remota se logado, local se anônimo. */
  library: LibraryStore;
  signIn(): Promise<void>;
  signOut(): Promise<void>;
  deleteAccount(): Promise<void>;
}

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<UserDto | null>(null);
  const tokenRef = useRef<string | null>(null);
  const local = useMemo(() => new LocalLibraryStore(), []);
  const api = useMemo(() => new ApiClient(() => tokenRef.current), []);
  const remote = useMemo(() => new RemoteLibraryStore(api), [api]);

  useEffect(() => {
    GoogleSignin.configure({ webClientId: config.googleWebClientId });
    (async () => {
      try {
        tokenRef.current = await SecureStore.getItemAsync(TOKEN_KEY);
        const stored = await SecureStore.getItemAsync(USER_KEY);
        if (tokenRef.current && stored) setUser(JSON.parse(stored) as UserDto);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const clearSession = useCallback(async () => {
    tokenRef.current = null;
    setUser(null);
    await Promise.all([SecureStore.deleteItemAsync(TOKEN_KEY), SecureStore.deleteItemAsync(USER_KEY)]);
  }, []);

  const signIn = useCallback(async () => {
    if (!config.googleWebClientId) throw new Error('Login com Google não configurado neste build.');
    await GoogleSignin.hasPlayServices();
    const result = await GoogleSignin.signIn();
    if (!isSuccessResponse(result) || !result.data.idToken) return; // usuário cancelou

    const auth = await api.loginWithGoogle(result.data.idToken);
    tokenRef.current = auth.accessToken;
    await SecureStore.setItemAsync(TOKEN_KEY, auth.accessToken);
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(auth.user));

    // Migra o histórico anônimo para a conta e limpa o local (os dados passam a viver no servidor).
    const decisions = await local.all();
    if (decisions.length > 0) {
      await api.importSwipes(
        decisions.map((d) => ({
          titleId: d.titleId,
          decision: d.decision,
          decidedAt: d.decidedAt,
          watched: d.watched,
        })),
      );
      await local.clear();
    }
    setUser(auth.user);
  }, [api, local]);

  const signOut = useCallback(async () => {
    await GoogleSignin.signOut().catch(() => undefined);
    await clearSession();
  }, [clearSession]);

  const deleteAccount = useCallback(async () => {
    await api.deleteAccount();
    await GoogleSignin.revokeAccess().catch(() => undefined);
    await clearSession();
  }, [api, clearSession]);

  const value = useMemo<SessionValue>(
    () => ({ ready, user, api, library: user ? remote : local, signIn, signOut, deleteAccount }),
    [ready, user, api, remote, local, signIn, signOut, deleteAccount],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession fora do SessionProvider');
  return ctx;
}
