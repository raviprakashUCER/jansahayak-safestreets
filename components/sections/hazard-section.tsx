import Link from "next/link";
import { ArrowUpRight, HazardIcon } from "@/components/icons";
import { hazardCategories } from "@/lib/site";
import Section from "./section";

export function HazardSection() {
  return (
    <Section id="community" className="hazard-box">
      <section className="categories-section">
        <div className="section-heading">
          <div>
            <p className="section-label">What needs attention</p>
            <h2>
              Small observations.
              <br />
              <em>Shared visibility.</em>
            </h2>
          </div>
          <p>
            From a broken path to a dark school route, a structured report helps turn a daily
            frustration into useful civic information.
          </p>
        </div>
        <div className="hazard-list">
          {hazardCategories.map((hazard) => (
            <Link className="hazard-row" href="/reports/new" key={hazard.label}>
              <span className={`hazard-symbol hazard-symbol-${hazard.tone}`} aria-hidden="true">
                <HazardIcon type={hazard.icon} />
              </span>
              <span className="hazard-name">
                <strong>{hazard.label}</strong>
                <small>{hazard.context}</small>
              </span>
              <span className="hazard-cta">
                Report this <ArrowUpRight />
              </span>
            </Link>
          ))}
        </div>
      </section>
    </Section>
  );
}
