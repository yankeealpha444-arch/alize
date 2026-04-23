import type { PipelineRunResult } from "@/lib/pipeline/types";
import { resolveToolDomainFamily, type ToolDomainFamilyId } from "@/lib/pipeline/toolFamilyRegistry";

/** Portable snapshot for bulk harness / APIs — extends as new domains gain submodes. */
export interface StructuredToolSnapshot {
  appType: string;
  category: string;
  subtype: string;
  submode: string | null;
  domainFamily: ToolDomainFamilyId;
  entities: string[];
  confidence: number;
  blockedCategories: string[];
}

export function buildStructuredToolSnapshot(r: PipelineRunResult): StructuredToolSnapshot {
  const route = r.route.primaryFamilies.join("+");
  const submode = r.pricingSubmode;

  return {
    appType: r.intent.app_type,
    category: r.intent.primary_category,
    subtype: route || "unknown",
    submode,
    domainFamily: resolveToolDomainFamily(r),
    entities: [...r.intent.entities],
    confidence: r.intent.confidence,
    blockedCategories: [...r.intent.blocked_categories],
  };
}
