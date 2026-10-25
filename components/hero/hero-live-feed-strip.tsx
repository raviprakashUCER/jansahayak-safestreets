import React from "react";
import { CheckCircle2, ShieldCheck, MapPin } from "lucide-react";

export function HeroLiveFeedStrip() {
  return (
    <div className="mt-8 border-t border-[#d2d9d0] pt-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex items-start gap-2.5">
          <div className="mt-0.5 rounded-full bg-[#dce8d9] p-1 text-[#17382f]">
            <MapPin className="size-3.5" />
          </div>
          <div>
            <div className="font-semibold text-xs text-[#0e2b24]">Active Pilot</div>
            <div className="text-[11px] text-[#63736b]">
              Greater Noida (Pari Chowk, Alpha, Knowledge Park)
            </div>
          </div>
        </div>

        <div className="flex items-start gap-2.5">
          <div className="mt-0.5 rounded-full bg-[#dce8d9] p-1 text-[#17382f]">
            <CheckCircle2 className="size-3.5 text-[#2d5246]" />
          </div>
          <div>
            <div className="font-semibold text-xs text-[#0e2b24]">Recent 24h Activity</div>
            <div className="text-[11px] text-[#63736b]">
              Citizen-verified hazards tracked to resolution
            </div>
          </div>
        </div>

        <div className="flex items-start gap-2.5">
          <div className="mt-0.5 rounded-full bg-[#dce8d9] p-1 text-[#17382f]">
            <ShieldCheck className="size-3.5 text-[#2d5246]" />
          </div>
          <div>
            <div className="font-semibold text-xs text-[#0e2b24]">Civic Channel</div>
            <div className="text-[11px] text-[#63736b]">
              Routed to GNIDA & Traffic Police portals
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
