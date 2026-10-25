"use client";

import { useEffect, useId } from "react";
import { useMap } from "@/components/ui/map";
import type * as GeoJSON from "geojson";

export interface MapHeatmapLayerProps {
  data: GeoJSON.FeatureCollection<GeoJSON.Point>;
  id?: string;
}

export function MapHeatmapLayer({ data, id }: MapHeatmapLayerProps) {
  const { map, isLoaded } = useMap();
  const generatedId = useId();
  const sourceId = id ? `${id}-source` : `heatmap-src-${generatedId.replace(/:/g, "")}`;
  const layerId = id ? `${id}-layer` : `heatmap-lyr-${generatedId.replace(/:/g, "")}`;

  useEffect(() => {
    if (!map || !isLoaded) return;

    try {
      // Add or update source
      if (!map.getSource(sourceId)) {
        map.addSource(sourceId, {
          type: "geojson",
          data,
        });
      } else {
        const src = map.getSource(sourceId) as { setData: (data: GeoJSON.FeatureCollection<GeoJSON.Point>) => void } | undefined;
        src?.setData(data);
      }

      // Add heatmap layer if not existing
      if (!map.getLayer(layerId)) {
        map.addLayer({
          id: layerId,
          type: "heatmap",
          source: sourceId,
          maxzoom: 18,
          paint: {
            // Increase weight based on the feature's weight property
            "heatmap-weight": [
              "interpolate",
              ["linear"],
              ["get", "weight"],
              0,
              0,
              1.5,
              1,
            ],
            // Increase intensity as zoom level increases
            "heatmap-intensity": [
              "interpolate",
              ["linear"],
              ["zoom"],
              0,
              1,
              15,
              3,
            ],
            // Color ramp tailored to JanSahayak's palette (transparent -> sage -> amber -> coral -> red)
            "heatmap-color": [
              "interpolate",
              ["linear"],
              ["heatmap-density"],
              0,
              "rgba(0, 0, 0, 0)",
              0.2,
              "#dce8d9",
              0.4,
              "#78a37d",
              0.6,
              "#e7b64f",
              0.8,
              "#e4876f",
              1,
              "#b91c1c",
            ],
            // Transition radius with zoom
            "heatmap-radius": [
              "interpolate",
              ["linear"],
              ["zoom"],
              0,
              4,
              9,
              16,
              15,
              28,
            ],
            // Fade out slightly at highest zoom so individual street details can be seen
            "heatmap-opacity": 0.85,
          },
        });
      }
    } catch (err) {
      console.warn("Heatmap layer render warning:", err);
    }

    return () => {
      try {
        if (map.getLayer(layerId)) {
          map.removeLayer(layerId);
        }
        if (map.getSource(sourceId)) {
          map.removeSource(sourceId);
        }
      } catch {
        // Map may have unmounted
      }
    };
  }, [map, isLoaded, data, sourceId, layerId]);

  return null;
}
