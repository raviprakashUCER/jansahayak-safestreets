import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "@/components/icons";
import { HeroLiveFeedStrip } from "./hero-live-feed-strip";
import { siteConfig } from "@/lib/site";

export function HeroCopy() {
  return (
    <div className="hero-copy">
      <h1>
        Safer streets
        <br />
        <span>start with us.</span>
      </h1>

      <div className="mt-4 flex items-center gap-2 text-xs text-[#486057]">
        <span className="size-2 rounded-full bg-[#e4876f]" />
        <span className="font-medium text-[#0e2b24]">Pilot Area:</span>
        <span>{siteConfig.pilotArea}</span>
      </div>

      <p className="hero-intro">
        Spot a dangerous pothole, unlit corridor, or broken crossing? Document it once, verify
        existing community reports, and track the public record as it moves toward a fix.
      </p>

      <div className="hero-actions">
        <Link className="button button-dark shadow-sm" href="/reports/new">
          Report a hazard <ArrowUpRight />
        </Link>
        <a className="text-link" href="#map">
          Explore recent reports <ArrowRight />
        </a>
      </div>

      <p className="trust-note">
        <span className="trust-check">✓</span> An open civic coordination layer that complements
        official Greater Noida Authority grievance portals.
      </p>

      <HeroLiveFeedStrip />
    </div>
  );
}
