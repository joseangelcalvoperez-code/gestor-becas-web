import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { obtenerSesion } from "@/lib/session";

/* =========================================================
   GET
   CARGAR ASIGNATURAS + CONVALIDACIONES DE UNA MATRÍCULA
   ========================================================= */

export async function GET(
  _request: Request,
  context: {
    params: Promise<{
      id: string;
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
      id: idTexto,
    } =
      await context.params;

    const matriculaId =
      Number(
        idTexto
      );

    if (
      !Number.isInteger(
        matriculaId
      ) ||
      matriculaId <= 0
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "La matrícula seleccionada no es válida.",
        },
        {
          status: 400,
        }
      );
    }

    const matricula =
      await prisma.matricula.findFirst({
        where: {
          id:
            matriculaId,

          centroId:
            sesion.centroId,
        },

        select: {
          id: true,
          gradoId: true,
          curso: true,

          alumno: {
            select: {
              nombre: true,
              apellidos: true,
            },
          },

          asignaturasConvalidadas: {
            select: {
              asignaturaId: true,
            },
          },
        },
      });

    if (!matricula) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "No se ha encontrado la matrícula.",
        },
        {
          status: 404,
        }
      );
    }

    const asignaturas =
      await prisma.asignatura.findMany({
        where: {
          centroId:
            sesion.centroId,

          gradoId:
            matricula.gradoId,

          curso:
            matricula.curso,
        },

        orderBy: [
          {
            codigo:
              "asc",
          },
          {
            nombre:
              "asc",
          },
        ],

        select: {
          id: true,
          codigo: true,
          nombre: true,
        },
      });

    return NextResponse.json({
      ok: true,

      matricula: {
        id:
          matricula.id,

        alumno:
          `${matricula.alumno.nombre} ${matricula.alumno.apellidos}`,
      },

      asignaturas,

      convalidadas:
        matricula
          .asignaturasConvalidadas
          .map(
            (
              item
            ) =>
              item.asignaturaId
          ),
    });
  } catch (error) {
    console.error(
      "Error cargando convalidaciones:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          "No se han podido cargar las convalidaciones.",
      },
      {
        status: 500,
      }
    );
  }
}

/* =========================================================
   PUT
   REEMPLAZAR CONVALIDACIONES DE UNA MATRÍCULA
   ========================================================= */

export async function PUT(
  request: Request,
  context: {
    params: Promise<{
      id: string;
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
      id: idTexto,
    } =
      await context.params;

    const matriculaId =
      Number(
        idTexto
      );

    if (
      !Number.isInteger(
        matriculaId
      ) ||
      matriculaId <= 0
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "La matrícula seleccionada no es válida.",
        },
        {
          status: 400,
        }
      );
    }

    const body =
      await request.json();

    const valores =
      Array.isArray(
        body.asignaturaIds
      )
        ? body.asignaturaIds
        : [];

const asignaturaIds: number[] =
  Array.from(
    new Set<number>(
      valores
        .map(
          (
            valor:
              unknown
          ) =>
            Number(
              valor
            )
        )
            .filter(
            (
                valor: number
            ) =>
                Number.isInteger(
                valor
                ) &&
                valor > 0
            )
                )
        );

    const matricula =
      await prisma.matricula.findFirst({
        where: {
          id:
            matriculaId,

          centroId:
            sesion.centroId,

          activo:
            true,
        },

        select: {
          id: true,
          gradoId: true,
          curso: true,
        },
      });

    if (!matricula) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "No se ha encontrado una matrícula activa.",
        },
        {
          status: 404,
        }
      );
    }

    /*
     * Comprobamos que todas las asignaturas marcadas
     * pertenecen realmente al grado/curso de la matrícula.
     */

    if (
      asignaturaIds.length >
      0
    ) {
      const asignaturasValidas =
        await prisma.asignatura.findMany({
          where: {
            id: {
              in:
                asignaturaIds,
            },

            centroId:
              sesion.centroId,

            gradoId:
              matricula.gradoId,

            curso:
              matricula.curso,
          },

          select: {
            id: true,
          },
        });

      if (
        asignaturasValidas.length !==
        asignaturaIds.length
      ) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "Una o varias asignaturas seleccionadas no corresponden al grado y curso de la matrícula.",
          },
          {
            status: 400,
          }
        );
      }
    }

    await prisma.$transaction(
      async (
        tx
      ) => {
        await tx
          .matriculaAsignaturaConvalidada
          .deleteMany({
            where: {
              matriculaId,
            },
          });

        if (
          asignaturaIds.length >
          0
        ) {
          await tx
            .matriculaAsignaturaConvalidada
            .createMany({
              data:
                asignaturaIds.map(
                  (
                    asignaturaId
                  ) => ({
                    matriculaId,
                    asignaturaId,
                  })
                ),
            });
        }
      }
    );

    return NextResponse.json({
      ok: true,

      mensaje:
        "Convalidaciones guardadas correctamente.",

      convalidadas:
        asignaturaIds,
    });
  } catch (error) {
    console.error(
      "Error guardando convalidaciones:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          "No se han podido guardar las convalidaciones.",
      },
      {
        status: 500,
      }
    );
  }
}