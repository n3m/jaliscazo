"use client";

import { useState, useEffect, useCallback } from "react";
import type { Report } from "@/types";
import { getFingerprint } from "@/lib/fingerprint";

interface ReportPopupProps {
  report: Report;
  onClose: () => void;
  onVoteSuccess: (updatedReport: Report) => void;
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

export function ReportPopup({ report, onClose, onVoteSuccess }: ReportPopupProps) {
  const [voting, setVoting] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [voteError, setVoteError] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 200);
  };

  const handleVote = useCallback(
    async (voteType: "confirm" | "deny") => {
      setVoting(true);
      setVoteError(null);

      try {
        const fingerprint = await getFingerprint();
        const res = await fetch(`/api/reports/${report.id}/vote`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            vote_type: voteType,
            voter_fingerprint: fingerprint,
          }),
        });

        if (res.status === 409) {
          setHasVoted(true);
          return;
        }

        if (res.ok) {
          const updated = await res.json();
          setHasVoted(true);
          onVoteSuccess(updated);
        }
      } catch {
        setVoteError("Error al votar");
      } finally {
        setVoting(false);
      }
    },
    [report.id, onVoteSuccess]
  );

  const typeConfig: Record<string, { dot: string; title: string; link: string }> = {
    armed_confrontation: {
      dot: "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.4)]",
      title: "Balacera",
      link: "text-red-600 hover:text-red-500",
    },
    road_blockade: {
      dot: "bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.4)]",
      title: "Bloqueo",
      link: "text-amber-600 hover:text-amber-500",
    },
    cartel_activity: {
      dot: "bg-violet-500 shadow-[0_0_10px_rgba(139,92,246,0.4)]",
      title: "Actividad del Cartel",
      link: "text-violet-600 hover:text-violet-500",
    },
  };
  const config = typeConfig[report.type] ?? typeConfig.cartel_activity;

  const statusLabels: Record<string, string> = {
    unconfirmed: "Sin confirmar",
    confirmed: "Confirmado",
    denied: "Negado",
    expired: "Expirado",
  };

  const statusColors: Record<string, string> = {
    unconfirmed: "bg-zinc-200 text-zinc-600",
    confirmed: "bg-emerald-100 text-emerald-700 shadow-[0_0_8px_rgba(16,185,129,0.15)]",
    denied: "bg-rose-100 text-rose-700",
    expired: "bg-zinc-100 text-zinc-400",
  };

  return (
    <>
      <div
        className={`absolute inset-0 z-[1001] bg-black/20 transition-opacity duration-200 ${
          visible ? "opacity-100" : "opacity-0"
        }`}
        onClick={handleClose}
      />

      <div
        className={`absolute bottom-0 left-0 right-0 z-[1002] transition-transform duration-300 ease-out ${
          visible ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="bg-white border-t border-zinc-200 rounded-t-2xl p-5 pb-8 max-w-lg mx-auto shadow-[0_-4px_30px_rgba(0,0,0,0.1)]">
          {/* Handle */}
          <div className="flex justify-center mb-4">
            <div className="w-10 h-1 rounded-full bg-zinc-300" />
          </div>

          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <span
                className={`w-4 h-4 rounded-full ${config.dot}`}
              />
              <div>
                <h2 className="font-display font-bold text-zinc-900 text-lg uppercase tracking-wide">
                  {config.title}
                </h2>
                <p className="font-mono text-xs text-zinc-400">
                  {timeAgo(report.createdAt)}
                </p>
              </div>
            </div>
            <span
              className={`px-2.5 py-1 rounded-full font-mono text-xs font-bold uppercase tracking-wider ${
                statusColors[report.status]
              }`}
            >
              {statusLabels[report.status]}
            </span>
          </div>

          {/* Description */}
          {report.description && (
            <p className="font-mono text-base text-zinc-700 mb-4 leading-relaxed">
              {report.description}
            </p>
          )}

          {/* Source link */}
          {report.sourceUrl && (
            <a
              href={report.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-1.5 font-mono text-sm mb-4 ${config.link}`}
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
              Ver fuente
            </a>
          )}

          {/* Vote counts */}
          <div className="flex items-center gap-6 mb-5 py-3 border-y border-zinc-200">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xl font-bold text-emerald-600">
                {report.confirmCount}
              </span>
              <span className="font-mono text-xs text-zinc-400 uppercase tracking-wider">
                confirman
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xl font-bold text-rose-600">
                {report.denyCount}
              </span>
              <span className="font-mono text-xs text-zinc-400 uppercase tracking-wider">
                niegan
              </span>
            </div>
            <div className="ml-auto">
              <span className="font-mono text-xs text-zinc-400">
                Score: {report.score}
              </span>
            </div>
          </div>

          {/* Vote buttons or voted state */}
          {hasVoted ? (
            <div className="text-center py-3">
              <p className="font-mono text-base text-zinc-400">
                ✓ Ya votaste en este reporte
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleVote("confirm")}
                disabled={voting}
                className="flex items-center justify-center gap-2 py-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 font-display font-bold text-base tracking-widest uppercase transition-all hover:bg-emerald-100 active:scale-95 disabled:opacity-50 min-h-[48px]"
              >
                Confirmar
              </button>
              <button
                onClick={() => handleVote("deny")}
                disabled={voting}
                className="flex items-center justify-center gap-2 py-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-display font-bold text-base tracking-widest uppercase transition-all hover:bg-rose-100 active:scale-95 disabled:opacity-50 min-h-[48px]"
              >
                Negar
              </button>
            </div>
          )}

          {voteError && (
            <p className="font-mono text-sm text-rose-600 text-center mt-3">
              {voteError}
            </p>
          )}
        </div>
      </div>
    </>
  );
}
