import { describe, expect, it } from "vitest";
import {
  runBreakEvenUnitsLogic,
  runConversionRateLogic,
  runGstLogic,
  runLoanRepaymentLogic,
  runRoiLogic,
  runTimeValueLogic,
} from "@/lib/pipeline/specializedSegmentLogic";

describe("specializedSegmentLogic", () => {
  it("break-even units: F=1000, P=50, V=20 → 100/3 units, revenue = units*P", () => {
    const r = runBreakEvenUnitsLogic(1000, 50, 20);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.breakEvenUnits).toBeCloseTo(1000 / 30, 5);
    expect(r.breakEvenRevenue).toBeCloseTo((1000 / 30) * 50, 5);
  });

  it("loan: zero interest → flat principal/n", () => {
    const r = runLoanRepaymentLogic(12000, 0, 1);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.monthlyRepayment).toBeCloseTo(1000, 5);
  });

  it("roi", () => {
    const r = runRoiLogic(100, 125);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.roiPercent).toBeCloseTo(25, 5);
    expect(r.profit).toBeCloseTo(25, 5);
  });

  it("gst", () => {
    const r = runGstLogic(100, 10);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.gstAmount).toBe(10);
    expect(r.priceIncludingGst).toBe(110);
  });

  it("conversion rate", () => {
    const r = runConversionRateLogic(200, 10);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.ratePercent).toBe(5);
  });

  it("time value", () => {
    const r = runTimeValueLogic(2, 5, 50);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.weeklyValue).toBe(500);
  });
});
