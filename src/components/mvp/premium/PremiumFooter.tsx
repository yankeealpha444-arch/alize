import { premiumTheme } from "@/lib/mvp/premiumTheme";

type Props = { label?: string };

export function PremiumFooter({ label = "Alizé — ship growth-ready products faster." }: Props) {
  return <footer className={premiumTheme.footer}>{label}</footer>;
}
