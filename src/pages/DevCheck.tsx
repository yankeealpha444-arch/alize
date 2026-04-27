import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

type EventRow = {
  id: string;
  event_name?: string | null;
  event_type?: string | null;
  occurred_at?: string | null;
  created_at?: string | null;
  metadata?: unknown;
  meta?: unknown;
};

type JobRow = {
  id: string;
  project_id: string | null;
  source_kind: string | null;
  status: string | null;
  error_message: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type ClipRow = {
  id: string;
  job_id: string | null;
  label: string | null;
  start_time_sec: number | null;
  end_time_sec: number | null;
  duration_sec: number | null;
  status: string | null;
  video_url: string | null;
};

type ExportRow = {
  id: string;
  clip_id: string | null;
  status: string | null;
  storage_path: string | null;
  download_url: string | null;
};

const TRACKED_EVENTS = [
  "session_started",
  "upload_started",
  "link_submitted",
  "clips_generated",
  "clip_played",
  "clip_viewed",
  "clip_downloaded",
  "generation_failed",
] as const;

export default function DevCheck() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [supabaseConnected, setSupabaseConnected] = useState<boolean>(false);
  const [supabaseError, setSupabaseError] = useState<string | null>(null);
  const [eventInsertOk, setEventInsertOk] = useState<boolean>(false);
  const [eventInsertId, setEventInsertId] = useState<string | null>(null);
  const [eventInsertError, setEventInsertError] = useState<string | null>(null);
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [clips, setClips] = useState<ClipRow[]>([]);
  const [exportsRows, setExportsRows] = useState<ExportRow[]>([]);
  const [eventCounts, setEventCounts] = useState<Record<string, number>>({});

  const latestClipWithUrl = useMemo(
    () => clips.find((c) => Boolean(c.video_url && c.video_url.trim())),
    [clips],
  );

  const latestJob = jobs[0] ?? null;

  const workerHint = useMemo(() => {
    if (!latestJob) return "No jobs found";
    if (latestJob.status === "failed") {
      return `Latest job failed: ${latestJob.error_message || "unknown error"}`;
    }
    if (latestJob.status === "queued" && latestJob.created_at) {
      const ageMs = Date.now() - Date.parse(latestJob.created_at);
      if (ageMs > 2 * 60 * 1000) {
        return "Worker likely not processing";
      }
    }
    return "Worker status looks active";
  }, [latestJob]);

  useEffect(() => {
    let mounted = true;
    const runChecks = async () => {
      setLoading(true);
      setSupabaseError(null);
      setEventInsertError(null);
      setEventInsertId(null);
      try {
        const conn = await supabase.from("events").select("id").limit(1);
        if (!mounted) return;
        if (conn.error) {
          setSupabaseConnected(false);
          setSupabaseError(conn.error.message || "Connection check failed");
        } else {
          setSupabaseConnected(true);
        }

        const insert = await supabase
          .from("events")
          .insert({
            event_name: "dev_check_event",
            event_type: "dev_check_event",
            page_path: "/internal/dev-check",
            page: "/internal/dev-check",
            occurred_at: new Date().toISOString(),
            metadata: { source: "dev_check_page" },
            meta: { source: "dev_check_page" },
          })
          .select("id")
          .single();
        if (!mounted) return;
        if (insert.error) {
          setEventInsertOk(false);
          setEventInsertError(insert.error.message || "Insert failed");
        } else {
          setEventInsertOk(true);
          setEventInsertId((insert.data as { id: string } | null)?.id || null);
        }

        const latestJobs = await supabase
          .from("video_jobs")
          .select("id,project_id,source_kind,status,error_message,created_at,updated_at")
          .order("created_at", { ascending: false })
          .limit(5);
        if (!mounted) return;
        setJobs(((latestJobs.data as JobRow[] | null) || []).slice());

        const latestClips = await supabase
          .from("video_clips")
          .select("id,job_id,label,start_time_sec,end_time_sec,duration_sec,status,video_url,created_at")
          .order("created_at", { ascending: false })
          .limit(10);
        if (!mounted) return;
        setClips(((latestClips.data as ClipRow[] | null) || []).slice());

        const latestExports = await supabase
          .from("clip_exports")
          .select("id,clip_id,status,storage_path,download_url,created_at")
          .order("created_at", { ascending: false })
          .limit(10);
        if (!mounted) return;
        setExportsRows(((latestExports.data as ExportRow[] | null) || []).slice());

        const counts: Record<string, number> = {};
        await Promise.all(
          TRACKED_EVENTS.map(async (name) => {
            const r = await supabase.from("events").select("id", { count: "exact", head: true }).eq("event_name", name);
            counts[name] = r.count ?? 0;
          }),
        );
        if (!mounted) return;
        setEventCounts(counts);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void runChecks();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Founder only</p>
          <h1 className="text-2xl font-bold tracking-tight">Clipper Dev Check</h1>
        </div>
        <button
          type="button"
          className="rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary"
          onClick={() => navigate("/internal")}
        >
          Back to Internal
        </button>
      </header>

      <section className="rounded-xl border border-border/60 bg-card p-4 text-sm space-y-2">
        <p>Supabase connection: <strong>{supabaseConnected ? "yes" : "no"}</strong></p>
        <p className="text-muted-foreground">Error: {supabaseError || "-"}</p>
        <p>Event insert test: <strong>{eventInsertOk ? "yes" : "no"}</strong></p>
        <p className="text-muted-foreground">Inserted row id: {eventInsertId || "-"}</p>
        <p className="text-muted-foreground">Insert error: {eventInsertError || "-"}</p>
      </section>

      <section className="rounded-xl border border-border/60 bg-card p-4 text-sm space-y-2">
        <h2 className="font-semibold">Worker status hint</h2>
        <p>{workerHint}</p>
      </section>

      <section className="rounded-xl border border-border/60 bg-card p-4 text-sm space-y-2">
        <h2 className="font-semibold">Preview tester</h2>
        <p className="break-all text-muted-foreground">URL: {latestClipWithUrl?.video_url || "-"}</p>
        {latestClipWithUrl?.video_url ? (
          <video src={latestClipWithUrl.video_url} controls playsInline className="w-full max-h-[360px] rounded-md border bg-black" />
        ) : (
          <p className="text-muted-foreground">No video_url found in latest clips.</p>
        )}
        <div className="flex gap-2">
          {latestClipWithUrl?.video_url ? (
            <>
              <a
                href={latestClipWithUrl.video_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-secondary"
              >
                Open URL
              </a>
              <a
                href={latestClipWithUrl.video_url}
                download
                className="inline-flex items-center rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-secondary"
              >
                Download
              </a>
            </>
          ) : null}
        </div>
      </section>

      <section className="rounded-xl border border-border/60 bg-card p-4 overflow-auto">
        <h2 className="font-semibold mb-2">Latest clipper jobs (5)</h2>
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-muted-foreground">
              <th>id</th><th>project_id</th><th>source_kind</th><th>status</th><th>error_message</th><th>created_at</th><th>updated_at</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((r) => (
              <tr key={r.id} className="border-t border-border/40">
                <td className="py-1 pr-2">{r.id}</td>
                <td className="py-1 pr-2">{r.project_id}</td>
                <td className="py-1 pr-2">{r.source_kind}</td>
                <td className="py-1 pr-2">{r.status}</td>
                <td className="py-1 pr-2">{r.error_message}</td>
                <td className="py-1 pr-2">{r.created_at}</td>
                <td className="py-1 pr-2">{r.updated_at}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="rounded-xl border border-border/60 bg-card p-4 overflow-auto">
        <h2 className="font-semibold mb-2">Latest clips (10)</h2>
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-muted-foreground">
              <th>id</th><th>job_id</th><th>label</th><th>start_time_sec</th><th>end_time_sec</th><th>duration_sec</th><th>status</th><th>video_url</th>
            </tr>
          </thead>
          <tbody>
            {clips.map((r) => (
              <tr key={r.id} className="border-t border-border/40">
                <td className="py-1 pr-2">{r.id}</td>
                <td className="py-1 pr-2">{r.job_id}</td>
                <td className="py-1 pr-2">{r.label}</td>
                <td className="py-1 pr-2">{r.start_time_sec}</td>
                <td className="py-1 pr-2">{r.end_time_sec}</td>
                <td className="py-1 pr-2">{r.duration_sec}</td>
                <td className="py-1 pr-2">{r.status}</td>
                <td className="py-1 pr-2 break-all">{r.video_url}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="rounded-xl border border-border/60 bg-card p-4 overflow-auto">
        <h2 className="font-semibold mb-2">Latest exports (10)</h2>
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-muted-foreground">
              <th>id</th><th>clip_id</th><th>status</th><th>storage_path</th><th>download_url</th>
            </tr>
          </thead>
          <tbody>
            {exportsRows.map((r) => (
              <tr key={r.id} className="border-t border-border/40">
                <td className="py-1 pr-2">{r.id}</td>
                <td className="py-1 pr-2">{r.clip_id}</td>
                <td className="py-1 pr-2">{r.status}</td>
                <td className="py-1 pr-2 break-all">{r.storage_path}</td>
                <td className="py-1 pr-2 break-all">{r.download_url}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="rounded-xl border border-border/60 bg-card p-4 overflow-auto">
        <h2 className="font-semibold mb-2">AI CEO event counts</h2>
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-muted-foreground">
              <th>event_name</th><th>count</th>
            </tr>
          </thead>
          <tbody>
            {TRACKED_EVENTS.map((name) => (
              <tr key={name} className="border-t border-border/40">
                <td className="py-1 pr-2">{name}</td>
                <td className="py-1 pr-2">{eventCounts[name] ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {loading ? <p className="text-sm text-muted-foreground">Running checks...</p> : null}
    </div>
  );
}
