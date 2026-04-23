import type { PipelineRunResult } from "@/lib/pipeline/types";
import CompetitorPositionPricingMVP from "@/components/pipeline/CompetitorPositionPricingMVP";
import PricingConfidenceMVP from "@/components/pipeline/PricingConfidenceMVP";
import DiscountImpactCalculator from "@/components/pipeline/DiscountImpactCalculator";
import MarginCalculatorMVP from "@/components/pipeline/MarginCalculatorMVP";
import ProfitMarginCalculatorMVP from "@/components/pipeline/ProfitMarginCalculatorMVP";
import PriceChangeSimulatorMVP from "@/components/pipeline/PriceChangeSimulatorMVP";
import BreakEvenCalculatorMVP from "@/components/pipeline/BreakEvenCalculatorMVP";
import MarkupCalculatorMVP from "@/components/pipeline/MarkupCalculatorMVP";
import UnitRevenueCalculatorMVP from "@/components/pipeline/UnitRevenueCalculatorMVP";
import CostPlusPricingMVP from "@/components/pipeline/CostPlusPricingMVP";

type Props = {
  projectId: string;
  pipeline: PipelineRunResult;
  /** Current tool idea/prompt — combined with submode so switching ideas remounts and clears stale UI. */
  idea: string;
};

/**
 * Routes `pricing_calculator` premium UI by `pipeline.pricingSubmode` so intent matches blocks and logic.
 */
export default function PricingPremiumMVP({ projectId, pipeline, idea }: Props) {
  const sub = pipeline.pricingSubmode ?? "competitor_position";

  switch (sub) {
    case "discount_impact":
      return <DiscountImpactCalculator key={`${projectId}-${idea}`} projectId={projectId} idea={idea} />;
    case "break_even":
      return <BreakEvenCalculatorMVP key={`${projectId}-${idea}`} projectId={projectId} idea={idea} />;
    case "pricing_confidence":
      return <PricingConfidenceMVP key={`${projectId}-${idea}`} projectId={projectId} pipeline={pipeline} />;
    case "profit_margin":
      return <ProfitMarginCalculatorMVP key={`${projectId}-${idea}`} projectId={projectId} idea={idea} />;
    case "markup":
      return <MarkupCalculatorMVP key={`${projectId}-${idea}`} projectId={projectId} idea={idea} />;
    case "unit_revenue":
      return <UnitRevenueCalculatorMVP key={`${projectId}-${idea}`} projectId={projectId} idea={idea} />;
    case "cost_plus_pricing":
      return <CostPlusPricingMVP key={`${projectId}-${idea}`} projectId={projectId} idea={idea} />;
    case "margin_calculator":
      return <MarginCalculatorMVP key={`${projectId}-${idea}`} projectId={projectId} pipeline={pipeline} />;
    case "price_change_simulator":
      return <PriceChangeSimulatorMVP key={`${projectId}-${idea}`} projectId={projectId} pipeline={pipeline} />;
    case "competitor_position":
    default:
      return <CompetitorPositionPricingMVP key={`${projectId}-${idea}`} projectId={projectId} pipeline={pipeline} />;
  }
}
