import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { obtenerSesion } from "@/lib/session";

type Context = {
  params: Promise<{
    id: string;
  }>;
};

/* =========================================================
   PUT
   EDITAR ALUMNO + MATRÍCULA
   ========================================================= */

export async function PUT(
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

    const matriculaId =
      Number(id);

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
            "La matrícula no es válida.",
        },
        {
          status: 400,
        }
      );
    }

    const matriculaActual =
      await prisma.matricula.findFirst({
        where: {
          id:
            matriculaId,

          centroId:
            sesion.centroId,
        },

        select: {
          id: true,
          alumnoId: true,
          cursoAcademicoId: true,
          activo: true,
        },
      });

    if (!matriculaActual) {
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

    const body =
      await request.json();

    const nombre =
      String(
        body.nombre ?? ""
      ).trim();

    const apellidos =
      String(
        body.apellidos ?? ""
      ).trim();

    const dni =
      String(
        body.dni ?? ""
      )
        .trim()
        .toUpperCase();

    const expediente =
      String(
        body.expediente ?? ""
      ).trim();

    const gradoId =
      Number(
        body.gradoId
      );

    const curso =
      Number(
        body.curso
      );

    if (
      !nombre ||
      !apellidos ||
      !dni
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Debe completar nombre, apellidos y DNI/NIE.",
        },
        {
          status: 400,
        }
      );
    }

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
            "Debe seleccionar un grado.",
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
            "El curso debe ser 1.º o 2.º.",
        },
        {
          status: 400,
        }
      );
    }

    /* =====================================================
       VALIDAR GRADO
       ===================================================== */

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
            "El grado seleccionado no es válido.",
        },
        {
          status: 404,
        }
      );
    }

    /* =====================================================
       DNI NO PUEDE PERTENECER A OTRA PERSONA
       ===================================================== */

    const otroAlumnoConDni =
      await prisma.alumno.findFirst({
        where: {
          centroId:
            sesion.centroId,

          dni,

          NOT: {
            id:
              matriculaActual.alumnoId,
          },
        },

        select: {
          id: true,
        },
      });

    if (
      otroAlumnoConDni
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Ya existe otro alumno con ese DNI/NIE.",
        },
        {
          status: 409,
        }
      );
    }

    /* =====================================================
       EXPEDIENTE DEL CURSO ACADÉMICO
       ===================================================== */

    if (
      expediente &&
      matriculaActual.activo
    ) {
      const expedienteDuplicado =
        await prisma.matricula.findFirst({
          where: {
            centroId:
              sesion.centroId,

            cursoAcademicoId:
              matriculaActual.cursoAcademicoId,

            activo:
              true,

            expediente,

            NOT: {
              id:
                matriculaId,
            },
          },

          select: {
            id: true,
          },
        });

      if (
        expedienteDuplicado
      ) {
        return NextResponse.json(
          {
            ok: false,
            error:
              `El expediente "${expediente}" ya está asignado a otra matrícula activa en este curso académico. Introduzca un número diferente.`,          },
          {
            status: 409,
          }
        );
      }
    }

    /* =====================================================
       ACTUALIZACIÓN ATÓMICA
       ===================================================== */

    const resultado =
      await prisma.$transaction(
        async (
          tx
        ) => {
          await tx.alumno.update({
            where: {
              id:
                matriculaActual.alumnoId,
            },

            data: {
              nombre,
              apellidos,
              dni,
            },
          });

          return tx.matricula.update({
            where: {
              id:
                matriculaId,
            },

            data: {
              gradoId,
              curso,
              expediente,
            },

            select: {
              id: true,

              curso: true,
              expediente: true,
              activo: true,

              gradoId: true,
              cursoAcademicoId: true,

              alumno: {
                select: {
                  id: true,
                  nombre: true,
                  apellidos: true,
                  dni: true,
                },
              },

              grado: {
                select: {
                  id: true,
                  nombre: true,
                },
              },

              cursoAcademico: {
                select: {
                  id: true,
                  nombre: true,
                },
              },
            },
          });
        }
      );

    return NextResponse.json({
      ok: true,

      matricula:
        resultado,

      mensaje:
        "Alumno actualizado correctamente.",
    });
  } catch (error) {
    console.error(
      "Error actualizando alumno/matrícula:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          "No se ha podido actualizar el alumno.",
      },
      {
        status: 500,
      }
    );
  }
}

/* =========================================================
   DELETE
   BAJA DE LA MATRÍCULA
   ========================================================= */

export async function DELETE(
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

    const matriculaId =
      Number(id);

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
            "La matrícula no es válida.",
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

          activo:
            true,
        },

        select: {
          id: true,

          alumno: {
            select: {
              nombre: true,
              apellidos: true,
            },
          },
        },
      });

    if (!matricula) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "No se ha encontrado la matrícula activa.",
        },
        {
          status: 404,
        }
      );
    }

    await prisma.matricula.update({
      where: {
        id:
          matricula.id,
      },

      data: {
        activo:
          false,
      },
    });

    return NextResponse.json({
      ok: true,

      mensaje:
        "Matrícula dada de baja correctamente.",
    });
  } catch (error) {
    console.error(
      "Error dando de baja matrícula:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          "No se ha podido dar de baja la matrícula.",
      },
      {
        status: 500,
      }
    );
  }
}

/* =========================================================
   PATCH
   REACTIVAR MATRÍCULA
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

    const matriculaId =
      Number(id);

    const matricula =
      await prisma.matricula.findFirst({
        where: {
          id:
            matriculaId,

          centroId:
            sesion.centroId,

          activo:
            false,
        },

        select: {
          id: true,
          expediente: true,
          gradoId: true,
          cursoAcademicoId: true,

          alumno: {
            select: {
              id: true,
              dni: true,
            },
          },

          grado: {
            select: {
              activo: true,
            },
          },

          cursoAcademico: {
            select: {
              activo: true,
            },
          },
        },
      });

    if (!matricula) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "No se ha encontrado la matrícula inactiva.",
        },
        {
          status: 404,
        }
      );
    }

    if (
      !matricula.cursoAcademico.activo
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "No se puede reactivar una matrícula de un curso académico inactivo.",
        },
        {
          status: 409,
        }
      );
    }

    if (
      !matricula.grado.activo
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "No se puede reactivar porque el grado ya no está activo.",
        },
        {
          status: 409,
        }
      );
    }

    if (
      matricula.expediente
    ) {
      const duplicado =
        await prisma.matricula.findFirst({
          where: {
            centroId:
              sesion.centroId,

            cursoAcademicoId:
              matricula.cursoAcademicoId,

            expediente:
              matricula.expediente,

            activo:
              true,

            NOT: {
              id:
                matricula.id,
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
              "No se puede reactivar porque ya existe otra matrícula activa con ese expediente.",
          },
          {
            status: 409,
          }
        );
      }
    }

    await prisma.$transaction([
      prisma.alumno.update({
        where: {
          id:
            matricula.alumno.id,
        },

        data: {
          activo:
            true,
        },
      }),

      prisma.matricula.update({
        where: {
          id:
            matricula.id,
        },

        data: {
          activo:
            true,
        },
      }),
    ]);

    return NextResponse.json({
      ok: true,

      mensaje:
        "Matrícula reactivada correctamente.",
    });
  } catch (error) {
    console.error(
      "Error reactivando matrícula:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          "No se ha podido reactivar la matrícula.",
      },
      {
        status: 500,
      }
    );
  }
}