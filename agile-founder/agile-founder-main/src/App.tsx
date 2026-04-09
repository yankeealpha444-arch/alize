import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import AppLayout from "@/components/AppLayout";
import Idea from "@/pages/Idea";
import Questions from "@/pages/Questions";
import GenerateMVP from "@/pages/GenerateMVP";
import Builder from "@/pages/Builder";
import Publish from "@/pages/Publish";
import Dashboard from "@/pages/Dashboard";
import Tests from "@/pages/Tests";
import PreviewChanges from "@/pages/PreviewChanges";
import Versions from "@/pages/Versions";
import GetUsers from "@/pages/GetUsers";
import PublicMVP from "@/pages/PublicMVP";
import Projects from "@/pages/Projects";
import NotFound from "@/pages/NotFound";
import FeedbackDetail from "@/pages/detail/FeedbackDetail";
import SurveyDetail from "@/pages/detail/SurveyDetail";
import PriceIntentDetail from "@/pages/detail/PriceIntentDetail";
import EmailsDetail from "@/pages/detail/EmailsDetail";
import DropOffDetail from "@/pages/detail/DropOffDetail";
import UsageDetail from "@/pages/detail/UsageDetail";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Home = Projects list */}
          <Route path="/" element={<Projects />} />

          {/* Public MVP — customer view, no founder tools */}
          <Route path="/p" element={<PublicMVP />} />
          <Route path="/p/:projectId" element={<PublicMVP />} />

          {/* Standalone pages (no sidebar) */}
          <Route path="/idea" element={<Idea />} />
          <Route path="/questions" element={<Questions />} />
          <Route path="/generate" element={<GenerateMVP />} />

          {/* Founder mode: sidebar layout — project-scoped */}
          <Route element={<AppLayout />}>
            <Route path="/builder/:projectId" element={<Builder />} />
            <Route path="/publish/:projectId" element={<Publish />} />
            <Route path="/dashboard/:projectId" element={<Dashboard />} />
            <Route path="/tests/:projectId" element={<Tests />} />
            <Route path="/preview/:projectId" element={<PreviewChanges />} />
            <Route path="/versions/:projectId" element={<Versions />} />
            <Route path="/get-users/:projectId" element={<GetUsers />} />
            {/* Detail pages */}
            <Route path="/detail/feedback/:projectId" element={<FeedbackDetail />} />
            <Route path="/detail/surveys/:projectId" element={<SurveyDetail />} />
            <Route path="/detail/price-intent/:projectId" element={<PriceIntentDetail />} />
            <Route path="/detail/emails/:projectId" element={<EmailsDetail />} />
            <Route path="/detail/drop-off/:projectId" element={<DropOffDetail />} />
            <Route path="/detail/usage/:projectId" element={<UsageDetail />} />
          </Route>

          {/* Legacy routes — redirect to default project */}
          <Route path="/builder" element={<Navigate to="/builder/default" replace />} />
          <Route path="/publish" element={<Navigate to="/publish/default" replace />} />
          <Route path="/dashboard" element={<Navigate to="/dashboard/default" replace />} />
          <Route path="/tests" element={<Navigate to="/tests/default" replace />} />
          <Route path="/preview" element={<Navigate to="/preview/default" replace />} />
          <Route path="/versions" element={<Navigate to="/versions/default" replace />} />
          <Route path="/get-users" element={<Navigate to="/get-users/default" replace />} />
          <Route path="/insights" element={<Navigate to="/tests/default" replace />} />
          <Route path="/insights/:projectId" element={<Navigate to="/tests/default" replace />} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
