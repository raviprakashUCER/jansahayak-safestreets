"use client";

import React from "react";

export function MapLegend() {
  return (
    <div className="hidden sm:flex items-center gap-3 rounded-lg border border-[#cbd5cb] bg-white/90 px-2.5 py-1 text-[10px] text-[#486057] shadow-xs backdrop-blur-xs">
      <div className="flex items-center gap-1.5">
        <span className="size-2 rounded-full bg-[#e4876f]" />
        <span>Critical</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="size-2 rounded-full bg-[#e7b64f]" />
        <span>Moderate</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="size-2 rounded-full bg-[#78a37d]" />
        <span>Verified / Logged</span>
      </div>
    </div>
  );
}
