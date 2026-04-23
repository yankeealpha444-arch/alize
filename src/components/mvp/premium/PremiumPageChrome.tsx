import type { ReactNode } from "react";
import { premiumTheme } from "@/lib/mvp/premiumTheme";

type Props = { children: ReactNode };

/** Full-page chrome: restrained gradient + container width. */
export function PremiumPageChrome({ children }: Props) {
  return <div className={premiumTheme.pageBackdrop}>{children}</div>;
}
