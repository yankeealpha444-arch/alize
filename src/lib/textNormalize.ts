/**
 * Display copy: avoid em/en dashes and hyphenated compounds in MVP strings.
 */
export function stripDashesFromDisplayText(input: string): string {
  let s = input;
  s = s.replace(/\s*[–—]\s*/g, ". ");
  s = s.replace(/\s+-\s+/g, ". ");
  s = s.replace(/([a-z])-([a-z])/gi, "$1 $2");
  return s.replace(/\s+\.\s+\./g, ".").replace(/\s+/g, " ").trim();
}
