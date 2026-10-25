"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { HazardReport } from "@/lib/types/hazard";
import { ArrowUpRight, ChevronLeft, ChevronRight, CheckCircle2 } from "lucide-react";

interface HazardCardDrawerProps {
  hazard: HazardReport | null;
  currentIndex: number;
  totalCount: number;
  onPrev: () => void;
  onNext: () => void;
  onClose?: () => void;
}

export function HazardCardDrawer({
  hazard,
  currentIndex,
  totalCount,
  onPrev,
  onNext,
}: HazardCardDrawerProps) {
  if (!hazard) return null;

  const severityBadgeClass =
    {
      critical: "bg-[#e4876f]/20 text-[#8c2e1b] border-[#e4876f]/40 font-medium",
      high: "bg-[#e4876f]/20 text-[#8c2e1b] border-[#e4876f]/40 font-medium",
      moderate: "bg-[#e7b64f]/20 text-[#7a540b] border-[#e7b64f]/40 font-medium",
      medium: "bg-[#e7b64f]/20 text-[#7a540b] border-[#e7b64f]/40 font-medium",
      minor: "bg-[#78a37d]/20 text-[#234a29] border-[#78a37d]/40 font-medium",
      low: "bg-[#78a37d]/20 text-[#234a29] border-[#78a37d]/40 font-medium",
    }[hazard.severity] || "bg-muted text-muted-foreground";

  const severityLabel =
    {
      critical: "High Urgency",
      high: "High Urgency",
      moderate: "Moderate Urgency",
      medium: "Moderate Urgency",
      minor: "Standard Priority",
      low: "Standard Priority",
    }[hazard.severity] || "Reported";

  return (
    <Card className="absolute bottom-3 left-3 right-3 z-1000 border border-[#cbd5cb] bg-white/95 shadow-xl backdrop-blur-md sm:bottom-4 sm:left-auto sm:right-4 sm:w-87.5">
      <CardHeader className="p-3 pb-2">
        <div className="flex items-center justify-between text-[11px] text-[#63736b]">
          <div className="flex items-center gap-1.5">
            <span className="font-mono font-semibold text-[#0e2b24]">{hazard.id}</span>
            <span>·</span>
            <span>{hazard.reportedAt}</span>
          </div>

          {/* Stepper controls */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-[#63736b]">
              {currentIndex + 1} of {totalCount}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={onPrev}
              aria-label="Previous hazard"
              className="size-6 text-[#17382f]"
            >
              <ChevronLeft className="size-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={onNext}
              aria-label="Next hazard"
              className="size-6 text-[#17382f]"
            >
              <ChevronRight className="size-3.5" />
            </Button>
          </div>
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <span
            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] ${severityBadgeClass}`}
          >
            {severityLabel}
          </span>
          <Badge
            variant="outline"
            className="border-[#cbd5cb] bg-[#f5f3ed] text-[10px] text-[#17382f]"
          >
            {hazard.statusLabel}
          </Badge>
          <span className="text-[10px] text-[#63736b]">{hazard.categoryLabel}</span>
        </div>

        <CardTitle className="mt-2 text-sm leading-snug font-semibold text-[#0e2b24]">
          {hazard.title}
        </CardTitle>
        <CardDescription className="text-xs text-[#486057]">{hazard.landmark}</CardDescription>
      </CardHeader>

      <CardContent className="px-3 py-1 text-xs text-[#5c6f66]">
        <p className="line-clamp-2 leading-relaxed">{hazard.description}</p>
        <div className="mt-2.5 flex items-center justify-between border-t border-[#d2d9d0] pt-2 text-[11px]">
          <span className="flex items-center gap-1 text-[#2d5246] font-medium">
            <CheckCircle2 className="size-3.5 text-[#78a37d]" />
            {hazard.verificationsCount} citizens verified
          </span>
          <span className="text-[10px] text-[#718077] truncate max-w-37.5">
            {hazard.officialRouting}
          </span>
        </div>
      </CardContent>

      <CardFooter className="flex items-center justify-between gap-2 border-t border-[#eef1e9] bg-[#f8faf7] p-2.5 px-3">
        <Link
          href={`/reports/new?ref=${hazard.id}`}
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0e2b24] hover:underline"
        >
          Confirm / Add notes <ArrowUpRight className="size-3" />
        </Link>
        <Link
          href={`/reports/new`}
          className="rounded-full bg-[#0e2b24] px-3 py-1.5 text-[11px] font-medium text-[#f5f3ed]! shadow-xs transition hover:bg-[#1c4b3e]"
        >
          Report near here
        </Link>
      </CardFooter>
    </Card>
  );
}
