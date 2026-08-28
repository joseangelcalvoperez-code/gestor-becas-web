import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { obtenerSesion } from "@/lib/session";

/* =========================================================
   GET
   INFORMACIÓN PREVIA A LA ELIMINACIÓN DEL GRADO
   ========================================================= */

export async function GET(
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

    const { id } =
      await context.params;

    const gradoId =
      Number(id);

    if (
      !Number.isInteger(
        gradoId
      ) ||
      gradoId <= 0
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "El grado no es válido.",
        },
        {
          status: 400,
        }
      );
    }

    const grado =
      await prisma.grado.findFirst({
        where: {
          id:
            gradoId,

          centroId:
            sesion.centroId,

          activo:
            true,
        },

        select: {
          id: true,
          nombre: true,

          asignaturas: {
            select: {
              id: true,
              nombre: true,

              profesor: {
                select: {
                  id: true,
                  nombre: true,
                  apellidos: true,
                  dni: true,
                },
              },
            },

            orderBy: {
              nombre: "asc",
            },
          },
        },
      });

    if (!grado) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "No se ha encontrado el grado.",
        },
        {
          status: 404,
        }
      );
    }

    /*
     * Profesores distintos relacionados
     * con las asignaturas del grado.
     */

    const profesoresMap =
      new Map<
        number,
        {
          id: number;
          nombre: string;
          apellidos: string;
          dni: string;
        }
      >();

    for (
      const asignatura
      of grado.asignaturas
    ) {
      profesoresMap.set(
        asignatura.profesor.id,
        asignatura.profesor
      );
    }

    const profesores =
      Array.from(
        profesoresMap.values()
      );

    return NextResponse.json({
      ok: true,

      grado: {
        id:
          grado.id,

        nombre:
          grado.nombre,

        totalAsignaturas:
          grado.asignaturas.length,

        totalProfesores:
          profesores.length,

        asignaturas:
          grado.asignaturas.map(
            (
              asignatura
            ) => ({
              id:
                asignatura.id,

              nombre:
                asignatura.nombre,

              profesor:
                `${asignatura.profesor.nombre} ${asignatura.profesor.apellidos}`,
            })
          ),

        profesores,
      },
    });
  } catch (error) {
    console.error(
      "Error obteniendo información del grado:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          "No se ha podido obtener la información del grado.",
      },
      {
        status: 500,
      }
    );
  }
}

/* =========================================================
   DELETE
   ELIMINAR GRADO
   ========================================================= */

export async function DELETE(
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

    const { id } =
      await context.params;

    const gradoId =
      Number(id);

    if (
      !Number.isInteger(
        gradoId
      ) ||
      gradoId <= 0
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "El grado no es válido.",
        },
        {
          status: 400,
        }
      );
    }

    const grado =
      await prisma.grado.findFirst({
        where: {
          id:
            gradoId,

          centroId:
            sesion.centroId,

          activo:
            true,
        },

        select: {
          id: true,
        },
      });

    if (!grado) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "No se ha encontrado el grado.",
        },
        {
          status: 404,
        }
      );
    }

    await prisma.$transaction([
      prisma.asignatura.deleteMany({
        where: {
          gradoId:
            grado.id,

          centroId:
            sesion.centroId,
        },
      }),

      prisma.grado.update({
        where: {
          id:
            grado.id,
        },

        data: {
          activo:
            false,
        },
      }),
    ]);

    /*
     * IMPORTANTE:
     *
     * NO eliminamos profesores.
     * Aunque queden sin asignaturas,
     * se mantienen en el centro para
     * poder reutilizarlos más adelante.
     */

    return NextResponse.json({
      ok: true,

      mensaje:
        "Grado eliminado correctamente.",
    });
  } catch (error) {
    console.error(
      "Error eliminando grado:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          "No se ha podido eliminar el grado.",
      },
      {
        status: 500,
      }
    );
  }
}