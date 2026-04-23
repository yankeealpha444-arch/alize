import { useState } from "react";
import { useLocation, useNavigate, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useFounderAuth } from "@/context/FounderAuthContext";
import { userIsFounder } from "@/lib/founderAuth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export default function FounderLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const { session, isFounder, loading } = useFounderAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const from =
    (location.state as { from?: string } | null)?.from &&
    typeof (location.state as { from?: string }).from === "string"
      ? (location.state as { from: string }).from
      : "/projects";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground text-sm">
        Loading…
      </div>
    );
  }

  if (session && isFounder) {
    return <Navigate to={from.startsWith("/") ? from : "/projects"} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { data, error: signErr } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signErr) {
        setError(signErr.message);
        return;
      }
      if (!data.user || !userIsFounder(data.user)) {
        await supabase.auth.signOut();
        setError("This account is not authorized for founder access.");
        return;
      }
      navigate(from.startsWith("/") ? from : "/projects", { replace: true });
    } catch {
      setError("Sign-in failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6 rounded-xl border border-border bg-card p-6 shadow-sm">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Founder sign-in</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Internal tools only. Public Video MVP does not require an account.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="founder-email">Email</Label>
            <Input
              id="founder-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="founder-password">Password</Label>
            <Input
              id="founder-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" className="w-full" disabled={submitting || loading}>
            {submitting ? "Signing in…" : "Sign in"}
          </Button>
        </form>
        <button
          type="button"
          className="w-full text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
          onClick={() => navigate("/video")}
        >
          Back to Video MVP
        </button>
      </div>
    </div>
  );
}
