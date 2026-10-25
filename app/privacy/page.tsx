import type { Metadata } from "next";

import { SiteFooter, SiteNav } from "@/components/sections";

export const metadata: Metadata = {
  title: "Privacy — JanSahayak SafeStreets",
  description: "How the Greater Noida pilot handles the data in hazard reports and accounts.",
};

export default function PrivacyPage() {
  return (
    <>
      <div className="box-grid">
        <SiteNav />
        <main>
          <section className="section-box categories-section">
            <p className="section-label">Privacy</p>
            <div className="section-heading">
              <h2>Minimum data, visible by design</h2>
            </div>
            <div style={{ maxWidth: "62ch", marginTop: "28px" }}>
              <p style={{ color: "#486057", fontSize: "15px", lineHeight: 1.7 }}>
                SafeStreets collects only what a hazard report needs: a description, a category, a
                location, a photograph or other evidence if you attach one, and a status history.
                Reports are public — that visibility is the point of the noticeboard.
              </p>
              <p
                style={{
                  color: "#486057",
                  fontSize: "15px",
                  lineHeight: 1.7,
                  marginTop: "18px",
                }}
              >
                Personal details are limited to what is needed to keep reports verifiable and
                prevent abuse. The platform does not sell data and does not imply any relationship
                with government bodies; reports you submit here are not automatically forwarded to
                any authority unless an escalation record states it.
              </p>
              <p
                style={{
                  color: "#486057",
                  fontSize: "15px",
                  lineHeight: 1.7,
                  marginTop: "18px",
                }}
              >
                This summary is provided for the pilot. The full policy will accompany the public
                launch.
              </p>
            </div>
          </section>
        </main>
        <SiteFooter />
      </div>
    </>
  );
}
