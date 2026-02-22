"use client";

import { useState, useEffect } from "react";
import { useAdmin } from "./admin-context";

interface AdminLoginDialogProps {
  onClose: () => void;
}

export function AdminLoginDialog({ onClose }: AdminLoginDialogProps) {
  const { login } = useAdmin();
  const [pw, setPw] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 200);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(false);
    setLoading(true);

    const ok = await login(pw);
    setLoading(false);

    if (ok) {
      handleClose();
    } else {
      setError(true);
    }
  };

  return (
    <>
      <div
        className={`absolute inset-0 z-[2001] bg-black/20 transition-opacity duration-200 ${
          visible ? "opacity-100" : "opacity-0"
        }`}
        onClick={handleClose}
      />
      <div
        className={`absolute bottom-0 left-0 right-0 z-[2002] transition-transform duration-300 ease-out ${
          visible ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="bg-white border-t border-zinc-200 rounded-t-2xl p-5 pb-8 max-w-sm mx-auto shadow-[0_-4px_30px_rgba(0,0,0,0.1)]">
          <div className="flex justify-center mb-4">
            <div className="w-10 h-1 rounded-full bg-zinc-300" />
          </div>
          <h2 className="font-display font-bold text-zinc-900 text-lg uppercase tracking-wide mb-4">
            Acceso Admin
          </h2>
          <form onSubmit={handleSubmit}>
            <input
              type="password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              placeholder="Contrasena"
              autoFocus
              className="w-full px-4 py-3 rounded-xl border border-zinc-300 font-mono text-base text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400 mb-3"
            />
            {error && (
              <p className="font-mono text-sm text-rose-600 mb-3">
                Contrasena incorrecta
              </p>
            )}
            <button
              type="submit"
              disabled={loading || !pw}
              className="w-full py-3 rounded-xl bg-zinc-900 text-white font-display font-bold text-base tracking-widest uppercase transition-all hover:bg-zinc-800 active:scale-95 disabled:opacity-50"
            >
              {loading ? "Verificando..." : "Entrar"}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
