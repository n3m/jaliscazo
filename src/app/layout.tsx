import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, Share_Tech_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import "leaflet/dist/leaflet.css";

const barlowCondensed = Barlow_Condensed({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

const shareTechMono = Share_Tech_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "Jaliscazo — Reportes en tiempo real",
  description:
    "Mapa colaborativo de reportes de balaceras, bloqueos y situaciones de riesgo en Guadalajara y zona metropolitana. Información ciudadana en tiempo real.",
  openGraph: {
    title: "Jaliscazo — Reportes en tiempo real",
    description:
      "Mapa colaborativo de reportes de balaceras y bloqueos en Guadalajara.",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${barlowCondensed.variable} ${shareTechMono.variable} antialiased bg-[#f8f8f8] text-zinc-900 overflow-hidden`}
      >
        {children}
        {process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID && (
          <Script
            src={process.env.NEXT_PUBLIC_UMAMI_URL}
            data-website-id={process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID}
            strategy="afterInteractive"
          />
        )}
      </body>
    </html>
  );
}
