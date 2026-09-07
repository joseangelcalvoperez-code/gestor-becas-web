import {
  rm,
} from "node:fs/promises";

import path from "node:path";

import {
  prisma,
} from "@/lib/prisma";

export interface ResultadoLimpiezaPdf {
  documentosRevisados:
    number;

  documentosEliminados:
    number;

  archivosEliminados:
    number;

  errores:
    {
      documentoId:
        number;

      mensaje:
        string;
    }[];
}

/*
 * =========================================================
 * LIMPIEZA DE PDF CON PLAZO DE 6 MESES CUMPLIDO
 * =========================================================
 *
 * ESTA FUNCIÓN SOLO ELIMINA LOS ARCHIVOS FÍSICOS.
 *
 * NO ELIMINA:
 * - DocumentoFirma
 * - FirmaDocumento
 * - FirmanteEnvio
 * - EnvioFirma
 * - EventoFirma
 * - RechazoDocumentoFirma
 * - CSV
 * - hashOriginal
 * - hashFirmado
 * - datos de identidad
 * - fechas de firma
 *
 * Por tanto, la evidencia continúa disponible durante
 * los 5 años definidos para cada FirmaDocumento.
 *
 * Al eliminar el PDF:
 *
 * archivoOriginalKey = null
 * archivoFirmadoKey  = null
 * pdfEliminadoEn     = fecha actual
 * motivoEliminacionPdf = "PLAZO_6_MESES"
 */
export async function limpiarPdfsExpirados(
  opciones?: {
    centroId?:
      number;

    ahora?:
      Date;
  }
): Promise<
  ResultadoLimpiezaPdf
> {
  const ahora =
    opciones?.ahora ??
    new Date();

  const documentos =
    await prisma.documentoFirma.findMany({
      where: {
        pdfEliminadoEn:
          null,

        pdfDisponibleHasta: {
          not:
            null,

          lte:
            ahora,
        },

        OR: [
          {
            archivoOriginalKey: {
              not:
                null,
            },
          },
          {
            archivoFirmadoKey: {
              not:
                null,
            },
          },
        ],

        ...(opciones?.centroId
          ? {
              envioFirma: {
                centroId:
                  opciones.centroId,
              },
            }
          : {}),
      },

      select: {
        id:
          true,

        archivoOriginalKey:
          true,

        archivoFirmadoKey:
          true,
      },
    });

  let documentosEliminados =
    0;

  let archivosEliminados =
    0;

  const errores:
    ResultadoLimpiezaPdf["errores"] =
    [];

  for (
    const documento of
      documentos
  ) {
    try {
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
       * Eliminamos primero todos los archivos físicos.
       *
       * rm(..., force:true) no falla si el fichero ya
       * no existe, lo que permite recuperar situaciones
       * antiguas donde la BD mantenga una ruta obsoleta.
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

        archivosEliminados +=
          1;
      }

      /*
       * Solo después de completar el borrado físico
       * quitamos las rutas de la base de datos.
       *
       * Los hashes y todas las evidencias permanecen.
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
            "PLAZO_6_MESES",
        },
      });

      documentosEliminados +=
        1;
    } catch (
      error
    ) {
      errores.push({
        documentoId:
          documento.id,

        mensaje:
          error instanceof
          Error
            ? error.message
            : "Error desconocido eliminando los PDF.",
      });

      console.error(
        `Error eliminando PDF vencido del documento ${documento.id}:`,
        error
      );
    }
  }

  return {
    documentosRevisados:
      documentos.length,

    documentosEliminados,

    archivosEliminados,

    errores,
  };
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
