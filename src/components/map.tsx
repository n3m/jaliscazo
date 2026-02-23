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
import { WelcomeDialog } from "./welcome-dialog";
import { AdminProvider, useAdmin } from "./admin-context";
import { useTheme } from "./theme-context";
import { AdminLoginDialog } from "./admin-login-dialog";

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
  return (
    <AdminProvider>
      <MapInner />
    </AdminProvider>
  );
}

const TILE_LIGHT = "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
const TILE_DARK = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";

function MapInner() {
  const { isAdmin, logout } = useAdmin();
  const { isDark, toggle: toggleTheme } = useTheme();
  const [reports, setReports] = useState<Report[]>([]);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [formPosition, setFormPosition] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [panelOpen, setPanelOpen] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const boundsRef = useRef<L.LatLngBounds | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!localStorage.getItem("jaliscazo_welcome_seen_v2")) {
      setShowWelcome(true);
    }
  }, []);

  const handleWelcomeClose = useCallback(() => {
    localStorage.setItem("jaliscazo_welcome_seen_v2", "1");
    setShowWelcome(false);
  }, []);

  const fetchReports = useCallback(async () => {
    try {
      const res = await fetch("/api/reports");
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
    },
    []
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

  const handleReportDeleted = useCallback((id: string) => {
    setReports((prev) => prev.filter((r) => r.id !== id));
    setSelectedReport(null);
  }, []);

  const handleReportUpdated = useCallback((updatedReport: Report) => {
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
        maxBounds={[[-90, -180], [90, 180]]}
        maxBoundsViscosity={1.0}
      >
        <MapController mapRef={mapRef} />
        <TileLayer
          key={isDark ? "dark" : "light"}
          url={isDark ? TILE_DARK : TILE_LIGHT}
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>'
          noWrap
        />
        <MapEvents
          onMapClick={handleMapClick}
          onBoundsChange={handleBoundsChange}
        />
        {reports.map((report) => (
          <ReportMarker
            key={report.id}
            report={report}
            onClick={handleMarkerClick}
          />
        ))}
      </MapContainer>

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-[1000] pointer-events-none">
        <div className="flex items-start justify-between px-4 py-3 bg-gradient-to-b from-white/95 dark:from-zinc-950/95 to-transparent">
          <div className="flex items-start gap-3 pointer-events-auto">
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setPanelOpen(true)}
                className="flex items-center justify-center w-10 h-10 rounded-xl bg-white dark:bg-zinc-900 shadow-sm border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:shadow-md transition-all"
                aria-label="Ver lista de reportes"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <button
                onClick={toggleTheme}
                className="flex items-center justify-center w-10 h-10 rounded-xl bg-white dark:bg-zinc-900 shadow-sm border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:shadow-md transition-all"
                aria-label={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
              >
                {isDark ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
              </button>
            </div>
            <div
              style={{ touchAction: "none" }}
              onPointerDown={() => {
                longPressRef.current = setTimeout(() => {
                  if (isAdmin) {
                    logout();
                  } else {
                    setShowAdminLogin(true);
                  }
                }, 3000);
              }}
              onPointerUp={() => { if (longPressRef.current) clearTimeout(longPressRef.current); }}
              onPointerLeave={() => { if (longPressRef.current) clearTimeout(longPressRef.current); }}
              onPointerCancel={() => { if (longPressRef.current) clearTimeout(longPressRef.current); }}
            >
              <div className="flex items-center gap-1.5">
                <h1 className="font-display text-2xl font-bold tracking-[0.2em] text-zinc-900 dark:text-zinc-100 uppercase">
                  Jaliscazo
                </h1>
                {isAdmin && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
              </div>
              <p className="font-mono text-xs text-zinc-500 dark:text-zinc-400 tracking-widest uppercase">
                Reportes en tiempo real
              </p>
              <a href="mailto:contacto@jaliscazo.com" className="font-mono text-xs text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors">
                Contacto: contacto@jaliscazo.com
              </a>
            </div>
          </div>
          <div className="flex flex-col gap-1.5 pointer-events-auto">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-600 shadow-[0_0_6px_rgba(220,38,38,0.5)]" />
              <span className="font-mono text-xs text-zinc-600 dark:text-zinc-400 uppercase">
                Balacera
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.5)]" />
              <span className="font-mono text-xs text-zinc-600 dark:text-zinc-400 uppercase">
                Narcobloqueo
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-violet-500 shadow-[0_0_6px_rgba(139,92,246,0.5)]" />
              <span className="font-mono text-xs text-zinc-600 dark:text-zinc-400 uppercase">
                Cartel
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-[0_0_6px_rgba(249,115,22,0.5)]" />
              <span className="font-mono text-xs text-zinc-600 dark:text-zinc-400 uppercase">
                Quema
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-pink-500 shadow-[0_0_6px_rgba(236,72,153,0.5)]" />
              <span className="font-mono text-xs text-zinc-600 dark:text-zinc-400 uppercase">
                Rapiña
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-500 shadow-[0_0_6px_rgba(100,116,139,0.5)]" />
              <span className="font-mono text-xs text-zinc-600 dark:text-zinc-400 uppercase">
                Peligro
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 shadow-[0_0_6px_rgba(5,150,105,0.5)]" />
              <span className="font-mono text-xs text-zinc-600 dark:text-zinc-400 uppercase">
                Criminal
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom status bar */}
      <div className="absolute bottom-0 left-0 right-0 z-[1000] pointer-events-none">
        <div className="flex items-center justify-between px-4 py-2 bg-gradient-to-t from-white/95 dark:from-zinc-950/95 to-transparent">
          <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400">
            {activeReports.length} reporte{activeReports.length !== 1 ? "s" : ""}{" "}
            activo{activeReports.length !== 1 ? "s" : ""}
          </span>
          <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400">
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
          onReportDeleted={handleReportDeleted}
          onReportUpdated={handleReportUpdated}
        />
      )}

      {/* Welcome dialog */}
      {showWelcome && <WelcomeDialog onClose={handleWelcomeClose} />}

      {/* Admin login dialog */}
      {showAdminLogin && <AdminLoginDialog onClose={() => setShowAdminLogin(false)} />}
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
