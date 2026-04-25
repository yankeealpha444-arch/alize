import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes, useParams } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { FounderAuthProvider } from "@/context/FounderAuthContext";
import FounderGate from "@/components/FounderGate";
import AppLayout from "@/components/AppLayout";
import Builder from "@/pages/Builder";
import Publish from "@/pages/Publish";
import Dashboard from "@/pages/Dashboard";
import Tests from "@/pages/Tests";
import PreviewChanges from "@/pages/PreviewChanges";
import Versions from "@/pages/Versions";
import GetUsers from "@/pages/GetUsers";
import PublicMVP from "@/pages/PublicMVP";
import GrowthToolApp from "@/pages/GrowthToolApp";
import Projects from "@/pages/Projects";
import NotFound from "@/pages/NotFound";
import InternalMetrics from "@/pages/InternalMetrics";
import FeedbackDetail from "@/pages/detail/FeedbackDetail";
import SurveyDetail from "@/pages/detail/SurveyDetail";
import PriceIntentDetail from "@/pages/detail/PriceIntentDetail";
import EmailsDetail from "@/pages/detail/EmailsDetail";
import DropOffDetail from "@/pages/detail/DropOffDetail";
import UsageDetail from "@/pages/detail/UsageDetail";
import ClipResults from "@/pages/ClipResults";
import Guidance from "@/pages/Guidance";
import ClipSelectionPage from "@/pages/ClipSelectionPage";
import ThumbnailSelectionPage from "@/pages/ThumbnailSelectionPage";
import PreviewPage from "@/pages/PreviewPage";
import VideoMVP from "@/pages/VideoMVP";
import DashboardPage from "@/pages/DashboardPage";
import FounderLogin from "@/pages/FounderLogin";
import ClipperClean from "@/pages/ClipperClean";
import ClipperCleanV2 from "@/pages/ClipperCleanV2";
import ClipperCleanV3 from "@/pages/ClipperCleanV3";
import ClipperAICEOV1 from "@/pages/ClipperAICEOV1";

const queryClient = new QueryClient();

function RedirectDashboardProjectToFounder() {
  const { projectId } = useParams();
  return <Navigate to={`/founder/${projectId}`} replace />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <FounderAuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/founder-login" element={<FounderLogin />} />
              <Route path="/login" element={<FounderLogin />} />
              <Route path="/internal" element={<FounderGate><InternalMetrics /></FounderGate>} />

              {/* Primary product: Video MVP (upload → clips → thumbnail → confirm → dashboard) */}
              <Route path="/" element={<Navigate to="/clips" replace />} />
              <Route path="/clips" element={<ClipSelectionPage />} />
              <Route path="/clips-clean" element={<ClipperClean />} />
              <Route path="/clips-clean-v2" element={<ClipperCleanV2 />} />
              <Route path="/clips-clean-v3" element={<ClipperCleanV3 />} />
              <Route path="/clips-ai-ceo-v1" element={<ClipperAICEOV1 />} />
              <Route path="/thumbnail" element={<ThumbnailSelectionPage />} />
              <Route path="/preview" element={<PreviewPage />} />
              <Route path="/video" element={<VideoMVP />} />
              <Route path="/dashboard" element={<DashboardPage />} />

              {/* Public MVP — customer view */}
              <Route path="/p" element={<PublicMVP />} />
              <Route path="/p/:projectId" element={<PublicMVP />} />
              <Route path="/video-mvp" element={<Navigate to="/clips" replace />} />
              <Route path="/video-mvp/:projectId" element={<Navigate to="/clips" replace />} />

              {/* growth_tool user product (no founder chrome) */}
              <Route path="/app/:projectId" element={<GrowthToolApp />} />

              {/* Legacy entry points → Video MVP */}
              <Route path="/idea" element={<Navigate to="/" replace />} />
              <Route path="/questions" element={<Navigate to="/" replace />} />
              <Route path="/generate" element={<Navigate to="/" replace />} />
              <Route path="/generate/:projectId" element={<Navigate to="/video-mvp/:projectId" replace />} />
              <Route path="/results/:projectId" element={<ClipResults />} />
              <Route path="/guidance/:projectId" element={<Guidance />} />

              {/* Founder-only: AI CEO, projects, validation, internal metrics, preview changes, builder, etc. */}
              <Route element={<FounderGate />}>
                <Route path="/projects" element={<Projects />} />
                <Route path="/dashboard/:projectId" element={<RedirectDashboardProjectToFounder />} />
                <Route element={<AppLayout />}>
                  <Route path="/builder/:projectId" element={<Builder />} />
                  <Route path="/publish/:projectId" element={<Publish />} />
                  <Route path="/founder/:projectId" element={<Dashboard />} />
                  <Route path="/tests/:projectId" element={<Tests />} />
                  <Route path="/preview/:projectId" element={<PreviewChanges />} />
                  <Route path="/versions/:projectId" element={<Versions />} />
                  <Route path="/get-users/:projectId" element={<GetUsers />} />
                  <Route path="/detail/feedback/:projectId" element={<FeedbackDetail />} />
                  <Route path="/detail/surveys/:projectId" element={<SurveyDetail />} />
                  <Route path="/detail/price-intent/:projectId" element={<PriceIntentDetail />} />
                  <Route path="/detail/emails/:projectId" element={<EmailsDetail />} />
                  <Route path="/detail/drop-off/:projectId" element={<DropOffDetail />} />
                  <Route path="/detail/usage/:projectId" element={<UsageDetail />} />
                </Route>
              </Route>

              {/* Compatibility aliases from previous root flow */}
              <Route path="/mvp-setup" element={<Navigate to="/" replace />} />
              <Route path="/project" element={<Navigate to="/" replace />} />

              {/* Legacy shortcuts */}
              <Route path="/builder" element={<Navigate to="/builder/default" replace />} />
              <Route path="/publish" element={<Navigate to="/publish/default" replace />} />
              <Route path="/dashboard/default" element={<Navigate to="/dashboard" replace />} />
              <Route path="/tests" element={<Navigate to="/tests/default" replace />} />
              <Route path="/preview/default" element={<Navigate to="/preview" replace />} />
              <Route path="/versions" element={<Navigate to="/versions/default" replace />} />
              <Route path="/get-users" element={<Navigate to="/get-users/default" replace />} />
              <Route path="/insights" element={<Navigate to="/tests/default" replace />} />
              <Route path="/insights/:projectId" element={<Navigate to="/tests/default" replace />} />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </FounderAuthProvider>
    </QueryClientProvider>
  );
}
