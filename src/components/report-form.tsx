"use client";

import { useState, useEffect } from "react";
import type { Report, ReportType } from "@/types";

interface ReportFormProps {
  latitude: number;
  longitude: number;
  onClose: () => void;
  onCreated: (report: Report) => void;
}

export function ReportForm({
  latitude,
  longitude,
  onClose,
  onCreated,
}: ReportFormProps) {
  const [type, setType] = useState<ReportType | null>(null);
  const [description, setDescription] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [address, setAddress] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=16&addressdetails=1`,
      {
        signal: controller.signal,
        headers: { "Accept-Language": "es" },
      }
    )
      .then((res) => res.json())
      .then((data) => {
        if (data.display_name) {
          setAddress(data.display_name.split(",").slice(0, 3).join(","));
        }
      })
      .catch(() => {});

    return () => controller.abort();
  }, [latitude, longitude]);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 200);
  };

  const handleSubmit = async () => {
    if (!type) return;
    setSubmitting(true);

    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          latitude,
          longitude,
          description: description || undefined,
          source_url: sourceUrl || undefined,
        }),
      });

      if (res.ok) {
        const report = await res.json();
        setVisible(false);
        setTimeout(() => onCreated(report), 200);
      }
    } catch {
      // Silently fail
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`absolute inset-0 z-[1001] bg-black/20 transition-opacity duration-200 ${
          visible ? "opacity-100" : "opacity-0"
        }`}
        onClick={handleClose}
      />

      {/* Bottom sheet */}
      <div
        className={`absolute bottom-0 left-0 right-0 z-[1002] transition-transform duration-300 ease-out ${
          visible ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="bg-white border-t border-zinc-200 rounded-t-2xl p-5 pb-8 max-w-lg mx-auto shadow-[0_-4px_30px_rgba(0,0,0,0.1)]">
          {/* Handle bar */}
          <div className="flex justify-center mb-4">
            <div className="w-10 h-1 rounded-full bg-zinc-300" />
          </div>

          {/* Location */}
          <div className="mb-5">
            <p className="font-mono text-xs text-zinc-400 tracking-widest uppercase mb-1">
              Ubicaci&oacute;n
            </p>
            <p className="font-mono text-sm text-zinc-700 truncate">
              {address || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`}
            </p>
          </div>

          {/* Type selection */}
          <div className="mb-5">
            <p className="font-mono text-xs text-zinc-400 tracking-widest uppercase mb-3">
              Tipo de reporte
            </p>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => setType("armed_confrontation")}
                className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all min-h-[80px] active:scale-95 ${
                  type === "armed_confrontation"
                    ? "border-red-500 bg-red-50 shadow-[0_0_20px_rgba(239,68,68,0.12)]"
                    : "border-zinc-200 bg-zinc-50 hover:border-zinc-300"
                }`}
              >
                <span className="text-3xl">💥</span>
                <span
                  className={`font-display text-base font-bold tracking-wide uppercase ${
                    type === "armed_confrontation"
                      ? "text-red-600"
                      : "text-zinc-500"
                  }`}
                >
                  Balacera
                </span>
              </button>

              <button
                onClick={() => setType("road_blockade")}
                className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all min-h-[80px] active:scale-95 ${
                  type === "road_blockade"
                    ? "border-amber-500 bg-amber-50 shadow-[0_0_20px_rgba(245,158,11,0.12)]"
                    : "border-zinc-200 bg-zinc-50 hover:border-zinc-300"
                }`}
              >
                <span className="text-3xl">🚧</span>
                <span
                  className={`font-display text-base font-bold tracking-wide uppercase ${
                    type === "road_blockade"
                      ? "text-amber-600"
                      : "text-zinc-500"
                  }`}
                >
                  Bloqueo
                </span>
              </button>

              <button
                onClick={() => setType("cartel_activity")}
                className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all min-h-[80px] active:scale-95 ${
                  type === "cartel_activity"
                    ? "border-violet-500 bg-violet-50 shadow-[0_0_20px_rgba(139,92,246,0.12)]"
                    : "border-zinc-200 bg-zinc-50 hover:border-zinc-300"
                }`}
              >
                <span className="text-3xl">🔫</span>
                <span
                  className={`font-display text-base font-bold tracking-wide uppercase ${
                    type === "cartel_activity"
                      ? "text-violet-600"
                      : "text-zinc-500"
                  }`}
                >
                  Cartel
                </span>
              </button>
            </div>
          </div>

          {/* Description */}
          <div className="mb-4">
            <label className="font-mono text-xs text-zinc-400 tracking-widest uppercase block mb-2">
              Descripci&oacute;n (opcional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="&iquest;Qu&eacute; est&aacute; pasando?"
              rows={2}
              className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 font-mono text-base text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-400 resize-none"
            />
          </div>

          {/* Source URL */}
          <div className="mb-6">
            <label className="font-mono text-xs text-zinc-400 tracking-widest uppercase block mb-2">
              Enlace fuente (opcional)
            </label>
            <input
              type="url"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="https://twitter.com/..."
              className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 font-mono text-base text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-400"
            />
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={!type || submitting}
            className={`w-full py-3.5 rounded-xl font-display font-bold text-base tracking-widest uppercase transition-all active:scale-[0.98] ${
              !type || submitting
                ? "bg-zinc-200 text-zinc-400 cursor-not-allowed"
                : type === "armed_confrontation"
                  ? "bg-red-600 text-white shadow-[0_4px_20px_rgba(239,68,68,0.3)] hover:bg-red-500"
                  : type === "cartel_activity"
                    ? "bg-violet-600 text-white shadow-[0_4px_20px_rgba(139,92,246,0.3)] hover:bg-violet-500"
                    : "bg-amber-500 text-white shadow-[0_4px_20px_rgba(245,158,11,0.3)] hover:bg-amber-400"
            }`}
          >
            {submitting ? "Enviando..." : "Reportar"}
          </button>
        </div>
      </div>
    </>
  );
}
