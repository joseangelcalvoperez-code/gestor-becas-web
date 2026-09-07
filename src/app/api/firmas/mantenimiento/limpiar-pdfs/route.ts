import {
  NextResponse,
} from "next/server";

import {
  obtenerSesion,
} from "@/lib/session";

import {
  limpiarPdfsExpirados,
} from "@/lib/firmas/limpiar-pdfs-expirados";

export const runtime =
  "nodejs";

/*
 * =========================================================
 * POST /api/firmas/mantenimiento/limpiar-pdfs
 * =========================================================
 *
 * Ejecuta la limpieza de PDF cuyo periodo de disponibilidad
 * de 6 meses ya ha terminado.
 *
 * Solo afecta al centro de la sesión activa.
 *
 * IMPORTANTE:
 * NO elimina evidencias de firma.
 */
export async function POST() {
  try {
    const sesion =
      await obtenerSesion();

    if (!sesion) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "No hay una sesión activa.",
        },
        {
          status: 401,
        }
      );
    }

    const resultado =
      await limpiarPdfsExpirados({
        centroId:
          sesion.centroId,
      });

    return NextResponse.json({
      ok: true,

      mensaje:
        resultado.documentosEliminados ===
        0
          ? "No hay PDF vencidos pendientes de eliminación."
          : `Se han eliminado los PDF de ${resultado.documentosEliminados} documento${resultado.documentosEliminados === 1 ? "" : "s"} cuyo periodo de 6 meses había finalizado.`,

      resultado,
    });
  } catch (
    error
  ) {
    console.error(
      "Error ejecutando mantenimiento de PDF:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          "No se ha podido ejecutar la limpieza de PDF.",
      },
      {
        status: 500,
      }
    );
  }
}
