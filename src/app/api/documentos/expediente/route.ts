import {
  POST as postAnexosV,
} from "../anexos-v/route";

import {
  POST as postAnexoI,
} from "../anexo-i/route";

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
   EXPEDIENTE COMPLETO DEL ALUMNO
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
       CURSO
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
          expediente: true,

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
            "No se ha encontrado la matrícula seleccionada.",
        },
        {
          status: 404,
        }
      );
    }

    /* =====================================================
       PREPARAR URLs INTERNAS
       ===================================================== */

    const cookie =
      request.headers.get(
        "cookie"
      ) ?? "";

    const urlActual =
      new URL(
        request.url
      );

    const urlTodosV =
      new URL(
        "/api/documentos/anexos-v",
        urlActual.origin
      );

    const urlAnexoI =
      new URL(
        "/api/documentos/anexo-i",
        urlActual.origin
      );

    /* =====================================================
       GENERAR TODOS LOS ANEXOS V
       ===================================================== */

    const respuestaV =
      await llamadaInterna(
          postAnexosV,
          urlTodosV,
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
              anio,
              mes,
            }),

          cache:
            "no-store",
        }
      );

    if (
      !respuestaV.ok
    ) {
      let mensaje =
        "No se han podido generar los Anexos V.";

      try {
        const resultado =
          await respuestaV.json();

        mensaje =
          resultado.error ??
          mensaje;
      } catch {
        // No era JSON.
      }

      return NextResponse.json(
        {
          ok: false,
          error:
            mensaje,
        },
        {
          status:
            respuestaV.status >=
            400
              ? respuestaV.status
              : 500,
        }
      );
    }

    const zipAnexosV =
      new Uint8Array(
        await respuestaV.arrayBuffer()
      );

    /* =====================================================
       GENERAR ANEXO I
       ===================================================== */

    const respuestaI =
      await llamadaInterna(
          postAnexoI,
          urlAnexoI,
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
              anio,
              mes,
            }),

          cache:
            "no-store",
        }
      );

    if (
      !respuestaI.ok
    ) {
      let mensaje =
        "No se ha podido generar el Anexo I.";

      try {
        const resultado =
          await respuestaI.json();

        mensaje =
          resultado.error ??
          mensaje;
      } catch {
        // No era JSON.
      }

      return NextResponse.json(
        {
          ok: false,
          error:
            mensaje,
        },
        {
          status:
            respuestaI.status >=
            400
              ? respuestaI.status
              : 500,
        }
      );
    }

    const anexoI =
      new Uint8Array(
        await respuestaI.arrayBuffer()
      );

    /* =====================================================
       EXTRAER LOS ANEXOS V DEL ZIP INTERNO
       ===================================================== */

    const zipOrigen =
      await JSZip.loadAsync(
        zipAnexosV
      );

    const zipFinal =
      new JSZip();

    const carpetaV =
      zipFinal.folder(
        "ANEXOS_V"
      );

    if (!carpetaV) {
      throw new Error(
        "No se ha podido crear la carpeta de Anexos V."
      );
    }

    const archivosV =
      Object.values(
        zipOrigen.files
      );

    let totalAnexosV =
      0;

    for (
      const archivo
      of archivosV
    ) {
      if (
        archivo.dir
      ) {
        continue;
      }

      const contenido =
        await archivo.async(
          "uint8array"
        );

      carpetaV.file(
        archivo.name,
        contenido
      );

      totalAnexosV++;
    }

    /* =====================================================
       AÑADIR ANEXO I
       ===================================================== */

    const dispositionI =
      respuestaI.headers.get(
        "Content-Disposition"
      );

    const coincidenciaI =
      dispositionI?.match(
        /filename="([^"]+)"/
      );

    const nombreAnexoI =
      coincidenciaI?.[1] ??
      "ANEXO_I.pdf";

    zipFinal.file(
      nombreAnexoI,
      anexoI
    );

    /* =====================================================
       GENERAR ZIP FINAL
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
       NOMBRE DEL EXPEDIENTE
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
      `EXPEDIENTE_${nombreAlumno}_${nombreMes}_${anio}_${nombreCurso}.zip`;

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

          "X-Total-Anexos-V":
            String(
              totalAnexosV
            ),

          "X-Anexo-I":
            "1",
        },
      }
    );
  } catch (
    error
  ) {
    console.error(
      "Error generando expediente completo:",
      error
    );

    return NextResponse.json(
      {
        ok: false,

        error:
          error instanceof Error
            ? error.message
            : "No se ha podido generar el expediente completo.",
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