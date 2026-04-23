import { useMemo, useState } from "react";
import { parseNumericSeeds, runLoanRepaymentLogic } from "@/lib/pipeline/specializedSegmentLogic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DEDICATED_CALC_ROOT,
  DedicatedCalculatorActions,
  DedicatedCalculatorHeader,
  DedicatedInputsHeading,
  DedicatedResultsBlock,
} from "@/components/pipeline/dedicatedCalculatorChrome";

type Props = { projectId: string; idea: string };

function clampNonNegative(n: number): number {
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export default function LoanRepaymentCalculatorMVP({ projectId, idea }: Props) {
  const seed = useMemo(() => {
    const n = parseNumericSeeds(idea, 3);
    if (n.length >= 3) return { principal: n[0], rate: n[1], years: n[2] };
    return { principal: 250_000, rate: 5.5, years: 25 };
  }, [idea]);

  const [principal, setPrincipal] = useState(seed.principal);
  const [annualRatePercent, setAnnualRatePercent] = useState(seed.rate);
  const [termYears, setTermYears] = useState(seed.years);
  const [calculated, setCalculated] = useState(false);

  const outcome = useMemo(
    () => runLoanRepaymentLogic(principal, annualRatePercent, termYears),
    [principal, annualRatePercent, termYears],
  );

  const show = calculated && outcome.ok;

  const reset = () => {
    setPrincipal(seed.principal);
    setAnnualRatePercent(seed.rate);
    setTermYears(seed.years);
    setCalculated(false);
  };

  const interestPaid =
    show && outcome.ok ? Math.max(0, outcome.totalRepayment - principal) : 0;

  const insights: [string, string] = show
    ? [
        `Interest cost over the term is ${interestPaid.toFixed(2)} on top of principal.`,
        annualRatePercent > 0
          ? "Lower rate or shorter term reduces total interest paid."
          : "With zero interest, total repayment equals principal spread across months.",
      ]
    : ["", ""];

  return (
    <div className={DEDICATED_CALC_ROOT}>
      <DedicatedCalculatorHeader
        kicker="Loan"
        title="Loan repayment calculator"
        description="Loan amount, annual interest rate, and term in years — monthly and total repayment."
      />

      <div className="space-y-4">
        <DedicatedInputsHeading />
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="rounded-2xl border-border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Loan amount</CardTitle>
            </CardHeader>
            <CardContent>
              <input
                id={`loan-p-${projectId}`}
                type="number"
                min={0}
                step={1}
                value={principal}
                onChange={(e) => {
                  setPrincipal(clampNonNegative(Number(e.target.value)));
                  setCalculated(false);
                }}
                aria-label="Loan amount"
                className="w-full h-11 rounded-xl border border-border bg-background px-3 text-lg font-semibold tabular-nums"
              />
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Interest rate (% p.a.)</CardTitle>
            </CardHeader>
            <CardContent>
              <input
                id={`loan-r-${projectId}`}
                type="number"
                min={0}
                step={0.01}
                value={annualRatePercent}
                onChange={(e) => {
                  setAnnualRatePercent(clampNonNegative(Number(e.target.value)));
                  setCalculated(false);
                }}
                aria-label="Interest rate percent per year"
                className="w-full h-11 rounded-xl border border-border bg-background px-3 text-lg font-semibold tabular-nums"
              />
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Loan term (years)</CardTitle>
            </CardHeader>
            <CardContent>
              <input
                id={`loan-y-${projectId}`}
                type="number"
                min={0.1}
                step={0.5}
                value={termYears}
                onChange={(e) => {
                  setTermYears(Math.max(0.1, Number(e.target.value) || 0.1));
                  setCalculated(false);
                }}
                aria-label="Loan term in years"
                className="w-full h-11 rounded-xl border border-border bg-background px-3 text-lg font-semibold tabular-nums"
              />
            </CardContent>
          </Card>
        </div>
      </div>

      <DedicatedCalculatorActions calculateLabel="Calculate repayment" onCalculate={() => setCalculated(true)} onReset={reset} />

      {calculated && !outcome.ok ? (
        <p className="text-sm text-destructive font-medium rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3">
          {outcome.error}
        </p>
      ) : null}

      {show && outcome.ok ? (
        <DedicatedResultsBlock
          primaryLabel="Monthly repayment"
          primaryValue={outcome.monthlyRepayment.toFixed(2)}
          secondaryLabel="Total repayment"
          secondaryValue={outcome.totalRepayment.toFixed(2)}
          insights={insights}
        />
      ) : null}
    </div>
  );
}
