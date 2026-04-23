import { useEffect } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useFounderAuth } from "@/context/FounderAuthContext";

/**
 * Requires Supabase session + founder allowlist / role. Renders child routes via `<Outlet />`.
 */
export default function FounderGate() {
  const { session, isFounder, loading } = useFounderAuth();
  const location = useLocation();

  useEffect(() => {
    if (loading) return;
    if (session && !isFounder) {
      void supabase.auth.signOut();
    }
  }, [loading, session, isFounder]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground text-sm">
        Loading…
      </div>
    );
  }

  if (!session) {
    return (
      <Navigate
        to="/founder-login"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    );
  }

  if (!isFounder) {
    return <Navigate to="/video" replace />;
  }

  return <Outlet />;
}
