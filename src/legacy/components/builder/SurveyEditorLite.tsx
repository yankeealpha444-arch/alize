export default function SurveyEditorLite({ projectName }: { projectName: string }) {
  return (
    <div className="p-6">
      <p className="text-xs font-semibold text-foreground uppercase tracking-widest mb-2">Survey</p>
      <p className="text-sm text-muted-foreground">
        Survey editor for <span className="text-foreground font-medium">{projectName}</span>.
      </p>
      <p className="text-xs text-muted-foreground mt-3">
        This is a lightweight placeholder aligned to the reference layout.
      </p>
    </div>
  );
}

