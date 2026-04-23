import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const ACCESS_CODE = "alize123";

export default function FounderLogin() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const isAuthed = localStorage.getItem("alize_founder_session") === "true";

  if (isAuthed) {
    return <Navigate to="/internal" replace />;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (code.trim() === ACCESS_CODE) {
        localStorage.setItem("alize_founder_session", "true");
        navigate("/internal");
        return;
      }
      setError("Invalid access code");
    } catch {
      setError("Invalid access code");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6 rounded-xl border border-border bg-card p-6 shadow-sm">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Founder Access</h1>
          <p className="mt-1 text-sm text-muted-foreground">Internal tools only</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            id="founder-access-code"
            type="password"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Enter founder access code"
            required
          />
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Entering…" : "Enter"}
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
