import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { obtenerSesion } from "@/lib/session";

/* =========================================================
   GET
   LISTAR ASIGNATURAS DE UN GRADO Y CURSO
   ========================================================= */

export async function GET(
  request: Request
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

    const url =
      new URL(
        request.url
      );

    const gradoId =
      Number(
        url.searchParams.get(
          "gradoId"
        )
      );

    const curso =
      Number(
        url.searchParams.get(
          "curso"
        )
      );

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

    if (
      curso !== 1 &&
      curso !== 2
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "El curso no es válido.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Comprobamos primero que el grado
     * pertenece al centro autenticado.
     */

    const grado =
      await prisma.grado.findFirst({
        where: {
          id: gradoId,
          centroId:
            sesion.centroId,
          activo: true,
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

    const asignaturas =
      await prisma.asignatura.findMany({
        where: {
          centroId:
            sesion.centroId,

          gradoId,

          curso,
        },

        orderBy: [
          {
            codigo: "asc",
          },
          {
            nombre: "asc",
          },
        ],

        select: {
          id: true,
          codigo: true,
          nombre: true,
          curso: true,

          profesor: {
            select: {
              id: true,
              nombre: true,
              apellidos: true,
              dni: true,
            },
          },
        },
      });

    return NextResponse.json({
      ok: true,
      asignaturas,
    });
  } catch (error) {
    console.error(
      "Error cargando asignaturas:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          "No se han podido cargar las asignaturas.",
      },
      {
        status: 500,
      }
    );
  }
}

/* =========================================================
   POST
   CREAR ASIGNATURA
   ========================================================= */

export async function POST(
  request: Request
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

    const body =
      await request.json();

    const gradoId =
      Number(
        body.gradoId
      );

    const curso =
      Number(
        body.curso
      );

    const codigo =
      String(
        body.codigo ?? ""
      ).trim();

    const nombre =
      String(
        body.nombre ?? ""
      ).trim();

    const modoProfesor =
      String(
        body.modoProfesor ??
          ""
      );

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

    if (
      curso !== 1 &&
      curso !== 2
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "El curso no es válido.",
        },
        {
          status: 400,
        }
      );
    }

    if (!nombre) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Debe introducir el nombre de la asignatura.",
        },
        {
          status: 400,
        }
      );
    }

    const grado =
      await prisma.grado.findFirst({
        where: {
          id: gradoId,

          centroId:
            sesion.centroId,

          activo: true,
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

    const asignaturaExistente =
      await prisma.asignatura.findFirst({
        where: {
          centroId:
            sesion.centroId,

          gradoId,

          curso,

          nombre,
        },

        select: {
          id: true,
        },
      });

    if (
      asignaturaExistente
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Ya existe una asignatura con ese nombre en este curso.",
        },
        {
          status: 409,
        }
      );
    }

    let profesorId:
      number;

    /* =====================================================
       PROFESOR EXISTENTE
       ===================================================== */

    if (
      modoProfesor ===
      "existente"
    ) {
      profesorId =
        Number(
          body.profesorId
        );

      if (
        !Number.isInteger(
          profesorId
        ) ||
        profesorId <= 0
      ) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "Debe seleccionar un profesor.",
          },
          {
            status: 400,
          }
        );
      }

      const profesor =
        await prisma.profesor.findFirst({
          where: {
            id: profesorId,

            centroId:
              sesion.centroId,

            activo: true,
          },

          select: {
            id: true,
          },
        });

      if (!profesor) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "El profesor seleccionado no es válido.",
          },
          {
            status: 404,
          }
        );
      }
    }

    /* =====================================================
       PROFESOR NUEVO
       ===================================================== */

    else if (
      modoProfesor ===
      "nuevo"
    ) {
      const profesorNombre =
        String(
          body.profesorNombre ??
            ""
        ).trim();

      const profesorApellidos =
        String(
          body.profesorApellidos ??
            ""
        ).trim();

      const profesorDni =
        String(
          body.profesorDni ??
            ""
        )
          .trim()
          .toUpperCase();

      if (
        !profesorNombre ||
        !profesorApellidos ||
        !profesorDni
      ) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "Debe completar nombre, apellidos y DNI/NIE del nuevo profesor.",
          },
          {
            status: 400,
          }
        );
      }

      const profesorExistente =
        await prisma.profesor.findFirst({
          where: {
            centroId:
              sesion.centroId,

            dni:
              profesorDni,
          },

          select: {
            id: true,
            activo: true,
          },
        });

      if (
        profesorExistente
      ) {
        if (
          !profesorExistente.activo
        ) {
          const recuperado =
            await prisma.profesor.update({
              where: {
                id:
                  profesorExistente.id,
              },

              data: {
                nombre:
                  profesorNombre,

                apellidos:
                  profesorApellidos,

                activo:
                  true,
              },

              select: {
                id: true,
              },
            });

          profesorId =
            recuperado.id;
        } else {
          return NextResponse.json(
            {
              ok: false,
              error:
                "Ya existe un profesor con ese DNI/NIE. Selecciónelo como profesor existente.",
            },
            {
              status: 409,
            }
          );
        }
      } else {
        const profesor =
          await prisma.profesor.create({
            data: {
              centroId:
                sesion.centroId,

              nombre:
                profesorNombre,

              apellidos:
                profesorApellidos,

              dni:
                profesorDni,

              activo:
                true,
            },

            select: {
              id: true,
            },
          });

        profesorId =
          profesor.id;
      }
    } else {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Debe seleccionar el tipo de profesor.",
        },
        {
          status: 400,
        }
      );
    }

    const asignatura =
      await prisma.asignatura.create({
        data: {
          centroId:
            sesion.centroId,

          gradoId,

          profesorId,

          curso,

          codigo,

          nombre,
        },

        select: {
          id: true,
          codigo: true,
          nombre: true,
          curso: true,

          profesor: {
            select: {
              id: true,
              nombre: true,
              apellidos: true,
              dni: true,
            },
          },
        },
      });

    return NextResponse.json(
      {
        ok: true,

        asignatura,

        mensaje:
          "Asignatura creada correctamente.",
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "Error creando asignatura:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          "No se ha podido crear la asignatura.",
      },
      {
        status: 500,
      }
    );
  }
}