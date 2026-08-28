import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { obtenerSesion } from "@/lib/session";

/* =========================================================
   GET
   LISTAR CURSOS ACADÉMICOS DEL CENTRO
   ========================================================= */

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

    const cursos =
      await prisma.cursoAcademico.findMany({
        where: {
          centroId:
            sesion.centroId,
        },

        orderBy: {
          fechaInicio:
            "desc",
        },
      });

    return NextResponse.json({
      ok: true,
      cursos,
    });
  } catch (error) {
    console.error(
      "Error obteniendo cursos académicos:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          "No se han podido obtener los cursos académicos.",
      },
      {
        status: 500,
      }
    );
  }
}

/* =========================================================
   POST
   CREAR CURSO ACADÉMICO
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

    const nombre =
      String(
        body.nombre ?? ""
      ).trim();

    const fechaInicioTexto =
      String(
        body.fechaInicio ?? ""
      );

    const fechaFinTexto =
      String(
        body.fechaFin ?? ""
      );

    const actual =
      Boolean(
        body.actual
      );

    if (
      !nombre ||
      !fechaInicioTexto ||
      !fechaFinTexto
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Debe completar todos los datos del curso académico.",
        },
        {
          status: 400,
        }
      );
    }

    const fechaInicio =
      new Date(
        `${fechaInicioTexto}T00:00:00`
      );

    const fechaFin =
      new Date(
        `${fechaFinTexto}T23:59:59`
      );

    if (
      Number.isNaN(
        fechaInicio.getTime()
      ) ||
      Number.isNaN(
        fechaFin.getTime()
      )
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Las fechas no son válidas.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      fechaFin <=
      fechaInicio
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

    const existente =
      await prisma.cursoAcademico.findFirst({
        where: {
          centroId:
            sesion.centroId,

          nombre,
        },

        select: {
          id: true,
        },
      });

    if (existente) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Ya existe un curso académico con ese nombre.",
        },
        {
          status: 409,
        }
      );
    }

    const numeroCursos =
      await prisma.cursoAcademico.count({
        where: {
          centroId:
            sesion.centroId,
        },
      });

    /*
     * El primer curso siempre queda
     * marcado como curso actual.
     */

    const debeSerActual =
      numeroCursos === 0
        ? true
        : actual;

    const curso =
      await prisma.$transaction(
        async (
          tx
        ) => {
          if (
            debeSerActual
          ) {
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
          }

          return tx.cursoAcademico.create({
            data: {
              centroId:
                sesion.centroId,

              nombre,

              fechaInicio,
              fechaFin,

              activo:
                true,

              actual:
                debeSerActual,
            },
          });
        }
      );

    return NextResponse.json(
      {
        ok: true,
        curso,
        mensaje:
          "Curso académico creado correctamente.",
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "Error creando curso académico:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          "No se ha podido crear el curso académico.",
      },
      {
        status: 500,
      }
    );
  }
}