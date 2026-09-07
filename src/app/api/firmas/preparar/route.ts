import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { obtenerSesion } from "@/lib/session";

export async function GET(request: Request) {
  try {
    const sesion = await obtenerSesion();

    if (!sesion) {
      return NextResponse.json(
        { ok: false, error: "No hay una sesión activa." },
        { status: 401 }
      );
    }

    const url = new URL(request.url);

    const cursoAcademicoId = Number(
      url.searchParams.get("cursoAcademicoId")
    );

    const anio = Number(
      url.searchParams.get("anio")
    );

    const mes = Number(
      url.searchParams.get("mes")
    );

    if (
      !Number.isInteger(cursoAcademicoId) ||
      cursoAcademicoId <= 0
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: "Debe seleccionar un curso académico.",
        },
        { status: 400 }
      );
    }

    if (
      !Number.isInteger(anio) ||
      !Number.isInteger(mes) ||
      mes < 1 ||
      mes > 12
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: "El mes seleccionado no es válido.",
        },
        { status: 400 }
      );
    }

    const cursoAcademico =
      await prisma.cursoAcademico.findFirst({
        where: {
          id: cursoAcademicoId,
          centroId: sesion.centroId,
          activo: true,
        },
        select: {
          id: true,
          nombre: true,
          fechaInicio: true,
          fechaFin: true,
        },
      });

    if (!cursoAcademico) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "El curso académico seleccionado no es válido.",
        },
        { status: 404 }
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
          error: `El mes seleccionado no pertenece al curso académico ${cursoAcademico.nombre}.`,
        },
        { status: 400 }
      );
    }

    const matriculas =
      await prisma.matricula.findMany({
        where: {
          centroId: sesion.centroId,
          cursoAcademicoId,
          activo: true,
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

          asignaturasConvalidadas: {
            select: {
              asignaturaId: true,
            },
          },
        },
      });

    const gradosCursos =
      Array.from(
        new Map(
          matriculas.map((matricula) => [
            `${matricula.gradoId}-${matricula.curso}`,
            {
              gradoId: matricula.gradoId,
              curso: matricula.curso,
            },
          ])
        ).values()
      );

    const asignaturas =
      gradosCursos.length === 0
        ? []
        : await prisma.asignatura.findMany({
            where: {
              centroId: sesion.centroId,

              OR: gradosCursos.map(
                (item) => ({
                  gradoId: item.gradoId,
                  curso: item.curso,
                })
              ),
            },

            orderBy: [
              { codigo: "asc" },
              { nombre: "asc" },
            ],

            select: {
              id: true,
              gradoId: true,
              curso: true,
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

    const documentosV =
      matriculas.flatMap(
        (matricula) => {
          const convalidadas =
            new Set(
              matricula.asignaturasConvalidadas.map(
                (item) =>
                  item.asignaturaId
              )
            );

          const asignaturasMatricula =
            asignaturas.filter(
              (asignatura) =>
                asignatura.gradoId ===
                  matricula.gradoId &&
                asignatura.curso ===
                  matricula.curso &&
                !convalidadas.has(
                  asignatura.id
                )
            );

          return asignaturasMatricula.map(
            (asignatura) => ({
              profesor:
                asignatura.profesor,

              matriculaId:
                matricula.id,

              expediente:
                matricula.expediente,

              alumno:
                matricula.alumno,

              asignatura: {
                id:
                  asignatura.id,
                codigo:
                  asignatura.codigo,
                nombre:
                  asignatura.nombre,
              },
            })
          );
        }
      );

    const gruposMap =
      new Map<number, {
        profesor: {
          id: number;
          nombre: string;
          apellidos: string;
          dni: string;
        };
        documentos: {
          matriculaId: number;
          expediente: string;
          alumno: {
            id: number;
            nombre: string;
            apellidos: string;
            dni: string;
          };
          asignatura: {
            id: number;
            codigo: string;
            nombre: string;
          };
        }[];
      }>();

    for (const documento of documentosV) {
      const profesorId =
        documento.profesor.id;

      const existente =
        gruposMap.get(
          profesorId
        );

      const documentoLimpio = {
        matriculaId:
          documento.matriculaId,
        expediente:
          documento.expediente,
        alumno:
          documento.alumno,
        asignatura:
          documento.asignatura,
      };

      if (existente) {
        existente.documentos.push(
          documentoLimpio
        );
      } else {
        gruposMap.set(
          profesorId,
          {
            profesor:
              documento.profesor,
            documentos: [
              documentoLimpio,
            ],
          }
        );
      }
    }

    const gruposProfesores =
      Array.from(
        gruposMap.values()
      ).sort(
        (a, b) =>
          `${a.profesor.apellidos} ${a.profesor.nombre}`.localeCompare(
            `${b.profesor.apellidos} ${b.profesor.nombre}`,
            "es"
          )
      );

    const anexosI =
      matriculas.map(
        (matricula) => {
          const convalidadas =
            new Set(
              matricula.asignaturasConvalidadas.map(
                (item) =>
                  item.asignaturaId
              )
            );

          const asignaturasMatricula =
            asignaturas.filter(
              (asignatura) =>
                asignatura.gradoId ===
                  matricula.gradoId &&
                asignatura.curso ===
                  matricula.curso &&
                !convalidadas.has(
                  asignatura.id
                )
            );

          const profesoresMap =
            new Map<number, {
              id: number;
              nombre: string;
              apellidos: string;
              dni: string;
            }>();

          for (
            const asignatura of asignaturasMatricula
          ) {
            profesoresMap.set(
              asignatura.profesor.id,
              asignatura.profesor
            );
          }

          const profesores =
            Array.from(
              profesoresMap.values()
            ).sort(
              (a, b) =>
                `${a.apellidos} ${a.nombre}`.localeCompare(
                  `${b.apellidos} ${b.nombre}`,
                  "es"
                )
            );

          return {
            matriculaId:
              matricula.id,
            expediente:
              matricula.expediente,
            alumno:
              matricula.alumno,
            grado:
              matricula.grado,
            curso:
              matricula.curso,
            numeroAsignaturas:
              asignaturasMatricula.length,
            profesores,
          };
        }
      );

    return NextResponse.json({
      ok: true,
      cursoAcademico,
      mes: {
        anio,
        mes,
      },
      gruposProfesores,
      anexosI,
    });
  } catch (error) {
    console.error(
      "Error preparando firmas:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          "No se han podido preparar los documentos para firma.",
      },
      { status: 500 }
    );
  }
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
    finMes >= fechaInicio &&
    inicioMes <= fechaFin
  );
}