/** Pure math for segment-only calculators (no runPipeline). */

export function parseNumericSeeds(prompt: string, minCount: number): number[] {
  const nums = prompt.match(/\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  if (nums.length >= minCount) return nums;
  return [];
}

export function runBreakEvenUnitsLogic(fixedCosts: number, pricePerUnit: number, variableCostPerUnit: number) {
  const F = Math.max(0, fixedCosts);
  const P = Math.max(0, pricePerUnit);
  const V = Math.max(0, variableCostPerUnit);
  const contribution = P - V;
  if (contribution <= 0) {
    return { ok: false as const, error: "Price per unit must be greater than variable cost per unit to break even." };
  }
  const breakEvenUnits = F / contribution;
  const breakEvenRevenue = breakEvenUnits * P;
  return {
    ok: true as const,
    breakEvenUnits,
    breakEvenRevenue,
    contributionPerUnit: contribution,
  };
}

/** Monthly payment (standard amortization). rateAnnual as percent e.g. 5 for 5%. */
export function runLoanRepaymentLogic(principal: number, annualRatePercent: number, termYears: number) {
  const P = Math.max(0, principal);
  const years = Math.max(0.01, termYears);
  const n = Math.round(years * 12);
  const rAnnual = Math.max(0, annualRatePercent) / 100;
  const r = rAnnual / 12;
  if (P <= 0 || n <= 0) return { ok: false as const, error: "Enter a positive loan amount and term." };
  let monthly: number;
  if (r <= 0) {
    monthly = P / n;
  } else {
    const pow = (1 + r) ** n;
    monthly = (P * r * pow) / (pow - 1);
  }
  const totalRepayment = monthly * n;
  return { ok: true as const, monthlyRepayment: monthly, totalRepayment, months: n };
}

export function runRoiLogic(investment: number, finalValue: number) {
  const I = Math.max(0, investment);
  if (I <= 0) return { ok: false as const, error: "Investment amount must be positive." };
  const profit = finalValue - I;
  const roiPercent = (profit / I) * 100;
  return { ok: true as const, profit, roiPercent };
}

export function runTimeValueLogic(hoursSavedPerDay: number, daysPerWeek: number, hourlyValue: number) {
  const h = Math.max(0, hoursSavedPerDay);
  const d = Math.max(0, daysPerWeek);
  const rate = Math.max(0, hourlyValue);
  const weeklyHours = h * d;
  const weeklyValue = weeklyHours * rate;
  const monthlyValue = weeklyValue * (52 / 12);
  return { ok: true as const, weeklyValue, monthlyValue, weeklyHours };
}

export function runConversionRateLogic(visitors: number, conversions: number) {
  const v = Math.max(0, visitors);
  const c = Math.max(0, conversions);
  if (v <= 0) return { ok: false as const, error: "Visitors must be greater than zero." };
  const ratePercent = (c / v) * 100;
  return { ok: true as const, ratePercent, conversions: c, visitors: v };
}

/** priceBeforeGst excludes tax; gstRatePercent e.g. 10 for 10%. */
export function runGstLogic(priceBeforeGst: number, gstRatePercent: number) {
  const base = Math.max(0, priceBeforeGst);
  const rate = Math.max(0, gstRatePercent);
  const gstAmount = base * (rate / 100);
  const priceIncludingGst = base + gstAmount;
  return { ok: true as const, gstAmount, priceIncludingGst, priceBeforeGst: base };
}
