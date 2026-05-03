import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';

import { storageService } from '../services/storageService';
import type { AuthStatus, AuthUser, SkinProfile, UserAccount } from '../types';

interface AuthContextValue {
  authLoading: boolean;
  authStatus: AuthStatus;
  user: AuthUser | null;
  registerAccount: (account: UserAccount) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  saveProfile: (profile: SkinProfile) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authLoading, setAuthLoading] = useState(true);
  const [authStatus, setAuthStatus] = useState<AuthStatus>('unauthenticated');
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const [account, profile, sessionActive] = await Promise.all([
          storageService.getAccount(),
          storageService.getProfile(),
          storageService.getSession(),
        ]);

        if (account && sessionActive) {
          setUser({
            fullName: account.fullName,
            email: account.email,
            profile,
          });
          setAuthStatus(profile ? 'authenticated' : 'profile-setup');
        } else {
          setAuthStatus('unauthenticated');
        }
      } finally {
        setAuthLoading(false);
      }
    };

    bootstrap();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      authLoading,
      authStatus,
      user,
      registerAccount: async (account) => {
        await storageService.saveAccount(account);
        await storageService.saveSession(true);
        setUser({
          fullName: account.fullName,
          email: account.email,
          profile: null,
        });
        setAuthStatus('profile-setup');
      },
      signIn: async (email, password) => {
        const storedAccount = await storageService.getAccount();
        const storedProfile = await storageService.getProfile();

        if (!storedAccount) {
          throw new Error('No account found. Please register first.');
        }

        if (
          storedAccount.email.trim().toLowerCase() !== email.trim().toLowerCase() ||
          storedAccount.password !== password
        ) {
          throw new Error('Invalid email or password.');
        }

        await storageService.saveSession(true);
        setUser({
          fullName: storedAccount.fullName,
          email: storedAccount.email,
          profile: storedProfile,
        });
        setAuthStatus(storedProfile ? 'authenticated' : 'profile-setup');
      },
      saveProfile: async (profile) => {
        await storageService.saveProfile(profile);
        setUser((current) =>
          current
            ? {
                ...current,
                profile,
              }
            : current
        );
        setAuthStatus('authenticated');
      },
      logout: async () => {
        await storageService.clearSession();
        setUser(null);
        setAuthStatus('unauthenticated');
      },
    }),
    [authLoading, authStatus, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider.');
  }

  return context;
}
