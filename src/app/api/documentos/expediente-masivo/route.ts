import {
  CONCURRENCIA_EXPEDIENTES,
  procesarConConcurrencia,
  semaforoMasivos,
} from "@/lib/limitador";

import {
  POST as postExpediente,
} from "../expediente/route";

import {
  llamadaInterna,
  opcionesZip,
} from "@/lib/llamadaInterna";

import {
  NextResponse,
} from "next/server";

import JSZip from "jszip";

import {
  prisma,
} from "@/lib/prisma";

import {
  obtenerSesion,
} from "@/lib/session";

export const runtime =
  "nodejs";

/* =========================================================
   POST
   GENERACIÓN MASIVA DEL CENTRO
   ========================================================= */

async function generarMasivo(
  request: Request
) {
  try {
    /* =====================================================
       SESIÓN
       ===================================================== */

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

    /* =====================================================
       BODY
       ===================================================== */

    const body =
      await request.json();

    const cursoAcademicoId =
      Number(
        body.cursoAcademicoId
      );

    const anio =
      Number(
        body.anio
      );

    const mes =
      Number(
        body.mes
      );

    if (
      !Number.isInteger(
        cursoAcademicoId
      ) ||
      cursoAcademicoId <= 0 ||
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
            "Los datos seleccionados no son válidos.",
        },
        {
          status: 400,
        }
      );
    }

    /* =====================================================
       CURSO ACADÉMICO
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
        {
          status: 404,
        }
      );
    }

    /* =====================================================
       COMPROBAR QUE EL MES PERTENECE AL CURSO
       ===================================================== */

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
       MATRÍCULAS ACTIVAS DEL CURSO
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

          alumno: {
            select: {
              id: true,
              nombre: true,
              apellidos: true,
              dni: true,
            },
          },
        },
      });

    if (
      matriculas.length ===
      0
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "No hay alumnos matriculados en este curso académico.",
        },
        {
          status: 404,
        }
      );
    }

    /* =====================================================
       PREPARAR ZIP FINAL
       ===================================================== */

    const zipFinal =
      new JSZip();

    /* =====================================================
       URL DEL GENERADOR DE EXPEDIENTE
       ===================================================== */

    const cookie =
      request.headers.get(
        "cookie"
      ) ?? "";

    const urlActual =
      new URL(
        request.url
      );

    const urlExpediente =
      new URL(
        "/api/documentos/expediente",
        urlActual.origin
      );

    /* =====================================================
       CONTADORES
       ===================================================== */

    let totalExpedientes =
      0;

    let totalAnexosV =
      0;

    const errores: {
      alumno: string;
      detalle: string;
    }[] = [];

    /* =====================================================
       RECORRER TODOS LOS ALUMNOS
       ===================================================== */

    /* =====================================================
       GENERACIÓN EN PARALELO ACOTADO

       Los expedientes se generan varios a la vez
       (EXPEDIENTES_CONCURRENCIA). Cada respuesta se lee
       completa en memoria y después se ensambla el ZIP final
       en el orden original de alumnos.
       ===================================================== */

    const respuestasExpedientes =
      await procesarConConcurrencia(
        matriculas,
        CONCURRENCIA_EXPEDIENTES,
        async (matricula) => {
          try {
            const respuestaOriginal =
              await llamadaInterna(
          postExpediente,
          urlExpediente,
            {
              method:
                "POST",

              headers: {
                "Content-Type":
                  "application/json",

                cookie,
              },

              body:
                JSON.stringify({
                  cursoAcademicoId,

                  matriculaId:
                    matricula.id,

                  anio,
                  mes,
                }),

              cache:
                "no-store",
            }
          );

            return new Response(
              await respuestaOriginal.arrayBuffer(),
              {
                status:
                  respuestaOriginal.status,

                headers:
                  respuestaOriginal.headers,
              }
            );
          } catch (error) {
            return Response.json(
              {
                ok: false,

                error:
                  error instanceof Error
                    ? error.message
                    : String(error),
              },
              {
                status: 500,
              }
            );
          }
        }
      );

    for (
      const [
        indiceMatricula,
        matricula,
      ]
      of matriculas.entries()
    ) {
      const nombreAlumno =
        `${matricula.alumno.apellidos} ${matricula.alumno.nombre}`;

      try {
        /* =================================================
           GENERAR EXPEDIENTE DEL ALUMNO
           ================================================= */

        const respuesta =
          respuestasExpedientes[
            indiceMatricula
          ];

        /* =================================================
           ERROR EN ESTE ALUMNO

           No detenemos toda la generación.
           Continuamos con los demás.
           ================================================= */

        if (
          !respuesta.ok
        ) {
          let detalle =
            "No se ha podido generar el expediente.";

          try {
            const resultado =
              await respuesta.json();

            detalle =
              resultado.error ??
              detalle;
          } catch {
            // No era JSON.
          }

          errores.push({
            alumno:
              nombreAlumno,

            detalle,
          });

          continue;
        }

        /* =================================================
           RECIBIR ZIP DEL EXPEDIENTE
           ================================================= */

        const bytesExpediente =
          new Uint8Array(
            await respuesta.arrayBuffer()
          );

        const zipExpediente =
          await JSZip.loadAsync(
            bytesExpediente
          );

        /* =================================================
           CARPETA DEL ALUMNO
           ================================================= */

        const identificador =
          matricula.expediente
            ? limpiarNombreArchivo(
                matricula.expediente
              )
            : `MATRICULA_${matricula.id}`;

        const nombreCarpetaAlumno =
          `${limpiarNombreArchivo(
            `${matricula.alumno.apellidos}_${matricula.alumno.nombre}`
          )}_${identificador}`;

        const carpetaAlumno =
          zipFinal.folder(
            nombreCarpetaAlumno
          );

        if (
          !carpetaAlumno
        ) {
          throw new Error(
            `No se ha podido crear la carpeta de ${nombreAlumno}.`
          );
        }

        /* =================================================
           COPIAR CONTENIDO DEL EXPEDIENTE
           ================================================= */

        const archivos =
          Object.values(
            zipExpediente.files
          );

        for (
          const archivo
          of archivos
        ) {
          /*
           * No necesitamos copiar las
           * entradas de carpeta vacías.
           */

          if (
            archivo.dir
          ) {
            continue;
          }

          const contenido =
            await archivo.async(
              "uint8array"
            );

          /*
           * archivo.name conserva:
           *
           * ANEXOS_V/archivo.pdf
           *
           * o:
           *
           * ANEXO_I_xxx.pdf
           */

          carpetaAlumno.file(
            archivo.name,
            contenido
          );
        }

        /* =================================================
           CONTADORES
           ================================================= */

        const anexosVAlumno =
          Number(
            respuesta.headers.get(
              "X-Total-Anexos-V"
            ) ??
            0
          );

        totalAnexosV +=
          anexosVAlumno;

        totalExpedientes++;
      } catch (
        error
      ) {
        const detalle =
          error instanceof Error
            ? error.message
            : String(
                error
              );

        errores.push({
          alumno:
            nombreAlumno,

          detalle,
        });
      }
    }

    /* =====================================================
       SI NO SE HA PODIDO GENERAR NINGUNO
       ===================================================== */

    if (
      totalExpedientes ===
      0
    ) {
      return NextResponse.json(
        {
          ok: false,

          error:
            "No se ha podido generar ningún expediente.",

          errores,
        },
        {
          status: 500,
        }
      );
    }

    /* =====================================================
       SI HUBO ERRORES, AÑADIR INFORME AL ZIP
       ===================================================== */

    if (
      errores.length >
      0
    ) {
      const contenidoErrores =
        [
          "ERRORES DE GENERACIÓN",
          "=====================",
          "",
          `Curso académico: ${cursoAcademico.nombre}`,
          `Mes: ${nombreMesPorNumero(mes)} ${anio}`,
          "",
          ...errores.flatMap(
            (
              error,
              indice
            ) => [
              `${indice + 1}. ${error.alumno}`,
              `   ${error.detalle}`,
              "",
            ]
          ),
        ].join(
          "\r\n"
        );

      zipFinal.file(
        "ERRORES_GENERACION.txt",
        contenidoErrores
      );
    }

    /* =====================================================
       GENERAR ZIP
       ===================================================== */

    const bytesZip =
      await zipFinal.generateAsync({
        type:
          "uint8array",

        ...opcionesZip(
          request
        ),
      });

    /* =====================================================
       NOMBRE DEL ZIP
       ===================================================== */

    const nombreMes =
      nombreMesPorNumero(
        mes
      );

    const nombreCurso =
      limpiarNombreArchivo(
        cursoAcademico.nombre
      );

    const nombreArchivo =
      `DOCUMENTACION_CENTRO_${nombreMes}_${anio}_${nombreCurso}.zip`;

    /* =====================================================
       DEVOLVER
       ===================================================== */

    return new Response(
      Buffer.from(
        bytesZip
      ),
      {
        status: 200,

        headers: {
          "Content-Type":
            "application/zip",

          "Content-Disposition":
            `attachment; filename="${nombreArchivo}"`,

          "Cache-Control":
            "no-store",

          "X-Total-Expedientes":
            String(
              totalExpedientes
            ),

          "X-Total-Alumnos":
            String(
              matriculas.length
            ),

          "X-Total-Anexos-V":
            String(
              totalAnexosV
            ),

          "X-Total-Anexos-I":
            String(
              totalExpedientes
            ),

          "X-Total-Errores":
            String(
              errores.length
            ),
        },
      }
    );
  } catch (
    error
  ) {
    console.error(
      "Error en generación masiva:",
      error
    );

    return NextResponse.json(
      {
        ok: false,

        error:
          error instanceof Error
            ? error.message
            : "No se ha podido generar la documentación del centro.",
      },
      {
        status: 500,
      }
    );
  }
}

/* =========================================================
   MES PERTENECE AL CURSO
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

/* =========================================================
   LIMPIAR NOMBRE
   ========================================================= */

function limpiarNombreArchivo(
  texto: string
) {
  return texto
    .normalize(
      "NFD"
    )
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .replace(
      /[^a-zA-Z0-9_-]+/g,
      "_"
    )
    .replace(
      /_+/g,
      "_"
    )
    .replace(
      /^_|_$/g,
      ""
    );
}

/* =========================================================
   MES
   ========================================================= */

function nombreMesPorNumero(
  mes: number
) {
  const meses:
    Record<
      number,
      string
    > =
  {
    1: "ENERO",
    2: "FEBRERO",
    3: "MARZO",
    4: "ABRIL",
    5: "MAYO",
    6: "JUNIO",
    7: "JULIO",
    8: "AGOSTO",
    9: "SEPTIEMBRE",
    10: "OCTUBRE",
    11: "NOVIEMBRE",
    12: "DICIEMBRE",
  };

  return (
    meses[
      mes
    ] ??
    String(
      mes
    )
  );
}

/* =========================================================
   POST
   Las generaciones masivas pasan por una cola por proceso
   (MASIVOS_CONCURRENTES). La sesión se comprueba antes de
   entrar en la cola para no hacer esperar peticiones inválidas.
   ========================================================= */

export async function POST(
  request: Request
) {
  if (
    !(await obtenerSesion())
  ) {
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

  return semaforoMasivos.ejecutar(
    () => generarMasivo(request)
  );
}
