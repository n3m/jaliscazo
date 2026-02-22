"use client";

import { useEffect, useRef } from "react";
import { CircleMarker, useMap } from "react-leaflet";
import type { Report } from "@/types";

interface ReportMarkerProps {
  report: Report;
  onClick: (report: Report) => void;
}

export function ReportMarker({ report, onClick }: ReportMarkerProps) {
  const markerRef = useRef<L.CircleMarker>(null);
  const isConfirmed = report.status === "confirmed";

  const colorMap: Record<string, string> = {
    armed_confrontation: "#ef4444",
    road_blockade: "#f59e0b",
    cartel_activity: "#8b5cf6",
    building_fire: "#f97316",
  };
  const baseColor = colorMap[report.type] ?? "#f97316";
  const radius = isConfirmed ? 14 : 9;
  const opacity = isConfirmed ? 0.95 : 0.6;
  const weight = isConfirmed ? 3 : 1.5;

  useEffect(() => {
    const marker = markerRef.current;
    if (!marker) return;

    const el = marker.getElement();
    if (!el) return;

    el.classList.remove("marker-pulse", "marker-glow");

    if (isConfirmed) {
      el.classList.add("marker-glow");
    } else {
      el.classList.add("marker-pulse");
    }
  }, [isConfirmed, report.id]);

  return (
    <CircleMarker
      ref={markerRef}
      center={[report.latitude, report.longitude]}
      radius={radius}
      bubblingMouseEvents={false}
      pathOptions={{
        color: baseColor,
        fillColor: baseColor,
        fillOpacity: opacity,
        weight,
        opacity: 1,
      }}
      eventHandlers={{
        click: (e) => {
          e.originalEvent.stopPropagation();
          onClick(report);
        },
      }}
    />
  );
}
