import {
  readFile,
} from "node:fs/promises";

import path from "node:path";

import {
  NextResponse,
} from "next/server";

import {
  prisma,
} from "@/lib/prisma";

import {
  obtenerSesion,
} from "@/lib/session";

export const runtime =
  "nodejs";

export async function GET(
  _request: Request,
  context: {
    params:
      Promise<{
        id: string;
        documentoId:
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
      id:
        envioTexto,

      documentoId:
        documentoTexto,
    } =
      await context.params;

    const envioId =
      Number(
        envioTexto
      );

    const documentoId =
      Number(
        documentoTexto
      );

    if (
      !Number.isInteger(
        envioId
      ) ||
      envioId <= 0 ||
      !Number.isInteger(
        documentoId
      ) ||
      documentoId <= 0
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "La solicitud no es válida.",
        },
        {
          status: 400,
        }
      );
    }

    const documento =
      await prisma.documentoFirma.findFirst({
        where: {
          id:
            documentoId,

          envioFirmaId:
            envioId,

          envioFirma: {
            centroId:
              sesion.centroId,
          },
        },

        select: {
          id: true,
          nombreArchivo:
            true,

          archivoOriginalKey:
            true,

          archivoFirmadoKey:
            true,
        },
      });

    if (!documento) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "No se ha encontrado el documento.",
        },
        {
          status: 404,
        }
      );
    }

    /*
     * Desde el gestor mostramos siempre la versión
     * más avanzada disponible.
     */
    const archivoKey =
      documento.archivoFirmadoKey ??
      documento.archivoOriginalKey;

    if (!archivoKey) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "El PDF del documento no está disponible.",
        },
        {
          status: 404,
        }
      );
    }

    const key =
      archivoKey
        .replaceAll(
          "\\",
          "/"
        )
        .replace(
          /^\/+/,
          ""
        );

    if (
      !key.startsWith(
        "storage/firmas/"
      )
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "La ubicación del documento no es válida.",
        },
        {
          status: 500,
        }
      );
    }

    const raiz =
      path.resolve(
        process.cwd(),
        "storage",
        "firmas"
      );

    const ruta =
      path.resolve(
        process.cwd(),
        key
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
            "La ubicación física del documento no es válida.",
        },
        {
          status: 500,
        }
      );
    }

    let bytes:
      Buffer;

    try {
      bytes =
        await readFile(
          ruta
        );
    } catch {
      return NextResponse.json(
        {
          ok: false,
          error:
            "El archivo PDF no está disponible en el servidor.",
        },
        {
          status: 404,
        }
      );
    }

    const pdfBytes =
      Uint8Array.from(
        bytes
      );

    const nombreSeguro =
      documento.nombreArchivo
        .replace(
          /[\r\n"]/g,
          "_"
        );

    return new Response(
      pdfBytes,
      {
        status: 200,

        headers: {
          "Content-Type":
            "application/pdf",

          "Content-Disposition":
            `inline; filename="${nombreSeguro}"`,

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
      "Error mostrando PDF del envío:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          "No se ha podido mostrar el documento.",
      },
      {
        status: 500,
      }
    );
  }
}
