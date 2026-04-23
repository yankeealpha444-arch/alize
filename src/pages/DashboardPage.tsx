import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Dashboard from "../../vision-clip-hub/src/pages/Dashboard";
import { useFounderAuth } from "@/context/FounderAuthContext";

export default function DashboardPage() {
  const navigate = useNavigate();
  const { isFounder } = useFounderAuth();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <>
      {isFounder ? (
        <div className="flex justify-end border-b border-border/40 px-4 py-2 sm:px-6">
          <button
            type="button"
            onClick={() => navigate("/internal")}
            className="rounded-full border border-border bg-background px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted"
          >
            Open AI CEO
          </button>
        </div>
      ) : null}
      <Dashboard />
    </>
  );
}
