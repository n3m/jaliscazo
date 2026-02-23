"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { Report, Message, Source } from "@/types";
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

const ALIAS_COLORS = [
  "bg-blue-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-violet-500",
  "bg-cyan-500",
  "bg-orange-500",
  "bg-pink-500",
  "bg-teal-500",
  "bg-indigo-500",
];

type TabId = "info" | "chat" | "sources";

export function ReportPopup({ report, onClose, onVoteSuccess, onReportDeleted, onReportUpdated }: ReportPopupProps) {
  const [activeTab, setActiveTab] = useState<TabId>("info");
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

  // Chat state
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [chatCooldown, setChatCooldown] = useState(0);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Sources state
  const [reportSources, setReportSources] = useState<Source[]>([]);
  const [sourceInput, setSourceInput] = useState("");
  const [addingSource, setAddingSource] = useState(false);
  const [sourceError, setSourceError] = useState<string | null>(null);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  // Fetch messages when chat tab is active
  useEffect(() => {
    if (activeTab !== "chat") {
      if (chatPollRef.current) clearInterval(chatPollRef.current);
      return;
    }

    const fetchMessages = async (since?: string) => {
      try {
        const url = since
          ? `/api/reports/${report.id}/messages?since=${encodeURIComponent(since)}`
          : `/api/reports/${report.id}/messages`;
        const res = await fetch(url);
        if (res.ok) {
          const data: Message[] = await res.json();
          if (since) {
            setChatMessages((prev) => {
              const existingIds = new Set(prev.map((m) => m.id));
              const newMsgs = data.filter((m) => !existingIds.has(m.id));
              return newMsgs.length > 0 ? [...prev, ...newMsgs] : prev;
            });
          } else {
            setChatMessages(data);
          }
        }
      } catch {
        // silent
      }
    };

    fetchMessages();
    chatPollRef.current = setInterval(() => {
      const lastMsg = chatMessages[chatMessages.length - 1];
      fetchMessages(lastMsg?.createdAt);
    }, 10_000);

    return () => {
      if (chatPollRef.current) clearInterval(chatPollRef.current);
    };
  }, [activeTab, report.id, chatMessages]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (activeTab === "chat") {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, activeTab]);

  // Cooldown timer
  useEffect(() => {
    if (chatCooldown <= 0) return;
    const interval = setInterval(() => {
      setChatCooldown((c) => Math.max(0, c - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [chatCooldown]);

  // Fetch sources when sources tab is active
  useEffect(() => {
    if (activeTab !== "sources") return;

    const fetchSources = async () => {
      try {
        const res = await fetch(`/api/reports/${report.id}/sources`);
        if (res.ok) {
          setReportSources(await res.json());
        }
      } catch {
        // silent
      }
    };

    fetchSources();
  }, [activeTab, report.id]);

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

  const handleSendMessage = useCallback(async () => {
    if (!chatInput.trim() || sendingMessage || chatCooldown > 0) return;
    setSendingMessage(true);

    try {
      const fingerprint = await getFingerprint();
      const res = await fetch(`/api/reports/${report.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: chatInput.trim(),
          sender_fingerprint: fingerprint,
        }),
      });

      if (res.status === 429) {
        setChatCooldown(30);
        return;
      }

      if (res.ok) {
        const msg: Message = await res.json();
        setChatMessages((prev) => [...prev, msg]);
        setChatInput("");
        setChatCooldown(30);
      }
    } catch {
      // silent
    } finally {
      setSendingMessage(false);
    }
  }, [chatInput, sendingMessage, chatCooldown, report.id]);

  const handleDeleteMessage = useCallback(
    async (messageId: string) => {
      try {
        const res = await fetch(
          `/api/reports/${report.id}/messages/${messageId}`,
          {
            method: "DELETE",
            headers: { Authorization: `Bearer ${password}` },
          }
        );
        if (res.ok) {
          setChatMessages((prev) => prev.filter((m) => m.id !== messageId));
        }
      } catch {
        // silent
      }
    },
    [report.id, password]
  );

  const handleAddSource = useCallback(async () => {
    if (!sourceInput.trim() || addingSource) return;
    setSourceError(null);

    try {
      new URL(sourceInput.trim());
    } catch {
      setSourceError("URL no válida");
      return;
    }

    setAddingSource(true);
    try {
      const fingerprint = await getFingerprint();
      const res = await fetch(`/api/reports/${report.id}/sources`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: sourceInput.trim(),
          added_by_fingerprint: fingerprint,
        }),
      });

      if (res.ok) {
        const source: Source = await res.json();
        setReportSources((prev) => [...prev, source]);
        setSourceInput("");
      } else {
        setSourceError("Error al agregar fuente");
      }
    } catch {
      setSourceError("Error al agregar fuente");
    } finally {
      setAddingSource(false);
    }
  }, [sourceInput, addingSource, report.id]);

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
    unconfirmed: "bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400",
    confirmed: "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.15)]",
    denied: "bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-400",
    expired: "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500",
  };

  const tabs: { id: TabId; label: string; badge?: number }[] = [
    { id: "info", label: "Info" },
    { id: "chat", label: "Chat", badge: report.messageCount || undefined },
    { id: "sources", label: "Fuentes", badge: report.sourceCount || undefined },
  ];

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
        <div className="bg-white dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800 rounded-t-2xl p-5 pb-8 max-w-lg mx-auto shadow-[0_-4px_30px_rgba(0,0,0,0.1)] max-h-[85vh] flex flex-col">
          {/* Handle */}
          <div className="flex justify-center mb-4">
            <div className="w-10 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
          </div>

          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <span
                className={`w-4 h-4 rounded-full ${config.dot}`}
              />
              <div>
                <h2 className="font-display font-bold text-zinc-900 dark:text-zinc-100 text-lg uppercase tracking-wide">
                  {config.title}
                </h2>
                <p className="font-mono text-xs text-zinc-400">
                  Reportado {timeAgo(report.createdAt)}
                </p>
                <p className="font-mono text-xs text-zinc-400">
                  Última actualización {timeAgo(report.lastActivityAt)}
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

          {/* Tab bar */}
          <div className="flex gap-1 mb-4 border-b border-zinc-200 dark:border-zinc-800">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2 font-mono text-xs uppercase tracking-widest transition-all border-b-2 -mb-px ${
                  activeTab === tab.id
                    ? "border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100"
                    : "border-transparent text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300"
                }`}
              >
                {tab.label}
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 text-[10px] font-bold leading-none">
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="overflow-y-auto flex-1 min-h-0">
            {/* === INFO TAB === */}
            {activeTab === "info" && (
              <div>
                {/* Description */}
                {report.description && (
                  <p className="font-mono text-base text-zinc-700 dark:text-zinc-300 mb-4 leading-relaxed">
                    {report.description}
                  </p>
                )}

                {/* Source link (legacy) */}
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
                <div className="flex items-center gap-6 mb-5 py-3 border-y border-zinc-200 dark:border-zinc-800">
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
                      className="flex items-center justify-center gap-2 py-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-display font-bold text-base tracking-widest uppercase transition-all hover:bg-emerald-100 dark:hover:bg-emerald-900 active:scale-95 disabled:opacity-50 min-h-[48px]"
                    >
                      Confirmar
                    </button>
                    <button
                      onClick={() => handleVote("deny")}
                      disabled={voting}
                      className="flex items-center justify-center gap-2 py-3.5 rounded-xl bg-rose-50 dark:bg-rose-950 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-display font-bold text-base tracking-widest uppercase transition-all hover:bg-rose-100 dark:hover:bg-rose-900 active:scale-95 disabled:opacity-50 min-h-[48px]"
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
                  <div className="mt-5 pt-4 border-t border-zinc-200 dark:border-zinc-800">
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
                          className="py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 font-display font-bold text-sm tracking-widest uppercase transition-all hover:bg-zinc-100 dark:hover:bg-zinc-800 active:scale-95"
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
                  <div className="mt-5 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                    <p className="font-mono text-[10px] text-zinc-400 uppercase tracking-widest mb-3">Editar reporte</p>
                    <div className="space-y-3">
                      <div>
                        <label className="font-mono text-xs text-zinc-500 mb-1 block">Tipo</label>
                        <select
                          value={editForm.type}
                          onChange={(e) => setEditForm((f) => ({ ...f, type: e.target.value }))}
                          className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 font-mono text-sm text-zinc-900 dark:text-zinc-100 bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-600"
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
                          className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 font-mono text-sm text-zinc-900 dark:text-zinc-100 bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-600"
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
                          className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 font-mono text-sm text-zinc-900 dark:text-zinc-100 bg-white dark:bg-zinc-900 resize-none focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-600"
                        />
                      </div>
                      <div>
                        <label className="font-mono text-xs text-zinc-500 mb-1 block">URL fuente</label>
                        <input
                          type="url"
                          value={editForm.sourceUrl}
                          onChange={(e) => setEditForm((f) => ({ ...f, sourceUrl: e.target.value }))}
                          className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 font-mono text-sm text-zinc-900 dark:text-zinc-100 bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-600"
                        />
                      </div>
                      <div>
                        <label className="font-mono text-xs text-zinc-500 mb-1 block">Creado</label>
                        <input
                          type="datetime-local"
                          value={editForm.createdAt}
                          onChange={(e) => setEditForm((f) => ({ ...f, createdAt: e.target.value }))}
                          className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 font-mono text-sm text-zinc-900 dark:text-zinc-100 bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-600"
                        />
                      </div>
                      <div>
                        <label className="font-mono text-xs text-zinc-500 mb-1 block">Ultima actividad</label>
                        <input
                          type="datetime-local"
                          value={editForm.lastActivityAt}
                          onChange={(e) => setEditForm((f) => ({ ...f, lastActivityAt: e.target.value }))}
                          className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 font-mono text-sm text-zinc-900 dark:text-zinc-100 bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-600"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                          onClick={handleSaveEdit}
                          disabled={saving}
                          className="py-2.5 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-display font-bold text-sm tracking-widest uppercase transition-all hover:bg-zinc-800 dark:hover:bg-zinc-200 active:scale-95 disabled:opacity-50"
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
                          className="py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 font-display font-bold text-sm tracking-widest uppercase transition-all hover:bg-zinc-100 dark:hover:bg-zinc-800 active:scale-95 disabled:opacity-50"
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
            )}

            {/* === CHAT TAB === */}
            {activeTab === "chat" && (
              <div className="flex flex-col h-full">
                {/* Messages */}
                <div className="flex-1 space-y-3 mb-3 min-h-[200px]">
                  {chatMessages.length === 0 && (
                    <p className="font-mono text-sm text-zinc-400 text-center py-8">
                      Sin mensajes aún. Sé el primero en comentar.
                    </p>
                  )}
                  {chatMessages.map((msg) => (
                    <div key={msg.id} className="flex items-start gap-2 group">
                      <span
                        className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold text-white leading-none mt-0.5 ${
                          msg.isOp
                            ? "bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900"
                            : ALIAS_COLORS[(msg.aliasNumber - 1) % ALIAS_COLORS.length]
                        }`}
                      >
                        {msg.isOp ? "OP" : `#${msg.aliasNumber}`}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-mono text-sm text-zinc-800 dark:text-zinc-200 break-words">
                          {msg.content}
                        </p>
                        <p className="font-mono text-[10px] text-zinc-400 mt-0.5">
                          {timeAgo(msg.createdAt)}
                        </p>
                      </div>
                      {isAdmin && (
                        <button
                          onClick={() => handleDeleteMessage(msg.id)}
                          className="opacity-0 group-hover:opacity-100 shrink-0 p-1 text-zinc-400 hover:text-rose-500 transition-all"
                          aria-label="Eliminar mensaje"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>

                {/* Chat input */}
                {report.status !== "expired" && (
                  <div className="flex gap-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      placeholder="Escribe un mensaje..."
                      maxLength={280}
                      className="flex-1 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 font-mono text-sm text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-500"
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={!chatInput.trim() || sendingMessage || chatCooldown > 0}
                      className="px-3 py-2 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-mono text-sm font-bold transition-all hover:bg-zinc-800 dark:hover:bg-zinc-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                    >
                      {chatCooldown > 0 ? `${chatCooldown}s` : sendingMessage ? "..." : "Enviar"}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* === SOURCES TAB === */}
            {activeTab === "sources" && (
              <div>
                {/* Source list */}
                <div className="space-y-2 mb-4">
                  {reportSources.length === 0 && (
                    <p className="font-mono text-sm text-zinc-400 text-center py-8">
                      Sin fuentes. Agrega un enlace como evidencia.
                    </p>
                  )}
                  {reportSources.map((source) => {
                    let domain = "";
                    try {
                      domain = new URL(source.url).hostname;
                    } catch {
                      domain = source.url;
                    }
                    return (
                      <a
                        key={source.id}
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600 transition-all group"
                      >
                        <img
                          src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
                          alt=""
                          className="w-4 h-4 shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-mono text-xs text-zinc-500 dark:text-zinc-400">
                            {domain}
                          </p>
                          <p className="font-mono text-xs text-zinc-400 dark:text-zinc-500 truncate">
                            {source.url}
                          </p>
                        </div>
                        <span className="font-mono text-[10px] text-zinc-400 shrink-0">
                          {timeAgo(source.createdAt)}
                        </span>
                      </a>
                    );
                  })}
                </div>

                {/* Add source input */}
                {report.status !== "expired" && (
                  <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800">
                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={sourceInput}
                        onChange={(e) => {
                          setSourceInput(e.target.value);
                          setSourceError(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddSource();
                          }
                        }}
                        placeholder="https://..."
                        className="flex-1 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 font-mono text-sm text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-500"
                      />
                      <button
                        onClick={handleAddSource}
                        disabled={!sourceInput.trim() || addingSource}
                        className="px-3 py-2 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-mono text-sm font-bold transition-all hover:bg-zinc-800 dark:hover:bg-zinc-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                      >
                        {addingSource ? "..." : "Agregar"}
                      </button>
                    </div>
                    {sourceError && (
                      <p className="font-mono text-xs text-rose-600 mt-1.5">
                        {sourceError}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
