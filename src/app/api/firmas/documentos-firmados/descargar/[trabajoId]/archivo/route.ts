import {
  readFile,
  rm,
} from "node:fs/promises";

import path from "node:path";

import {
  NextResponse,
} from "next/server";

import {
  obtenerSesion,
} from "@/lib/session";

import {
  actualizarTrabajoDescarga,
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

    if (
      trabajo.estado !==
        "COMPLETADO" ||
      !trabajo.archivoZip
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "El archivo ZIP todavía no está disponible.",
        },
        {
          status: 409,
        }
      );
    }

    const raiz =
      path.resolve(
        process.cwd(),
        "storage",
        "firmas",
        "descargas-temp"
      );

    const ruta =
      path.resolve(
        trabajo.archivoZip
      );

    if (
      ruta !==
        raiz &&
      !ruta.startsWith(
        `${raiz}${path.sep}`
      )
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "La ubicación del ZIP no es válida.",
        },
        {
          status: 500,
        }
      );
    }

    const bytes =
      await readFile(
        ruta
      );

    const zipBytes =
      Uint8Array.from(
        bytes
      );

    /*
     * =======================================================
     * EL ZIP DEJA DE EXISTIR EN DISCO AQUÍ
     * =======================================================
     *
     * En este punto el ZIP ya está íntegramente cargado en
     * memoria (zipBytes). El archivo temporal del servidor ya
     * no es necesario para completar esta respuesta HTTP.
     *
     * Por tanto:
     * - se elimina inmediatamente del disco;
     * - NO entra en ningún periodo de retención;
     * - NO se conserva junto a los documentos firmados;
     * - NO ocupa almacenamiento después de iniciarse la descarga.
     *
     * Si el navegador aborta posteriormente la transferencia,
     * no conservamos una copia redundante: el usuario tendrá que
     * generar de nuevo la descarga masiva.
     */
    await rm(
      ruta,
      {
        force:
          true,
      }
    );

    actualizarTrabajoDescarga(
      trabajoId,
      {
        archivoZip:
          null,

        mensaje:
          "ZIP entregado para descarga y eliminado del almacenamiento temporal.",
      }
    );

    return new NextResponse(
      zipBytes,
      {
        status: 200,

        headers: {
          "Content-Type":
            "application/zip",

          "Content-Disposition":
            `attachment; filename="documentos_firmados_${trabajo.id.slice(
              0,
              8
            )}.zip"`,

          "Content-Length":
            String(
              zipBytes.byteLength
            ),

          "Cache-Control":
            "private, no-store, max-age=0",

          "X-Content-Type-Options":
            "nosniff",
        },
      }
    );
  } catch (
    error
  ) {
    console.error(
      "Error descargando ZIP:",
      error
    );

    const codigo =
      typeof error ===
        "object" &&
      error !==
        null &&
      "code" in
        error
        ? String(
            (
              error as {
                code?:
                  unknown;
              }
            ).code ??
              ""
          )
        : "";

    return NextResponse.json(
      {
        ok: false,
        error:
          codigo ===
          "ENOENT"
            ? "El ZIP temporal ya no está disponible. Genere de nuevo la descarga masiva."
            : "No se ha podido descargar el archivo ZIP.",
      },
      {
        status:
          codigo ===
          "ENOENT"
            ? 410
            : 500,
      }
    );
  }
}
