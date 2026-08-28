import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { obtenerSesion } from "@/lib/session";

/* =========================================================
   GET
   LISTAR MATRÍCULAS DEL CURSO ACADÉMICO SELECCIONADO
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

    const cursoAcademicoId =
      Number(
        url.searchParams.get(
          "cursoAcademicoId"
        )
      );

    const busqueda =
      String(
        url.searchParams.get(
          "q"
        ) ?? ""
      ).trim();

    const estado =
      String(
        url.searchParams.get(
          "estado"
        ) ?? "activos"
      );

    const gradoIdTexto =
      url.searchParams.get(
        "gradoId"
      );

    const cursoTexto =
      url.searchParams.get(
        "curso"
      );

    const gradoId =
      gradoIdTexto
        ? Number(
            gradoIdTexto
          )
        : null;

    const curso =
      cursoTexto
        ? Number(
            cursoTexto
          )
        : null;

    /* =====================================================
       VALIDAR CURSO ACADÉMICO
       ===================================================== */

    if (
      !Number.isInteger(
        cursoAcademicoId
      ) ||
      cursoAcademicoId <= 0
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Debe seleccionar un curso académico.",
        },
        {
          status: 400,
        }
      );
    }

    const cursoAcademico =
      await prisma.cursoAcademico.findFirst({
        where: {
          id:
            cursoAcademicoId,

          centroId:
            sesion.centroId,
        },

        select: {
          id: true,
          nombre: true,
        },
      });

    if (!cursoAcademico) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "El curso académico seleccionado no es válido.",
        },
        {
          status: 404,
        }
      );
    }

    /* =====================================================
       ESTADO MATRÍCULA
       ===================================================== */

    let activo:
      boolean | undefined;

    if (
      estado ===
      "activos"
    ) {
      activo = true;
    } else if (
      estado ===
      "inactivos"
    ) {
      activo = false;
    }

    /* =====================================================
       CONSULTA
       ===================================================== */

    const matriculas =
      await prisma.matricula.findMany({
        where: {
          centroId:
            sesion.centroId,

          cursoAcademicoId,

          ...(activo !==
          undefined
            ? {
                activo,
              }
            : {}),

          ...(gradoId &&
          Number.isInteger(
            gradoId
          )
            ? {
                gradoId,
              }
            : {}),

          ...(curso === 1 ||
          curso === 2
            ? {
                curso,
              }
            : {}),

          ...(busqueda
            ? {
                OR: [
                  {
                    alumno: {
                      nombre: {
                        contains:
                          busqueda,
                      },
                    },
                  },

                  {
                    alumno: {
                      apellidos: {
                        contains:
                          busqueda,
                      },
                    },
                  },

                  {
                    alumno: {
                      dni: {
                        contains:
                          busqueda,
                      },
                    },
                  },

                  {
                    expediente: {
                      contains:
                        busqueda,
                    },
                  },
                ],
              }
            : {}),
        },

        orderBy: [
          {
            alumno: {
              apellidos:
                "asc",
            },
          },

          {
            alumno: {
              nombre:
                "asc",
            },
          },
        ],

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
              activo: true,
            },
          },

          grado: {
            select: {
              id: true,
              nombre: true,
              activo: true,
            },
          },

          asignaturasConvalidadas: {
            orderBy: {
              asignatura: {
                nombre: "asc",
              },
            },

            select: {
              asignaturaId: true,

              asignatura: {
                select: {
                  id: true,
                  codigo: true,
                  nombre: true,
                },
              },
            },
          },

          cursoAcademico: {
            select: {
              id: true,
              nombre: true,
            },
          },

          createdAt: true,
          updatedAt: true,
        },
      });

    return NextResponse.json({
      ok: true,

      cursoAcademico,

      matriculas,
    });
  } catch (error) {
    console.error(
      "Error cargando alumnos/matrículas:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          "No se han podido cargar los alumnos.",
      },
      {
        status: 500,
      }
    );
  }
}

/* =========================================================
   POST
   CREAR ALUMNO / MATRÍCULA
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

    const cursoAcademicoId =
      Number(
        body.cursoAcademicoId
      );

    /* =====================================================
       VALIDACIONES BÁSICAS
       ===================================================== */

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
        cursoAcademicoId
      ) ||
      cursoAcademicoId <= 0
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Debe seleccionar un curso académico.",
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
       CURSO ACADÉMICO DEL CENTRO
       ===================================================== */

    const cursoAcademico =
      await prisma.cursoAcademico.findFirst({
        where: {
          id:
            cursoAcademicoId,

          centroId:
            sesion.centroId,

          activo:
            true,
        },

        select: {
          id: true,
          nombre: true,
        },
      });

    if (!cursoAcademico) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "El curso académico seleccionado no es válido.",
        },
        {
          status: 404,
        }
      );
    }

    /* =====================================================
       GRADO DEL CENTRO
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
       EXPEDIENTE ÚNICO DENTRO DEL CURSO ACADÉMICO
       ===================================================== */

    if (expediente) {
      const expedienteDuplicado =
        await prisma.matricula.findFirst({
          where: {
            centroId:
              sesion.centroId,

            cursoAcademicoId,

            activo:
              true,

            expediente,
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
        `El expediente "${expediente}" ya está asignado a otro alumno en el curso académico ${cursoAcademico.nombre}. Introduzca un número de expediente diferente para esta matrícula.`,
    },
    {
      status: 409,
    }
  );
}
    }

    /* =====================================================
       BUSCAR PERSONA POR DNI
       ===================================================== */

    let alumno =
      await prisma.alumno.findFirst({
        where: {
          centroId:
            sesion.centroId,

          dni,
        },

        select: {
          id: true,
          nombre: true,
          apellidos: true,
          dni: true,
          activo: true,
        },
      });

    /*
     * Si el alumno ya existe como persona,
     * reutilizamos su identidad.
     */

    if (alumno) {
      const matriculaExistente =
        await prisma.matricula.findFirst({
          where: {
            centroId:
              sesion.centroId,

            alumnoId:
              alumno.id,

            cursoAcademicoId,
          },

          select: {
            id: true,
            activo: true,
          },
        });

      if (
        matriculaExistente
      ) {
        return NextResponse.json(
          {
            ok: false,

            error:
              matriculaExistente.activo
                ? "Este alumno ya está matriculado en el curso académico seleccionado."
                : "Este alumno ya tiene una matrícula inactiva en este curso académico. Reactívela desde el listado.",
          },
          {
            status: 409,
          }
        );
      }
    }

    /* =====================================================
       CREACIÓN ATÓMICA
       ===================================================== */

    const resultado =
      await prisma.$transaction(
        async (
          tx
        ) => {
          let alumnoId:
            number;

          if (alumno) {
            /*
             * Actualizamos nombre/apellidos por si
             * los datos aportados son más recientes.
             */

            const actualizado =
              await tx.alumno.update({
                where: {
                  id:
                    alumno.id,
                },

                data: {
                  nombre,
                  apellidos,
                  activo:
                    true,
                },

                select: {
                  id: true,
                },
              });

            alumnoId =
              actualizado.id;
          } else {
            const nuevoAlumno =
              await tx.alumno.create({
                data: {
                  centroId:
                    sesion.centroId,

                  nombre,
                  apellidos,
                  dni,

                  activo:
                    true,
                },

                select: {
                  id: true,
                },
              });

            alumnoId =
              nuevoAlumno.id;
          }

          return tx.matricula.create({
            data: {
              centroId:
                sesion.centroId,

              alumnoId,

              cursoAcademicoId,

              gradoId,

              curso,

              expediente,

              activo:
                true,
            },

            select: {
              id: true,

              curso: true,
              expediente: true,
              activo: true,

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

    return NextResponse.json(
      {
        ok: true,

        matricula:
          resultado,

        mensaje:
          "Alumno matriculado correctamente.",
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "Error matriculando alumno:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          "No se ha podido matricular el alumno.",
      },
      {
        status: 500,
      }
    );
  }
}