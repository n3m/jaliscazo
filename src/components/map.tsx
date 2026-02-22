"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  useMapEvents,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import type { Report } from "@/types";
import { ReportMarker } from "./report-marker";
import { ReportForm } from "./report-form";
import { ReportPopup } from "./report-popup";
import { ReportsPanel } from "./reports-panel";

const GUADALAJARA_CENTER: [number, number] = [20.6597, -103.3496];
const POLL_INTERVAL = 20_000;

interface MapEventsProps {
  onMapClick: (lat: number, lng: number) => void;
  onBoundsChange: (bounds: L.LatLngBounds) => void;
}

function MapEvents({ onMapClick, onBoundsChange }: MapEventsProps) {
  const map = useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
    moveend() {
      onBoundsChange(map.getBounds());
    },
    zoomend() {
      onBoundsChange(map.getBounds());
    },
  });

  useEffect(() => {
    onBoundsChange(map.getBounds());
  }, [map, onBoundsChange]);

  return null;
}

function MapController({ mapRef }: { mapRef: React.MutableRefObject<L.Map | null> }) {
  const map = useMap();
  mapRef.current = map;
  return null;
}

export function Map() {
  const [reports, setReports] = useState<Report[]>([]);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [formPosition, setFormPosition] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [panelOpen, setPanelOpen] = useState(false);
  const boundsRef = useRef<L.LatLngBounds | null>(null);
  const mapRef = useRef<L.Map | null>(null);

  const fetchReports = useCallback(async () => {
    const bounds = boundsRef.current;
    let url = "/api/reports";
    if (bounds) {
      const sw = bounds.getSouthWest();
      const ne = bounds.getNorthEast();
      url += `?swLat=${sw.lat}&swLng=${sw.lng}&neLat=${ne.lat}&neLng=${ne.lng}`;
    }

    try {
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setReports(data);
        setLastUpdate(new Date());
      }
    } catch {
      // Silent fail — polling will retry
    }
  }, []);

  useEffect(() => {
    fetchReports();
    const interval = setInterval(fetchReports, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchReports]);

  const handleBoundsChange = useCallback(
    (bounds: L.LatLngBounds) => {
      boundsRef.current = bounds;
      fetchReports();
    },
    [fetchReports]
  );

  const handleMapClick = useCallback((lat: number, lng: number) => {
    setSelectedReport(null);
    setFormPosition({ lat, lng });
  }, []);

  const handleMarkerClick = useCallback((report: Report) => {
    setFormPosition(null);
    setSelectedReport(report);
  }, []);

  const handleFormClose = useCallback(() => {
    setFormPosition(null);
  }, []);

  const handleReportCreated = useCallback(
    (report: Report) => {
      setReports((prev) => [...prev, report]);
      setFormPosition(null);
      setLastUpdate(new Date());
    },
    []
  );

  const handlePopupClose = useCallback(() => {
    setSelectedReport(null);
  }, []);

  const handleVoteSuccess = useCallback((updatedReport: Report) => {
    setReports((prev) =>
      prev.map((r) => (r.id === updatedReport.id ? updatedReport : r))
    );
    setSelectedReport(updatedReport);
  }, []);

  const handlePanelReportSelect = useCallback((report: Report) => {
    mapRef.current?.flyTo([report.latitude, report.longitude], 15, { duration: 0.5 });
    setSelectedReport(report);
    setFormPosition(null);
    setPanelOpen(false);
  }, []);

  const activeReports = reports.filter((r) => r.status !== "expired");

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={GUADALAJARA_CENTER}
        zoom={12}
        className="h-full w-full z-0"
        zoomControl={false}
        attributionControl={false}
      >
        <MapController mapRef={mapRef} />
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>'
        />
        <MapEvents
          onMapClick={handleMapClick}
          onBoundsChange={handleBoundsChange}
        />
        {activeReports.map((report) => (
          <ReportMarker
            key={report.id}
            report={report}
            onClick={handleMarkerClick}
          />
        ))}
      </MapContainer>

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-[1000] pointer-events-none">
        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-b from-white/95 to-transparent">
          <div className="flex items-center gap-3 pointer-events-auto">
            <button
              onClick={() => setPanelOpen(true)}
              className="flex items-center justify-center w-10 h-10 rounded-xl bg-white shadow-sm border border-zinc-200 text-zinc-600 hover:text-zinc-900 hover:shadow-md transition-all"
              aria-label="Ver lista de reportes"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div>
              <h1 className="font-display text-xl font-bold tracking-[0.2em] text-zinc-900 uppercase">
                Jaliscazo
              </h1>
              <p className="font-mono text-[10px] text-zinc-500 tracking-widest uppercase">
                Reportes en tiempo real
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 pointer-events-auto">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-600 shadow-[0_0_6px_rgba(220,38,38,0.5)]" />
              <span className="font-mono text-[10px] text-zinc-600 uppercase">
                Balacera
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.5)]" />
              <span className="font-mono text-[10px] text-zinc-600 uppercase">
                Bloqueo
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom status bar */}
      <div className="absolute bottom-0 left-0 right-0 z-[1000] pointer-events-none">
        <div className="flex items-center justify-between px-4 py-2 bg-gradient-to-t from-white/95 to-transparent">
          <span className="font-mono text-[10px] text-zinc-500">
            {activeReports.length} reporte{activeReports.length !== 1 ? "s" : ""}{" "}
            activo{activeReports.length !== 1 ? "s" : ""}
          </span>
          <span className="font-mono text-[10px] text-zinc-500">
            Actualizado hace{" "}
            <TimeSince date={lastUpdate} />
          </span>
        </div>
      </div>

      {/* Reports panel */}
      <ReportsPanel
        reports={activeReports}
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        onSelectReport={handlePanelReportSelect}
      />

      {/* Report form */}
      {formPosition && (
        <ReportForm
          latitude={formPosition.lat}
          longitude={formPosition.lng}
          onClose={handleFormClose}
          onCreated={handleReportCreated}
        />
      )}

      {/* Report popup */}
      {selectedReport && (
        <ReportPopup
          report={selectedReport}
          onClose={handlePopupClose}
          onVoteSuccess={handleVoteSuccess}
        />
      )}
    </div>
  );
}

function TimeSince({ date }: { date: Date }) {
  const [text, setText] = useState("");

  useEffect(() => {
    const update = () => {
      const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
      if (seconds < 60) {
        setText(`${seconds}s`);
      } else {
        setText(`${Math.floor(seconds / 60)}m`);
      }
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [date]);

  return <>{text}</>;
}
