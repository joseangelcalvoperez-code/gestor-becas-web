import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { obtenerSesion } from "@/lib/session";

/* =========================================================
   GET
   ========================================================= */

export async function GET(request: Request) {
  try {
    const sesion = await obtenerSesion();

    if (!sesion) {
      return NextResponse.json(
        {
          ok: false,
          error: "No hay una sesión activa.",
        },
        {
          status: 401,
        }
      );
    }

    const url = new URL(request.url);

    const cursoAcademicoId = Number(
      url.searchParams.get("cursoAcademicoId")
    );

    const asignaturaIdTexto =
      url.searchParams.get("asignaturaId");

    const matriculaIdTexto =
      url.searchParams.get("matriculaId");

    const anioTexto =
      url.searchParams.get("anio");

    const mesTexto =
      url.searchParams.get("mes");

    /* =====================================================
       CURSO ACADÉMICO
       ===================================================== */

    if (
      !Number.isInteger(cursoAcademicoId) ||
      cursoAcademicoId <= 0
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: "Debe seleccionar un curso académico.",
        },
        {
          status: 400,
        }
      );
    }

    const cursoAcademico =
      await prisma.cursoAcademico.findFirst({
        where: {
          id: cursoAcademicoId,
          centroId: sesion.centroId,
        },

        select: {
          id: true,
          nombre: true,
          fechaInicio: true,
          fechaFin: true,
          activo: true,
          actual: true,
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
       SIN ASIGNATURA
       DEVOLVER ASIGNATURAS
       ===================================================== */

    if (!asignaturaIdTexto) {
      const asignaturas =
        await prisma.asignatura.findMany({
          where: {
            centroId: sesion.centroId,
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
            gradoId: true,
            curso: true,

            grado: {
              select: {
                id: true,
                nombre: true,
              },
            },

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
        cursoAcademico,
        asignaturas,
      });
    }

    /* =====================================================
       ASIGNATURA
       ===================================================== */

    const asignaturaId =
      Number(asignaturaIdTexto);

    if (
      !Number.isInteger(asignaturaId) ||
      asignaturaId <= 0
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "La asignatura seleccionada no es válida.",
        },
        {
          status: 400,
        }
      );
    }

    const asignatura =
      await prisma.asignatura.findFirst({
        where: {
          id: asignaturaId,
          centroId: sesion.centroId,
        },

        select: {
          id: true,
          codigo: true,
          nombre: true,
          gradoId: true,
          curso: true,

          grado: {
            select: {
              id: true,
              nombre: true,
            },
          },

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

    if (!asignatura) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "No se ha encontrado la asignatura.",
        },
        {
          status: 404,
        }
      );
    }

    /* =====================================================
   MATRÍCULAS CON ESTA ASIGNATURA CONVALIDADA
   ===================================================== */

const convalidaciones =
  await prisma.matriculaAsignaturaConvalidada.findMany({
    where: {
      asignaturaId,
    },

    select: {
      matriculaId: true,
    },
  });

const matriculasConvalidadasIds =
  convalidaciones.map(
    (
      convalidacion
    ) =>
      convalidacion.matriculaId
  );

    /* =====================================================
       MATRÍCULAS COMPATIBLES
       ===================================================== */

    const matriculas =
      await prisma.matricula.findMany({
      where: {
        centroId:
          sesion.centroId,

        cursoAcademicoId,

        gradoId:
          asignatura.gradoId,

        curso:
          asignatura.curso,

        activo: true,

        /*
        * Los alumnos que tengan esta asignatura
        * convalidada no participan en ASISTENCIA.
        */

        ...(matriculasConvalidadasIds.length >
        0
          ? {
              id: {
                notIn:
                  matriculasConvalidadasIds,
              },
            }
          : {}),
      },

        orderBy: [
          {
            alumno: {
              apellidos: "asc",
            },
          },
          {
            alumno: {
              nombre: "asc",
            },
          },
        ],

        select: {
          id: true,
          expediente: true,
          curso: true,
          gradoId: true,

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
        },
      });

    /*
     * Si todavía no hay alumno elegido,
     * terminamos aquí.
     */

    if (!matriculaIdTexto) {
      return NextResponse.json({
        ok: true,
        cursoAcademico,
        asignatura,
        matriculas,
      });
    }

    /* =====================================================
       MATRÍCULA
       ===================================================== */

    const matriculaId =
      Number(matriculaIdTexto);

    const matricula =
      matriculas.find(
        (item) =>
          item.id === matriculaId
      );

    if (!matricula) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "El alumno no corresponde al grado y curso de la asignatura.",
        },
        {
          status: 404,
        }
      );
    }

    /* =====================================================
       MES
       ===================================================== */

    const anio =
      Number(anioTexto);

    const mes =
      Number(mesTexto);

    if (
      !Number.isInteger(anio) ||
      !Number.isInteger(mes) ||
      mes < 1 ||
      mes > 12
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "El mes seleccionado no es válido.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !mesPerteneceAlCurso(
        anio,
        mes,
        cursoAcademico.fechaInicio,
        cursoAcademico.fechaFin
      )
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            `El mes seleccionado no pertenece al curso académico ${cursoAcademico.nombre}.`,
        },
        {
          status: 400,
        }
      );
    }

    /* =====================================================
       ASISTENCIA
       ===================================================== */

    const asistencia =
      await prisma.asistencia.findUnique({
        where: {
          matriculaId_asignaturaId_anio_mes: {
            matriculaId,
            asignaturaId,
            anio,
            mes,
          },
        },

        select: {
          id: true,

          horasAsistidas:
            true,

          horasNoAsistidas:
            true,

          observaciones:
            true,

          dias: {
            orderBy: {
              fecha: "asc",
            },

            select: {
              id: true,
              fecha: true,

              horasAsistidas:
                true,

              horasNoAsistidas:
                true,
            },
          },
        },
      });

    return NextResponse.json({
      ok: true,

      cursoAcademico,
      asignatura,
      matricula,

      asistencia: {
        id:
          asistencia?.id ??
          null,

        horasAsistidas:
          Number(
            asistencia?.horasAsistidas ??
              0
          ),

        horasNoAsistidas:
          Number(
            asistencia?.horasNoAsistidas ??
              0
          ),

        observaciones:
          asistencia?.observaciones ??
          "",

        dias:
          (
            asistencia?.dias ??
            []
          ).map(
            (dia) => ({
              id: dia.id,

              fecha:
                fechaISO(
                  dia.fecha
                ),

              horasAsistidas:
                Number(
                  dia.horasAsistidas
                ),

              horasNoAsistidas:
                Number(
                  dia.horasNoAsistidas
                ),
            })
          ),
      },
    });
  } catch (error) {
    console.error(
      "Error cargando asistencia:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          "No se ha podido cargar la asistencia.",
      },
      {
        status: 500,
      }
    );
  }
}

/* =========================================================
   POST
   GUARDAR MES COMPLETO
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

    const cursoAcademicoId =
      Number(
        body.cursoAcademicoId
      );

    const asignaturaId =
      Number(
        body.asignaturaId
      );

    const matriculaId =
      Number(
        body.matriculaId
      );

    const anio =
      Number(
        body.anio
      );

    const mes =
      Number(
        body.mes
      );

    const observaciones =
      String(
        body.observaciones ??
        ""
      );

    const registros =
      Array.isArray(
        body.registros
      )
        ? body.registros
        : [];

    /* =====================================================
       VALIDAR CURSO
       ===================================================== */

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
          fechaInicio: true,
          fechaFin: true,
        },
      });

    if (!cursoAcademico) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "El curso académico no es válido.",
        },
        {
          status: 404,
        }
      );
    }

    if (
      !Number.isInteger(anio) ||
      !Number.isInteger(mes) ||
      mes < 1 ||
      mes > 12 ||
      !mesPerteneceAlCurso(
        anio,
        mes,
        cursoAcademico.fechaInicio,
        cursoAcademico.fechaFin
      )
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "El mes seleccionado no pertenece al curso académico.",
        },
        {
          status: 400,
        }
      );
    }

    /* =====================================================
       VALIDAR ASIGNATURA
       ===================================================== */

    const asignatura =
      await prisma.asignatura.findFirst({
        where: {
          id:
            asignaturaId,

          centroId:
            sesion.centroId,
        },

        select: {
          id: true,
          gradoId: true,
          curso: true,
        },
      });

    if (!asignatura) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "La asignatura seleccionada no es válida.",
        },
        {
          status: 404,
        }
      );
    }

    /* =====================================================
       VALIDAR MATRÍCULA
       ===================================================== */

    const matricula =
      await prisma.matricula.findFirst({
        where: {
          id:
            matriculaId,

          centroId:
            sesion.centroId,

          cursoAcademicoId,

          gradoId:
            asignatura.gradoId,

          curso:
            asignatura.curso,

          activo:
            true,
        },

        select: {
          id: true,
        },
      });

    if (!matricula) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "El alumno no pertenece al grado y curso de la asignatura.",
        },
        {
          status: 404,
        }
      );
    }

    /* =====================================================
   COMPROBAR CONVALIDACIÓN
   ===================================================== */

const convalidacion =
  await prisma.matriculaAsignaturaConvalidada.findUnique({
    where: {
      matriculaId_asignaturaId: {
        matriculaId,
        asignaturaId,
      },
    },

    select: {
      id: true,
    },
  });

if (convalidacion) {
  return NextResponse.json(
    {
      ok: false,

      error:
        "No se puede registrar asistencia porque el alumno tiene esta asignatura convalidada.",
    },
    {
      status: 409,
    }
  );
}

    /* =====================================================
       NORMALIZAR DÍAS
       ===================================================== */

    const diasValidos: {
      fecha: Date;
      horasAsistidas: number;
      horasNoAsistidas: number;
    }[] = [];

    for (
      const registro
      of registros
    ) {
      const fechaTexto =
        String(
          registro.fecha ??
          ""
        );

      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(
          fechaTexto
        )
      ) {
        continue;
      }

      const fecha =
        fechaDesdeISO(
          fechaTexto
        );

      if (
        fecha.getUTCFullYear() !==
          anio ||
        fecha.getUTCMonth() + 1 !==
          mes
      ) {
        continue;
      }

      const horasAsistidas =
        normalizarHoras(
          registro.horasAsistidas
        );

      const horasNoAsistidas =
        normalizarHoras(
          registro.horasNoAsistidas
        );

      if (
        horasAsistidas === null ||
        horasNoAsistidas === null
      ) {
        return NextResponse.json(
          {
            ok: false,
            error:
              `Hay un valor de horas no válido en ${fechaTexto}.`,
          },
          {
            status: 400,
          }
        );
      }

      /*
       * No guardamos días completamente vacíos.
       */

      if (
        horasAsistidas === 0 &&
        horasNoAsistidas === 0
      ) {
        continue;
      }

      diasValidos.push({
        fecha,
        horasAsistidas,
        horasNoAsistidas,
      });
    }

    /* =====================================================
       TOTALES
       ===================================================== */

    const totalAsistidas =
      diasValidos.reduce(
        (
          total,
          dia
        ) =>
          total +
          dia.horasAsistidas,
        0
      );

    const totalNoAsistidas =
      diasValidos.reduce(
        (
          total,
          dia
        ) =>
          total +
          dia.horasNoAsistidas,
        0
      );

    /* =====================================================
       GUARDADO ATÓMICO
       ===================================================== */

    await prisma.$transaction(
      async (tx) => {
        const asistencia =
          await tx.asistencia.upsert({
            where: {
              matriculaId_asignaturaId_anio_mes:
                {
                  matriculaId,
                  asignaturaId,
                  anio,
                  mes,
                },
            },

            update: {
              horasAsistidas:
                totalAsistidas,

              horasNoAsistidas:
                totalNoAsistidas,

              observaciones,
            },

            create: {
              centroId:
                sesion.centroId,

              matriculaId,
              asignaturaId,

              anio,
              mes,

              horasAsistidas:
                totalAsistidas,

              horasNoAsistidas:
                totalNoAsistidas,

              observaciones,
            },

            select: {
              id: true,
            },
          });

        /*
         * Sustituimos el detalle del mes completo.
         * De esta forma también se eliminan correctamente
         * las celdas que el usuario haya vaciado.
         */

        await tx.asistenciaDia.deleteMany({
          where: {
            asistenciaId:
              asistencia.id,
          },
        });

        if (
          diasValidos.length >
          0
        ) {
          await tx.asistenciaDia.createMany({
            data:
              diasValidos.map(
                (dia) => ({
                  asistenciaId:
                    asistencia.id,

                  fecha:
                    dia.fecha,

                  horasAsistidas:
                    dia.horasAsistidas,

                  horasNoAsistidas:
                    dia.horasNoAsistidas,
                })
              ),
          });
        }
      }
    );

    const totalHoras =
      totalAsistidas +
      totalNoAsistidas;

    return NextResponse.json({
      ok: true,

      mensaje:
        "Asistencia guardada correctamente.",

      resumen: {
        horasAsistidas:
          totalAsistidas,

        horasNoAsistidas:
          totalNoAsistidas,

        horasTotales:
          totalHoras,

        porcentaje:
          totalHoras > 0
            ? (
                totalAsistidas /
                totalHoras
              ) *
              100
            : 0,
      },
    });
  } catch (error) {
    console.error(
      "Error guardando asistencia:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          "No se ha podido guardar la asistencia.",
      },
      {
        status: 500,
      }
    );
  }
}

/* =========================================================
   AUXILIARES
   ========================================================= */

function fechaDesdeISO(
  texto: string
) {
  return new Date(
    `${texto}T12:00:00.000Z`
  );
}

function fechaISO(
  fecha: Date
) {
  return `${fecha.getUTCFullYear()}-${String(
    fecha.getUTCMonth() + 1
  ).padStart(
    2,
    "0"
  )}-${String(
    fecha.getUTCDate()
  ).padStart(
    2,
    "0"
  )}`;
}

function normalizarHoras(
  valor: unknown
) {
  if (
    valor === "" ||
    valor === null ||
    valor === undefined
  ) {
    return 0;
  }

  const numero =
    Number(valor);

  if (
    !Number.isFinite(numero) ||
    numero < 0
  ) {
    return null;
  }

  return (
    Math.round(
      numero * 100
    ) / 100
  );
}

function mesPerteneceAlCurso(
  anio: number,
  mes: number,
  fechaInicio: Date,
  fechaFin: Date
) {
  const inicioMes =
    new Date(
      Date.UTC(
        anio,
        mes - 1,
        1
      )
    );

  const finMes =
    new Date(
      Date.UTC(
        anio,
        mes,
        0,
        23,
        59,
        59
      )
    );

  return (
    finMes >=
      fechaInicio &&
    inicioMes <=
      fechaFin
  );
}