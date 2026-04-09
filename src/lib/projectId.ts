export function generateProjectId(idea: string): string {
  return (
    idea
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40) || "default"
  );
}
