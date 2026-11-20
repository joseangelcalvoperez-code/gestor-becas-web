import type { Metadata, Viewport } from "next";

import "./globals.css";

import { MARCA } from "@/lib/marca";

export const metadata: Metadata = {
  title: {
    default: `${MARCA.aplicacion} · ${MARCA.programa}`,
    template: `%s · ${MARCA.aplicacion}`,
  },

  description: `${MARCA.aplicacion} del programa ${MARCA.programa}. ${MARCA.departamento} — ${MARCA.organismo}.`,

  // Herramienta interna: no indexar en buscadores.
  robots: {
    index: false,
    follow: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#c8102e",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
