"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import {
  Map,
  MapMarker,
  MarkerContent,
  MarkerPopup,
  MarkerTooltip,
  MapControls,
  MapClusterLayer,
  useMap,
  type MapRef,
} from "@/components/ui/map";
import { ArrowRight, ArrowUpRight } from "@/components/icons";
import { Plus, Flame, MapPin as PinIcon, Layers, ShieldCheck } from "lucide-react";
import { GREATER_NOIDA_CENTER } from "@/lib/data";
import type { HazardReport, HazardCategoryKey } from "@/lib/types/hazard";
import { HazardPin } from "./hazard-pin";
import { MapCategoryFilter } from "./map-category-filter";
import { MapHeatmapLayer } from "./map-heatmap-layer";
import type * as GeoJSON from "geojson";

// Dynamically skin MapLibre vector layers to match the JanSahayak project theme:
// Webpage Paper: #f5f3ed
// Project Sage:  #dce8d9 / #d2dfd1 (water and nature)
function MapThemeCustomizer() {
  const { map, isLoaded } = useMap();

  useEffect(() => {
    if (!map || !isLoaded) return;
    const currentMap = map;

    function applyTheme(m: NonNullable<typeof map>) {
      try {
        // Match map background to webpage background (#f5f3ed Paper)
        if (m.getLayer("background")) {
          m.setPaintProperty("background", "background-color", "#f5f3ed");
        }
        // Tint water bodies in the project's Sage color
        if (m.getLayer("water")) {
          m.setPaintProperty("water", "fill-color", "#d2dfd1");
        }
        if (m.getLayer("waterway")) {
          m.setPaintProperty("waterway", "line-color", "#c0d4bf");
        }
        // Tint parks and green spaces in soft sage
        if (m.getLayer("park_national_park")) {
          m.setPaintProperty("park_national_park", "fill-color", "#e2ede0");
        }
        if (m.getLayer("park_nature_reserve")) {
          m.setPaintProperty("park_nature_reserve", "fill-color", "#e2ede0");
        }
        // Landcover and residential in subtle warm tones
        if (m.getLayer("landcover")) {
          m.setPaintProperty("landcover", "fill-color", "#f1efe8");
        }
        // Primary and secondary roads in crisp readable graphite
        if (m.getLayer("road_motorway")) {
          m.setPaintProperty("road_motorway", "line-color", "#c8c3b5");
        }
        if (m.getLayer("road_primary")) {
          m.setPaintProperty("road_primary", "line-color", "#d2cdc0");
        }
        if (m.getLayer("road_secondary")) {
          m.setPaintProperty("road_secondary", "line-color", "#ddd8cb");
        }
        // Buildings in light paper tint
        if (m.getLayer("building")) {
          m.setPaintProperty("building", "fill-color", "#ebe7dc");
          m.setPaintProperty("building", "fill-outline-color", "#dfdacd");
        }
      } catch {
        // Map layers might still be loading; fail gracefully
      }
    }

    if (currentMap.isStyleLoaded()) {
      applyTheme(currentMap);
    } else {
      currentMap.once("style.load", () => applyTheme(currentMap));
    }
  }, [map, isLoaded]);

  return null;
}

export interface LiveHazardMapProps {
  hazards?: HazardReport[];
  showHeroOverlay?: boolean;
}

export type MapViewMode = "pins" | "clusters" | "heatmap";
export type TimeFilter = "all" | "7d" | "30d";

export function LiveHazardMap({ hazards = [], showHeroOverlay = true }: LiveHazardMapProps) {
  const mapRef = useRef<MapRef | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<HazardCategoryKey | "all">("all");
  const [viewMode, setViewMode] = useState<MapViewMode>("pins");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "resolved">("all");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");
  const [liveHazards, setLiveHazards] = useState<HazardReport[]>(hazards);

  useEffect(() => {
    setIsMounted(true);
    let active = true;

    async function fetchLiveIncidents() {
      try {
        const res = await fetch("/api/map/incidents");
        if (!res.ok) return;
        const data = await res.json();
        if (active && data.success && Array.isArray(data.incidents)) {
          setLiveHazards(data.incidents);
        }
      } catch (err) {
        console.warn("Public map fetch error:", err);
      }
    }

    fetchLiveIncidents();
    return () => {
      active = false;
    };
  }, []);

  const filteredHazards = useMemo(() => {
    return liveHazards.filter((h) => {
      if (selectedCategory !== "all" && h.category !== selectedCategory) return false;
      if (verifiedOnly && !(h.verificationsCount && h.verificationsCount > 0) && !(h.votes && h.votes > 0) && h.status !== "community-verified") {
        return false;
      }
      if (statusFilter === "open" && h.status === "resolved") return false;
      if (statusFilter === "resolved" && h.status !== "resolved") return false;
      if (timeFilter === "7d" && h.hoursAgo && h.hoursAgo > 168) return false;
      if (timeFilter === "30d" && h.hoursAgo && h.hoursAgo > 720) return false;
      return true;
    });
  }, [liveHazards, selectedCategory, verifiedOnly, statusFilter, timeFilter]);

  const hazardGeoJson = useMemo<GeoJSON.FeatureCollection<GeoJSON.Point>>(() => {
    return {
      type: "FeatureCollection",
      features: filteredHazards.map((h) => ({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [h.longitude, h.latitude],
        },
        properties: {
          id: h.id,
          title: h.title,
          category: h.category,
          severity: h.severity,
          weight: h.severity === "critical" ? 1.5 : h.severity === "high" ? 1.0 : 0.6,
        },
      })),
    };
  }, [filteredHazards]);

  if (!isMounted) {
    return (
      <div
        className="relative flex h-[calc(100dvh-80px)] min-h-150 w-full items-center justify-center bg-[#f5f3ed] dark:bg-[#081713]"
        aria-label="Loading map"
      >
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="size-8 animate-spin rounded-full border-2 border-[#17382f] dark:border-[#78a37d] border-t-transparent" />
          <p className="text-sm font-semibold text-[#0e2b24] dark:text-[#f5f3ed]">
            Loading Greater Noida Live Safety Map...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="group/hero-map relative h-[calc(100dvh-80px)] min-h-150 w-full overflow-hidden bg-[#f5f3ed] dark:bg-[#081713]"
      id="map"
      aria-label="Interactive Live Map of road-safety hazards in Greater Noida"
    >
      {/* ── FULL-BLEED MAP CANVAS (Spans entire hero section) ── */}
      <Map
        ref={mapRef}
        center={GREATER_NOIDA_CENTER}
        zoom={13.6}
        pitch={44}
        bearing={-16}
        maxPitch={75}
        theme="light"
        className="size-full"
      >
        {/* Dynamic theme matching to webpage #f5f3ed Paper background */}
        <MapThemeCustomizer />

        {/* Minimal clean zoom controls tucked in bottom-right */}
        <MapControls
          position="bottom-right"
          showZoom
          showCompass={false}
          showLocate
          showFullscreen={false}
          className="bottom-6 right-6"
        />

        {/* 1. Pin Markers View */}
        {viewMode === "pins" &&
          filteredHazards.map((hazard) => (
            <MapMarker key={hazard.id} longitude={hazard.longitude} latitude={hazard.latitude}>
              <MarkerContent>
                <HazardPin severity={hazard.severity} />
              </MarkerContent>

              {/* Hover tooltip for quick glance */}
              <MarkerTooltip className="text-[11px] font-medium">
                {hazard.title} ({hazard.reportedAt || hazard.time || "Recently"})
              </MarkerTooltip>

              {/* Click popup anchored to the pin */}
              <MarkerPopup>
                <div className="w-64 rounded-lg bg-white dark:bg-[#122822] p-3 text-[#17382f] dark:text-[#f5f3ed] shadow-xl border border-border">
                  <div className="flex items-center justify-between text-[10px] text-[#63736b] dark:text-[#9bb2a8]">
                    <span className="font-mono font-semibold text-[#0e2b24] dark:text-[#78a37d]">{hazard.id}</span>
                    <span>{hazard.reportedAt || hazard.time || "Recently"}</span>
                  </div>
                  <p className="mt-1 font-semibold text-xs text-[#0e2b24] dark:text-[#f5f3ed]">{hazard.title}</p>
                  <p className="mt-0.5 text-[11px] text-[#486057] dark:text-[#cbd5cb]">
                    {hazard.landmark || hazard.location}
                  </p>
                  <div className="mt-2.5 flex items-center justify-between border-t border-[#eef1e9] dark:border-[#1e3c33] pt-2 text-[10px]">
                    <span className="font-medium text-[#78a37d]">
                      ✓ {hazard.verificationsCount || hazard.votes || 0} verified
                    </span>
                    <Link
                      href={`/reports/${hazard.id}`}
                      className="font-semibold text-[#0e2b24] dark:text-[#78a37d] underline underline-offset-2 hover:opacity-80"
                    >
                      View Case Details &rarr;
                    </Link>
                  </div>
                </div>
              </MarkerPopup>
            </MapMarker>
          ))}

        {/* 2. Cluster Aggregation View */}
        {viewMode === "clusters" && (
          <MapClusterLayer
            data={hazardGeoJson}
            clusterRadius={45}
            clusterMaxZoom={16}
            clusterColors={["#78a37d", "#e7b64f", "#b91c1c"]}
            clusterThresholds={[5, 15]}
          />
        )}

        {/* 3. Heatmap Density View */}
        {viewMode === "heatmap" && <MapHeatmapLayer data={hazardGeoJson} />}
      </Map>

      {/* ── Floating Controls for Dedicated Map View ── */}
      {!showHeroOverlay && (
        <>
          <div className="pointer-events-auto absolute top-3 inset-x-3 z-20 flex flex-col gap-2 sm:top-4 sm:left-4 sm:right-auto sm:max-w-md">
            {/* Header pill with incident tally and layer mode toggle */}
            <div className="flex flex-wrap items-center justify-between gap-2 bg-[#faf9f5]/95 dark:bg-[#102922]/95 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-[#cbd5cb] dark:border-[#22483d] shadow-xs">
              <span className="flex items-center gap-1.5 text-[11px] font-semibold text-[#0e2b24] dark:text-[#f5f3ed]">
                <span className="size-2 rounded-full bg-emerald-600 animate-pulse" />
                Greater Noida Safety Map
              </span>
              <div className="flex items-center gap-1">
                {/* View Mode buttons */}
                <button
                  type="button"
                  onClick={() => setViewMode("pins")}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium transition-all ${
                    viewMode === "pins"
                      ? "bg-[#0e2b24] text-white dark:bg-[#78a37d] dark:text-[#0e2b24]"
                      : "text-muted-foreground hover:bg-[#e6eee4] dark:hover:bg-[#1a382f]"
                  }`}
                  title="Show individual pins"
                >
                  <PinIcon className="size-3" />
                  <span>Pins</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("clusters")}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium transition-all ${
                    viewMode === "clusters"
                      ? "bg-[#0e2b24] text-white dark:bg-[#78a37d] dark:text-[#0e2b24]"
                      : "text-muted-foreground hover:bg-[#e6eee4] dark:hover:bg-[#1a382f]"
                  }`}
                  title="Group nearby hazards into clusters"
                >
                  <Layers className="size-3" />
                  <span>Clusters</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("heatmap")}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium transition-all ${
                    viewMode === "heatmap"
                      ? "bg-[#e4876f] text-[#0e2b24] font-semibold"
                      : "text-muted-foreground hover:bg-[#e6eee4] dark:hover:bg-[#1a382f]"
                  }`}
                  title="Show density heatmap"
                >
                  <Flame className="size-3" />
                  <span>Heatmap</span>
                </button>
                <span className="text-[10px] font-mono text-[#5c6f66] dark:text-[#9bb2a8] ml-1">
                  ({filteredHazards.length})
                </span>
              </div>
            </div>

            {/* Category Filter Chips */}
            <div className="bg-[#faf9f5]/95 dark:bg-[#102922]/95 backdrop-blur-md rounded-2xl p-1 border border-[#cbd5cb] dark:border-[#22483d] shadow-sm">
              <MapCategoryFilter
                selectedCategory={selectedCategory}
                onSelectCategory={setSelectedCategory}
              />
            </div>

            {/* Quick status & verification sub-filters */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar bg-[#faf9f5]/90 dark:bg-[#102922]/90 backdrop-blur-md px-2.5 py-1 rounded-xl border border-[#cbd5cb] dark:border-[#22483d] text-[10px]">
              <button
                type="button"
                onClick={() => setVerifiedOnly(!verifiedOnly)}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full transition-all ${
                  verifiedOnly
                    ? "bg-[#0e2b24] text-white dark:bg-[#78a37d] dark:text-[#0e2b24] font-semibold"
                    : "text-muted-foreground hover:bg-[#e6eee4] dark:hover:bg-[#1a382f]"
                }`}
              >
                <ShieldCheck className="size-3" />
                <span>Verified Only</span>
              </button>
              <div className="h-3 w-px bg-border" />
              <button
                type="button"
                onClick={() => setStatusFilter(statusFilter === "open" ? "all" : "open")}
                className={`px-2 py-0.5 rounded-full transition-all ${
                  statusFilter === "open"
                    ? "bg-[#0e2b24] text-white dark:bg-[#78a37d] dark:text-[#0e2b24] font-semibold"
                    : "text-muted-foreground hover:bg-[#e6eee4] dark:hover:bg-[#1a382f]"
                }`}
              >
                Active Only
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter(statusFilter === "resolved" ? "all" : "resolved")}
                className={`px-2 py-0.5 rounded-full transition-all ${
                  statusFilter === "resolved"
                    ? "bg-[#78a37d] text-[#0e2b24] font-semibold"
                    : "text-muted-foreground hover:bg-[#e6eee4] dark:hover:bg-[#1a382f]"
                }`}
              >
                Resolved
              </button>
              <div className="h-3 w-px bg-border" />
              <select
                aria-label="Filter incidents by date range"
                value={timeFilter}
                onChange={(e) => setTimeFilter(e.target.value as TimeFilter)}
                className="bg-transparent text-[10px] text-muted-foreground rounded px-1 py-0.5 focus:outline-none cursor-pointer"
              >
                <option value="all">All Time</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
              </select>
            </div>
          </div>

          <div className="pointer-events-auto absolute bottom-4 left-4 z-20 hidden sm:block">
            <Link
              href="/reports/new"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-[#0e2b24] text-[#faf9f5] font-semibold text-xs shadow-lg hover:bg-[#1c4b3e] active:scale-95 transition-all"
            >
              <Plus className="size-4 stroke-[2.5]" />
              <span>Report at Current Location</span>
            </Link>
          </div>
        </>
      )}

      {/* ── Empty Map State Notice when no hazards are mapped ── */}
      {filteredHazards.length === 0 && (
        <div className="pointer-events-auto absolute bottom-8 left-8 z-20 rounded-lg border border-border/80 bg-background/95 p-4 shadow-lg backdrop-blur-xs max-w-sm">
          <div className="flex items-start gap-3">
            <span className="inline-flex size-2 rounded-full bg-emerald-500 mt-1.5" />
            <div>
              <p className="text-xs font-semibold text-foreground">Greater Noida Pilot Ready</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                No active hazards currently match this category filter.
              </p>
              <Link
                href="/reports/new"
                className="mt-2.5 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                <span>Report a hazard in this category</span>
                <span className="size-3.5 inline-flex items-center">
                  <ArrowUpRight />
                </span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ── HERO TEXT OVERLAY (Non-blocking: pointer-events-none) ── */}
      {showHeroOverlay && (
        <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between p-6 select-none sm:p-10 lg:p-14">
          {/* Top-Left Hero Title & Narrative (Completely transparent background) */}
          <div className="max-w-xl bg-transparent p-0 shadow-none border-0">
            <h1 className="hero-overlay-shadow font-heading text-3xl font-bold tracking-tight text-[#0e2b24] sm:text-5xl lg:text-6xl leading-[0.95]">
              Safer streets
              <br />
              <span className="text-[#1c4737] font-medium">start with us.</span>
            </h1>

            <p className="hero-overlay-shadow-subtle mt-3.5 max-w-lg text-sm sm:text-base font-medium leading-relaxed text-[#14352b]">
              A live civic map documenting road-safety hazards across Greater Noida. Spot an unsafe
              area, explore verified community reports, and follow the recorded path towards a fix.
            </p>

            {/* Report + explore actions — the two ways in, equally findable */}
            <div className="pointer-events-auto mt-5 flex flex-wrap items-center gap-3">
              <Link className="nav-cta" href="/reports/new">
                <span className="nav-cta-label">Report a hazard</span>
                <span className="nav-cta-icon-track" aria-hidden="true">
                  <span className="nav-cta-icon">
                    <span className="nav-cta-arrow nav-cta-arrow-launch">
                      <ArrowUpRight />
                    </span>
                    <span className="nav-cta-arrow nav-cta-arrow-continue">
                      <ArrowRight />
                    </span>
                  </span>
                </span>
              </Link>
              <Link className="hero-pill-secondary" href="/#how-it-works">
                How it works
              </Link>
            </div>
          </div>

          {/* Bottom-Left subtle tip (also pointer-events-none) */}
          <div className="hero-overlay-shadow-subtle text-[11px] font-medium text-[#2d5246]">
            Interactive map · Click any pin to inspect verified community reports
          </div>
        </div>
      )}
    </div>
  );
}
