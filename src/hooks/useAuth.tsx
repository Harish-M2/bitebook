import {
  createContext,
  useCallback,
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

/**
 * Supabase returns a user but *no* session when email confirmation is enabled on the
 * project, so sign-up has to distinguish "signed in" from "go and check your inbox".
 */
type SignUpResult = AuthResult & { needsEmailConfirmation: boolean };

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
  signUpWithPassword: (email: string, password: string) => Promise<SignUpResult>;
  signOut: () => Promise<AuthResult>;
  resetPassword: (email: string) => Promise<AuthResult>;
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

  /**
   * Single profile-loading path, shared by the userId effect and `refreshProfile`.
   * `isActive` lets the effect drop a response that arrived after the user changed.
   */
  const loadProfile = useCallback(async (id: string, isActive: () => boolean = () => true) => {
    try {
      const nextProfile = await getProfile(id);
      if (isActive()) {
        setProfile(nextProfile);
      }
    } catch (error) {
      // Do not crash the app on a transient profile-fetch failure — surface via
      // `profile` remaining null; screens should treat that as a loading/error state.
      console.warn('[Bitebook] Failed to load profile:', error);
    }
  }, []);

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
    const isActive = () => !isCancelled;

    // Deferred to a microtask: neither the lint rule nor the React Compiler can see
    // that `loadProfile` only calls setState after an await, so a direct call here
    // reads as a synchronous setState in the effect body.
    void Promise.resolve().then(() => {
      if (isCancelled) return;
      if (!userId) {
        setProfile(null);
        return;
      }
      return loadProfile(userId, isActive);
    });

    return () => {
      isCancelled = true;
    };
  }, [userId, loadProfile]);

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
        const { data, error } = await supabase.auth.signUp({ email, password });
        return {
          error: error?.message ?? null,
          needsEmailConfirmation: !error && data.session === null,
        };
      },
      signOut: async () => {
        const { error } = await supabase.auth.signOut();
        return { error: error?.message ?? null };
      },
      resetPassword: async (email) => {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: 'bitebook://auth/reset-password',
        });
        return { error: error?.message ?? null };
      },
    }),
    [session, isLoading, profile, userId, loadProfile]
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
