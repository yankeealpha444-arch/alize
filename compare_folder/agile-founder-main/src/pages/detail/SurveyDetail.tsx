import { useNavigate } from "react-router-dom";
import { ArrowLeft, ClipboardList } from "lucide-react";
import { useProjectId } from "@/hooks/useProject";
import { getProjectData } from "@/lib/projectData";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

const SurveyDetail = () => {
  const projectId = useProjectId();
  const data = getProjectData(projectId);
  const navigate = useNavigate();
  const surveys = data.surveys;

  // Compute summary stats
  const wouldPay = surveys.filter((s) =>
    Object.values(s.answers).some((a) => a === "Yes" || a === "Yes, definitely" || a === "Probably yes")
  ).length;
  const payRate = surveys.length > 0 ? Math.round((wouldPay / surveys.length) * 100) : 0;

  // Most common answers per question
  const answerCounts: Record<number, Record<string, number>> = {};
  surveys.forEach((s) => {
    Object.entries(s.answers).forEach(([q, a]) => {
      const qn = Number(q);
      if (!answerCounts[qn]) answerCounts[qn] = {};
      answerCounts[qn][a] = (answerCounts[qn][a] || 0) + 1;
    });
  });

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </button>

      <div className="flex items-center gap-3">
        <ClipboardList className="w-5 h-5 text-foreground" />
        <h1 className="text-xl font-bold text-foreground">Survey Responses ({surveys.length})</h1>
      </div>

      {/* AI Summary */}
      <div className="rounded-lg border border-border bg-card p-5 space-y-3">
        <h2 className="text-sm font-bold text-foreground">AI Summary</h2>
        {surveys.length === 0 ? (
          <p className="text-sm text-muted-foreground">No survey responses yet. Share your MVP to start collecting data.</p>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Total Responses</p>
                <p className="text-2xl font-bold font-mono text-foreground">{surveys.length}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Would Pay</p>
                <p className="text-2xl font-bold font-mono text-foreground">{payRate}%</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Target</p>
                <p className="text-2xl font-bold font-mono text-muted-foreground">40</p>
              </div>
            </div>
            <div className="pt-2 border-t border-border">
              <p className="text-xs text-muted-foreground">
                {surveys.length < 40
                  ? `${40 - surveys.length} more responses needed to reach validation threshold.`
                  : "✓ Survey validation target reached."}
              </p>
            </div>
          </>
        )}
      </div>

      {/* Raw Evidence Table */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <h2 className="text-sm font-bold text-foreground">All Responses (Raw Evidence)</h2>
        </div>
        {surveys.length === 0 ? (
          <p className="px-5 py-8 text-sm text-muted-foreground text-center">No responses yet</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                {Object.keys(surveys[0]?.answers || {}).map((q) => (
                  <TableHead key={q}>Q{Number(q) + 1}</TableHead>
                ))}
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {surveys.slice().reverse().map((s, i) => (
                <TableRow key={i}>
                  <TableCell className="font-mono text-xs">{surveys.length - i}</TableCell>
                  {Object.values(s.answers).map((a, j) => (
                    <TableCell key={j} className="text-xs max-w-[200px] truncate">{a}</TableCell>
                  ))}
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(s.timestamp).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
};

export default SurveyDetail;
