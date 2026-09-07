import {
  mkdir,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";

import path from "node:path";

import {
  NextResponse,
} from "next/server";

import {
  prisma,
} from "@/lib/prisma";

import {
  prepararEstampacionDocumento,
} from "@/lib/firmas/estampar-pdf";

export const runtime =
  "nodejs";

type CopiaSeguridadArchivo = {
  ruta:
    string;

  existia:
    boolean;

  bytesAnteriores:
    Buffer | null;
};

export async function POST(
  request: Request,
  context: {
    params:
      Promise<{
        token: string;
      }>;
  }
) {
  const archivosTocados:
    CopiaSeguridadArchivo[] =
    [];

  try {
    const {
      token:
        tokenTexto,
    } =
      await context.params;

    const token =
      String(
        tokenTexto ??
          ""
      ).trim();

    if (!token) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "El enlace de firma no es válido.",
        },
        {
          status: 400,
        }
      );
    }

    const firmante =
      await prisma.firmanteEnvio.findUnique({
        where: {
          token,
        },

        select: {
          id: true,
          nombre: true,
          apellidos:
            true,
          dni: true,
          tipo: true,
          estado: true,
          fechaFirma:
            true,

          envioFirma: {
            select: {
              id: true,
              estado: true,

              firmantes: {
                select: {
                  id: true,
                  tipo: true,
                  estado: true,
                },
              },

              documentos: {
                select: {
                  id: true,
                  hashOriginal:
                    true,
                  hashFirmado:
                    true,
                  archivoOriginalKey:
                    true,
                  archivoFirmadoKey:
                    true,

                  firmas: {
                    select: {
                      id: true,
                      firmanteEnvioId:
                        true,
                    },
                  },

                  rechazos: {
                    select: {
                      id: true,
                      firmanteEnvioId:
                        true,
                    },
                  },
                },
              },
            },
          },
        },
      });

    if (!firmante) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "El enlace de firma no existe o ha dejado de ser válido.",
        },
        {
          status: 404,
        }
      );
    }

    if (
      firmante.fechaFirma
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Este proceso de firma ya fue finalizado.",
        },
        {
          status: 409,
        }
      );
    }

    if (
      firmante.envioFirma.estado ===
        "BORRADOR" ||
      firmante.envioFirma.estado ===
        "CANCELADO"
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Este envío no se encuentra disponible para firma.",
        },
        {
          status: 409,
        }
      );
    }

    if (
      firmante.tipo === "DIRECTOR" &&
      firmante.envioFirma.firmantes.some(
        (otro) => otro.tipo === "PROFESOR" && otro.estado !== "FIRMADO"
      )
    ) {
      return NextResponse.json(
        { ok: false, error: "La firma del director aún no está habilitada porque quedan profesores pendientes." },
        { status: 409 }
      );
    }

    const documentosDisponibles =
      firmante.envioFirma.documentos
        .filter(
          (
            documento
          ) =>
            Boolean(
              documento.archivoOriginalKey
            ) &&
            Boolean(
              documento.hashOriginal
            )
        );

    if (
      documentosDisponibles.length ===
      0
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "No hay documentos disponibles para firmar.",
        },
        {
          status: 409,
        }
      );
    }

    const rechazadosPorMi =
      documentosDisponibles.filter(
        (
          documento
        ) =>
          documento.rechazos.some(
            (
              rechazo
            ) =>
              rechazo.firmanteEnvioId ===
              firmante.id
          )
      );

    const bloqueadosPorOtros =
      documentosDisponibles.filter(
        (
          documento
        ) =>
          !documento.rechazos.some(
            (
              rechazo
            ) =>
              rechazo.firmanteEnvioId ===
              firmante.id
          ) &&
          documento.rechazos.some(
            (
              rechazo
            ) =>
              rechazo.firmanteEnvioId !==
              firmante.id
          )
      );

    /*
     * LÓGICA BASE:
     * todo documento se firma salvo que exista un rechazo.
     *
     * También descartamos documentos que este mismo
     * firmante ya hubiese firmado.
     */
    const paraFirmar =
      documentosDisponibles.filter(
        (
          documento
        ) =>
          documento.rechazos.length ===
            0 &&
          !documento.firmas.some(
            (
              firma
            ) =>
              firma.firmanteEnvioId ===
              firmante.id
          )
      );

    const ahora =
      new Date();

    /*
     * =======================================================
     * POLÍTICA DE CONSERVACIÓN
     * =======================================================
     *
     * PDF:
     * se mantiene disponible 6 meses desde la firma.
     *
     * EVIDENCIA:
     * cada evidencia individual se conserva 5 años desde
     * la fecha en la que ese firmante realizó la firma.
     *
     * En documentos con varios firmantes, cada nueva firma
     * vuelve a fijar pdfDisponibleHasta a 6 meses desde esa
     * última firma. De esta forma el PDF final completo queda
     * disponible durante 6 meses desde la última firma.
     */
    const pdfDisponibleHasta =
      sumarMeses(
        ahora,
        6
      );

    const evidenciaDisponibleHasta =
      sumarAnios(
        ahora,
        5
      );

    const ip =
      obtenerIp(
        request
      );

    const userAgent =
      request.headers.get(
        "user-agent"
      );

    /*
     * =======================================================
     * 1. PREPARAR LOS PDF FIRMADOS
     * =======================================================
     *
     * No tocamos la base de datos todavía.
     *
     * Cada documento:
     * - carga el PDF exacto almacenado;
     * - comprueba su SHA-256;
     * - añade la representación visible de la firma;
     * - genera el nuevo SHA-256.
     *
     * Si un Anexo I ya contiene firmas anteriores,
     * se usa ese PDF firmado como base y se acumula
     * la nueva firma.
     */
const estampaciones:
  Awaited<
    ReturnType<
      typeof prepararEstampacionDocumento
    >
  >[] =
  [];

    for (
      const documento of
        paraFirmar
    ) {
      const estampacion =
        await prepararEstampacionDocumento(
          documento.id,
          firmante.id,
          ahora
        );

      estampaciones.push(
        estampacion
      );
    }

    /*
     * =======================================================
     * 2. ESCRIBIR LOS PDF EN STORAGE
     * =======================================================
     *
     * Guardamos una copia en memoria de cualquier PDF
     * firmado anterior para poder restaurarlo si después
     * falla la transacción de base de datos.
     */
    for (
      const estampacion of
        estampaciones
    ) {
      await mkdir(
        path.dirname(
          estampacion.rutaDestino
        ),
        {
          recursive:
            true,
        }
      );

      let bytesAnteriores:
        Buffer | null =
        null;

      let existia =
        false;

      try {
        bytesAnteriores =
          await readFile(
            estampacion.rutaDestino
          );

        existia =
          true;
      } catch {
        // Todavía no existía un PDF firmado.
      }

      archivosTocados.push({
        ruta:
          estampacion.rutaDestino,

        existia,

        bytesAnteriores,
      });

      await writeFile(
        estampacion.rutaDestino,
        estampacion.bytesFirmados
      );
    }

    /*
     * =======================================================
     * 3. REGISTRAR EVIDENCIAS Y ESTADOS
     * =======================================================
     */
    const resultado =
      await prisma.$transaction(
        async (
          tx
        ) => {
          for (
            const estampacion of
              estampaciones
          ) {
            /*
             * hashDocumento = huella de la versión exacta
             * que este firmante aceptó antes de añadir
             * su representación visible.
             */
            await tx.firmaDocumento.upsert({
              where: {
                documentoFirmaId_firmanteEnvioId: {
                  documentoFirmaId:
                    estampacion.documentoId,

                  firmanteEnvioId:
                    firmante.id,
                },
              },

              update: {
                fechaFirma:
                  ahora,

                ip,

                userAgent,

                hashDocumento:
                  estampacion.hashBase,

                evidenciaDisponibleHasta,
              },

              create: {
                documentoFirmaId:
                  estampacion.documentoId,

                firmanteEnvioId:
                  firmante.id,

                fechaFirma:
                  ahora,

                ip,

                userAgent,

                hashDocumento:
                  estampacion.hashBase,

                evidenciaDisponibleHasta,
              },
            });

            await tx.documentoFirma.update({
              where: {
                id:
                  estampacion.documentoId,
              },

              data: {
                archivoFirmadoKey:
                  estampacion.archivoFirmadoKey,

                hashFirmado:
                  estampacion.hashFirmado,

                /*
                 * El PDF queda disponible durante 6 meses
                 * desde esta firma.
                 *
                 * Si es un ANEXO I con varios profesores,
                 * una firma posterior actualizará de nuevo
                 * esta fecha, quedando finalmente 6 meses
                 * desde la última firma.
                 */
                pdfDisponibleHasta,

                /*
                 * Si el documento hubiera tenido información
                 * de una eliminación anterior durante pruebas,
                 * una nueva versión firmada vuelve a dejarlo
                 * disponible.
                 */
                pdfEliminadoEn:
                  null,

                motivoEliminacionPdf:
                  null,
              },
            });

            await tx.eventoFirma.create({
              data: {
                envioFirmaId:
                  firmante.envioFirma.id,

                tipo:
                  "DOCUMENTO_FIRMADO",

                descripcion:
                  `Documento ${estampacion.documentoId} firmado electrónicamente por ${firmante.nombre} ${firmante.apellidos}. PDF firmado generado con SHA-256 ${estampacion.hashFirmado}.`,

                ip,
              },
            });
          }

          /*
           * Recalculamos el estado de TODOS los documentos
           * después de incorporar esta firma.
           */
          const documentos =
            await tx.documentoFirma.findMany({
              where: {
                envioFirmaId:
                  firmante.envioFirma.id,
              },

              select: {
                id: true,

                _count: {
                  select: {
                    firmas:
                      true,

                    rechazos:
                      true,
                  },
                },
              },
            });

          const totalFirmantes =
            firmante.envioFirma
              .firmantes.length;

          for (
            const documento of
              documentos
          ) {
            let estado:
              "PENDIENTE" |
              "PARCIAL" |
              "FIRMADO" |
              "RECHAZADO";

            if (
              documento._count
                .rechazos >
              0
            ) {
              estado =
                "RECHAZADO";
            } else if (
              documento._count
                .firmas >=
              totalFirmantes
            ) {
              estado =
                "FIRMADO";
            } else if (
              documento._count
                .firmas >
              0
            ) {
              estado =
                "PARCIAL";
            } else {
              estado =
                "PENDIENTE";
            }

            await tx.documentoFirma.update({
              where: {
                id:
                  documento.id,
              },

              data: {
                estado,
              },
            });
          }

          const totalRechazados =
            rechazadosPorMi.length;

          const totalFirmados =
            estampaciones.length;

          const estadoFirmante =
            bloqueadosPorOtros.length >
              0
              ? "PARCIAL"
              : totalFirmados >
                    0 &&
                  totalRechazados >
                    0
                ? "PARCIAL"
                : totalFirmados >
                      0 &&
                    totalRechazados ===
                      0
                  ? "FIRMADO"
                  : totalFirmados ===
                        0 &&
                      totalRechazados >
                        0
                    ? "RECHAZADO"
                    : "PARCIAL";

          await tx.firmanteEnvio.update({
            where: {
              id:
                firmante.id,
            },

            data: {
              estado:
                estadoFirmante,

              fechaFirma:
                ahora,
            },
          });

          const documentosFinales =
            await tx.documentoFirma.findMany({
              where: {
                envioFirmaId:
                  firmante.envioFirma.id,
              },

              select: {
                estado: true,
              },
            });

          const todosFirmados =
            documentosFinales.length >
              0 &&
            documentosFinales.every(
              (
                documento
              ) =>
                documento.estado ===
                "FIRMADO"
            );

          const hayActividad =
            documentosFinales.some(
              (
                documento
              ) =>
                documento.estado !==
                "PENDIENTE"
            );

          await tx.envioFirma.update({
            where: {
              id:
                firmante.envioFirma.id,
            },

            data: {
              estado:
                todosFirmados
                  ? "COMPLETADO"
                  : hayActividad
                    ? "PARCIAL"
                    : "PENDIENTE",
            },
          });

          await tx.eventoFirma.create({
            data: {
              envioFirmaId:
                firmante.envioFirma.id,

              tipo:
                "LOTE_PROCESADO",

              descripcion:
                `Proceso finalizado por ${firmante.nombre} ${firmante.apellidos}: ${totalFirmados} documento${totalFirmados === 1 ? "" : "s"} firmado${totalFirmados === 1 ? "" : "s"}, ${totalRechazados} rechazado${totalRechazados === 1 ? "" : "s"}${bloqueadosPorOtros.length > 0 ? ` y ${bloqueadosPorOtros.length} bloqueado${bloqueadosPorOtros.length === 1 ? "" : "s"} por rechazo de otro firmante` : ""}.`,

              ip,
            },
          });

          if (
            todosFirmados
          ) {
            await tx.eventoFirma.create({
              data: {
                envioFirmaId:
                  firmante.envioFirma.id,

                tipo:
                  "ENVIO_COMPLETADO",

                descripcion:
                  "Todos los documentos y firmantes requeridos han completado correctamente el proceso de firma.",

                ip,
              },
            });
          }

          return {
            totalFirmados,

            totalRechazados,

            totalBloqueados:
              bloqueadosPorOtros.length,

            estadoFirmante,
          };
        }
      );

    return NextResponse.json({
      ok: true,

      ...resultado,

      fecha:
        ahora,
    });
  } catch (
    error
  ) {
    /*
     * Si algo falla después de haber escrito los PDF,
     * restauramos los archivos a su estado anterior.
     *
     * Así evitamos:
     * PDF firmado físicamente
     * +
     * base de datos sin registrar la firma.
     */
    for (
      const archivo of
        archivosTocados
          .reverse()
    ) {
      try {
        if (
          archivo.existia &&
          archivo.bytesAnteriores
        ) {
          await writeFile(
            archivo.ruta,
            archivo.bytesAnteriores
          );
        } else {
          await rm(
            archivo.ruta,
            {
              force:
                true,
            }
          );
        }
      } catch (
        errorRestauracion
      ) {
        console.error(
          "No se ha podido restaurar un PDF tras fallar la firma:",
          errorRestauracion
        );
      }
    }

    console.error(
      "Error finalizando firma y estampando PDF:",
      error
    );

    return NextResponse.json(
      {
        ok: false,

        error:
          error instanceof
          Error
            ? error.message
            : "No se ha podido completar el proceso de firma.",
      },
      {
        status: 500,
      }
    );
  }
}

function sumarMeses(
  fecha:
    Date,

  meses:
    number
) {
  const resultado =
    new Date(
      fecha
    );

  resultado.setMonth(
    resultado.getMonth() +
      meses
  );

  return resultado;
}

function sumarAnios(
  fecha:
    Date,

  anios:
    number
) {
  const resultado =
    new Date(
      fecha
    );

  resultado.setFullYear(
    resultado.getFullYear() +
      anios
  );

  return resultado;
}

function obtenerIp(
  request: Request
) {
  const forwarded =
    request.headers.get(
      "x-forwarded-for"
    );

  if (forwarded) {
    return (
      forwarded
        .split(",")[0]
        ?.trim() ??
      null
    );
  }

  return (
    request.headers.get(
      "x-real-ip"
    ) ??
    null
  );
}
