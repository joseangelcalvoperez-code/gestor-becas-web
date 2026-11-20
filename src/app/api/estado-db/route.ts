import {
  NextResponse,
} from "next/server";

import {
  prisma,
} from "@/lib/prisma";

import {
  semaforoMasivos,
  semaforoPdf,
} from "@/lib/limitador";

export const dynamic =
  "force-dynamic";

/* =========================================================
   GET /api/estado-db
   Comprobación de salud para el balanceador / monitorización.
   Ya no expone el número de centros ni de usuarios (era
   información accesible sin sesión).
   ========================================================= */

export async function GET() {
  const inicio = Date.now();

  try {
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json(
      {
        ok: true,

        latenciaBdMs:
          Date.now() - inicio,

        pdf: {
          enEjecucion:
            semaforoPdf.enEjecucion,

          enCola:
            semaforoPdf.enCola,
        },

        generacionesMasivas: {
          enEjecucion:
            semaforoMasivos.enEjecucion,

          enCola:
            semaforoMasivos.enCola,
        },
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error(
      "Error comprobando la base de datos:",
      error
    );

    return NextResponse.json(
      {
        ok: false,

        error:
          "No se ha podido conectar con la base de datos.",
      },
      {
        status: 503,
      }
    );
  }
}
