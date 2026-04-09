import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

type ProjectRow = {
  id: string;
  name: string;
  created_at: string;
};

export default function FrontPage() {
  const navigate = useNavigate();

  const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || "https://epqbupbzgtfpioinadgv.supabase.co";
  const supabaseAnonKey =
    (import.meta as any).env?.VITE_SUPABASE_ANON_KEY ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVwcWJ1cGJ6Z3RmcGlvaW5hZGd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzNDY1OTksImV4cCI6MjA4NTkyMjU5OX0.Irz_OheIX6FJFSyuz8Gjb60teENux1KNkoZZvUgURME";

  const supabase: SupabaseClient = useMemo(() => {
    return createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true },
    });
  }, [supabaseUrl, supabaseAnonKey]);

  const [status, setStatus] = useState<string>("ready");
  const [debug, setDebug] = useState<string>("");
  const [creating, setCreating] = useState<boolean>(false);
  const [latest, setLatest] = useState<ProjectRow | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setStatus("checking supabase");
        setDebug("");

        const { data, error } = await supabase
          .from("projects")
          .select("id,name,created_at")
          .order("created_at", { ascending: false })
          .limit(1);

        if (error) throw error;

        setLatest((data?.[0] as ProjectRow) || null);
        setStatus("supabase ok");
      } catch (e: any) {
        setStatus("supabase error");
        setDebug(e?.message || String(e));
      }
    })();
  }, [supabase]);

  async function handleCreateProject() {
    try {
      setCreating(true);
      setDebug("");
      setStatus("creating project");

      const { data, error } = await supabase
        .from("projects")
        .insert({
          name: "New Project",
        })
        .select("id,name,created_at")
        .single();

      if (error) throw error;

      const created = data as ProjectRow;
      setLatest(created);
      setStatus("created, navigating");
      navigate(`/p/${created.id}`);
    } catch (e: any) {
      setStatus("create failed");
      setDebug(e?.message || String(e));
    } finally {
      setCreating(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 14,
        background: "#0b0b0b",
        color: "white",
        fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, "Helvetica Neue", Arial',
      }}
    >
      <div style={{ fontSize: 22, fontWeight: 700 }}>Front Page</div>

      <div style={{ opacity: 0.85, fontSize: 14 }}>
        Status: <span style={{ fontWeight: 600 }}>{status}</span>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={() => {
            console.log("frontpage tap test");
            alert("tap works");
          }}
          style={{
            padding: "12px 14px",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.18)",
            background: "rgba(255,255,255,0.08)",
            color: "white",
            fontSize: 16,
            cursor: "pointer",
            touchAction: "manipulation",
            userSelect: "none",
          }}
        >
          Tap Test
        </button>

        <button
          type="button"
          onClick={handleCreateProject}
          disabled={creating}
          style={{
            padding: "12px 14px",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.18)",
            background: creating ? "rgba(255,255,255,0.06)" : "white",
            color: creating ? "rgba(255,255,255,0.65)" : "black",
            fontSize: 16,
            cursor: creating ? "not-allowed" : "pointer",
            touchAction: "manipulation",
            userSelect: "none",
          }}
        >
          {creating ? "Creating..." : "Go to Project Page"}
        </button>
      </div>

      {latest && (
        <div
          style={{
            marginTop: 6,
            padding: 12,
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(255,255,255,0.06)",
            fontSize: 14,
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Latest project</div>
          <div>ID: {latest.id}</div>
          <div>Name: {latest.name}</div>
          <div>Created: {latest.created_at}</div>

          <button
            type="button"
            onClick={() => navigate(`/p/${latest.id}`)}
            style={{
              marginTop: 10,
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.18)",
              background: "rgba(255,255,255,0.08)",
              color: "white",
              fontSize: 14,
              cursor: "pointer",
              touchAction: "manipulation",
              userSelect: "none",
            }}
          >
            Open latest
          </button>
        </div>
      )}

      {debug && (
        <div
          style={{
            marginTop: 8,
            padding: 12,
            borderRadius: 12,
            border: "1px solid rgba(255,90,90,0.35)",
            background: "rgba(255,90,90,0.10)",
            color: "rgba(255,255,255,0.95)",
            fontSize: 13,
            whiteSpace: "pre-wrap",
          }}
        >
          {debug}
        </div>
      )}

      <div style={{ marginTop: "auto", opacity: 0.6, fontSize: 12 }}>
        If creation works but ProjectPage errors, the next fix will be in src/pages/ProjectPage.tsx to match your table
        columns.
      </div>
    </div>
  );
}
