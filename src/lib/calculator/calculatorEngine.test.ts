import { describe, expect, it } from "vitest";
import { formatNumber, roundStable } from "@/lib/calculator/formatNumber";
import { runProfitMarginLogic } from "@/lib/pipeline/profitMarginLogic";
import { rankScenariosByRevenue } from "@/lib/calculator/scenarioRanking";

describe("precision engine (formatNumber)", () => {
  it("cleans float noise to max 4 decimal places (e.g. 1.8 not 1.7999…)", () => {
    expect(formatNumber(1.7999999999999998)).toBe("1.8");
  });

  it("never uses scientific notation for typical small decimals", () => {
    const v = 0.1 + 0.2;
    const s = formatNumber(v);
    expect(s).not.toMatch(/e[+-]/i);
    expect(s).toMatch(/^0\.3/);
  });

  it("formats very small positive values without scientific notation", () => {
    const s = formatNumber(0.0000000004);
    expect(s).not.toMatch(/e[+-]/i);
  });

  it("stabilizes float noise via roundStable", () => {
    expect(roundStable(4.00000000000004e-1, 12)).toBeCloseTo(0.4, 10);
  });
});

describe("validation engine (zero division / margin)", () => {
  it("rejects zero selling price for profit margin (denominator)", () => {
    const out = runProfitMarginLogic(0, 5, 10);
    expect(out.ok).toBe(false);
    if (out.ok) return;
    expect(out.error).toBeTruthy();
  });
});

describe("scenario ranking", () => {
  it("ranks highest revenue first", () => {
    const r = rankScenariosByRevenue([
      { id: "a", label: "Low", revenue: 100 },
      { id: "b", label: "High", revenue: 500 },
      { id: "c", label: "Mid", revenue: 300 },
    ]);
    expect(r[0].id).toBe("b");
    expect(r[2].id).toBe("a");
  });
});

describe("combined logic (precision + validation + ranking)", () => {
  it("formats ranked revenues consistently after stable rounding", () => {
    const r = rankScenariosByRevenue([
      { id: "x", label: "A", revenue: 99.99999999999 },
      { id: "y", label: "B", revenue: 100.00000000001 },
    ]);
    expect(r[0].id).toBe("y");
    const a = formatNumber(r[0].revenue);
    const b = formatNumber(r[1].revenue);
    expect(a).not.toMatch(/e[+-]/i);
    expect(b).not.toMatch(/e[+-]/i);
  });
});
