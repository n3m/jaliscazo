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

  const hasChat = !isExpired && report.messageCount > 0;

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
          position:relative;
          ${isExpired ? "filter:grayscale(1);" : ""}
        ">${emoji}${
          hasChat
            ? `<span style="
                position:absolute;
                top:-3px;
                right:-3px;
                width:12px;
                height:12px;
                background:${baseColor};
                border-radius:50%;
                display:flex;
                align-items:center;
                justify-content:center;
              "><svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg></span>`
            : ""
        }</div>`,
      }),
    [size, baseColor, emoji, emojiSize, animClass, opacity, isExpired, hasChat]
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
