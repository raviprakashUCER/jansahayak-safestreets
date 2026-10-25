"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { SiteNav, SiteFooter } from "@/components/sections";
import {
  Map,
  MapMarker,
  MarkerContent,
  MarkerTooltip,
  MarkerPopup,
  MapControls,
  MapGeoJSON,
} from "@/components/ui/map";
import { HazardPin } from "@/components/map/hazard-pin";
import {
  Navigation,
  MapPin,
  AlertTriangle,
  ShieldCheck,
  Compass,
  ArrowRight,
  Info,
  Clock,
  RotateCcw,
} from "lucide-react";
import { GREATER_NOIDA_CENTER } from "@/lib/data";
import { PILOT_CONFIG, PILOT_SECTORS } from "@/lib/data/constants";
import type { RouteAdvisoryResult } from "@/lib/routing/route-advisory";
import { ROUTE_SAFETY_DISCLAIMER } from "@/lib/routing/route-advisory";
import type { HazardReport } from "@/lib/types/hazard";

const PRESET_HUBS = [
  { name: "Pari Chowk", lat: 28.4682, lng: 77.5039 },
  { name: "Alpha I Commercial Belt", lat: 28.4744, lng: 77.504 },
  { name: "Beta II Market", lat: 28.482, lng: 77.512 },
  { name: "Knowledge Park II (Institutes)", lat: 28.461, lng: 77.498 },
  { name: "Greater Noida West (Gaur City)", lat: 28.53, lng: 77.44 },
  { name: "Surajpur Collectorate", lat: 28.515, lng: 77.485 },
];

export default function NearbyRouteAdvisoryPage() {
  const [originIndex, setOriginIndex] = useState(0);
  const [destIndex, setDestIndex] = useState(1);
  const [customOrigin, setCustomOrigin] = useState<{ lat: number; lng: number; name: string } | null>(null);
  const [locationPermissionState, setLocationPermissionState] = useState<"idle" | "requesting" | "granted" | "denied">("idle");
  const [loadingAdvisory, setLoadingAdvisory] = useState(false);
  const [advisoryResult, setAdvisoryResult] = useState<RouteAdvisoryResult | null>(null);
  const [advisoryError, setAdvisoryError] = useState<string | null>(null);
  const [allIncidents, setAllIncidents] = useState<HazardReport[]>([]);
  const [distanceRadiusMeters, setDistanceRadiusMeters] = useState(2000);
  const [verifiedFilter, setVerifiedFilter] = useState(false);

  // Fetch all live incidents on mount
  useEffect(() => {
    let active = true;
    async function loadIncidents() {
      try {
        const res = await fetch("/api/map/incidents");
        if (!res.ok) return;
        const data = await res.json();
        if (active && data.success && Array.isArray(data.incidents)) {
          setAllIncidents(data.incidents);
        }
      } catch (err) {
        console.warn("Error fetching hazards:", err);
      }
    }
    loadIncidents();
    return () => {
      active = false;
    };
  }, []);

  // Compute origin coordinates
  const currentOrigin = useMemo(() => {
    if (customOrigin) return customOrigin;
    const hub = PRESET_HUBS[originIndex] || PRESET_HUBS[0]!;
    return { lat: hub.lat, lng: hub.lng, name: hub.name };
  }, [customOrigin, originIndex]);

  // Compute destination coordinates
  const currentDestination = useMemo(() => {
    const hub = PRESET_HUBS[destIndex] || PRESET_HUBS[1]!;
    return { lat: hub.lat, lng: hub.lng, name: hub.name };
  }, [destIndex]);

  // Trigger route calculation
  const fetchAdvisory = async () => {
    setLoadingAdvisory(true);
    setAdvisoryError(null);
    try {
      const url = `/api/routing/advisory?originLat=${currentOrigin.lat}&originLng=${currentOrigin.lng}&destLat=${currentDestination.lat}&destLng=${currentDestination.lng}&corridorMeters=150`;
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to calculate route advisory");
      }
      setAdvisoryResult(data.advisory);
    } catch (err) {
      setAdvisoryError(err instanceof Error ? err.message : "Route service unavailable");
    } finally {
      setLoadingAdvisory(false);
    }
  };

  useEffect(() => {
    fetchAdvisory();
  }, [currentOrigin.lat, currentOrigin.lng, currentDestination.lat, currentDestination.lng]);

  // Geolocation request with explicit user action
  const handleRequestGeolocation = () => {
    if (!navigator.geolocation) {
      setLocationPermissionState("denied");
      return;
    }
    setLocationPermissionState("requesting");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        // Verify within pilot bounds approx
        const [[minLng, minLat], [maxLng, maxLat]] = PILOT_CONFIG.bounds;
        if (lat < minLat - 0.1 || lat > maxLat + 0.1 || lng < minLng - 0.1 || lng > maxLng + 0.1) {
          alert("Your device location is outside the Greater Noida pilot perimeter. Using Pari Chowk instead.");
          setLocationPermissionState("idle");
          return;
        }
        setCustomOrigin({ lat, lng, name: "Current GPS Location" });
        setLocationPermissionState("granted");
      },
      (err) => {
        console.warn("Geolocation denied/failed:", err);
        setLocationPermissionState("denied");
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Nearby hazards list from origin
  const nearbyHazards = useMemo(() => {
    return allIncidents
      .map((h) => {
        // Approximate distance in meters
        const dLat = (h.latitude - currentOrigin.lat) * 111320;
        const dLng = (h.longitude - currentOrigin.lng) * 111320 * Math.cos((currentOrigin.lat * Math.PI) / 180);
        const dist = Math.round(Math.sqrt(dLat * dLat + dLng * dLng));
        return { ...h, distanceMeters: dist };
      })
      .filter((h) => {
        if (h.distanceMeters > distanceRadiusMeters) return false;
        if (verifiedFilter && !(h.verificationsCount && h.verificationsCount > 0) && !(h.votes && h.votes > 0)) {
          return false;
        }
        return true;
      })
      .sort((a, b) => a.distanceMeters - b.distanceMeters);
  }, [allIncidents, currentOrigin, distanceRadiusMeters, verifiedFilter]);

  // Primary route GeoJSON
  const primaryRouteGeoJson = useMemo(() => {
    if (!advisoryResult?.waypoints || advisoryResult.waypoints.length < 2) return null;
    return {
      type: "Feature" as const,
      properties: {},
      geometry: {
        type: "LineString" as const,
        coordinates: advisoryResult.waypoints,
      },
    };
  }, [advisoryResult]);

  // Alternate route GeoJSON
  const alternateRouteGeoJson = useMemo(() => {
    if (!advisoryResult?.alternateWaypoints || advisoryResult.alternateWaypoints.length < 2) return null;
    return {
      type: "Feature" as const,
      properties: {},
      geometry: {
        type: "LineString" as const,
        coordinates: advisoryResult.alternateWaypoints,
      },
    };
  }, [advisoryResult]);

  return (
    <>
      <div className="box-grid">
        <SiteNav />
        <main className="min-h-screen">
          <section className="section-box categories-section">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="section-label">Civilian Road Safety</p>
                <div className="section-heading">
                  <h1 className="font-heading text-2xl font-bold text-[#0e2b24] dark:text-[#f5f3ed] sm:text-3xl">
                    Nearby Hazards & Route Advisory
                  </h1>
                </div>
                <p className="mt-1 text-sm text-[#486057] dark:text-[#cbd5cb] max-w-2xl">
                  Inspect recorded hazards along your daily transit corridor in Greater Noida. Compare direct path
                  hazards against calculated avoidance detours before you drive.
                </p>
              </div>

              {/* Explicit Geolocation Button */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleRequestGeolocation}
                  disabled={locationPermissionState === "requesting"}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#0e2b24] dark:bg-[#78a37d] dark:text-[#0e2b24] text-white px-3.5 py-2 text-xs font-semibold shadow-xs hover:bg-[#1a443a] transition-all disabled:opacity-60 cursor-pointer"
                >
                  <Compass className="size-4" />
                  <span>
                    {locationPermissionState === "requesting"
                      ? "Acquiring GPS..."
                      : locationPermissionState === "granted"
                      ? "GPS Location Active"
                      : "Use My Geolocation"}
                  </span>
                </button>
                {customOrigin && (
                  <button
                    type="button"
                    onClick={() => {
                      setCustomOrigin(null);
                      setLocationPermissionState("idle");
                    }}
                    title="Reset to preset hub"
                    className="p-2 rounded-xl border border-border text-xs text-muted-foreground hover:bg-muted"
                  >
                    <RotateCcw className="size-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Hub Selector Bar */}
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="p-3 rounded-2xl bg-card border border-border">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <MapPin className="size-3.5 text-emerald-600" />
                  <span>Origin Location</span>
                </label>
                {customOrigin ? (
                  <div className="mt-1 text-xs font-semibold text-foreground truncate">
                    📍 {customOrigin.name}
                  </div>
                ) : (
                  <select
                    aria-label="Select origin location"
                    value={originIndex}
                    onChange={(e) => setOriginIndex(Number(e.target.value))}
                    className="mt-1 w-full bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs font-medium text-foreground focus:outline-none"
                  >
                    {PRESET_HUBS.map((hub, idx) => (
                      <option key={hub.name} value={idx}>
                        {hub.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="p-3 rounded-2xl bg-card border border-border">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Navigation className="size-3.5 text-amber-600" />
                  <span>Destination Hub</span>
                </label>
                <select
                  aria-label="Select destination hub"
                  value={destIndex}
                  onChange={(e) => setDestIndex(Number(e.target.value))}
                  className="mt-1 w-full bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs font-medium text-foreground focus:outline-none"
                >
                  {PRESET_HUBS.map((hub, idx) => (
                    <option key={hub.name} value={idx} disabled={!customOrigin && idx === originIndex}>
                      {hub.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3 rounded-2xl bg-card border border-border">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Nearby Radius
                </label>
                <select
                  aria-label="Select nearby radius"
                  value={distanceRadiusMeters}
                  onChange={(e) => setDistanceRadiusMeters(Number(e.target.value))}
                  className="mt-1 w-full bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs font-medium text-foreground focus:outline-none"
                >
                  <option value={500}>500 meters</option>
                  <option value={1000}>1 kilometer</option>
                  <option value={2000}>2 kilometers</option>
                  <option value={5000}>5 kilometers</option>
                </select>
              </div>

              <div className="p-3 rounded-2xl bg-card border border-border flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Filter Reports
                  </div>
                  <div className="text-xs font-semibold text-foreground mt-0.5">Verified Only</div>
                </div>
                <input
                  type="checkbox"
                  checked={verifiedFilter}
                  onChange={(e) => setVerifiedFilter(e.target.checked)}
                  className="size-4 accent-[#0e2b24] cursor-pointer"
                />
              </div>
            </div>

            {/* Route Map & Advisory Panel */}
            <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Map Canvas with Route Waypoints */}
              <div className="lg:col-span-2 h-110 sm:h-135 rounded-3xl overflow-hidden border border-border shadow-xs relative">
                <Map
                  center={[currentOrigin.lng, currentOrigin.lat]}
                  zoom={13}
                  pitch={30}
                  theme="light"
                  className="size-full"
                >
                  <MapControls position="bottom-right" showZoom showCompass={false} />

                  {/* Primary Route Line (Amber) */}
                  {primaryRouteGeoJson && (
                    <MapGeoJSON
                      id="primary-route"
                      data={primaryRouteGeoJson}
                      fillPaint={false}
                      linePaint={{
                        "line-color": "#e7b64f",
                        "line-width": 4.5,
                        "line-opacity": 0.9,
                      }}
                    />
                  )}

                  {/* Alternate Avoidance Route Line (Sage Green) */}
                  {alternateRouteGeoJson && (
                    <MapGeoJSON
                      id="alternate-route"
                      data={alternateRouteGeoJson}
                      fillPaint={false}
                      linePaint={{
                        "line-color": "#78a37d",
                        "line-width": 3.5,
                        "line-dasharray": [2, 2],
                        "line-opacity": 0.85,
                      }}
                    />
                  )}

                  {/* Origin Marker */}
                  <MapMarker longitude={currentOrigin.lng} latitude={currentOrigin.lat}>
                    <MarkerContent>
                      <div className="size-6 rounded-full bg-emerald-600 text-white font-bold text-[10px] flex items-center justify-center border-2 border-white shadow-md">
                        A
                      </div>
                    </MarkerContent>
                    <MarkerTooltip>Start: {currentOrigin.name}</MarkerTooltip>
                  </MapMarker>

                  {/* Destination Marker */}
                  <MapMarker longitude={currentDestination.lng} latitude={currentDestination.lat}>
                    <MarkerContent>
                      <div className="size-6 rounded-full bg-amber-600 text-white font-bold text-[10px] flex items-center justify-center border-2 border-white shadow-md">
                        B
                      </div>
                    </MarkerContent>
                    <MarkerTooltip>Destination: {currentDestination.name}</MarkerTooltip>
                  </MapMarker>

                  {/* Hazards along route and nearby */}
                  {nearbyHazards.slice(0, 30).map((h) => (
                    <MapMarker key={h.id} longitude={h.longitude} latitude={h.latitude}>
                      <MarkerContent>
                        <HazardPin severity={h.severity} />
                      </MarkerContent>
                      <MarkerPopup>
                        <div className="p-2 max-w-xs text-xs">
                          <p className="font-semibold">{h.title}</p>
                          <p className="text-[10px] text-muted-foreground">{h.distanceMeters}m from origin</p>
                          <Link href={`/reports/${h.id}`} className="mt-1 inline-block text-[10px] font-semibold underline">
                            View Report
                          </Link>
                        </div>
                      </MarkerPopup>
                    </MapMarker>
                  ))}
                </Map>

                {/* Map Legend overlay */}
                <div className="absolute bottom-4 left-4 z-10 bg-background/90 backdrop-blur-md px-3 py-2 rounded-2xl border border-border text-[11px] flex items-center gap-3 shadow-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-full bg-[#e7b64f]" />
                    <span className="font-medium">Direct Corridor</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-full bg-[#78a37d]" />
                    <span className="font-medium">Avoidance Detour</span>
                  </div>
                </div>
              </div>

              {/* Corridor Advisory Details */}
              <div className="flex flex-col gap-4">
                <div className="p-4 rounded-3xl bg-card border border-border shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Route Corridor Assessment
                    </span>
                    {loadingAdvisory && (
                      <span className="size-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    )}
                  </div>

                  {advisoryResult && (
                    <div className="mt-3 space-y-3">
                      <div className="flex items-center justify-between border-b border-border pb-3">
                        <div>
                          <div className="text-xs text-muted-foreground">Corridor Distance</div>
                          <div className="font-mono text-base font-bold text-foreground">
                            {advisoryResult.totalDistanceKm} km
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">Est. Transit Time</div>
                          <div className="font-mono text-base font-bold text-foreground">
                            ~{advisoryResult.estimatedTravelTimeMinutes} mins
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">Hazards on Route</div>
                          <div className="font-mono text-base font-bold text-destructive">
                            {advisoryResult.hazardsOnRouteCount}
                          </div>
                        </div>
                      </div>

                      {/* Advisory badge */}
                      <div
                        className={`p-3 rounded-2xl text-xs font-medium border ${
                          advisoryResult.advisoryLevel === "elevated_risk"
                            ? "bg-red-50 text-red-900 border-red-200 dark:bg-red-950/40 dark:text-red-200 dark:border-red-800"
                            : advisoryResult.advisoryLevel === "caution"
                            ? "bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-800"
                            : "bg-emerald-50 text-emerald-900 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-800"
                        }`}
                      >
                        <div className="flex items-center gap-2 font-semibold">
                          <AlertTriangle className="size-4 shrink-0" />
                          <span>Advisory: {advisoryResult.advisoryLevel.toUpperCase().replace("_", " ")}</span>
                        </div>
                        <p className="mt-1 leading-relaxed text-[11px]">{advisoryResult.advisorySummary}</p>
                      </div>

                      {/* Hazards along route listing */}
                      {advisoryResult.hazards.length > 0 && (
                        <div>
                          <div className="text-xs font-semibold text-foreground mb-1.5">
                            Specific Hazards Along Route:
                          </div>
                          <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                            {advisoryResult.hazards.map((hz) => (
                              <div
                                key={hz.id}
                                className="p-2 rounded-xl bg-background border border-border text-[11px] flex items-center justify-between"
                              >
                                <div className="truncate pr-2">
                                  <div className="font-semibold text-foreground truncate">{hz.title}</div>
                                  <div className="text-[10px] text-muted-foreground">
                                    {Math.round(hz.crossTrackDistanceMeters)}m off corridor · {hz.ageDays}d old
                                  </div>
                                </div>
                                <span className="font-mono text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                                  {hz.severity}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {advisoryError && (
                    <div className="mt-3 p-3 rounded-2xl bg-muted text-xs text-muted-foreground">
                      {advisoryError}
                    </div>
                  )}
                </div>

                {/* Statutory safety disclaimer as required by Rule 8 */}
                <div className="p-3.5 rounded-2xl bg-[#f5f3ed] dark:bg-[#102922] border border-[#cbd5cb] dark:border-[#22483d] text-[11px] text-[#486057] dark:text-[#9bb2a8]">
                  <div className="flex items-start gap-2">
                    <Info className="size-4 shrink-0 mt-0.5 text-[#0e2b24] dark:text-[#78a37d]" />
                    <div>
                      <span className="font-semibold text-[#0e2b24] dark:text-[#f5f3ed]">Civic Advisory Disclaimer: </span>
                      {ROUTE_SAFETY_DISCLAIMER}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Nearby Hazards Directory Table */}
            <div className="mt-10">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-heading text-lg font-bold text-foreground">
                    Nearby Hazards ({nearbyHazards.length} within {distanceRadiusMeters / 1000}km)
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Sorted by proximity to {currentOrigin.name}
                  </p>
                </div>
              </div>

              {nearbyHazards.length === 0 ? (
                <div className="mt-4 p-8 rounded-3xl bg-card border border-border text-center">
                  <ShieldCheck className="size-8 mx-auto text-emerald-600 mb-2" />
                  <p className="text-sm font-semibold text-foreground">No reported hazards within this radius</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Try expanding the radius to 5km or unchecking the verified filter.
                  </p>
                </div>
              ) : (
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {nearbyHazards.slice(0, 12).map((h) => (
                    <div
                      key={h.id}
                      className="p-3.5 rounded-2xl bg-card border border-border shadow-xs flex flex-col justify-between hover:border-primary/50 transition-all"
                    >
                      <div>
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                          <span className="font-mono font-semibold">{h.id}</span>
                          <span className="flex items-center gap-1">
                            <Clock className="size-3" />
                            {h.reportedAt || "Recently"}
                          </span>
                        </div>
                        <h3 className="mt-1 font-semibold text-xs text-foreground line-clamp-1">{h.title}</h3>
                        <p className="mt-0.5 text-[11px] text-muted-foreground line-clamp-1">
                          {h.landmark || h.location || "Greater Noida"}
                        </p>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-border flex items-center justify-between text-[10px]">
                        <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                          📍 {h.distanceMeters}m away
                        </span>
                        <Link
                          href={`/reports/${h.id}`}
                          className="font-semibold text-primary hover:underline inline-flex items-center gap-1"
                        >
                          <span>Case Details</span>
                          <ArrowRight className="size-3" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </main>
        <SiteFooter />
      </div>
    </>
  );
}
