import {
  rm,
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

type Context = {
  params:
    Promise<{
      documentoId:
        string;
    }>;
};

/*
 * =========================================================
 * DELETE
 * ELIMINAR ANTICIPADAMENTE EL PDF DE UN DOCUMENTO FIRMADO
 * =========================================================
 *
 * Esta operación funciona con la MISMA filosofía que el
 * borrado de PDF provocado al eliminar un curso:
 *
 * SÍ ELIMINA:
 * - archivo PDF original físico;
 * - archivo PDF firmado físico;
 * - archivoOriginalKey;
 * - archivoFirmadoKey.
 *
 * REGISTRA:
 * - pdfEliminadoEn;
 * - motivoEliminacionPdf = "ELIMINACION_MANUAL_CENTRO".
 *
 * NO ELIMINA:
 * - DocumentoFirma;
 * - EnvioFirma;
 * - FirmaDocumento;
 * - FirmanteEnvio;
 * - EventoFirma;
 * - RechazoDocumentoFirma;
 * - CSV;
 * - hashOriginal;
 * - hashFirmado;
 * - identidad declarada del firmante;
 * - DNI;
 * - fecha/hora;
 * - IP/user-agent que formen parte de la evidencia.
 *
 * Por tanto, eliminar el PDF antes de los 6 meses NO destruye
 * la evidencia de firma. Esa evidencia continúa su periodo
 * de conservación de 5 años.
 * =========================================================
 */
export async function DELETE(
  _request:
    Request,

  context:
    Context
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
      documentoId:
        documentoIdTexto,
    } =
      await context.params;

    const documentoId =
      Number(
        documentoIdTexto
      );

    if (
      !Number.isInteger(
        documentoId
      ) ||
      documentoId <=
        0
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "El documento no es válido.",
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

          estado:
            "FIRMADO",

          envioFirma: {
            centroId:
              sesion.centroId,
          },
        },

        select: {
          id:
            true,

          nombreArchivo:
            true,

          archivoOriginalKey:
            true,

          archivoFirmadoKey:
            true,

          pdfEliminadoEn:
            true,
        },
      });

    if (!documento) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "No se ha encontrado el documento firmado.",
        },
        {
          status: 404,
        }
      );
    }

    if (
      documento.pdfEliminadoEn ||
      (
        !documento
          .archivoOriginalKey &&
        !documento
          .archivoFirmadoKey
      )
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "El PDF de este documento ya no está disponible.",
        },
        {
          status: 409,
        }
      );
    }

    const claves =
      Array.from(
        new Set(
          [
            documento
              .archivoOriginalKey,

            documento
              .archivoFirmadoKey,
          ].filter(
            (
              valor
            ): valor is string =>
              Boolean(
                valor
              )
          )
        )
      );

    /*
     * Eliminamos los archivos físicos.
     *
     * force:true permite que la operación sea idempotente
     * si un archivo concreto ya hubiera desaparecido del disco.
     */
    for (
      const key of
        claves
    ) {
      const ruta =
        resolverRutaFirma(
          key
        );

      await rm(
        ruta,
        {
          force:
            true,
        }
      );
    }

    const ahora =
      new Date();

    /*
     * MUY IMPORTANTE:
     * únicamente quitamos las referencias a los PDF.
     *
     * El registro DocumentoFirma permanece porque contiene
     * parte esencial del histórico y mantiene sus hashes/CSV.
     */
    await prisma.documentoFirma.update({
      where: {
        id:
          documento.id,
      },

      data: {
        archivoOriginalKey:
          null,

        archivoFirmadoKey:
          null,

        pdfEliminadoEn:
          ahora,

        motivoEliminacionPdf:
          "ELIMINACION_MANUAL_CENTRO",
      },
    });

    return NextResponse.json({
      ok: true,

      mensaje:
        "El PDF se ha eliminado correctamente. La evidencia de firma se conserva durante 5 años.",

      documentoId:
        documento.id,

      pdfEliminadoEn:
        ahora,
    });
  } catch (
    error
  ) {
    console.error(
      "Error eliminando PDF firmado:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          "No se ha podido eliminar el PDF firmado.",
      },
      {
        status: 500,
      }
    );
  }
}

function resolverRutaFirma(
  key:
    string
) {
  const keyNormalizada =
    key
      .replaceAll(
        "\\",
        "/"
      )
      .replace(
        /^\/+/,
        ""
      );

  if (
    !keyNormalizada.startsWith(
      "storage/firmas/"
    )
  ) {
    throw new Error(
      `La ubicación del archivo no pertenece al almacenamiento de firmas: ${key}`
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
      keyNormalizada
    );

  if (
    ruta ===
      raiz ||
    !ruta.startsWith(
      `${raiz}${path.sep}`
    )
  ) {
    throw new Error(
      `La ubicación física del archivo de firma no es segura: ${key}`
    );
  }

  return ruta;
}