"use client";

import { useState, useEffect } from "react";

interface WelcomeDialogProps {
  onClose: () => void;
}

export function WelcomeDialog({ onClose }: WelcomeDialogProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 200);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`absolute inset-0 z-[1003] bg-black/20 transition-opacity duration-200 ${
          visible ? "opacity-100" : "opacity-0"
        }`}
        onClick={handleClose}
      />

      {/* Bottom sheet */}
      <div
        className={`absolute bottom-0 left-0 right-0 z-[1004] transition-transform duration-300 ease-out ${
          visible ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="bg-white dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800 rounded-t-2xl p-5 pb-8 max-w-lg mx-auto shadow-[0_-4px_30px_rgba(0,0,0,0.1)]">
          {/* Handle bar */}
          <div className="flex justify-center mb-4">
            <div className="w-10 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
          </div>

          {/* Title */}
          <h2 className="font-display font-bold text-zinc-900 dark:text-zinc-100 text-xl uppercase tracking-wide mb-1">
            Bienvenido a Jaliscazo
          </h2>
          <p className="font-mono text-xs text-zinc-400 dark:text-zinc-500 tracking-widest uppercase mb-5">
            C&oacute;mo funciona
          </p>

          {/* Tutorial items */}
          <div className="flex flex-col gap-4 mb-6">
            {/* 1. Reportar */}
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="3" strokeWidth={2} />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2v4m0 12v4m10-10h-4M6 12H2" />
                </svg>
              </div>
              <div>
                <p className="font-display text-base font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wide">
                  Reportar
                </p>
                <p className="font-mono text-sm text-zinc-500 dark:text-zinc-400">
                  Toca el mapa para crear un reporte en esa ubicaci&oacute;n
                </p>
              </div>
            </div>

            {/* 2. Tipos de reporte */}
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span className="w-2 h-2 rounded-full bg-violet-500" />
                </div>
              </div>
              <div>
                <p className="font-display text-base font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wide">
                  Tipos de reporte
                </p>
                <p className="font-mono text-sm text-zinc-500 dark:text-zinc-400">
                  Balacera, bloqueo vial o actividad del cartel
                </p>
              </div>
            </div>

            {/* 3. Confirmar o negar */}
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="font-display text-base font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wide">
                  Confirmar o negar
                </p>
                <p className="font-mono text-sm text-zinc-500 dark:text-zinc-400">
                  Toca un marcador y vota si el reporte es real
                </p>
              </div>
            </div>

            {/* 4. 100% anónimo */}
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <p className="font-display text-base font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wide">
                  100% an&oacute;nimo
                </p>
                <p className="font-mono text-sm text-zinc-500 dark:text-zinc-400">
                  No se requiere cuenta ni datos personales
                </p>
              </div>
            </div>
          </div>

          {/* Button */}
          <button
            onClick={handleClose}
            className="w-full py-3.5 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-display font-bold text-base tracking-widest uppercase transition-all hover:bg-zinc-800 dark:hover:bg-zinc-200 active:scale-[0.98]"
          >
            Entendido
          </button>
        </div>
      </div>
    </>
  );
}
