import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import VideoClipperMVP from "@/components/mvp/VideoClipperMVP";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/trackingEvents";
import { sanitizeIdeaForPersistence } from "@/lib/mvp/ideaContentSafety";

type TemplatePayload = Record<string, unknown> & {
  ui_type?: string;
  template_id?: string;
  hero_title?: string;
  subtitle?: string;
  cta_text?: string;
  search_placeholder?: string;
};

function safeParseTemplatePayload(raw: unknown): TemplatePayload | null {
  try {
    if (!raw) return null;
    if (typeof raw === "string") {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? (parsed as TemplatePayload) : null;
    }
    if (typeof raw === "object") return raw as TemplatePayload;
    return null;
  } catch (err) {
    console.warn("[PublicMVP] template_payload parse error:", err);
    return null;
  }
}

export default function PublicMVP() {
  const routeParams = useParams<{ projectId?: string }>();
  const routeProjectId = routeParams.projectId;
  const projectId = routeProjectId || localStorage.getItem("alize_projectId") || "default";

  const [idea, setIdea] = useState("Loading...");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProject = async () => {
      setLoading(true);
      if (routeProjectId) localStorage.setItem("alize_projectId", routeProjectId);

      const sb = supabase as unknown as {
        from: (table: string) => {
          select: (cols: string) => {
            eq: (col: string, val: string) => {
              single: () => Promise<{ data: Record<string, unknown> | null; error: { message: string } | null }>;
              order: (col: string, o: { ascending: boolean }) => {
                limit: (n: number) => Promise<{ data: Array<Record<string, unknown>> | null; error: { message: string } | null }>;
              };
            };
          };
        };
      };

      const projectRes = await sb.from("projects").select("id, idea, name, status").eq("id", projectId).single();
      const outputRes = await sb
        .from("project_outputs")
        .select("template_payload, created_at")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(1);

      const project = projectRes.data ?? null;
      const output = outputRes.data?.[0] ?? null;
      const payload = safeParseTemplatePayload(output?.template_payload);

      const ideaFromPayload =
        typeof payload?.idea === "string"
          ? payload.idea
          : typeof payload?.project_idea === "string"
            ? payload.project_idea
            : "";
      const ideaFromProject =
        typeof project?.idea === "string"
          ? project.idea
          : typeof project?.name === "string"
            ? project.name
            : "";
      const merged = (ideaFromPayload || ideaFromProject || "My Product").trim();
      const resolvedIdea = sanitizeIdeaForPersistence(merged) || "My Product";

      setIdea(resolvedIdea.length > 0 ? resolvedIdea : "My Product");

      if (projectRes.error) console.warn("[PublicMVP] projects load error:", projectRes.error.message);
      if (outputRes.error) console.warn("[PublicMVP] project_outputs load error:", outputRes.error.message);

      setLoading(false);
    };

    loadProject();
  }, [projectId]);

  useEffect(() => {
    const run = async () => {
      await trackEvent("page_view", projectId, "public_mvp");
    };
    void run();
  }, [projectId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        Loading clips...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <VideoClipperMVP projectId={projectId} ideaSeed={idea} hideDashboardFab />
    </div>
  );
}