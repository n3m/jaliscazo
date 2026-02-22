"use client";

import type { Report } from "@/types";

interface ReportsPanelProps {
  reports: Report[];
  open: boolean;
  onClose: () => void;
  onSelectReport: (report: Report) => void;
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / 1000
  );
  if (seconds < 60) return `hace ${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `hace ${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `hace ${hours}h`;
}

const statusLabels: Record<string, string> = {
  unconfirmed: "Sin confirmar",
  confirmed: "Confirmado",
  denied: "Negado",
  expired: "Expirado",
};

const statusColors: Record<string, string> = {
  unconfirmed: "bg-zinc-200 text-zinc-600",
  confirmed: "bg-emerald-100 text-emerald-700",
  denied: "bg-rose-100 text-rose-700",
  expired: "bg-zinc-100 text-zinc-400",
};

export function ReportsPanel({
  reports,
  open,
  onClose,
  onSelectReport,
}: ReportsPanelProps) {
  const sorted = [...reports].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <>
      {/* Backdrop — mobile only */}
      <div
        className={`fixed inset-0 z-[1001] bg-black/20 transition-opacity duration-300 md:hidden ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={`fixed left-0 top-0 bottom-0 z-[1002] w-[80vw] max-w-[320px] bg-white shadow-[4px_0_30px_rgba(0,0,0,0.1)] flex flex-col transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-zinc-200">
          <h2 className="font-display font-bold text-base text-zinc-900 uppercase tracking-widest">
            Reportes Recientes
          </h2>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors min-h-0 min-w-0"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {sorted.length === 0 ? (
            <div className="flex items-center justify-center h-full px-4">
              <p className="font-mono text-base text-zinc-400 text-center">
                No hay reportes activos
              </p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-100">
              {sorted.map((report) => {
                const borderMap: Record<string, string> = {
                  armed_confrontation: "border-l-red-500",
                  road_blockade: "border-l-amber-500",
                  cartel_activity: "border-l-violet-500",
                };
                const titleMap: Record<string, string> = {
                  armed_confrontation: "Balacera",
                  road_blockade: "Bloqueo",
                  cartel_activity: "Cartel",
                };
                return (
                  <button
                    key={report.id}
                    onClick={() => onSelectReport(report)}
                    className={`w-full text-left px-4 py-3 hover:bg-zinc-50 active:bg-zinc-100 transition-colors cursor-pointer border-l-[3px] min-h-[44px] min-w-0 ${
                      borderMap[report.type] ?? "border-l-violet-500"
                    }`}
                  >
                    {/* Type + time */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-display font-bold text-base text-zinc-900 uppercase tracking-wide">
                        {titleMap[report.type] ?? "Cartel"}
                      </span>
                      <span className="font-mono text-xs text-zinc-400 shrink-0">
                        {timeAgo(report.createdAt)}
                      </span>
                    </div>

                    {/* Description */}
                    {report.description && (
                      <p className="font-mono text-sm text-zinc-500 mt-1 line-clamp-1">
                        {report.description}
                      </p>
                    )}

                    {/* Status + votes */}
                    <div className="flex items-center gap-3 mt-1.5">
                      <span
                        className={`px-2 py-0.5 rounded-full font-mono text-[10px] font-bold uppercase tracking-wider ${
                          statusColors[report.status]
                        }`}
                      >
                        {statusLabels[report.status]}
                      </span>
                      <span className="font-mono text-xs text-emerald-600">
                        {report.confirmCount}
                      </span>
                      <span className="font-mono text-xs text-rose-600">
                        {report.denyCount}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
