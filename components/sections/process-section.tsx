import Link from "next/link";
import { MapPin, Users2, Building2, ShieldCheck, ArrowRight } from "lucide-react";
import Section from "./section";

const STEPS = [
  {
    number: "01",
    phase: "Capture",
    title: "Pinpoint in place",
    description:
      "Log the unsafe spot on the live map with a photo, severity tag, and GPS coordinates.",
    tag: "GPS & photo mapped",
    icon: MapPin,
  },
  {
    number: "02",
    phase: "Corroborate",
    title: "Neighbourhood verification",
    description:
      "Nearby commuters confirm the hazard, merging duplicate notices and proving civic priority.",
    tag: "Community verified",
    icon: Users2,
  },
  {
    number: "03",
    phase: "Route",
    title: "Authority dispatch",
    description:
      "Automatically routed to the responsible division (GNIDA Civil, Electrical, or Traffic) with a tracking ID.",
    tag: "Official reference assigned",
    icon: Building2,
  },
  {
    number: "04",
    phase: "Resolve",
    title: "Verified proof of fix",
    description:
      "Closure requires photographic evidence of repair and resident sign-off before being archived.",
    tag: "Photo proof required",
    icon: ShieldCheck,
  },
] as const;

export function ProcessSection() {
  return (
    <Section id="how-it-works" className="process-box bg-[#faf9f5] scroll-mt-24">
      <div className="px-4 py-8 sm:px-10 sm:py-12 lg:px-14">
        {/* ── Lean, Disciplined Header ──────────────────────────── */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between pb-5 border-b border-[var(--box-border)]">
          <div>
            <h2 className="font-heading text-xl sm:text-2xl font-bold tracking-tight text-[#0e2b24]">
              How civic reporting works
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-[#486057]">
              Four structured steps from everyday road hazard to verified community repair across
              Greater Noida.
            </p>
          </div>

          <Link
            href="/reports/new"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0e2b24] hover:text-[#1c4737] transition-colors self-start sm:self-auto shrink-0 group focus-visible:outline-3 focus-visible:outline-[#bd7b3b]"
          >
            <span>Report a hazard</span>
            <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        {/* ── Compact 4-Step Process Strip ───────────────────────── */}
        <div className="mt-6 grid grid-cols-1 border border-[var(--box-border)] rounded-xl overflow-hidden bg-white/50 shadow-xs md:grid-cols-2 lg:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-[var(--box-border)]">
          {STEPS.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.number}
                className="group flex flex-col justify-between p-5 transition-colors duration-150 hover:bg-[#f4f7f1]"
              >
                <div>
                  {/* Step Top Meta */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-[#72877c]">
                        {step.number}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#556e62]">
                        {step.phase}
                      </span>
                    </div>

                    <div className="size-7 rounded-md border border-[var(--box-border)] bg-[#edf3eb] text-[#17382f] flex items-center justify-center transition-colors group-hover:bg-[#17382f] group-hover:text-white">
                      <Icon className="size-3.5" />
                    </div>
                  </div>

                  {/* Title & Short Description */}
                  <h3 className="mt-3.5 text-sm font-semibold text-[#0e2b24] tracking-tight">
                    {step.title}
                  </h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-[#3d564a]">
                    {step.description}
                  </p>
                </div>

                {/* Quiet Status Token */}
                <div className="mt-4 pt-3 border-t border-[#e2eae0] flex items-center justify-between text-[11px]">
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-[#486057]">
                    <span className="size-1.5 rounded-full bg-[#78a37d]" />
                    {step.tag}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Section>
  );
}
