import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';
import { getProfile, type Profile } from '@/lib/db/profiles';

type AuthResult = { error: string | null };

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  /** True until the initial session lookup resolves. */
  isLoading: boolean;
  /** True once `profile` has loaded and `profile.username` is still null. */
  needsOnboarding: boolean;
  refreshProfile: () => Promise<void>;
  signInWithPassword: (email: string, password: string) => Promise<AuthResult>;
  signUpWithPassword: (email: string, password: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * Wraps the app in Supabase auth state. This is a skeleton for Phase 1: it exposes
 * session/user state and the core auth actions, but no sign-in UI is built yet
 * (planned for the (auth) route group in a later phase).
 */
export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);

  const userId = session?.user.id ?? null;

  const loadProfile = async (id: string) => {
    try {
      const nextProfile = await getProfile(id);
      setProfile(nextProfile);
    } catch (error) {
      // Do not crash the app on a transient profile-fetch failure — surface via
      // `profile` remaining null; screens should treat that as a loading/error state.
      console.warn('[Bitebook] Failed to load profile:', error);
    }
  };

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) return;
      setSession(data.session);
      setIsLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!isMounted) return;
      setSession(nextSession);
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let isCancelled = false;

    if (!userId) {
      // Defer to a microtask so this isn't a synchronous setState call inside the
      // effect body (avoids the cascading-render lint rule) while still resetting
      // profile state as soon as the user signs out.
      Promise.resolve().then(() => {
        if (!isCancelled) setProfile(null);
      });
      return () => {
        isCancelled = true;
      };
    }

    getProfile(userId)
      .then((nextProfile) => {
        if (!isCancelled) setProfile(nextProfile);
      })
      .catch((error) => {
        console.warn('[Bitebook] Failed to load profile:', error);
      });

    return () => {
      isCancelled = true;
    };
  }, [userId]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      isLoading,
      needsOnboarding: profile !== null && profile.username === null,
      refreshProfile: async () => {
        if (userId) {
          await loadProfile(userId);
        }
      },
      signInWithPassword: async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return { error: error?.message ?? null };
      },
      signUpWithPassword: async (email, password) => {
        const { error } = await supabase.auth.signUp({ email, password });
        return { error: error?.message ?? null };
      },
      signOut: async () => {
        await supabase.auth.signOut();
      },
    }),
    [session, isLoading, profile, userId]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
