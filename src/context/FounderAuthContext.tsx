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

const FOUNDER_SESSION_KEY = "alize_founder_session";
const FOUNDER_EMAIL = "founder@alize.dev";
const FOUNDER_PASSWORD = "123456";

export type FounderAuthState = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  isFounder: boolean;
  signIn: (email: string, password: string) => boolean;
  signOut: () => Promise<void>;
};

const FounderAuthContext = createContext<FounderAuthState | null>(null);

export function FounderAuthProvider({ children }: { children: ReactNode }) {
  const [isFounder, setIsFounder] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const hasSession = localStorage.getItem(FOUNDER_SESSION_KEY) === "true";
    setIsFounder(hasSession);
    setLoading(false);
  }, []);

  const signIn = useCallback((email: string, password: string) => {
    const validEmail = email.trim().toLowerCase() === FOUNDER_EMAIL;
    const validPassword = password === FOUNDER_PASSWORD;
    const isValid = validEmail && validPassword;
    if (isValid) {
      localStorage.setItem(FOUNDER_SESSION_KEY, "true");
      setIsFounder(true);
      return true;
    }
    return false;
  }, []);

  const signOut = useCallback(async () => {
    localStorage.removeItem(FOUNDER_SESSION_KEY);
    setIsFounder(false);
  }, []);

  const value = useMemo(
    () => ({
      session: null,
      user: null,
      loading,
      isFounder,
      signIn,
      signOut,
    }),
    [loading, isFounder, signIn, signOut],
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
