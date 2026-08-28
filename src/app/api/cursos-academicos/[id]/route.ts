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
   ELIMINAR CURSO ACADÉMICO Y TODOS SUS DATOS
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

    /*
     * El schema utiliza borrado en cascada:
     *
     * CursoAcademico
     *   -> Matricula
     *      -> Asistencia
     *         -> AsistenciaDia
     *      -> MatriculaAsignaturaConvalidada
     *
     * El registro base de Alumno NO se elimina.
     */

    await prisma.cursoAcademico.delete({
      where: {
        id:
          cursoId,
      },
    });

    return NextResponse.json({
      ok: true,
      mensaje:
        `Curso académico ${curso.nombre} y todos sus datos asociados eliminados correctamente.`,
    });
  } catch (error) {
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
