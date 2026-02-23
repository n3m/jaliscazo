"use client";

import { useState, useEffect, useCallback } from "react";
import type { Report } from "@/types";
import { getFingerprint } from "@/lib/fingerprint";
import { useAdmin } from "./admin-context";

interface ReportPopupProps {
  report: Report;
  onClose: () => void;
  onVoteSuccess: (updatedReport: Report) => void;
  onReportDeleted?: (id: string) => void;
  onReportUpdated?: (report: Report) => void;
}

function toLocalDatetime(isoStr: string): string {
  const d = new Date(isoStr);
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
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

export function ReportPopup({ report, onClose, onVoteSuccess, onReportDeleted, onReportUpdated }: ReportPopupProps) {
  const [voting, setVoting] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [voteError, setVoteError] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const { isAdmin, password } = useAdmin();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    type: report.type as string,
    status: report.status as string,
    description: report.description || "",
    sourceUrl: report.sourceUrl || "",
    createdAt: toLocalDatetime(report.createdAt),
    lastActivityAt: toLocalDatetime(report.lastActivityAt),
  });

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const handleClose = useCallback(() => {
    setVisible(false);
    setTimeout(onClose, 200);
  }, [onClose]);

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

  const handleDelete = useCallback(async () => {
    setSaving(true);
    setAdminError(null);
    try {
      const res = await fetch(`/api/reports/${report.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${password}` },
      });
      if (res.ok) {
        onReportDeleted?.(report.id);
        handleClose();
      } else {
        setAdminError("Error al eliminar");
      }
    } catch {
      setAdminError("Error al eliminar");
    } finally {
      setSaving(false);
    }
  }, [report.id, password, onReportDeleted, handleClose]);

  const handleSaveEdit = useCallback(async () => {
    setSaving(true);
    setAdminError(null);
    try {
      const res = await fetch(`/api/reports/${report.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${password}`,
        },
        body: JSON.stringify({
          type: editForm.type,
          status: editForm.status,
          description: editForm.description,
          sourceUrl: editForm.sourceUrl,
          createdAt: new Date(editForm.createdAt).toISOString(),
          lastActivityAt: new Date(editForm.lastActivityAt).toISOString(),
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        onReportUpdated?.(updated);
        setEditing(false);
      } else {
        setAdminError("Error al guardar");
      }
    } catch {
      setAdminError("Error al guardar");
    } finally {
      setSaving(false);
    }
  }, [report.id, password, editForm, onReportUpdated]);

  const typeConfig: Record<string, { dot: string; title: string; link: string }> = {
    armed_confrontation: {
      dot: "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.4)]",
      title: "Balacera",
      link: "text-red-600 hover:text-red-500",
    },
    road_blockade: {
      dot: "bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.4)]",
      title: "Narcobloqueo",
      link: "text-amber-600 hover:text-amber-500",
    },
    cartel_activity: {
      dot: "bg-violet-500 shadow-[0_0_10px_rgba(139,92,246,0.4)]",
      title: "Actividad del Cartel",
      link: "text-violet-600 hover:text-violet-500",
    },
    building_fire: {
      dot: "bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.4)]",
      title: "Quema de Edificio",
      link: "text-orange-600 hover:text-orange-500",
    },
    looting: {
      dot: "bg-pink-500 shadow-[0_0_10px_rgba(236,72,153,0.4)]",
      title: "Rapiña",
      link: "text-pink-600 hover:text-pink-500",
    },
    general_danger: {
      dot: "bg-slate-500 shadow-[0_0_10px_rgba(100,116,139,0.4)]",
      title: "Peligro General",
      link: "text-slate-600 hover:text-slate-500",
    },
    criminal_activity: {
      dot: "bg-emerald-600 shadow-[0_0_10px_rgba(5,150,105,0.4)]",
      title: "Actividad Criminal",
      link: "text-emerald-600 hover:text-emerald-500",
    },
  };
  const config = typeConfig[report.type] ?? typeConfig.building_fire;

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

          {/* Admin controls */}
          {isAdmin && !editing && (
            <div className="mt-5 pt-4 border-t border-zinc-200">
              <p className="font-mono text-[10px] text-zinc-400 uppercase tracking-widest mb-3">Admin</p>
              {deleting ? (
                <div className="space-y-2">
                  <p className="font-mono text-sm text-rose-600 text-center">Eliminar este reporte?</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={handleDelete}
                      disabled={saving}
                      className="py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-display font-bold text-sm tracking-widest uppercase transition-all hover:bg-rose-100 active:scale-95 disabled:opacity-50"
                    >
                      {saving ? "Eliminando..." : "Confirmar"}
                    </button>
                    <button
                      onClick={() => setDeleting(false)}
                      disabled={saving}
                      className="py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-600 font-display font-bold text-sm tracking-widest uppercase transition-all hover:bg-zinc-100 active:scale-95 disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setEditing(true)}
                    className="py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-600 font-display font-bold text-sm tracking-widest uppercase transition-all hover:bg-zinc-100 active:scale-95"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => setDeleting(true)}
                    className="py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 font-display font-bold text-sm tracking-widest uppercase transition-all hover:bg-rose-100 active:scale-95"
                  >
                    Eliminar
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Admin edit form */}
          {isAdmin && editing && (
            <div className="mt-5 pt-4 border-t border-zinc-200">
              <p className="font-mono text-[10px] text-zinc-400 uppercase tracking-widest mb-3">Editar reporte</p>
              <div className="space-y-3">
                <div>
                  <label className="font-mono text-xs text-zinc-500 mb-1 block">Tipo</label>
                  <select
                    value={editForm.type}
                    onChange={(e) => setEditForm((f) => ({ ...f, type: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-300 font-mono text-sm text-zinc-900 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400"
                  >
                    <option value="armed_confrontation">Balacera</option>
                    <option value="road_blockade">Narcobloqueo</option>
                    <option value="cartel_activity">Actividad del Cartel</option>
                    <option value="building_fire">Quema de Edificio</option>
                    <option value="looting">Rapiña</option>
                    <option value="general_danger">Peligro General</option>
                    <option value="criminal_activity">Actividad Criminal</option>
                  </select>
                </div>
                <div>
                  <label className="font-mono text-xs text-zinc-500 mb-1 block">Status</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-300 font-mono text-sm text-zinc-900 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400"
                  >
                    <option value="unconfirmed">Sin confirmar</option>
                    <option value="confirmed">Confirmado</option>
                    <option value="denied">Negado</option>
                    <option value="expired">Expirado</option>
                  </select>
                </div>
                <div>
                  <label className="font-mono text-xs text-zinc-500 mb-1 block">Descripcion</label>
                  <textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-300 font-mono text-sm text-zinc-900 resize-none focus:outline-none focus:ring-2 focus:ring-zinc-400"
                  />
                </div>
                <div>
                  <label className="font-mono text-xs text-zinc-500 mb-1 block">URL fuente</label>
                  <input
                    type="url"
                    value={editForm.sourceUrl}
                    onChange={(e) => setEditForm((f) => ({ ...f, sourceUrl: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-300 font-mono text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400"
                  />
                </div>
                <div>
                  <label className="font-mono text-xs text-zinc-500 mb-1 block">Creado</label>
                  <input
                    type="datetime-local"
                    value={editForm.createdAt}
                    onChange={(e) => setEditForm((f) => ({ ...f, createdAt: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-300 font-mono text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400"
                  />
                </div>
                <div>
                  <label className="font-mono text-xs text-zinc-500 mb-1 block">Ultima actividad</label>
                  <input
                    type="datetime-local"
                    value={editForm.lastActivityAt}
                    onChange={(e) => setEditForm((f) => ({ ...f, lastActivityAt: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-300 font-mono text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={handleSaveEdit}
                    disabled={saving}
                    className="py-2.5 rounded-xl bg-zinc-900 text-white font-display font-bold text-sm tracking-widest uppercase transition-all hover:bg-zinc-800 active:scale-95 disabled:opacity-50"
                  >
                    {saving ? "Guardando..." : "Guardar"}
                  </button>
                  <button
                    onClick={() => {
                      setEditing(false);
                      setEditForm({
                        type: report.type,
                        status: report.status,
                        description: report.description || "",
                        sourceUrl: report.sourceUrl || "",
                        createdAt: toLocalDatetime(report.createdAt),
                        lastActivityAt: toLocalDatetime(report.lastActivityAt),
                      });
                    }}
                    disabled={saving}
                    className="py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-600 font-display font-bold text-sm tracking-widest uppercase transition-all hover:bg-zinc-100 active:scale-95 disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          )}

          {adminError && (
            <p className="font-mono text-sm text-rose-600 text-center mt-3">
              {adminError}
            </p>
          )}
        </div>
      </div>
    </>
  );
}
