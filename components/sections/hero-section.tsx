import { LiveHazardMap } from "@/components/map";
import Section from "./section";

export function HeroSection() {
  return (
    <Section className="hero-box overflow-hidden border-b border-(--box-border) p-0">
      <LiveHazardMap />
    </Section>
  );
}
