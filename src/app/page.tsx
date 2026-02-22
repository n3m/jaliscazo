import { MapLoader } from "@/components/map-loader";

export default function Home() {
  return (
    <main className="h-dvh w-full flex flex-col">
      <div className="bg-red-700 text-white px-4 py-2 flex items-center gap-3 shrink-0 font-[family-name:var(--font-display)]">
        <span className="live-badge bg-white text-red-700 text-xs font-bold px-2 py-0.5 rounded uppercase tracking-wider shrink-0">
          EN VIVO
        </span>
        <span className="text-sm font-semibold sm:text-base">
          Jalisco: Código Rojo — Alerta por la muerte de &ldquo;El Mencho&rdquo;
        </span>
      </div>
      <div className="flex-1 min-h-0">
        <MapLoader />
      </div>
    </main>
  );
}
