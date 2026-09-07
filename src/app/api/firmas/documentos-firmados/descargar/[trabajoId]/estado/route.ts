import {
  NextResponse,
} from "next/server";

import {
  obtenerSesion,
} from "@/lib/session";

import {
  obtenerTrabajoDescarga,
} from "@/lib/firmas/trabajos-descarga";

export const runtime =
  "nodejs";

export async function GET(
  _request:
    Request,

  context: {
    params:
      Promise<{
        trabajoId:
          string;
      }>;
  }
) {
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

    const {
      trabajoId,
    } =
      await context.params;

    const trabajo =
      obtenerTrabajoDescarga(
        trabajoId
      );

    if (
      !trabajo ||
      trabajo.centroId !==
        sesion.centroId
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "No se ha encontrado la operación de descarga.",
        },
        {
          status: 404,
        }
      );
    }

    /*
     * El estado COMPLETADO significa que el ZIP está listo
     * para ser solicitado por /archivo.
     *
     * El propio endpoint /archivo elimina el ZIP del disco
     * en cuanto lo carga en memoria para la descarga.
     */
    return NextResponse.json({
      ok: true,

      trabajo: {
        id:
          trabajo.id,

        estado:
          trabajo.estado,

        total:
          trabajo.total,

        procesados:
          trabajo.procesados,

        porcentaje:
          trabajo.porcentaje,

        mensaje:
          trabajo.mensaje,

        error:
          trabajo.error,

        listo:
          trabajo.estado ===
          "COMPLETADO",
      },
    });
  } catch (
    error
  ) {
    console.error(
      "Error consultando progreso de descarga:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          "No se ha podido consultar el progreso.",
      },
      {
        status: 500,
      }
    );
  }
}
