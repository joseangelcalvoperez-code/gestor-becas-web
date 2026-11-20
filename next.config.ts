import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // No anunciar la tecnología del servidor.
  poweredByHeader: false,

  // Compresión gzip de respuestas (desactivar si la hace el proxy inverso).
  compress: process.env.DISABLE_COMPRESSION !== "1",

  // Paquetes de servidor pesados: se cargan desde node_modules sin empaquetar.
  serverExternalPackages: ["pdf-lib", "exceljs", "jszip", "mariadb"],

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
      {
        // Plantillas y documentación estáticas: caché de 1 día en el navegador.
        source: "/plantillas/:file*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=86400" },
        ],
      },
      {
        // Solo los PDF estáticos (el manual), no la página /documentos.
        source: "/documentos/:file(.+\\.pdf)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=86400" },
        ],
      },
    ];
  },
};

export default nextConfig;
