"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { TimeWindowFilter } from "@/lib/types/hazard";

interface MapHeaderStatusProps {
  timeFilter: TimeWindowFilter;
  onTimeFilterChange: (val: TimeWindowFilter) => void;
  reportCount: number;
}

export function MapHeaderStatus({
  timeFilter,
  onTimeFilterChange,
  reportCount,
}: MapHeaderStatusProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-t-xl border-b border-[#cbd5cb] bg-[#eef3eb] px-4 py-2.5 text-[#17382f]">
      {/* Live Sync Status */}
      <div className="flex items-center gap-2">
        <span className="relative flex size-2.5">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#e4876f] opacity-75" />
          <span className="relative inline-flex size-2.5 rounded-full bg-[#e4876f]" />
        </span>
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold tracking-wider text-[#0e2b24] uppercase">
              Greater Noida Pilot
            </span>
            <span className="rounded-full bg-[#dce8d9] px-1.5 py-0.2 text-[10px] font-medium text-[#17382f]">
              Frequent Sync
            </span>
          </div>
          <span className="text-[10px] text-[#63736b]">
            Window: 12h–24h recent citizen logs · {reportCount} active points
          </span>
        </div>
      </div>

      {/* Time Window Tabs */}
      <div className="flex items-center gap-1.5">
        <Tabs
          value={timeFilter}
          onValueChange={(val) => onTimeFilterChange(val as TimeWindowFilter)}
          className="w-auto"
        >
          <TabsList className="h-7 bg-[#dce8d9]/80 p-0.5 text-[11px]">
            <TabsTrigger
              value="12h"
              className="h-6 rounded-md px-2 text-[11px] data-[state=active]:bg-white data-[state=active]:text-[#0e2b24] data-[state=active]:shadow-xs"
            >
              12h
            </TabsTrigger>
            <TabsTrigger
              value="24h"
              className="h-6 rounded-md px-2 text-[11px] data-[state=active]:bg-white data-[state=active]:text-[#0e2b24] data-[state=active]:shadow-xs"
            >
              24h
            </TabsTrigger>
            <TabsTrigger
              value="all"
              className="h-6 rounded-md px-2 text-[11px] data-[state=active]:bg-white data-[state=active]:text-[#0e2b24] data-[state=active]:shadow-xs"
            >
              All
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
    </div>
  );
}
