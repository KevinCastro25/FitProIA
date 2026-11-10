import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthGate } from "@/components/AuthGate";

export const metadata: Metadata = {
  title: "FitProIA — Recomposición Corporal y Rendimiento Híbrido",
  description:
    "Seguimiento inteligente de nutrición colombiana, porcentaje de grasa corporal, masa magra y entrenamiento híbrido (Gym + Running / Hyrox).",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "FitProIA",
  },
  icons: {
    icon: "/icons/icon.svg",
    apple: "/icons/icon.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#090d16" },
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es-CO" suppressHydrationWarning>
      <head>
        <meta name="color-scheme" content="light dark" />
        <script
          dangerouslySetInnerHTML={{
            __html: `try{document.querySelector('meta[name="color-scheme"]').content=localStorage.getItem("color-scheme")??"light dark";}catch(e){}`,
          }}
        />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
        <meta name="apple-mobile-web-app-title" content="FitProIA" />
        <link rel="apple-touch-icon" href="/icons/icon.svg" />
      </head>
      <body className="antialiased selection:bg-emerald-500/30">
        <AuthGate>{children}</AuthGate>
      </body>
    </html>
  );
}
