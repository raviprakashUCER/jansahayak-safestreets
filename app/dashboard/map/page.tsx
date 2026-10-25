"use client";

import * as React from "react";
import Link from "next/link";
import { ExternalLink, Plus } from "lucide-react";

import { LiveHazardMap } from "@/components/map";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function DashboardMapPage() {
  return (
    <div className="flex flex-col gap-6">
      {/* ── Page Header ─── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground md:text-3xl">
              Geospatial Operations Map
            </h1>
            <Badge variant="outline" className="text-xs">
              Live Published Incidents
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Geotagged hazards, pedestrian accident risk hotspots, and repair cluster mapping.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" render={<Link href="/map" />}>
            <span>Full-Screen Map</span>
            <ExternalLink className="size-3.5" />
          </Button>

          <Button size="sm" render={<Link href="/reports/new" />}>
            <Plus className="size-3.5" />
            <span>Pin Hazard</span>
          </Button>
        </div>
      </div>

      {/* ── Map Container Card ─── */}
      <Card className="overflow-hidden shadow-xs">
        <CardHeader className="border-b border-border pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Greater Noida Road Safety Radar</CardTitle>
              <CardDescription className="text-xs">
                Interactive tiles centered on Pari Chowk and Knowledge Park corridor.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="relative h-[640px] w-full">
            <LiveHazardMap showHeroOverlay={false} />
          </div>
        </CardContent>

        <CardFooter className="border-t border-border px-6 py-3 bg-muted/20 text-xs text-muted-foreground">
          <div className="flex flex-wrap items-center justify-between gap-4 w-full">
            <span>Click any pin to inspect incident history and authority dispatch status.</span>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-[#e4876f]" />
                <span>High Urgency</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-[#e7b64f]" />
                <span>Medium Urgency</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-[#78a37d]" />
                <span>Resolved</span>
              </span>
            </div>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
