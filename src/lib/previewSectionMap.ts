/** Maps VersionDiff.fieldKey / projectData keys to SaaSPreview [data-section] values. */
export function fieldKeyToDataSection(fieldKey: string): string {
  const map: Record<string, string> = {
    headline: "headline",
    subtitle: "subtitle",
    ctaText: "cta",
    pricingCopy: "pricing",
    heroTone: "hero-tone",
    showTestimonials: "testimonials",
  };
  return map[fieldKey] ?? fieldKey;
}
