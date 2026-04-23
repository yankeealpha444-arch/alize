import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { userIsFounder } from "@/lib/founderAuth";

export type FounderAuthState = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  isFounder: boolean;
  signOut: () => Promise<void>;
};

const FounderAuthContext = createContext<FounderAuthState | null>(null);

export function FounderAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (mounted) {
        setSession(s);
        setLoading(false);
      }
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const user = session?.user ?? null;
  const isFounder = userIsFounder(user);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const value = useMemo(
    () => ({
      session,
      user,
      loading,
      isFounder,
      signOut,
    }),
    [session, user, loading, isFounder, signOut],
  );

  return <FounderAuthContext.Provider value={value}>{children}</FounderAuthContext.Provider>;
}

export function useFounderAuth(): FounderAuthState {
  const ctx = useContext(FounderAuthContext);
  if (!ctx) {
    throw new Error("useFounderAuth must be used within FounderAuthProvider");
  }
  return ctx;
}

/** Safe for public routes that may render outside provider — use optional hook pattern. */
export function useFounderAuthOptional(): FounderAuthState | null {
  return useContext(FounderAuthContext);
}
