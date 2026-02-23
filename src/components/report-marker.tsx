"use client";

import { useMemo } from "react";
import { Marker, Tooltip } from "react-leaflet";
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
  looting: "🚨",
  general_danger: "⚠️",
  criminal_activity: "👹",
};

const colorMap: Record<string, string> = {
  armed_confrontation: "#ef4444",
  road_blockade: "#f59e0b",
  cartel_activity: "#8b5cf6",
  building_fire: "#f97316",
  looting: "#ec4899",
  general_danger: "#64748b",
  criminal_activity: "#059669",
};

function getRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const minutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(minutes / 60);

  if (minutes < 1) return "hace menos de un minuto";
  if (minutes === 1) return "hace 1 minuto";
  if (minutes < 60) return `hace ${minutes} minutos`;
  if (hours === 1) return "hace 1 hora";
  return `hace ${hours} horas`;
}

export function ReportMarker({ report, onClick }: ReportMarkerProps) {
  const isExpired = report.status === "expired";
  const isConfirmed = report.status === "confirmed";
  const baseColor = isExpired ? "#9ca3af" : (colorMap[report.type] ?? "#f97316");
  const emoji = emojiMap[report.type] ?? "⚠️";
  const size = isExpired ? 28 : isConfirmed ? 40 : 32;
  const emojiSize = isExpired ? 18 : isConfirmed ? 28 : 22;
  const animClass = isExpired ? "" : isConfirmed ? "marker-glow" : "marker-pulse";
  const opacity = isExpired ? 0.5 : 1;

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
          opacity:${opacity};
          --marker-color:${baseColor};
          ${isExpired ? "filter:grayscale(1);" : ""}
        ">${emoji}</div>`,
      }),
    [size, baseColor, emoji, emojiSize, animClass, opacity, isExpired]
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
    >
      <Tooltip direction="top" offset={[0, -size / 2]}>
        <span>Reportado {getRelativeTime(report.createdAt)}</span>
        <br />
        <span>Última actualización {getRelativeTime(report.lastActivityAt)}</span>
      </Tooltip>
    </Marker>
  );
}
