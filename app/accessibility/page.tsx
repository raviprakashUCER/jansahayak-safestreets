import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter, SiteNav } from "@/components/sections";

export const metadata: Metadata = {
  title: "Accessibility — JanSahayak SafeStreets",
  description: "Accessibility commitments for the JanSahayak SafeStreets pilot.",
};

export default function AccessibilityPage() {
  return (
    <>
      <div className="box-grid">
        <SiteNav />
        <main>
          <section className="section-box categories-section">
            <p className="section-label">Accessibility</p>
            <div className="section-heading">
              <h2>Built to be readable and operable</h2>
            </div>
            <div style={{ maxWidth: "62ch", marginTop: "28px" }}>
              <p style={{ color: "#486057", fontSize: "15px", lineHeight: 1.7 }}>
                The interface aims for WCAG AA contrast on body text, visible focus indicators on
                every interactive control, keyboard-operable navigation and forms, and reduced
                motion fallbacks for animations. Text sizes keep small captions at a legible minimum
                on screen.
              </p>
              <p
                style={{
                  color: "#486057",
                  fontSize: "15px",
                  lineHeight: 1.7,
                  marginTop: "18px",
                }}
              >
                The live map is the primary surface, and it carries text alternatives: pins expose
                tooltips and popups with report titles, landmarks, and verification counts, and the
                reporting form is fully usable without the map.
              </p>
              <p style={{ color: "#486057", fontSize: "15px", lineHeight: 1.7, marginTop: "18px" }}>
                Found a barrier we missed? Tell us through the{" "}
                <Link style={{ textDecoration: "underline" }} href="/help">
                  help page
                </Link>{" "}
                and we will track it like any other reported hazard.
              </p>
            </div>
          </section>
        </main>
        <SiteFooter />
      </div>
    </>
  );
}
