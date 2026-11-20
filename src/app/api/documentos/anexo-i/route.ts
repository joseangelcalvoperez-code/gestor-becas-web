import {
  leerPlantilla,
} from "@/lib/plantillas";

import {
  semaforoPdf,
} from "@/lib/limitador";

import {
  NextResponse,
} from "next/server";

import {
  PDFDocument,
  PDFFont,
  PDFPage,
  StandardFonts,
  rgb,
} from "pdf-lib";


import path from "path";

import {
  prisma,
} from "@/lib/prisma";

import {
  obtenerSesion,
} from "@/lib/session";

export const runtime =
  "nodejs";

/* =========================================================
   PLANTILLA MAESTRA
   =========================================================

   La plantilla YA NO depende del curso académico.

   Ruta esperada:
   public/plantillas/anexo-i-vacio.pdf

   El curso y el mes se escriben dinámicamente.
   ========================================================= */

const RUTA_PLANTILLA =
  path.join(
    process.cwd(),
    "public",
    "plantillas",
    "anexo-i-vacio.pdf"
  );

/* =========================================================
   CONSTANTES PDF
   ========================================================= */

const MM_A_PUNTOS =
  72 / 25.4;

const ALTURA_A4_MM =
  297;

/* =========================================================
   COORDENADAS ANEXO I
   Primera calibración sobre la plantilla maestra definitiva.
   Se han tomado de "coordenadas anexos i.docx".
   ========================================================= */

const ANEXO_I = {
  cabecera: {
    curso: {
      x: 135.6,
      y: 49.8,
    },

    mes: {
      x: 98.7,
      y: 57.5,
    },

    centro: {
      x: 35.3,
      y: 62.9,
      xMax: 154,
    },

    codigoCentro: {
      x: 161.8,
      y: 62.9,
      xMax: 196.9,
    },

    expediente: {
      x: 47.3,
      y: 74.9,
      xMax: 98,
    },

    nombreAlumno: {
      x: 47.3,
      y: 82.5,
      xMax: 135.5,
    },

    dni: {
      x: 165.5,
      y: 83.0,
      xMax: 196.9,
    },

    cicloFormativo: {
      x: 44.6,
      y: 95.9,
      xMax: 154,
      yMax: 98.2,
    },

    nivelCurso: {
      x: 172.9,
      y: 95,
      xMax: 196.9,
    },
  },

  tabla: {
    maxAsignaturasPagina:
      10,

    primeraFila: {
      xInicio:
        14.4,

      yInicio:
        118.2,

      xFin:
        98.7,

      yFin:
        124.1,
    },

    /*
     * Las filas de la plantilla son regulares.
     * Partimos de la fila 1 y repetimos el salto vertical.
     * Si tras la primera prueba hace falta, este será uno de
     * los valores que afinaremos.
     */
    separacionFilas:
      10.1,

    asignatura: {
      tamanoFuente:
        7,

      tamanoFuenteMinimo:
        5.5,

      maxLineas:
        2,

      interlineado:
        2.7,
    },

    horasTotales: {
      x:
        109,

      yPrimeraFila:
        121.0,
    },

    horasAsistidas: {
      x:
        127.3,

      yPrimeraFila:
        120.2,
    },
  },

  resumen: {
    totalHoras: {
      x:
        109,

      y:
        223.1,
    },

    totalAsistidas: {
      x:
        127.3,

      y:
        223.1,
    },

    porcentaje: {
      x:
        174.1,

      y:
        222.9,
    },
  },

  certificacion: {
    fecha: {
      x:
        90.8,

      y:
        255.6,
    },
  },
};

/* =========================================================
   TIPOS
   ========================================================= */

interface AsignaturaAnexoI {
  id: number;

  codigo: string;
  nombre: string;

  horasTotales:
    number;

  horasAsistidas:
    number;
}

/* =========================================================
   POST
   ========================================================= */

async function generarDocumento(
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
      cursoAcademicoId <=
        0 ||
      !Number.isInteger(
        matriculaId
      ) ||
      matriculaId <=
        0 ||
      !Number.isInteger(
        anio
      ) ||
      !Number.isInteger(
        mes
      ) ||
      mes < 1 ||
      mes > 12 ||
      mes === 7 ||
      mes === 8
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

    const inicioCurso =
      cursoAcademico
        .fechaInicio
        .getUTCFullYear();

    const anioEsperado =
      obtenerAnioMesCurso(
        inicioCurso,
        mes
      );

    if (
      anio !==
      anioEsperado
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "El mes seleccionado no corresponde al curso académico.",
        },
        {
          status: 400,
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
          id:
            true,

          expediente:
            true,

          gradoId:
            true,

          curso:
            true,

          alumno: {
            select: {
              id:
                true,

              nombre:
                true,

              apellidos:
                true,

              dni:
                true,
            },
          },

          grado: {
            select: {
              id:
                true,

              nombre:
                true,
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
       CENTRO
       ===================================================== */

    const centro =
      await prisma.centro.findFirst({
        where: {
          id:
            sesion.centroId,
        },

        select: {
          nombre:
            true,

          codigo:
            true,
        },
      });

    if (!centro) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "No se han encontrado los datos del centro.",
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

    const asignaturasBase =
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
          id:
            true,

          codigo:
            true,

          nombre:
            true,
        },
      });

    if (
      asignaturasBase.length ===
      0
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "El alumno no tiene asignaturas asociadas a su grado y curso.",
        },
        {
          status: 404,
        }
      );
    }

    /* =====================================================
       HORAS DEL MES
       ===================================================== */

    const asignaturas:
      AsignaturaAnexoI[] =
      [];

    /*
     * Una sola consulta para todas las asignaturas
     * (antes: una consulta por asignatura).
     */

    const asistenciasMes =
      await prisma.asistencia.findMany({
        where: {
          matriculaId,
          anio,
          mes,

          asignaturaId: {
            in: asignaturasBase.map(
              (asignatura) =>
                asignatura.id
            ),
          },
        },

        select: {
          asignaturaId: true,
          horasAsistidas: true,
          horasNoAsistidas: true,
        },
      });

    const asistenciaPorAsignatura =
      new Map(
        asistenciasMes.map(
          (asistencia) => [
            asistencia.asignaturaId,
            asistencia,
          ]
        )
      );

    for (
      const asignatura
      of asignaturasBase
    ) {
      const asistencia =
        asistenciaPorAsignatura.get(
          asignatura.id
        );

      const horasAsistidas =
        Number(
          asistencia
            ?.horasAsistidas ??
          0
        );

      const horasNoAsistidas =
        Number(
          asistencia
            ?.horasNoAsistidas ??
          0
        );

      asignaturas.push({
        id:
          asignatura.id,

        codigo:
          asignatura.codigo,

        nombre:
          asignatura.nombre,

        horasAsistidas,

        horasTotales:
          horasAsistidas +
          horasNoAsistidas,
      });
    }

    /* =====================================================
       PLANTILLA MAESTRA
       ===================================================== */

    let bytesPlantilla:
      Buffer;

    try {
      bytesPlantilla =
        await leerPlantilla(
          RUTA_PLANTILLA
        );
    } catch {
      return NextResponse.json(
        {
          ok: false,
          error:
            "No se ha podido localizar public/plantillas/anexo-i-vacio.pdf.",
        },
        {
          status: 500,
        }
      );
    }

    const plantillaPdf =
      await PDFDocument.load(
        bytesPlantilla
      );

    if (
      plantillaPdf
        .getPages()
        .length ===
      0
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "La plantilla maestra del Anexo I no contiene ninguna página.",
        },
        {
          status: 500,
        }
      );
    }

    /* =====================================================
       NÚMERO DE PÁGINAS
       ===================================================== */

    const maxAsignaturasPagina =
      ANEXO_I
        .tabla
        .maxAsignaturasPagina;

    const numeroPaginas =
      Math.max(
        1,

        Math.ceil(
          asignaturas.length /
          maxAsignaturasPagina
        )
      );

    /* =====================================================
       CREAR PDF FINAL
       ===================================================== */

    const pdf =
      await PDFDocument.create();

    for (
      let indicePagina =
        0;

      indicePagina <
      numeroPaginas;

      indicePagina++
    ) {
      const paginasCopiadas =
        await pdf.copyPages(
          plantillaPdf,
          [
            0,
          ]
        );

      pdf.addPage(
        paginasCopiadas[
          0
        ]
      );
    }

    const paginas =
      pdf.getPages();

    const font =
      await pdf.embedFont(
        StandardFonts.Helvetica
      );

    const fontBold =
      await pdf.embedFont(
        StandardFonts.HelveticaBold
      );

    /* =====================================================
       CABECERA EN TODAS LAS PÁGINAS
       ===================================================== */

    for (
      const pagina
      of paginas
    ) {
      rellenarCabeceraAnexoI(
        pagina,
        font,
        fontBold,
        {
          nombre:
            centro.nombre ??
            "",

          codigo:
            centro.codigo ??
            "",
        },
        {
          nombre:
            matricula.alumno.nombre,

          apellidos:
            matricula.alumno.apellidos,

          dni:
            matricula.alumno.dni,

          expediente:
            matricula.expediente ??
            "",

          gradoNombre:
            matricula.grado.nombre,

          curso:
            matricula.curso,
        },
        cursoAcademico.nombre,
        mes
      );
    }

    /* =====================================================
       PAGINACIÓN
       ===================================================== */

    if (
      paginas.length >
      1
    ) {
      for (
        let indicePagina =
          0;

        indicePagina <
        paginas.length;

        indicePagina++
      ) {
        const pagina =
          paginas[
            indicePagina
          ];

        escribirTextoMM(
          pagina,
          `${indicePagina + 1}/${paginas.length}`,
          13,
          281,
          7,
          font
        );
      }
    }

    /* =====================================================
       ASIGNATURAS POR PÁGINA
       ===================================================== */

    for (
      let indicePagina =
        0;

      indicePagina <
      paginas.length;

      indicePagina++
    ) {
      const pagina =
        paginas[
          indicePagina
        ];

      const desde =
        indicePagina *
        maxAsignaturasPagina;

      const hasta =
        desde +
        maxAsignaturasPagina;

      const asignaturasPagina =
        asignaturas.slice(
          desde,
          hasta
        );

      for (
        let indiceFila =
          0;

        indiceFila <
        asignaturasPagina.length;

        indiceFila++
      ) {
        rellenarFilaAnexoI(
          pagina,
          font,
          asignaturasPagina[
            indiceFila
          ],
          indiceFila
        );
      }

      /*
       * Totales, porcentaje y fecha
       * únicamente en la última página.
       */
      const esUltimaPagina =
        indicePagina ===
        paginas.length -
          1;

      if (
        esUltimaPagina
      ) {
        rellenarResumenAnexoI(
          pagina,
          font,
          asignaturas
        );
      }
    }

    /* =====================================================
       GUARDAR PDF
       ===================================================== */

    const bytesFinales =
      await pdf.save();

    const nombreAlumno =
      limpiarNombreArchivo(
        `${matricula.alumno.apellidos}_${matricula.alumno.nombre}`
      );

    const nombreMes =
      limpiarNombreArchivo(
        obtenerNombreMes(
          mes
        )
      );

    const nombreCurso =
      limpiarNombreArchivo(
        cursoAcademico.nombre
      );

    const nombreArchivo =
      `ANEXO_I_${nombreAlumno}_${nombreMes}_${nombreCurso}.pdf`;

    return new Response(
      Buffer.from(
        bytesFinales
      ),
      {
        status: 200,

        headers: {
          "Content-Type":
            "application/pdf",

          "Content-Disposition":
            `attachment; filename="${nombreArchivo}"`,

          "Cache-Control":
            "no-store",

          "X-Numero-Paginas":
            String(
              numeroPaginas
            ),

          "X-Numero-Asignaturas":
            String(
              asignaturas.length
            ),
        },
      }
    );
  } catch (
    error
  ) {
    console.error(
      "Error generando Anexo I:",
      error
    );

    return NextResponse.json(
      {
        ok: false,

        error:
          error instanceof
          Error
            ? error.message
            : "No se ha podido generar el Anexo I.",
      },
      {
        status: 500,
      }
    );
  }
}

/* =========================================================
   CABECERA
   ========================================================= */

function rellenarCabeceraAnexoI(
  pagina:
    PDFPage,

  font:
    PDFFont,

  fontBold:
    PDFFont,

  centro: {
    nombre: string;
    codigo: string;
  },

  alumno: {
    nombre: string;
    apellidos: string;
    dni: string;
    expediente: string;
    gradoNombre: string;
    curso: number;
  },

  cursoAcademico:
    string,

  mes:
    number
) {
  escribirTextoMM(
    pagina,
    `CURSO ${cursoAcademico.toUpperCase()}`,
    ANEXO_I.cabecera.curso.x,
    ANEXO_I.cabecera.curso.y,
    10.5,
    fontBold
  );

  escribirTextoMM(
    pagina,
    obtenerNombreMes(
      mes
    ),
    ANEXO_I.cabecera.mes.x,
    ANEXO_I.cabecera.mes.y,
    9,
    fontBold
  );

  escribirTextoAjustadoMM(
    pagina,
    centro.nombre,
    ANEXO_I.cabecera.centro.x,
    ANEXO_I.cabecera.centro.y,
    ANEXO_I.cabecera.centro.xMax -
      ANEXO_I.cabecera.centro.x,
    8.5,
    6,
    font
  );

  escribirTextoAjustadoMM(
    pagina,
    centro.codigo,
    ANEXO_I.cabecera.codigoCentro.x,
    ANEXO_I.cabecera.codigoCentro.y,
    ANEXO_I.cabecera.codigoCentro.xMax -
      ANEXO_I.cabecera.codigoCentro.x,
    8.5,
    6,
    font
  );

  escribirTextoAjustadoMM(
    pagina,
    alumno.expediente,
    ANEXO_I.cabecera.expediente.x,
    ANEXO_I.cabecera.expediente.y,
    ANEXO_I.cabecera.expediente.xMax -
      ANEXO_I.cabecera.expediente.x,
    8.5,
    6,
    font
  );

  escribirTextoAjustadoMM(
    pagina,
    `${alumno.nombre} ${alumno.apellidos}`,
    ANEXO_I.cabecera.nombreAlumno.x,
    ANEXO_I.cabecera.nombreAlumno.y,
    ANEXO_I.cabecera.nombreAlumno.xMax -
      ANEXO_I.cabecera.nombreAlumno.x,
    8.5,
    6,
    font
  );

  escribirTextoAjustadoMM(
    pagina,
    alumno.dni,
    ANEXO_I.cabecera.dni.x,
    ANEXO_I.cabecera.dni.y,
    ANEXO_I.cabecera.dni.xMax -
      ANEXO_I.cabecera.dni.x,
    8.5,
    6,
    font
  );

  escribirTextoConSaltoMM(
    pagina,
    alumno.gradoNombre,
    ANEXO_I.cabecera.cicloFormativo.x,
    ANEXO_I.cabecera.cicloFormativo.y,
    ANEXO_I.cabecera.cicloFormativo.xMax -
      ANEXO_I.cabecera.cicloFormativo.x,
    2.4,
    8.2,
    font,
    2,
    6
  );

  escribirTextoAjustadoMM(
    pagina,
    `${alumno.curso}.º`,
    ANEXO_I.cabecera.nivelCurso.x,
    ANEXO_I.cabecera.nivelCurso.y,
    ANEXO_I.cabecera.nivelCurso.xMax -
      ANEXO_I.cabecera.nivelCurso.x,
    8.5,
    6,
    font
  );
}

/* =========================================================
   FILA ASIGNATURA
   ========================================================= */

function rellenarFilaAnexoI(
  pagina:
    PDFPage,

  font:
    PDFFont,

  asignatura:
    AsignaturaAnexoI,

  indiceFila:
    number
) {
  const desplazamiento =
    indiceFila *
    ANEXO_I.tabla.separacionFilas;

  const yAsignatura =
    ANEXO_I
      .tabla
      .primeraFila
      .yInicio +
    desplazamiento;

  const yNumeros =
    ANEXO_I
      .tabla
      .horasTotales
      .yPrimeraFila +
    desplazamiento;

  escribirTextoConSaltoMM(
    pagina,
    asignatura.nombre,
    ANEXO_I.tabla.primeraFila.xInicio,
    yAsignatura,
    ANEXO_I.tabla.primeraFila.xFin -
      ANEXO_I.tabla.primeraFila.xInicio,
    ANEXO_I.tabla.asignatura.interlineado,
    ANEXO_I.tabla.asignatura.tamanoFuente,
    font,
    ANEXO_I.tabla.asignatura.maxLineas,
    ANEXO_I.tabla.asignatura.tamanoFuenteMinimo
  );

  escribirTextoCentradoMM(
    pagina,
    formatearHoras(
      asignatura.horasTotales
    ),
    ANEXO_I.tabla.horasTotales.x,
    yNumeros,
    8,
    font
  );

  escribirTextoCentradoMM(
    pagina,
    formatearHoras(
      asignatura.horasAsistidas
    ),
    ANEXO_I.tabla.horasAsistidas.x,
    yNumeros,
    8,
    font
  );
}

/* =========================================================
   RESUMEN
   ========================================================= */

function rellenarResumenAnexoI(
  pagina:
    PDFPage,

  font:
    PDFFont,

  asignaturas:
    AsignaturaAnexoI[]
) {
  const totalHoras =
    asignaturas.reduce(
      (
        acumulado,
        asignatura
      ) =>
        acumulado +
        asignatura.horasTotales,
      0
    );

  const totalAsistidas =
    asignaturas.reduce(
      (
        acumulado,
        asignatura
      ) =>
        acumulado +
        asignatura.horasAsistidas,
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

  escribirTextoCentradoMM(
    pagina,
    formatearHoras(
      totalHoras
    ),
    ANEXO_I.resumen.totalHoras.x,
    ANEXO_I.resumen.totalHoras.y,
    10,
    font
  );

  escribirTextoCentradoMM(
    pagina,
    formatearHoras(
      totalAsistidas
    ),
    ANEXO_I.resumen.totalAsistidas.x,
    ANEXO_I.resumen.totalAsistidas.y,
    10,
    font
  );

  /*
   * La plantilla ya incluye el símbolo %.
   * Aquí escribimos solo el número.
   */
  const textoPorcentaje =
    totalHoras > 0
      ? porcentaje.toLocaleString(
          "es-ES",
          {
            minimumFractionDigits:
              2,

            maximumFractionDigits:
              2,
          }
        )
      : "0,00";

  escribirTextoCentradoMM(
    pagina,
    textoPorcentaje,
    ANEXO_I.resumen.porcentaje.x,
    ANEXO_I.resumen.porcentaje.y,
    10,
    font
  );

  escribirTextoMM(
    pagina,
    obtenerFechaDocumento(),
    ANEXO_I.certificacion.fecha.x,
    ANEXO_I.certificacion.fecha.y,
    8.5,
    font
  );
}

/* =========================================================
   TEXTO NORMAL
   ========================================================= */

function escribirTextoMM(
  pagina:
    PDFPage,

  texto:
    string,

  xMM:
    number,

  yMM:
    number,

  size:
    number,

  font:
    PDFFont,

  color =
    rgb(
      0,
      0,
      0
    )
) {
  const posicion =
    posicionDesdeMM(
      xMM,
      yMM
    );

  pagina.drawText(
    texto ??
      "",
    {
      x:
        posicion.x,

      y:
        posicion.y,

      size,

      font,

      color,
    }
  );
}

/* =========================================================
   TEXTO AJUSTADO A UN ANCHO
   ========================================================= */

function escribirTextoAjustadoMM(
  pagina:
    PDFPage,

  texto:
    string,

  xMM:
    number,

  yMM:
    number,

  anchoMaximoMM:
    number,

  sizeInicial:
    number,

  sizeMinimo:
    number,

  font:
    PDFFont
) {
  const textoSeguro =
    (
      texto ??
      ""
    ).trim();

  if (!textoSeguro) {
    return;
  }

  const anchoMaximo =
    anchoMaximoMM *
    MM_A_PUNTOS;

  let size =
    sizeInicial;

  while (
    size >
      sizeMinimo &&
    font.widthOfTextAtSize(
      textoSeguro,
      size
    ) >
      anchoMaximo
  ) {
    size -=
      0.25;
  }

  escribirTextoMM(
    pagina,
    textoSeguro,
    xMM,
    yMM,
    size,
    font
  );
}

/* =========================================================
   TEXTO CENTRADO
   ========================================================= */

function escribirTextoCentradoMM(
  pagina:
    PDFPage,

  texto:
    string,

  xCentroMM:
    number,

  yMM:
    number,

  size:
    number,

  font:
    PDFFont,

  color =
    rgb(
      0,
      0,
      0
    )
) {
  const posicion =
    posicionDesdeMM(
      xCentroMM,
      yMM
    );

  const textoSeguro =
    texto ??
    "";

  const anchoTexto =
    font.widthOfTextAtSize(
      textoSeguro,
      size
    );

  pagina.drawText(
    textoSeguro,
    {
      x:
        posicion.x -
        anchoTexto /
          2,

      y:
        posicion.y,

      size,

      font,

      color,
    }
  );
}

/* =========================================================
   TEXTO CON SALTO Y REDUCCIÓN DE FUENTE
   ========================================================= */

function escribirTextoConSaltoMM(
  pagina:
    PDFPage,

  texto:
    string,

  xMM:
    number,

  yMM:
    number,

  anchoMaximoMM:
    number,

  interlineadoMM:
    number,

  sizeInicial:
    number,

  font:
    PDFFont,

  maxLineas =
    2,

  sizeMinimo =
    5.5
) {
  const textoSeguro =
    (
      texto ??
      ""
    ).trim();

  if (!textoSeguro) {
    return;
  }

  let size =
    sizeInicial;

  let lineas =
    dividirTextoEnLineas(
      textoSeguro,
      anchoMaximoMM,
      size,
      font
    );

  while (
    (
      lineas.length >
      maxLineas
    ) &&
    size >
      sizeMinimo
  ) {
    size -=
      0.25;

    lineas =
      dividirTextoEnLineas(
        textoSeguro,
        anchoMaximoMM,
        size,
        font
      );
  }

  lineas =
    lineas.slice(
      0,
      maxLineas
    );

  for (
    let indice =
      0;

    indice <
    lineas.length;

    indice++
  ) {
    escribirTextoMM(
      pagina,
      lineas[
        indice
      ],
      xMM,
      yMM +
        (
          indice *
          interlineadoMM
        ),
      size,
      font
    );
  }
}

function dividirTextoEnLineas(
  texto:
    string,

  anchoMaximoMM:
    number,

  size:
    number,

  font:
    PDFFont
) {
  const palabras =
    texto.split(
      /\s+/
    );

  const anchoMaximo =
    anchoMaximoMM *
    MM_A_PUNTOS;

  const lineas:
    string[] =
    [];

  let actual =
    "";

  for (
    const palabra of
      palabras
  ) {
    const prueba =
      actual
        ? `${actual} ${palabra}`
        : palabra;

    if (
      font.widthOfTextAtSize(
        prueba,
        size
      ) <=
      anchoMaximo
    ) {
      actual =
        prueba;
    } else {
      if (
        actual
      ) {
        lineas.push(
          actual
        );
      }

      actual =
        palabra;
    }
  }

  if (
    actual
  ) {
    lineas.push(
      actual
    );
  }

  return lineas;
}

/* =========================================================
   UTILIDADES
   ========================================================= */

function posicionDesdeMM(
  xMM:
    number,

  yMM:
    number
) {
  return {
    x:
      xMM *
      MM_A_PUNTOS,

    y:
      (
        ALTURA_A4_MM -
        yMM
      ) *
      MM_A_PUNTOS,
  };
}

function formatearHoras(
  valor:
    number
) {
  return Number(
    valor
  ).toLocaleString(
    "es-ES",
    {
      maximumFractionDigits:
        2,
    }
  );
}

function obtenerNombreMes(
  mes:
    number
) {
  const meses = [
    "",
    "ENERO",
    "FEBRERO",
    "MARZO",
    "ABRIL",
    "MAYO",
    "JUNIO",
    "JULIO",
    "AGOSTO",
    "SEPTIEMBRE",
    "OCTUBRE",
    "NOVIEMBRE",
    "DICIEMBRE",
  ];

  return (
    meses[
      mes
    ] ??
    ""
  );
}

function obtenerAnioMesCurso(
  inicioCurso:
    number,

  mes:
    number
) {
  return mes >=
    9
    ? inicioCurso
    : inicioCurso +
        1;
}

function obtenerFechaDocumento() {
  const fecha =
    new Date();

  const dia =
    String(
      fecha.getDate()
    ).padStart(
      2,
      "0"
    );

  const mes =
    String(
      fecha.getMonth() +
        1
    ).padStart(
      2,
      "0"
    );

  const anio =
    fecha.getFullYear();

  return `${dia}/${mes}/${anio}`;
}

function limpiarNombreArchivo(
  texto:
    string
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
   POST
   La generación pasa por el semáforo de PDF para que las
   peticiones simultáneas de muchos centros no saturen la CPU
   del servidor (Anexo I).
   ========================================================= */

export function POST(
  request: Request
) {
  return semaforoPdf.ejecutar(
    () => generarDocumento(request)
  );
}
