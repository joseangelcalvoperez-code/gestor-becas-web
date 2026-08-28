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
   GENERAR TODOS LOS ANEXOS V DE UN ALUMNO
   ========================================================= */

export async function POST(
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

    if (
      !Number.isInteger(
        cursoAcademicoId
      ) ||
      cursoAcademicoId <= 0 ||
      !Number.isInteger(
        matriculaId
      ) ||
      matriculaId <= 0 ||
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
       MATRÍCULA
       ===================================================== */

    const matricula =
      await prisma.matricula.findFirst({
        where: {
          id:
            matriculaId,

          centroId:
            sesion.centroId,

          cursoAcademicoId,

          activo:
            true,
        },

        select: {
          id: true,
          gradoId: true,
          curso: true,
          expediente: true,

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

    if (!matricula) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "No se ha encontrado la matrícula seleccionada.",
        },
        {
          status: 404,
        }
      );
    }
/* =====================================================
   ASIGNATURAS CONVALIDADAS
   ===================================================== */

const convalidaciones =
  await prisma.matriculaAsignaturaConvalidada.findMany({
    where: {
      matriculaId,
    },

    select: {
      asignaturaId: true,
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
       ASIGNATURAS
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
        },
      });

    if (
      asignaturas.length ===
      0
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "No hay asignaturas que requieran Anexo V para este alumno.",
        },
        {
          status: 404,
        }
      );
    }

    /* =====================================================
       ZIP
       ===================================================== */

    const zip =
      new JSZip();

    /*
     * Conservamos la cookie de la petición actual.
     *
     * Esto permite que las llamadas internas al generador
     * individual mantengan la misma sesión.
     */

    const cookie =
      request.headers.get(
        "cookie"
      ) ?? "";

    /*
     * Construimos la URL a partir de la petición actual.
     *
     * Por ejemplo:
     *
     * http://localhost:3000/api/documentos/anexos-v
     *
     * pasa a:
     *
     * http://localhost:3000/api/documentos/anexo-v
     */

    const urlActual =
      new URL(
        request.url
      );

    const urlGenerador =
      new URL(
        "/api/documentos/anexo-v",
        urlActual.origin
      );

    let totalGenerados =
      0;

    /* =====================================================
       GENERAR UNO POR UNO
       ===================================================== */

    for (
      const asignatura
      of asignaturas
    ) {
      const respuesta =
        await fetch(
          urlGenerador,
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
                matriculaId,

                asignaturaId:
                  asignatura.id,

                anio,
                mes,
              }),

            cache:
              "no-store",
          }
        );

      /* ===================================================
         ERROR EN UNA ASIGNATURA
         =================================================== */

      if (
        !respuesta.ok
      ) {
        let detalle =
          `No se ha podido generar el Anexo V de ${asignatura.nombre}.`;

        try {
          const resultado =
            await respuesta.json();

          detalle =
            resultado.error ??
            detalle;
        } catch {
          // La respuesta no era JSON.
        }

        return NextResponse.json(
          {
            ok: false,

            error:
              detalle,
          },
          {
            status:
              respuesta.status >=
              400
                ? respuesta.status
                : 500,
          }
        );
      }

      /* ===================================================
         PDF
         =================================================== */

      const arrayBuffer =
        await respuesta.arrayBuffer();

      const bytes =
        new Uint8Array(
          arrayBuffer
        );

      /* ===================================================
         NOMBRE PDF
         =================================================== */

      const disposition =
        respuesta.headers.get(
          "Content-Disposition"
        );

      let nombrePdf =
        `ANEXO_V_${asignatura.id}.pdf`;

      const coincidencia =
        disposition?.match(
          /filename="([^"]+)"/
        );

      if (
        coincidencia?.[1]
      ) {
        nombrePdf =
          coincidencia[1];
      } else {
        const nombreAsignatura =
          limpiarNombreArchivo(
            asignatura.codigo
              ? `${asignatura.codigo}_${asignatura.nombre}`
              : asignatura.nombre
          );

        nombrePdf =
          `ANEXO_V_${nombreAsignatura}.pdf`;
      }

      /* ===================================================
         AÑADIR AL ZIP
         =================================================== */

      zip.file(
        nombrePdf,
        bytes
      );

      totalGenerados++;
    }

    /* =====================================================
       CREAR ZIP
       ===================================================== */

    const zipFinal =
      await zip.generateAsync({
        type:
          "uint8array",

        compression:
          "DEFLATE",

        compressionOptions: {
          level: 6,
        },
      });

    /* =====================================================
       NOMBRE ZIP
       ===================================================== */

    const nombreAlumno =
      limpiarNombreArchivo(
        `${matricula.alumno.apellidos}_${matricula.alumno.nombre}`
      );

    const nombreMes =
      nombreMesPorNumero(
        mes
      );

    const nombreCurso =
      limpiarNombreArchivo(
        cursoAcademico.nombre
      );

    const nombreArchivo =
      `ANEXOS_V_${nombreAlumno}_${nombreMes}_${anio}_${nombreCurso}.zip`;

    /* =====================================================
       DEVOLVER ZIP
       ===================================================== */

    return new Response(
      Buffer.from(
        zipFinal
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

          "X-Total-Generados":
            String(
              totalGenerados
            ),
        },
      }
    );
  } catch (
    error
  ) {
    console.error(
      "Error generando todos los Anexos V:",
      error
    );

    return NextResponse.json(
      {
        ok: false,

        error:
          error instanceof
          Error
            ? error.message
            : "No se han podido generar los Anexos V.",
      },
      {
        status: 500,
      }
    );
  }
}

/* =========================================================
   NOMBRE DE ARCHIVO SEGURO
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
   NOMBRE MES
   ========================================================= */

function nombreMesPorNumero(
  mes: number
) {
  const nombres:
    Record<
      number,
      string
    > =
  {
    1:
      "ENERO",

    2:
      "FEBRERO",

    3:
      "MARZO",

    4:
      "ABRIL",

    5:
      "MAYO",

    6:
      "JUNIO",

    7:
      "JULIO",

    8:
      "AGOSTO",

    9:
      "SEPTIEMBRE",

    10:
      "OCTUBRE",

    11:
      "NOVIEMBRE",

    12:
      "DICIEMBRE",
  };

  return (
    nombres[
      mes
    ] ??
    String(
      mes
    )
  );
}