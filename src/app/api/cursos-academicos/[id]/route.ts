import {
  rm,
} from "node:fs/promises";

import path from "node:path";

import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { obtenerSesion } from "@/lib/session";

type Context = {
  params: Promise<{
    id: string;
  }>;
};

/* =========================================================
   PATCH
   MODIFICAR / MARCAR COMO ACTUAL
   ========================================================= */

export async function PATCH(
  request: Request,
  context: Context
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
      id,
    } =
      await context.params;

    const cursoId =
      Number(id);

    if (
      !Number.isInteger(
        cursoId
      ) ||
      cursoId <= 0
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "El curso académico no es válido.",
        },
        {
          status: 400,
        }
      );
    }

    const cursoExistente =
      await prisma.cursoAcademico.findFirst({
        where: {
          id:
            cursoId,

          centroId:
            sesion.centroId,
        },
      });

    if (
      !cursoExistente
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "No se ha encontrado el curso académico.",
        },
        {
          status: 404,
        }
      );
    }

    const body =
      await request.json();

    /* =====================================================
       MARCAR COMO CURSO ACTUAL
       ===================================================== */

    if (
      body.actual ===
      true
    ) {
      const curso =
        await prisma.$transaction(
          async (
            tx
          ) => {
            await tx.cursoAcademico.updateMany({
              where: {
                centroId:
                  sesion.centroId,

                actual:
                  true,
              },

              data: {
                actual:
                  false,
              },
            });

            return tx.cursoAcademico.update({
              where: {
                id:
                  cursoId,
              },

              data: {
                actual:
                  true,

                activo:
                  true,
              },
            });
          }
        );

      return NextResponse.json({
        ok: true,
        curso,
        mensaje:
          "Curso académico marcado como actual.",
      });
    }

    /* =====================================================
       MODIFICACIÓN NORMAL
       ===================================================== */

    const datos: {
      nombre?: string;
      fechaInicio?: Date;
      fechaFin?: Date;
      activo?: boolean;
    } = {};

    if (
      typeof body.nombre ===
      "string"
    ) {
      const nombre =
        body.nombre.trim();

      if (!nombre) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "El nombre del curso no puede estar vacío.",
          },
          {
            status: 400,
          }
        );
      }

      const duplicado =
        await prisma.cursoAcademico.findFirst({
          where: {
            centroId:
              sesion.centroId,

            nombre,

            NOT: {
              id:
                cursoId,
            },
          },

          select: {
            id: true,
          },
        });

      if (
        duplicado
      ) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "Ya existe otro curso académico con ese nombre.",
          },
          {
            status: 409,
          }
        );
      }

      datos.nombre =
        nombre;
    }

    if (
      body.fechaInicio
    ) {
      const fecha =
        new Date(
          `${body.fechaInicio}T00:00:00`
        );

      if (
        Number.isNaN(
          fecha.getTime()
        )
      ) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "La fecha de inicio no es válida.",
          },
          {
            status: 400,
          }
        );
      }

      datos.fechaInicio =
        fecha;
    }

    if (
      body.fechaFin
    ) {
      const fecha =
        new Date(
          `${body.fechaFin}T23:59:59`
        );

      if (
        Number.isNaN(
          fecha.getTime()
        )
      ) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "La fecha de fin no es válida.",
          },
          {
            status: 400,
          }
        );
      }

      datos.fechaFin =
        fecha;
    }

    const fechaInicioFinal =
      datos.fechaInicio ??
      cursoExistente.fechaInicio;

    const fechaFinFinal =
      datos.fechaFin ??
      cursoExistente.fechaFin;

    if (
      fechaFinFinal <=
      fechaInicioFinal
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "La fecha de fin debe ser posterior a la fecha de inicio.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      typeof body.activo ===
      "boolean"
    ) {
      if (
        body.activo ===
        false
      ) {
        if (
          cursoExistente.actual
        ) {
          return NextResponse.json(
            {
              ok: false,
              error:
                "No puede desactivar el curso actual. Marque primero otro curso como actual.",
            },
            {
              status: 400,
            }
          );
        }

        const otroCursoActualActivo =
          await prisma.cursoAcademico.findFirst({
            where: {
              centroId:
                sesion.centroId,

              id: {
                not:
                  cursoId,
              },

              actual:
                true,

              activo:
                true,
            },

            select: {
              id: true,
            },
          });

        if (
          !otroCursoActualActivo
        ) {
          return NextResponse.json(
            {
              ok: false,
              error:
                "No puede desactivar este curso. El centro debe disponer de otro curso académico activo y actual.",
            },
            {
              status: 400,
            }
          );
        }
      }

      datos.activo =
        body.activo;
    }

    const curso =
      await prisma.cursoAcademico.update({
        where: {
          id:
            cursoId,
        },

        data:
          datos,
      });

    return NextResponse.json({
      ok: true,
      curso,
      mensaje:
        "Curso académico actualizado correctamente.",
    });
  } catch (error) {
    console.error(
      "Error modificando curso académico:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          "No se ha podido modificar el curso académico.",
      },
      {
        status: 500,
      }
    );
  }
}

/* =========================================================
   DELETE
   ELIMINAR CURSO ACADÉMICO
   =========================================================

   COMPORTAMIENTO DE ESTA ELIMINACIÓN
   ----------------------------------

   1) Elimina los DATOS OPERATIVOS del curso:
      - CursoAcademico
      - Matrículas
      - Asistencias
      - AsistenciaDia
      - Convalidadas
      - relaciones operativas que dependan del curso

   2) NO elimina las EVIDENCIAS DE FIRMA.
      Aunque el curso desaparezca de la gestión, se conservan:
      - EnvioFirma
      - DocumentoFirma
      - FirmaDocumento
      - FirmanteEnvio
      - RechazoDocumentoFirma
      - EventoFirma
      - CSV
      - SHA-256
      - firmante
      - DNI
      - fecha/hora
      - trazabilidad

      Esto es posible porque EnvioFirma -> CursoAcademico usa
      onDelete: SetNull. Al borrar el curso, cursoAcademicoId
      pasa a NULL y el histórico de firma permanece.

   3) SÍ elimina los PDF físicos asociados al curso si el centro
      elimina el curso:
      - PDF originales
      - PDF firmados

      La evidencia permanece aunque los archivos ya no estén.

   4) La eliminación de los PDF se registra en DocumentoFirma:
      - pdfEliminadoEn
      - motivoEliminacionPdf = "ELIMINACION_CURSO"

   5) La evidencia debe conservarse hasta completar 5 años desde
      la firma. Este DELETE NO borra esa evidencia.

   6) Independientemente del borrado manual del curso, los PDF
      podrán eliminarse automáticamente al cumplir 6 meses desde
      la firma mediante el proceso de limpieza que añadiremos
      después.

   ========================================================= */

export async function DELETE(
  _request: Request,
  context: Context
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
      id,
    } =
      await context.params;

    const cursoId =
      Number(id);

    if (
      !Number.isInteger(
        cursoId
      ) ||
      cursoId <=
        0
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "El curso académico no es válido.",
        },
        {
          status: 400,
        }
      );
    }

    const curso =
      await prisma.cursoAcademico.findFirst({
        where: {
          id:
            cursoId,

          centroId:
            sesion.centroId,
        },

        select: {
          id: true,
          nombre: true,
          activo: true,
          actual: true,
        },
      });

    if (!curso) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "No se ha encontrado el curso académico.",
        },
        {
          status: 404,
        }
      );
    }

    if (
      curso.actual
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "No se puede eliminar el curso académico actual.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      curso.activo
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Debe desactivar el curso académico antes de poder eliminarlo.",
        },
        {
          status: 400,
        }
      );
    }

    const otroCursoActualActivo =
      await prisma.cursoAcademico.findFirst({
        where: {
          centroId:
            sesion.centroId,

          id: {
            not:
              cursoId,
          },

          actual:
            true,

          activo:
            true,
        },

        select: {
          id: true,
        },
      });

    if (
      !otroCursoActualActivo
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "No se puede eliminar este curso. El centro debe conservar otro curso académico activo y actual.",
        },
        {
          status: 400,
        }
      );
    }

    /* =====================================================
       LOCALIZAR DOCUMENTOS DE FIRMA DEL CURSO
       =====================================================

       Importante:
       estos registros NO se van a eliminar.

       Solo necesitamos localizar sus PDF para poder borrarlos
       físicamente y dejar constancia de que ya no están
       disponibles.
    */

    const documentosFirma =
      await prisma.documentoFirma.findMany({
        where: {
          envioFirma: {
            centroId:
              sesion.centroId,

            cursoAcademicoId:
              cursoId,
          },
        },

        select: {
          id: true,

          archivoOriginalKey:
            true,

          archivoFirmadoKey:
            true,
        },
      });

    const ahora =
      new Date();

    /* =====================================================
       PRIMERO BORRAMOS LOS PDF FÍSICOS
       =====================================================

       Si un archivo ya no existe, no consideramos que sea un
       error. Puede haberse eliminado previamente por haber
       cumplido su plazo de 6 meses.
    */

    let archivosEliminados =
      0;

    for (
      const documento of
        documentosFirma
    ) {
      const claves = [
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
      );

      for (
        const key of
          claves
      ) {
        const ruta =
          resolverRutaFirma(
            key
          );

        try {
          await rm(
            ruta,
            {
              force:
                true,
            }
          );

          archivosEliminados +=
            1;
        } catch (
          error
        ) {
          console.error(
            "No se ha podido eliminar un PDF del curso:",
            ruta,
            error
          );
        }
      }
    }

    /* =====================================================
       TRANSACCIÓN DE BASE DE DATOS
       =====================================================

       1. Dejamos constancia de que los PDF ya no están.
       2. Vaciamos las rutas físicas.
       3. Conservamos CSV, hashes y evidencias.
       4. Eliminamos el curso académico y sus datos operativos.

       EnvioFirma queda vivo y su cursoAcademicoId pasará a NULL
       por el SetNull definido en schema.prisma.
    */

    await prisma.$transaction(
      async (
        tx
      ) => {
        if (
          documentosFirma.length >
          0
        ) {
          await tx.documentoFirma.updateMany({
            where: {
              id: {
                in:
                  documentosFirma.map(
                    (
                      documento
                    ) =>
                      documento.id
                  ),
              },
            },

            data: {
              archivoOriginalKey:
                null,

              archivoFirmadoKey:
                null,

              pdfEliminadoEn:
                ahora,

              motivoEliminacionPdf:
                "ELIMINACION_CURSO",
            },
          });
        }

        await tx.cursoAcademico.delete({
          where: {
            id:
              cursoId,
          },
        });
      }
    );

    return NextResponse.json({
      ok: true,

      mensaje:
        `Curso académico ${curso.nombre} eliminado correctamente. Los datos operativos y los PDF asociados se han eliminado, pero las evidencias de firma se conservarán durante su periodo de retención.`,

      resumen: {
        documentosFirmaConservados:
          documentosFirma.length,

        archivosPdfEliminados:
          archivosEliminados,

        evidenciasFirmaEliminadas:
          0,
      },
    });
  } catch (
    error
  ) {
    console.error(
      "Error eliminando curso académico:",
      error
    );

    return NextResponse.json(
      {
        ok: false,

        error:
          "No se ha podido eliminar el curso académico.",
      },
      {
        status: 500,
      }
    );
  }
}

/* =========================================================
   FUNCIONES AUXILIARES
   ========================================================= */

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
