"use client";

import React from "react";
import type { HazardCategoryKey } from "@/lib/types/hazard";
import { HAZARD_FILTER_CATEGORIES } from "@/lib/data/constants";
import { cn } from "@/lib/utils";

interface MapCategoryFilterProps {
  selectedCategory: HazardCategoryKey | "all";
  onSelectCategory: (cat: HazardCategoryKey | "all") => void;
}

export function MapCategoryFilter({ selectedCategory, onSelectCategory }: MapCategoryFilterProps) {
  return (
    <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto p-1 text-xs">
      {HAZARD_FILTER_CATEGORIES.map((cat) => {
        const isActive = selectedCategory === cat.key;
        return (
          <button
            key={cat.key}
            type="button"
            onClick={() => onSelectCategory(cat.key)}
            className={cn(
              "inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[11px] font-medium transition-all",
              isActive
                ? "bg-[#0e2b24] text-[#f5f3ed] shadow-xs"
                : "border border-[#cbd5cb] bg-white/80 text-[#3a4f47] hover:bg-[#e9efe8] hover:text-[#0e2b24]",
            )}
          >
            {cat.label}
          </button>
        );
      })}
    </div>
  );
}
