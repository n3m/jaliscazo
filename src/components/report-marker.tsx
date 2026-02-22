"use client";

import { useMemo } from "react";
import { Marker } from "react-leaflet";
import L from "leaflet";
import type { Report } from "@/types";

interface ReportMarkerProps {
  report: Report;
  onClick: (report: Report) => void;
}

const emojiMap: Record<string, string> = {
  armed_confrontation: "💥",
  road_blockade: "🚧",
  cartel_activity: "🔫",
  building_fire: "🔥",
};

const colorMap: Record<string, string> = {
  armed_confrontation: "#ef4444",
  road_blockade: "#f59e0b",
  cartel_activity: "#8b5cf6",
  building_fire: "#f97316",
};

export function ReportMarker({ report, onClick }: ReportMarkerProps) {
  const isConfirmed = report.status === "confirmed";
  const baseColor = colorMap[report.type] ?? "#f97316";
  const emoji = emojiMap[report.type] ?? "⚠️";
  const size = isConfirmed ? 40 : 32;
  const emojiSize = isConfirmed ? 28 : 22;
  const animClass = isConfirmed ? "marker-glow" : "marker-pulse";

  const icon = useMemo(
    () =>
      L.divIcon({
        className: "",
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
        html: `<div class="report-marker ${animClass}" style="
          width:${size}px;
          height:${size}px;
          border:2px solid ${baseColor};
          border-radius:50%;
          background:transparent;
          display:flex;
          align-items:center;
          justify-content:center;
          font-size:${emojiSize}px;
          line-height:1;
          --marker-color:${baseColor};
        ">${emoji}</div>`,
      }),
    [size, baseColor, emoji, emojiSize, animClass]
  );

  return (
    <Marker
      position={[report.latitude, report.longitude]}
      icon={icon}
      bubblingMouseEvents={false}
      eventHandlers={{
        click: (e) => {
          e.originalEvent.stopPropagation();
          onClick(report);
        },
      }}
    />
  );
}
