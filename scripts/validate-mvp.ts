import { detectProductType } from "../src/lib/productType";
import { buildHeroImageTagPath, getTemplateFamily } from "../src/lib/templateFamilies";
import { generateCopy } from "../src/lib/copyGenerator";

const ideas = ["social media grower", "clipper solution", "dog breeder marketplace", "ai study tutor"];

for (const idea of ideas) {
  const projectName = idea.split(" ").slice(0, 4).join(" ");
  const productType = detectProductType(idea);
  const family = getTemplateFamily(productType);
  const tagPath = buildHeroImageTagPath(productType, idea);
  const heroUrl = `https://loremflickr.com/900/700/${tagPath}`;
  const copy = generateCopy(idea, projectName);

  console.log("\n===", idea, "===");
  console.log("detected productType:", productType);
  console.log("template family:", family.type);
  console.log("hero image tagPath:", tagPath);
  console.log("hero image URL:", heroUrl);
  console.log("onboarding (3 Q):", family.onboarding.map((o) => o.q));
  console.log("product actions:", family.productActions);
  console.log("feature block titles:", family.featureBlocks.map((f) => f.title));
  console.log("how it works (titles):", family.howItWorks.map((s) => s.title));
  console.log("generated headline:", copy.headline);
}
