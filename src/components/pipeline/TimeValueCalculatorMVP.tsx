import { useMemo, useState } from "react";
import { parseNumericSeeds, runTimeValueLogic } from "@/lib/pipeline/specializedSegmentLogic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DEDICATED_CALC_ROOT,
  DedicatedCalculatorActions,
  DedicatedCalculatorHeader,
  DedicatedInputsHeading,
  DedicatedResultsBlock,
} from "@/components/pipeline/dedicatedCalculatorChrome";

type Props = { projectId: string; idea: string };

export default function TimeValueCalculatorMVP({ projectId, idea }: Props) {
  const seed = useMemo(() => {
    const n = parseNumericSeeds(idea, 3);
    if (n.length >= 3) return { hours: n[0], days: n[1], hourly: n[2] };
    return { hours: 2, days: 5, hourly: 75 };
  }, [idea]);

  const [hoursSavedPerDay, setHoursSavedPerDay] = useState(seed.hours);
  const [daysPerWeek, setDaysPerWeek] = useState(seed.days);
  const [hourlyValue, setHourlyValue] = useState(seed.hourly);
  const [calculated, setCalculated] = useState(false);

  const outcome = useMemo(
    () => runTimeValueLogic(hoursSavedPerDay, daysPerWeek, hourlyValue),
    [hoursSavedPerDay, daysPerWeek, hourlyValue],
  );
  const show = calculated && outcome.ok;

  const reset = () => {
    setHoursSavedPerDay(seed.hours);
    setDaysPerWeek(seed.days);
    setHourlyValue(seed.hourly);
    setCalculated(false);
  };

  const insights: [string, string] = show
    ? [
        `Weekly value is ${outcome.weeklyHours.toFixed(1)} hours × your hourly rate.`,
        "Monthly value uses 52÷12 weeks to scale weekly to an average month.",
      ]
    : ["", ""];

  return (
    <div className={DEDICATED_CALC_ROOT}>
      <DedicatedCalculatorHeader
        kicker="Productivity"
        title="Time saved calculator"
        description="Hours saved per day, days per week, and hourly value — weekly and monthly dollar value."
      />

      <div className="space-y-4">
        <DedicatedInputsHeading />
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="rounded-2xl border-border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Hours saved (per day)</CardTitle>
            </CardHeader>
            <CardContent>
              <input
                id={`tv-h-${projectId}`}
                type="number"
                min={0}
                step={0.25}
                value={hoursSavedPerDay}
                onChange={(e) => {
                  setHoursSavedPerDay(Math.max(0, Number(e.target.value) || 0));
                  setCalculated(false);
                }}
                aria-label="Hours saved per day"
                className="w-full h-11 rounded-xl border border-border bg-background px-3 text-lg font-semibold tabular-nums"
              />
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Days per week</CardTitle>
            </CardHeader>
            <CardContent>
              <input
                id={`tv-d-${projectId}`}
                type="number"
                min={0}
                max={7}
                step={1}
                value={daysPerWeek}
                onChange={(e) => {
                  setDaysPerWeek(Math.min(7, Math.max(0, Number(e.target.value) || 0)));
                  setCalculated(false);
                }}
                aria-label="Days per week"
                className="w-full h-11 rounded-xl border border-border bg-background px-3 text-lg font-semibold tabular-nums"
              />
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Hourly value</CardTitle>
            </CardHeader>
            <CardContent>
              <input
                id={`tv-v-${projectId}`}
                type="number"
                min={0}
                step={1}
                value={hourlyValue}
                onChange={(e) => {
                  setHourlyValue(Math.max(0, Number(e.target.value) || 0));
                  setCalculated(false);
                }}
                aria-label="Hourly value"
                className="w-full h-11 rounded-xl border border-border bg-background px-3 text-lg font-semibold tabular-nums"
              />
            </CardContent>
          </Card>
        </div>
      </div>

      <DedicatedCalculatorActions calculateLabel="Calculate value" onCalculate={() => setCalculated(true)} onReset={reset} />

      {show && outcome.ok ? (
        <DedicatedResultsBlock
          primaryLabel="Weekly value"
          primaryValue={outcome.weeklyValue.toFixed(2)}
          secondaryLabel="Monthly value"
          secondaryValue={outcome.monthlyValue.toFixed(2)}
          insights={insights}
        />
      ) : null}
    </div>
  );
}
