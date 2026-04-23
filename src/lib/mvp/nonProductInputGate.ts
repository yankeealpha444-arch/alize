/**
 * Pre-classification gate: SQL, code, and env/config blobs are not MVP product ideas.
 * Does not call detectToolSubtype — use before subtype routing.
 */
export function isNonProductInput(prompt: string): boolean {
  if (prompt == null || typeof prompt !== "string") return false;
  const raw = prompt;
  const h = raw.toLowerCase();

  const sqlPatterns = [
    "create table",
    "create extension",
    "alter table",
    "insert into",
    "select *",
    "jsonb",
    "uuid",
    "returns trigger",
    "function public",
  ];
  if (sqlPatterns.some((p) => h.includes(p))) return true;

  if (h.includes("import ") || h.includes("\nimport ")) return true;
  if (h.includes("export ") || h.includes("\nexport ")) return true;
  if (/\bconst\s+[\w$]+\s*=/.test(raw)) return true;
  if (/\blet\s+[\w$]+\s*=/.test(raw)) return true;
  if (raw.includes("function(")) return true;
  if (raw.includes("=>")) return true;
  if (h.includes("interface ")) return true;
  if (/\btype\s+\w+\s*=/.test(raw)) return true;
  if (/\bclass\s+[A-Za-z_$][\w$]*\s*\{/.test(raw)) return true;

  const envPatterns = ["vite_", "supabase_", "api_key", "process.env"];
  if (envPatterns.some((p) => h.includes(p.toLowerCase()))) return true;

  return false;
}

export type BlockedInputGateResult = {
  type: "blocked_input";
  message: string;
};

const DEFAULT_MESSAGE =
  "This looks like SQL or code, not a startup idea. Please enter a product idea to generate an MVP.";

/** Use before subtype detection; returns a blocked envelope when input must not be classified as a tool. */
export function tryNonProductInputGate(prompt: string): BlockedInputGateResult | null {
  if (!isNonProductInput(prompt)) return null;
  return { type: "blocked_input", message: DEFAULT_MESSAGE };
}
