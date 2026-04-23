import { supabase } from "@/integrations/supabase/client";
import type { UIHealthIssue, UIHealthReport } from "@/lib/mvp/uiHealth";
import { uiHealthOverallStatus } from "@/lib/mvp/uiHealth";

/**
 * Best-effort persist of a UI health snapshot to Supabase `ui_health_checks`.
 * Fails silently if the table is missing or RLS blocks insert (local dev).
 */
export async function saveUiHealthCheckToSupabase(input: {
  projectId: string;
  page: string;
  report: UIHealthReport;
  issues: UIHealthIssue[];
}): Promise<void> {
  try {
    const status = uiHealthOverallStatus(input.issues);
    const sb = supabase as unknown as {
      from: (table: string) => {
        insert: (row: Record<string, unknown>) => Promise<{ error: { message?: string } | null }>;
      };
    };
    const { error } = await sb.from("ui_health_checks").insert({
      project_id: String(input.projectId),
      page: input.page,
      status,
      health_report: input.report as unknown as Record<string, unknown>,
      issues: input.issues as unknown as Record<string, unknown>,
    });
    if (error) {
      console.warn("[uiHealth] Supabase insert skipped:", error.message);
    }
  } catch (e) {
    console.warn("[uiHealth] persist error", e);
  }
}
