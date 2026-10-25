import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter, SiteNav } from "@/components/sections";

export const metadata: Metadata = {
  title: "Help — JanSahayak SafeStreets",
  description: "How to report a hazard, follow up on a case, and find official reporting routes.",
};

export default function HelpPage() {
  return (
    <>
      <div className="box-grid">
        <SiteNav />
        <main>
          <section className="section-box categories-section">
            <p className="section-label">Help</p>
            <div className="section-heading">
              <h2>How the noticeboard works</h2>
            </div>
            <ul
              style={{
                maxWidth: "62ch",
                marginTop: "28px",
                padding: 0,
                listStyle: "none",
                display: "grid",
                gap: 22,
                color: "#486057",
                fontSize: "15px",
                lineHeight: 1.7,
              }}
            >
              <li>
                <strong style={{ color: "#0e2b24" }}>Report a hazard.</strong>{" "}
                <Link href="/reports/new" style={{ textDecoration: "underline" }}>
                  Open the report form
                </Link>
                , pick what you saw, pin the location, and add a photo or other evidence.
              </li>
              <li>
                <strong style={{ color: "#0e2b24" }}>Explore first.</strong> The{" "}
                <Link href="/map" style={{ textDecoration: "underline" }}>
                  live map
                </Link>{" "}
                shows existing reports nearby. If a hazard is already documented, verifying it is
                more useful than a duplicate report.
              </li>
              <li>
                <strong style={{ color: "#0e2b24" }}>Follow the follow-up.</strong> Every case keeps
                a public record — verifications, escalations, and status updates. You can watch a
                case move instead of wondering whether anything happened.
              </li>
              <li>
                <strong style={{ color: "#0e2b24" }}>Official routes matter.</strong> SafeStreets
                helps you find a likely authority for a hazard, but formal complaints belong to
                official government channels. This platform complements them; it does not replace
                them.
              </li>
            </ul>
          </section>
        </main>
        <SiteFooter />
      </div>
    </>
  );
}
