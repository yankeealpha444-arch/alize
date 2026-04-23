import type { DedicatedSegmentCalculatorSubtype } from "@/lib/mvp/toolTemplateSubtype";
import ProfitMarginCalculatorMVP from "@/components/pipeline/ProfitMarginCalculatorMVP";
import BreakEvenUnitsCalculatorMVP from "@/components/pipeline/BreakEvenUnitsCalculatorMVP";
import LoanRepaymentCalculatorMVP from "@/components/pipeline/LoanRepaymentCalculatorMVP";
import RoiCalculatorMVP from "@/components/pipeline/RoiCalculatorMVP";
import TimeValueCalculatorMVP from "@/components/pipeline/TimeValueCalculatorMVP";
import ConversionRateCalculatorMVP from "@/components/pipeline/ConversionRateCalculatorMVP";
import GSTCalculatorMVP from "@/components/pipeline/GSTCalculatorMVP";
import PricingTierSelectorMVP from "@/components/pipeline/PricingTierSelectorMVP";

export type SegmentDedicatedCalculatorProps = {
  subtype: DedicatedSegmentCalculatorSubtype;
  projectId: string;
  idea: string;
};

/**
 * Maps classifier subtype → concrete calculator UI + logic (bypasses runPipeline / PricingPremiumMVP / generic tool template).
 */
export default function SegmentDedicatedCalculator({ subtype, projectId, idea }: SegmentDedicatedCalculatorProps) {
  switch (subtype) {
    case "profit_margin_calculator":
      return <ProfitMarginCalculatorMVP projectId={projectId} idea={idea} />;
    case "break_even_calculator":
      return <BreakEvenUnitsCalculatorMVP projectId={projectId} idea={idea} />;
    case "loan_calculator":
      return <LoanRepaymentCalculatorMVP projectId={projectId} idea={idea} />;
    case "roi_calculator":
      return <RoiCalculatorMVP projectId={projectId} idea={idea} />;
    case "time_value_calculator":
      return <TimeValueCalculatorMVP projectId={projectId} idea={idea} />;
    case "conversion_rate_calculator":
      return <ConversionRateCalculatorMVP projectId={projectId} idea={idea} />;
    case "gst_calculator":
      return <GSTCalculatorMVP projectId={projectId} idea={idea} />;
    case "pricing_tier_selector":
      return <PricingTierSelectorMVP projectId={projectId} idea={idea} />;
    default:
      return null;
  }
}
