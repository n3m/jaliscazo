"use client";

import dynamic from "next/dynamic";

const Map = dynamic(
  () => import("@/components/map").then((mod) => mod.Map),
  {
    ssr: false,
    loading: () => (
      <div className="h-dvh w-full bg-black flex items-center justify-center">
        <div className="text-center">
          <h1 className="font-[var(--font-display)] text-2xl font-bold tracking-[0.3em] text-white uppercase mb-2">
            Jaliscazo
          </h1>
          <p className="font-[var(--font-mono)] text-xs text-zinc-600 tracking-widest animate-pulse">
            Cargando mapa...
          </p>
        </div>
      </div>
    ),
  }
);

export function MapLoader() {
  return <Map />;
}
