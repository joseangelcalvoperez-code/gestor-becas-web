import {
  NextResponse,
} from "next/server";

import {
  prisma,
} from "@/lib/prisma";

export const runtime =
  "nodejs";

type Context = {
  params:
    Promise<{
      csv:
        string;
    }>;
};

/*
 * =========================================================
 * GET /api/verificar/[csv]
 * =========================================================
 *
 * API PÚBLICA.
 *
 * No requiere sesión porque el CSV ya se encuentra impreso
 * en el propio documento firmado.
 *
 * Solo devolvemos la información necesaria para comprobar
 * la evidencia. NO exponemos:
 * - IP
 * - user-agent
 * - tokens de firma
 * - rutas físicas
 * - IDs internos
 * - correos electrónicos
 *
 * La existencia del PDF físico NO es necesaria para que la
 * evidencia continúe siendo consultable.
 */
export async function GET(
  _request:
    Request,

  context:
    Context
) {
  try {
    const {
      csv:
        csvParametro,
    } =
      await context.params;

    const csv =
      normalizarCsv(
        csvParametro
      );

    if (!csv) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "El código seguro de verificación no es válido.",
        },
        {
          status: 400,
        }
      );
    }

    const documento =
      await prisma.documentoFirma.findUnique({
        where: {
          csv,
        },

        select: {
          tipo:
            true,

          estado:
            true,

          nombreArchivo:
            true,

          /*
           * SNAPSHOT HISTÓRICO
           * ------------------
           * Estos datos sobreviven aunque se eliminen las
           * relaciones operativas del curso.
           */
          snapshotCentroNombre:
            true,

          snapshotCentroCodigo:
            true,

          snapshotCursoAcademicoNombre:
            true,

          snapshotAlumnoNombre:
            true,

          snapshotAlumnoApellidos:
            true,

          snapshotAlumnoDni:
            true,

          snapshotExpediente:
            true,

          snapshotGradoNombre:
            true,

          snapshotCursoAlumno:
            true,

          snapshotAsignaturaCodigo:
            true,

          snapshotAsignaturaNombre:
            true,

          snapshotCapturadoEn:
            true,

          hashFirmado:
            true,

          archivoFirmadoKey:
            true,

          pdfDisponibleHasta:
            true,

          pdfEliminadoEn:
            true,

          anio:
            true,

          mes:
            true,

          envioFirma: {
            select: {
              centro: {
                select: {
                  nombre:
                    true,

                  codigo:
                    true,
                },
              },

              cursoAcademico: {
                select: {
                  nombre:
                    true,
                },
              },
            },
          },

          matricula: {
            select: {
              expediente:
                true,

              curso:
                true,

              alumno: {
                select: {
                  nombre:
                    true,

                  apellidos:
                    true,
                },
              },

              grado: {
                select: {
                  nombre:
                    true,
                },
              },
            },
          },

          asignatura: {
            select: {
              codigo:
                true,

              nombre:
                true,
            },
          },

          firmas: {
            orderBy: {
              fechaFirma:
                "asc",
            },

            select: {
              fechaFirma:
                true,

              evidenciaDisponibleHasta:
                true,

              firmante: {
                select: {
                  nombre:
                    true,

                  apellidos:
                    true,

                  dni:
                    true,
                },
              },
            },
          },
        },
      });

    /*
     * Solo verificamos documentos que realmente tengan
     * alguna firma registrada y una huella final/actual.
     *
     * PARCIAL se admite porque un ANEXO I puede contener
     * varias firmas secuenciales antes de completarse.
     */
    if (
      !documento ||
      (
        documento.estado !==
          "FIRMADO" &&
        documento.estado !==
          "PARCIAL"
      ) ||
      !documento.hashFirmado ||
      documento.firmas.length ===
        0
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "No se ha encontrado una evidencia de firma disponible para este código.",
        },
        {
          status: 404,
        }
      );
    }

    const ahora =
      new Date();

    const firmas =
      documento.firmas.map(
        (
          firma
        ) => {
          /*
           * Compatibilidad con firmas realizadas antes de
           * incorporar el campo de retención:
           * si el valor es NULL calculamos 5 años desde
           * fechaFirma para mostrar el dato correctamente.
           */
          const evidenciaDisponibleHasta =
            firma
              .evidenciaDisponibleHasta ??
            sumarAnios(
              firma.fechaFirma,
              5
            );

          return {
            nombre:
              firma.firmante
                .nombre,

            apellidos:
              firma.firmante
                .apellidos,

            /*
             * La página es pública. Conservamos el DNI completo
             * en la evidencia interna, pero aquí mostramos una
             * versión parcialmente enmascarada.
             */
            dni:
              enmascararDocumentoIdentidad(
                firma.firmante
                  .dni
              ),

            fechaFirma:
              firma.fechaFirma,

            evidenciaDisponibleHasta,
          };
        }
      );

    const fechaUltimaFirma =
      documento.firmas[
        documento.firmas.length -
          1
      ].fechaFirma;

    const pdfDisponibleHasta =
      documento
        .pdfDisponibleHasta ??
      sumarMeses(
        fechaUltimaFirma,
        6
      );

    const pdfDisponible =
      Boolean(
        documento
          .archivoFirmadoKey
      ) &&
      !documento
        .pdfEliminadoEn &&
      pdfDisponibleHasta >
        ahora;

    const evidenciaActiva =
      firmas.some(
        (
          firma
        ) =>
          firma
            .evidenciaDisponibleHasta >
          ahora
      );

    return NextResponse.json({
      ok: true,

      evidencia: {
        csv,

        documento: {
          nombreArchivo:
            documento
              .nombreArchivo,

          tipo:
            documento.tipo,

          estado:
            documento.estado,

          anio:
            documento.anio,

          mes:
            documento.mes,

          hashFirmado:
            documento
              .hashFirmado,

          pdfDisponible,

          pdfDisponibleHasta,

          pdfEliminadoEn:
            documento
              .pdfEliminadoEn,
        },

        /*
         * Para documentos nuevos usamos primero el snapshot.
         *
         * Para documentos antiguos creados antes de esta mejora,
         * mantenemos compatibilidad utilizando las relaciones
         * actuales mientras todavía existan.
         */
        centro: {
          nombre:
            documento.snapshotCentroNombre ??
            documento.envioFirma.centro.nombre,

          codigo:
            documento.snapshotCentroCodigo ??
            documento.envioFirma.centro.codigo,
        },

        cursoAcademico:
          documento.snapshotCursoAcademicoNombre
            ? {
                nombre:
                  documento.snapshotCursoAcademicoNombre,
              }
            : documento.envioFirma.cursoAcademico,

        alumno:
          documento.snapshotAlumnoNombre ||
          documento.snapshotAlumnoApellidos ||
          documento.snapshotExpediente ||
          documento.snapshotGradoNombre
            ? {
                nombre:
                  documento.snapshotAlumnoNombre ??
                  "",

                apellidos:
                  documento.snapshotAlumnoApellidos ??
                  "",

                expediente:
                  documento.snapshotExpediente ??
                  "",

                grado:
                  documento.snapshotGradoNombre ??
                  "",

                curso:
                  documento.snapshotCursoAlumno,
              }
            : documento.matricula
              ? {
                  nombre:
                    documento.matricula.alumno.nombre,

                  apellidos:
                    documento.matricula.alumno.apellidos,

                  expediente:
                    documento.matricula.expediente,

                  grado:
                    documento.matricula.grado.nombre,

                  curso:
                    documento.matricula.curso,
                }
              : null,

        asignatura:
          documento.snapshotAsignaturaNombre ||
          documento.snapshotAsignaturaCodigo
            ? {
                codigo:
                  documento.snapshotAsignaturaCodigo ??
                  "",

                nombre:
                  documento.snapshotAsignaturaNombre ??
                  "",
              }
            : documento.asignatura,

        firmas,

        fechaUltimaFirma,

        evidenciaActiva,
      },
    });
  } catch (
    error
  ) {
    console.error(
      "Error verificando CSV:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          "No se ha podido consultar la evidencia de firma.",
      },
      {
        status: 500,
      }
    );
  }
}

function normalizarCsv(
  valor:
    string
) {
  try {
    return decodeURIComponent(
      valor
    )
      .trim()
      .toUpperCase()
      .replace(
        /\s+/g,
        ""
      );
  } catch {
    return valor
      .trim()
      .toUpperCase()
      .replace(
        /\s+/g,
        ""
      );
  }
}

function enmascararDocumentoIdentidad(
  valor:
    string
) {
  const limpio =
    String(
      valor ??
      ""
    )
      .trim()
      .toUpperCase();

  if (
    limpio.length <=
    4
  ) {
    return "****";
  }

  const visibles =
    limpio.slice(
      -4
    );

  return `${"*".repeat(
    Math.max(
      4,
      limpio.length -
        4
    )
  )}${visibles}`;
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
