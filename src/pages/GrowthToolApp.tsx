import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getMvpCustomizations, getProjectData } from "@/lib/projectData";
import { sanitizeIdeaForPersistence } from "@/lib/mvp/ideaContentSafety";
import { detectProductType } from "@/lib/productType";
import { generateCopy } from "@/lib/copyGenerator";
import GrowthToolMVP from "@/components/growth/GrowthToolMVP";
import MarketplaceMVP from "@/components/marketplace/MarketplaceMVP";
import ReelPerformanceLabMVP from "@/components/mvp/ReelPerformanceLabMVP";
import { isReelPerformanceLabContext } from "@/lib/mvp/reelPerformanceLab";
import { isCarouselTesterContext } from "@/lib/mvp/carouselTester";
import CarouselTesterMVP from "@/components/mvp/CarouselTesterMVP";
import VideoClipperMVP from "@/components/mvp/VideoClipperMVP";
import { isVideoClipperProductIdea } from "@/lib/mvp/videoClipperDetection";

export default function GrowthToolApp() {
  const { projectId = "default" } = useParams<{ projectId: string }>();
  const [idea, setIdea] = useState(() =>
    sanitizeIdeaForPersistence(localStorage.getItem("alize_idea") || ""),
  );

  const productType = useMemo(() => detectProductType(idea || "My Product"), [idea]);

  useEffect(() => {
    localStorage.setItem("alize_projectId", projectId);
    const d = getProjectData(projectId);
    if (d.mvpIdea) {
      const safe = sanitizeIdeaForPersistence(d.mvpIdea);
      setIdea(safe);
      localStorage.setItem("alize_idea", safe);
    } else {
      const ls = sanitizeIdeaForPersistence(localStorage.getItem("alize_idea") || "");
      setIdea(ls);
      if (ls) localStorage.setItem("alize_idea", ls);
    }
  }, [projectId]);

  const isGrowth = productType === "growth_tool";
  const isMarketplace = productType === "marketplace";
  const projectName = idea.split(" ").slice(0, 4).join(" ");
  const copy = generateCopy(idea, projectName);
  const custom = getMvpCustomizations(projectId);
  const headline = custom.headline || copy.headline;
  const subtitle = custom.subtitle || copy.subtitle;

  const carouselTester = isCarouselTesterContext(idea, headline);
  const reelLab = isReelPerformanceLabContext(idea, headline);

  if (isVideoClipperProductIdea(idea)) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <VideoClipperMVP projectId={projectId} hideDashboardFab />
      </div>
    );
  }

  if (carouselTester) {
    return (
      <CarouselTesterMVP
        projectId={projectId}
        productName={/carousel tester/i.test(idea) ? "Carousel Tester" : idea.trim().slice(0, 48) || "Carousel Tester"}
      />
    );
  }

  if (reelLab) {
    return (
      <ReelPerformanceLabMVP
        projectId={projectId}
        productName={/instagram reel performance lab/i.test(idea) ? "Instagram Reel Performance Lab" : idea.trim().slice(0, 48) || "Instagram Reel Performance Lab"}
      />
    );
  }

  if (!isGrowth && !isMarketplace) {
    return (
      <div className="min-h-screen bg-[#020617] text-foreground px-6 py-16">
        <div className="max-w-md mx-auto text-center space-y-4">
          <p className="text-sm text-muted-foreground">This workspace currently supports growth and marketplace MVPs.</p>
          <Link to="/" className="text-sm text-primary underline">
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-50">
      {isGrowth ? (
        <GrowthToolMVP
          projectId={projectId}
          idea={idea}
          headline={headline || "Growth workspace"}
          subtitle={subtitle || "Generate and iterate your channel growth plan."}
        />
      ) : (
        <MarketplaceMVP
          projectId={projectId}
          idea={idea}
          headline={headline || "Marketplace"}
          subtitle={subtitle || "Browse products and open item details."}
        />
      )}
    </div>
  );
}
