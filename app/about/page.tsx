import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter, SiteNav } from "@/components/sections";

export const metadata: Metadata = {
  title: "About the Pilot — JanSahayak SafeStreets",
  description:
    "What JanSahayak SafeStreets is, what it is not, and how the Greater Noida pilot works.",
};

export default function AboutPage() {
  return (
    <>
      <div className="box-grid">
        <SiteNav />
        <main>
          <section className="section-box categories-section">
            <p className="section-label">About</p>
            <div className="section-heading">
              <h2>A transparency layer, not an authority</h2>
            </div>
            <div className="hazard-intro-group" style={{ maxWidth: "62ch" }}>
              <p
                style={{
                  color: "#486057",
                  fontSize: "15px",
                  lineHeight: 1.7,
                  marginTop: "28px",
                }}
              >
                JanSahayak SafeStreets is a public noticeboard for road-safety hazards in the
                Greater Noida pilot area. Citizens document hazards with structured reports,
                discover existing cases nearby, and follow the recorded path of civic follow-up —
                verifications, escalations to the right authority, and status updates, all traceable
                in the case timeline.
              </p>
              <p
                style={{
                  color: "#486057",
                  fontSize: "15px",
                  lineHeight: 1.7,
                  marginTop: "18px",
                }}
              >
                It is <strong style={{ color: "#0e2b24" }}>not a government portal</strong>. It does
                not replace, act for, or represent any municipal body. Official grievance channels
                remain the source of formal complaints; SafeStreets complements them by making
                hazards and their follow-up publicly visible.
              </p>
              <p
                style={{
                  color: "#486057",
                  fontSize: "15px",
                  lineHeight: 1.7,
                  marginTop: "18px",
                }}
              >
                The platform distinguishes citizen reports, AI suggestions, community verifications,
                and official updates. Pilot targets and illustrative figures shown in the interface
                are not current performance claims.
              </p>
            </div>
            <div style={{ marginTop: "34px" }}>
              <Link className="button button-dark" href="/reports/new">
                Report a hazard
              </Link>
            </div>
          </section>
        </main>
        <SiteFooter />
      </div>
    </>
  );
}
