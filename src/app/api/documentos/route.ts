import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { obtenerSesion } from "@/lib/session";

/* =========================================================
   GET
   DATOS PARA LA PANTALLA DE DOCUMENTOS
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

    const matriculaIdTexto =
      url.searchParams.get(
        "matriculaId"
      );

    const anioTexto =
      url.searchParams.get(
        "anio"
      );

    const mesTexto =
      url.searchParams.get(
        "mes"
      );

    /* =====================================================
       CURSO ACADÉMICO
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
          fechaInicio: true,
          fechaFin: true,
          actual: true,
          activo: true,
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
       MATRÍCULAS DEL CURSO
       ===================================================== */

    const matriculas =
      await prisma.matricula.findMany({
        where: {
          centroId:
            sesion.centroId,

          cursoAcademicoId,

          activo:
            true,
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
     * Si todavía no se ha seleccionado alumno,
     * únicamente devolvemos las matrículas.
     */

    if (!matriculaIdTexto) {
      return NextResponse.json({
        ok: true,
        cursoAcademico,
        matriculas,
      });
    }

    /* =====================================================
       MATRÍCULA
       ===================================================== */

    const matriculaId =
      Number(
        matriculaIdTexto
      );

    const matricula =
      matriculas.find(
        (
          item
        ) =>
          item.id ===
          matriculaId
      );

    if (!matricula) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "La matrícula seleccionada no pertenece al curso académico.",
        },
        {
          status: 404,
        }
      );
    }

    /* =====================================================
       MES DE CORTE
       ===================================================== */

    const anio =
      Number(
        anioTexto
      );

    const mes =
      Number(
        mesTexto
      );

    if (
      !Number.isInteger(
        anio
      ) ||
      !Number.isInteger(
        mes
      ) ||
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
   ASIGNATURAS CONVALIDADAS DE ESTA MATRÍCULA
   ===================================================== */

const convalidaciones =
  await prisma.matriculaAsignaturaConvalidada.findMany({
    where: {
      matriculaId:
        matricula.id,
    },

    select: {
      asignaturaId:
        true,
    },
  });

const asignaturasConvalidadasIds =
  convalidaciones.map(
    (
      item
    ) =>
      item.asignaturaId
  );

    /* =====================================================
       ASIGNATURAS DE LA MATRÍCULA
       ===================================================== */

    const asignaturas =
      await prisma.asignatura.findMany({
        where: {
          centroId:
            sesion.centroId,

          gradoId:
            matricula.gradoId,

          curso:
            matricula.curso,

          ...(asignaturasConvalidadasIds.length >
          0
            ? {
                id: {
                  notIn:
                    asignaturasConvalidadasIds,
                },
              }
            : {}),
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

    /* =====================================================
       ASISTENCIAS DEL ALUMNO
       DESDE INICIO DE CURSO HASTA MES DE CORTE
       ===================================================== */

    const fechaCorte =
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

    const inicioCurso =
      new Date(
        cursoAcademico.fechaInicio
      );

    const asistencias =
      await prisma.asistencia.findMany({
        where: {
          centroId:
            sesion.centroId,

          matriculaId,

          OR: [
            {
              anio: {
                gt:
                  inicioCurso.getFullYear(),
                lt:
                  anio,
              },
            },

            {
              anio:
                inicioCurso.getFullYear(),

              mes: {
                gte:
                  inicioCurso.getMonth() +
                  1,
              },
            },

            {
              anio,

              mes: {
                lte:
                  mes,
              },
            },
          ],
        },

        select: {
          asignaturaId:
            true,

          anio: true,
          mes: true,

          horasAsistidas:
            true,

          horasNoAsistidas:
            true,

          observaciones:
            true,
        },
      });

    /*
     * Seguridad adicional:
     * descartamos cualquier registro posterior
     * al mes seleccionado.
     */

    const asistenciasHastaCorte =
      asistencias.filter(
        (
          asistencia
        ) => {
          const fecha =
            new Date(
              Date.UTC(
                asistencia.anio,
                asistencia.mes,
                0
              )
            );

          return (
            fecha <=
            fechaCorte
          );
        }
      );

    /* =====================================================
       RESUMEN POR ASIGNATURA
       ===================================================== */

    const datosAsignaturas =
      asignaturas.map(
        (
          asignatura
        ) => {
          const registros =
            asistenciasHastaCorte.filter(
              (
                asistencia
              ) =>
                asistencia.asignaturaId ===
                asignatura.id
            );

          /*
           * Datos SOLO del mes seleccionado:
           * alimentan el ANEXO I.
           */

          const registroMes =
            registros.find(
              (
                asistencia
              ) =>
                asistencia.anio ===
                  anio &&
                asistencia.mes ===
                  mes
            );

          const asistidasMes =
            Number(
              registroMes
                ?.horasAsistidas ??
              0
            );

          const noAsistidasMes =
            Number(
              registroMes
                ?.horasNoAsistidas ??
              0
            );

          /*
           * Datos acumulados hasta el mes:
           * servirán después para rellenar el ANEXO V.
           */

          const mesesAcumulados =
            registros
              .sort(
                (
                  a,
                  b
                ) =>
                  a.anio -
                    b.anio ||
                  a.mes -
                    b.mes
              )
              .map(
                (
                  asistencia
                ) => ({
                  anio:
                    asistencia.anio,

                  mes:
                    asistencia.mes,

                  horasAsistidas:
                    Number(
                      asistencia.horasAsistidas
                    ),

                  horasNoAsistidas:
                    Number(
                      asistencia.horasNoAsistidas
                    ),

                  observaciones:
                    asistencia.observaciones ??
                    "",
                })
              );

          return {
            id:
              asignatura.id,

            codigo:
              asignatura.codigo,

            nombre:
              asignatura.nombre,

            profesor:
              asignatura.profesor,

            mes: {
              horasAsistidas:
                asistidasMes,

              horasNoAsistidas:
                noAsistidasMes,

              horasTotales:
                asistidasMes +
                noAsistidasMes,
            },

            acumulado:
              mesesAcumulados,
          };
        }
      );

    /* =====================================================
       ANEXO I - RESUMEN DEL MES
       ===================================================== */

    const totalAsistidas =
      datosAsignaturas.reduce(
        (
          total,
          asignatura
        ) =>
          total +
          asignatura
            .mes
            .horasAsistidas,
        0
      );

    const totalHoras =
      datosAsignaturas.reduce(
        (
          total,
          asignatura
        ) =>
          total +
          asignatura
            .mes
            .horasTotales,
        0
      );

    const porcentaje =
      totalHoras > 0
        ? (
            totalAsistidas /
            totalHoras
          ) *
          100
        : 0;

    return NextResponse.json({
      ok: true,

      cursoAcademico,
      matricula,

      mes: {
        anio,
        mes,
      },

      asignaturas:
        datosAsignaturas,

      resumen: {
        horasTotales:
          totalHoras,

        horasAsistidas:
          totalAsistidas,

        porcentaje,
      },
    });
  } catch (error) {
    console.error(
      "Error cargando documentos:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          "No se han podido cargar los datos de documentos.",
      },
      {
        status: 500,
      }
    );
  }
}

/* =========================================================
   AUXILIAR
   ========================================================= */

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