import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import LinkClipperMvp from "./pages/LinkClipperMvp.tsx";
import Preview from "./pages/Preview.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import NotFound from "./pages/NotFound.tsx";
import AiCeoGuide from "../../src/pages/AiCeoGuide";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LinkClipperMvp />} />
          <Route path="/link-clipper" element={<LinkClipperMvp />} />
          <Route path="/clips" element={<LinkClipperMvp />} />
          <Route path="/ai-ceo" element={<AiCeoGuide />} />
          <Route path="/preview" element={<Preview />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/dashboard/:projectId" element={<Dashboard />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
