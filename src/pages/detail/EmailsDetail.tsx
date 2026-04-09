import { useNavigate } from "react-router-dom";
import { ArrowLeft, Mail, Download } from "lucide-react";
import { useProjectId } from "@/hooks/useProject";
import { getProjectData } from "@/lib/projectData";
import { toast } from "sonner";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

const EmailsDetail = () => {
  const projectId = useProjectId();
  const data = getProjectData(projectId);
  const navigate = useNavigate();
  const emails = data.emails;

  const exportCSV = () => {
    const csv = "Email,Date\n" + emails.map((e) => `${e.email},${e.timestamp}`).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `emails-${projectId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported!");
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </button>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Mail className="w-5 h-5 text-foreground" />
          <h1 className="text-xl font-bold text-foreground">Emails ({emails.length})</h1>
        </div>
        {emails.length > 0 && (
          <button onClick={exportCSV} className="flex items-center gap-2 text-sm font-medium text-foreground bg-secondary hover:bg-secondary/70 px-4 py-2 rounded-lg transition-colors">
            <Download className="w-4 h-4" /> Export CSV
          </button>
        )}
      </div>

      {/* Summary */}
      <div className="rounded-lg border border-border bg-card p-5 space-y-3">
        <h2 className="text-sm font-bold text-foreground">Summary</h2>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Total Emails</p>
            <p className="text-2xl font-bold font-mono text-foreground">{emails.length}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">This Week</p>
            <p className="text-2xl font-bold font-mono text-foreground">
              {emails.filter((e) => {
                const d = new Date(e.timestamp);
                const now = new Date();
                return now.getTime() - d.getTime() < 7 * 86400000;
              }).length}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Today</p>
            <p className="text-2xl font-bold font-mono text-foreground">
              {emails.filter((e) => new Date(e.timestamp).toDateString() === new Date().toDateString()).length}
            </p>
          </div>
        </div>
      </div>

      {/* Email List */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <h2 className="text-sm font-bold text-foreground">All Emails</h2>
        </div>
        {emails.length === 0 ? (
          <p className="px-5 py-8 text-sm text-muted-foreground text-center">No emails captured yet</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {emails.slice().reverse().map((e, i) => (
                <TableRow key={i}>
                  <TableCell className="font-mono text-xs">{emails.length - i}</TableCell>
                  <TableCell className="text-sm text-foreground">{e.email}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(e.timestamp).toLocaleString()}
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

export default EmailsDetail;
