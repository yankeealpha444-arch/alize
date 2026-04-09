import { updateMvpCustomizations, MvpCustomizations } from "@/lib/projectData";

/**
 * Applies the bundled “experiment wins” in one shot (Improve MVP from Dashboard).
 * User lands on Preview Changes to review before publishing.
 */
export function applyImproveMvpSuite(projectId: string): void {
  const patch: Partial<MvpCustomizations> = {
    headline: "Your MVP, sharpened by real tests",
    subtitle: "",
    ctaText: "Try it now — free",
    pricingCopy: "Start free — upgrade to Pro for $9/mo",
    showTestimonials: true,
  };
  updateMvpCustomizations(patch, projectId);
  window.dispatchEvent(new Event("alize-mvp-updated"));
}
