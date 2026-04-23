/**
 * Precision layer: never show NaN/Infinity; avoid scientific notation; trim float noise.
 */

function trimTrailingZeros(s: string): string {
  if (!s.includes(".")) return s;
  return s.replace(/\.?0+$/, "") || "0";
}

/** Stabilize floating-point noise before formatting (e.g. 0.30000000000000004 → 0.3). */
export function roundStable(value: number, maxDecimals = 10): number {
  if (!Number.isFinite(value)) return 0;
  const f = 10 ** maxDecimals;
  return Math.round((value + Number.EPSILON * Math.sign(value)) * f) / f;
}

const DISPLAY_MAX_DECIMALS = 4;

/**
 * Display formatter — no scientific notation; max 4 decimal places for normal magnitudes.
 * Float noise (e.g. 1.7999999999999998) is cleaned via roundStable first.
 * Very small non-zero values that would round to 0 at 4dp still render with extra decimals (no e-notation).
 */
export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return "—";
  if (value === 0) return "0";

  const abs0 = Math.abs(value);
  const atMax = roundStable(value, DISPLAY_MAX_DECIMALS);
  if (abs0 > 0 && atMax === 0 && abs0 < 0.00005) {
    const v = roundStable(value, 12);
    let s = trimTrailingZeros(v.toFixed(12));
    if (s === "-0") return "0";
    return s;
  }

  let s = trimTrailingZeros(atMax.toFixed(DISPLAY_MAX_DECIMALS));
  if (s === "-0") return "0";
  return s;
}

/** Percent display (number is already in % units, e.g. 12.5 for 12.5%). */
export function formatPercent(value: number): string {
  if (!Number.isFinite(value)) return "—";
  const v = roundStable(value, DISPLAY_MAX_DECIMALS);
  return `${trimTrailingZeros(v.toFixed(DISPLAY_MAX_DECIMALS))}%`;
}
