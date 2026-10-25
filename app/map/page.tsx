import type { Metadata } from "next";

import { LiveHazardMap } from "@/components/map";
import { SiteFooter, SiteNav } from "@/components/sections";

export const metadata: Metadata = {
  title: "Explore the Map — JanSahayak SafeStreets",
  description:
    "A live civic map of reported road-safety hazards across Greater Noida. Inspect verified community reports and follow their recorded status.",
};

export default function ExploreMapPage() {
  return (
    <>
      <div className="box-grid">
        <SiteNav />
      </div>
      <main>
        <LiveHazardMap showHeroOverlay={false} />
      </main>
      <div className="box-grid">
        <SiteFooter />
      </div>
    </>
  );
}
