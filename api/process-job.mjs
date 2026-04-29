// PRODUCTION WIRING SAFEGUARD:
// Root api/process-job.mjs is intentionally disabled to prevent route/API drift.
// The only supported production handler is: vision-clip-hub/api/process-job.js
function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

export default async function handler(req, res) {
  return json(res, 410, {
    ok: false,
    error: "root_process_job_disabled_use_vision_clip_hub_api",
    hint: "Use vision-clip-hub/api/process-job.js for production.",
    method: req.method,
  });
}
