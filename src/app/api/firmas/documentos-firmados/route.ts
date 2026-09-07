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

/*
 * =========================================================
 * GET /api/firmas/documentos-firmados
 * =========================================================
 *
 * Devuelve únicamente los documentos firmados cuyo PDF
 * todavía está físicamente disponible.
 *
 * La columna FECHA FIRMA de la pantalla utiliza la última
 * fecha de FirmaDocumento asociada al documento.
 *
 * Esto es importante en ANEXOS I con varios profesores:
 * el plazo de 6 meses del PDF se calcula desde la última
 * firma que completa/actualiza el documento.
 *
 * El CSV sigue existiendo en base de datos y en el propio
 * documento, pero NO se devuelve aquí porque ya no es
 * necesario mostrarlo en el buzón.
 */
export async function GET() {
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

    const documentos =
      await prisma.documentoFirma.findMany({
        where: {
          estado:
            "FIRMADO",

          /*
           * Si archivoFirmadoKey es NULL significa que:
           * - se eliminó manualmente;
           * - se eliminó al borrar el curso; o
           * - venció el plazo de 6 meses.
           *
           * En cualquiera de esos casos deja de aparecer
           * en DOCUMENTOS FIRMADOS, aunque la evidencia
           * siga conservándose.
           */
          archivoFirmadoKey: {
            not:
              null,
          },

          envioFirma: {
            centroId:
              sesion.centroId,
          },
        },

        orderBy: [
          {
            updatedAt:
              "desc",
          },
          {
            id:
              "desc",
          },
        ],

        select: {
          id:
            true,

          envioFirmaId:
            true,

          tipo:
            true,

          nombreArchivo:
            true,

          estado:
            true,

          anio:
            true,

          mes:
            true,

          updatedAt:
            true,

          pdfDisponibleHasta:
            true,

          firmas: {
            orderBy: {
              fechaFirma:
                "desc",
            },

            take:
              1,

            select: {
              fechaFirma:
                true,
            },
          },

          envioFirma: {
            select: {
              id:
                true,

              nombre:
                true,

              cursoAcademico: {
                select: {
                  id:
                    true,

                  nombre:
                    true,
                },
              },
            },
          },

          matricula: {
            select: {
              id:
                true,

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

                  dni:
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
        },
      });

    /*
     * No exponemos la relación firmas completa a la pantalla.
     * Solo enviamos la última fecha de firma, que es la fecha
     * sobre la que calculamos los 6 meses de disponibilidad.
     */
    const resultado =
      documentos.map(
        (
          documento
        ) => {
          const {
            firmas,
            ...resto
          } =
            documento;

          return {
            ...resto,

            fechaFirma:
              firmas[0]
                ?.fechaFirma ??
              null,
          };
        }
      );

    return NextResponse.json({
      ok: true,
      documentos:
        resultado,
    });
  } catch (
    error
  ) {
    console.error(
      "Error cargando documentos firmados:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          "No se han podido cargar los documentos firmados.",
      },
      {
        status: 500,
      }
    );
  }
}