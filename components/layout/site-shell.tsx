import type { ReactNode } from "react";

import {
  HazardSection,
  HeroSection,
  ProcessSection,
  SiteFooter,
  SiteNav,
} from "@/components/sections";

type SiteShellProps = {
  children?: ReactNode;
};

export function SiteShell({ children }: SiteShellProps) {
  return (
    <div className="box-grid">
      <SiteNav />
      <HeroSection />
      {children ?? (
        <>
          <ProcessSection />
          <HazardSection />
        </>
      )}
      <SiteFooter />
    </div>
  );
}
