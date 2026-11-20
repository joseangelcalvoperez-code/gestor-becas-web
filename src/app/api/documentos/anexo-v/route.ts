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

   Una única página física reutilizable.

   Ruta esperada:
   public/plantillas/anexo-v-vacio.pdf

   El generador copia esa página:
   - una vez para SEP-ENE;
   - una segunda vez cuando el corte llega a FEB-JUN.

   El curso, los meses y las semanas se escriben
   dinámicamente.
   ========================================================= */

const RUTA_PLANTILLA =
  path.join(
    process.cwd(),
    "public",
    "plantillas",
    "anexo-v-vacio.pdf"
  );

/* =========================================================
   TIPOS
   ========================================================= */

interface CoordenadasDia {
  asiste: number;
  noAsiste: number;
}

interface RegistroAsistencia {
  fecha:
    string;

  horasAsistidas:
    number;

  horasNoAsistidas:
    number;
}

interface SemanaMes {
  inicio:
    Date;

  fin:
    Date;
}

interface ConfiguracionBloque {
  mes: {
    xInicio:
      number;

    yInicio:
      number;

    xFin:
      number;

    yFin:
      number;
  };

  yFilas:
    number[];

  resumen: {
    horasTotales: {
      x:
        number;

      y:
        number;
    };

    horasAsistidas: {
      x:
        number;

      y:
        number;
    };

    porcentaje: {
      x:
        number;

      y:
        number;
    };

    observaciones: {
      xInicio:
        number;

      y:
        number;

      xFin:
        number;
    };

    /*
     * Se mantienen aquí también las cajas de firma
     * para que esta calibración pueda reutilizarse
     * después en estampar-pdf.ts.
     *
     * El generador previo a firma NO las utiliza.
     */
    firma: {
      xInicio:
        number;

      yInicio:
        number;

      xFin:
        number;

      yFin:
        number;
    };
  };
}

/* =========================================================
   CONSTANTES PDF
   ========================================================= */

const MM_A_PUNTOS =
  72 / 25.4;

const ALTURA_A4_MM =
  297;

/* =========================================================
   CABECERA
   ========================================================= */

const COORDENADAS_CABECERA = {
  curso: {
    x:
      138.1,

    y:
      36,
  },

  codigoCentro: {
    x:
      140.3,

    y:
      42.3,

    xMax:
      196,
  },

  nombreCentro: {
    x:
      47.2,

    y:
      47.7,

    xMax:
      196,
  },

  nombreAlumno: {
    x:
      47.2,

    y:
      53,

    xMax:
      115.3,
  },

  expediente: {
    x:
      152.7,

    y:
      53,

    xMax:
      196,
  },

  ensenanza: {
    x:
      47.2,

    y:
      58.7,

    xMax:
      196,
  },

  asignatura: {
    x:
      47.2,

    y:
      64,

    xMax:
      196,
  },

  profesor: {
    x:
      47.2,

    y:
      69,

    xMax:
      196,
  },
};

/* =========================================================
   COLUMNAS ASISTENCIA
   ========================================================= */

const COLUMNAS_ASISTENCIA: {
  lunes:
    CoordenadasDia;

  martes:
    CoordenadasDia;

  miercoles:
    CoordenadasDia;

  jueves:
    CoordenadasDia;

  viernes:
    CoordenadasDia;
} = {
  lunes: {
    asiste:
      40.5,

    noAsiste:
      50.7,
  },

  martes: {
    asiste:
      61.2,

    noAsiste:
      71.5,
  },

  miercoles: {
    asiste:
      82.5,

    noAsiste:
      93.3,
  },

  jueves: {
    asiste:
      103.8,

    noAsiste:
      114.3,
  },

  viernes: {
    asiste:
      124.8,

    noAsiste:
      135.4,
  },
};

/* =========================================================
   CINCO BLOQUES DE CADA PÁGINA

   Tabla 1 y tabla 2 usan las coordenadas medidas.
   Tablas 3-5 se han extrapolado a partir de la geometría
   repetitiva de la plantilla y deberán verificarse en la
   primera prueba visual.
   ========================================================= */

const BLOQUES:
  ConfiguracionBloque[] = [
  {
    mes: {
      xInicio:
        9.3,

      yInicio:
        75.6,

      xFin:
        33.5,

      yFin:
        83.2,
    },

    yFilas: [
      89,
      94.2,
      100,
      105.2,
      111,
    ],

    resumen: {
      horasTotales: {
        x:
          158.9,

        y:
          89.8,
      },

      horasAsistidas: {
        x:
          161.8,

        y:
          95.2,
      },

      porcentaje: {
        x:
          157.3,

        y:
          100.7,
      },

      firma: {
        xInicio:
          168.9,

        yInicio:
          87.4,

        xFin:
          196.1,

        yFin:
          100.4,
      },

      observaciones: {
        xInicio:
          142.2,

        y:
          110,

        xFin:
          196.3,
      },
    },
  },

  {
    mes: {
      xInicio:
        9.3,

      yInicio:
        119,

      xFin:
        33.5,

      yFin:
        128.3,
    },

    yFilas: [
      133.6,
      138.8,
      144.6,
      149.8,
      155.6,
    ],

    resumen: {
      horasTotales: {
        x:
          158.9,

        y:
          134.2,
      },

      horasAsistidas: {
        x:
          161.8,

        y:
          140
      },

      porcentaje: {
        x:
          157.3,

        y:
          145.4,
      },

      firma: {
        xInicio:
          168.9,

        yInicio:
          131.7,

        xFin:
          196.1,

        yFin:
          145.6,
      },

      observaciones: {
        xInicio:
          142.2,

        y:
          153.7,

        xFin:
          196.3,
      },
    },
  },

  {
    mes: {
      xInicio:
        9.3,

      yInicio:
        163.8,

      xFin:
        33.5,

      yFin:
        173.1,
    },

    yFilas: [
      178.4,
      183.6,
      189.4,
      194.6,
      200.4,
    ],

    resumen: {
      horasTotales: {
        x:
          158.9,

        y:
          179.1,
      },

      horasAsistidas: {
        x:
          161.8,

        y:
          184.5,
      },

      porcentaje: {
        x:
          157.3,

        y:
          190,
      },

      firma: {
        xInicio:
          168.9,

        yInicio:
          176.5,

        xFin:
          196.1,

        yFin:
          190.4,
      },

      observaciones: {
        xInicio:
          142.2,

        y:
          198.5,

        xFin:
          196.3,
      },
    },
  },

  {
    mes: {
      xInicio:
        9.3,

      yInicio:
        208.1,

      xFin:
        33.5,

      yFin:
        218.1,
    },

    yFilas: [
      222.7,
      227.9,
      233.7,
      238.9,
      244.7,
    ],

    resumen: {
      horasTotales: {
        x:
          158.9,

        y:
          223.6,
      },

      horasAsistidas: {
        x:
          161.8,

        y:
          229,
      },

      porcentaje: {
        x:
          157.3,

        y:
          234.6,
      },

      firma: {
        xInicio:
          168.9,

        yInicio:
          220.8,

        xFin:
          196.1,

        yFin:
          234.7,
      },

      observaciones: {
        xInicio:
          142.2,

        y:
          242.8,

        xFin:
          196.3,
      },
    },
  },

  {
    mes: {
      xInicio:
        9.3,

      yInicio:
        253.1,

      xFin:
        33.5,

      yFin:
        262.6,
    },

    yFilas: [
      267.7,
      272.9,
      278.7,
      283.9,
      289.7,
    ],

    resumen: {
      horasTotales: {
        x:
          158.9,

        y:
          268.3,
      },

      horasAsistidas: {
        x:
          161.8,

        y:
          273.8,
      },

      porcentaje: {
        x:
          157.3,

        y:
          279.3,
      },

      firma: {
        xInicio:
          168.9,

        yInicio:
          265.8,

        xFin:
          196.1,

        yFin:
          279.7,
      },

      observaciones: {
        xInicio:
          142.2,

        y:
          287.8,

        xFin:
          196.3,
      },
    },
  },
];

/* =========================================================
   ORDEN DEL CURSO
   ========================================================= */

const MESES_CURSO = [
  {
    nombre:
      "SEPTIEMBRE",

    numeroMes:
      9,
  },

  {
    nombre:
      "OCTUBRE",

    numeroMes:
      10,
  },

  {
    nombre:
      "NOVIEMBRE",

    numeroMes:
      11,
  },

  {
    nombre:
      "DICIEMBRE",

    numeroMes:
      12,
  },

  {
    nombre:
      "ENERO",

    numeroMes:
      1,
  },

  {
    nombre:
      "FEBRERO",

    numeroMes:
      2,
  },

  {
    nombre:
      "MARZO",

    numeroMes:
      3,
  },

  {
    nombre:
      "ABRIL",

    numeroMes:
      4,
  },

  {
    nombre:
      "MAYO",

    numeroMes:
      5,
  },

  {
    nombre:
      "JUNIO",

    numeroMes:
      6,
  },
];

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

    const asignaturaId =
      Number(
        body.asignaturaId
      );

    const anioCorte =
      Number(
        body.anio
      );

    const mesCorte =
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
        asignaturaId
      ) ||
      asignaturaId <=
        0 ||
      !Number.isInteger(
        anioCorte
      ) ||
      !Number.isInteger(
        mesCorte
      )
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
          id:
            true,

          nombre:
            true,

          fechaInicio:
            true,

          fechaFin:
            true,
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

    /* =====================================================
       MATRÍCULA + ALUMNO + GRADO
       ===================================================== */

    const matricula =
      await prisma.matricula.findFirst({
        where: {
          id:
            matriculaId,

          centroId:
            sesion.centroId,

          cursoAcademicoId,
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
            "No se ha encontrado la matrícula.",
        },
        {
          status: 404,
        }
      );
    }

    /* =====================================================
       ASIGNATURA
       ===================================================== */

    const asignatura =
      await prisma.asignatura.findFirst({
        where: {
          id:
            asignaturaId,

          centroId:
            sesion.centroId,

          gradoId:
            matricula.gradoId,

          curso:
            matricula.curso,
        },

        select: {
          id:
            true,

          codigo:
            true,

          nombre:
            true,

          profesor: {
            select: {
              id:
                true,

              nombre:
                true,

              apellidos:
                true,
            },
          },
        },
      });

    if (!asignatura) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "La asignatura seleccionada no corresponde a la matrícula.",
        },
        {
          status: 404,
        }
      );
    }

    /* =====================================================
       CONVALIDACIÓN
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
          id:
            true,
        },
      });

    if (
      convalidacion
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "No se puede generar el Anexo V porque esta asignatura está convalidada para el alumno.",
        },
        {
          status: 409,
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
       VALIDAR MES DE CORTE
       ===================================================== */

    const indiceCorte =
      MESES_CURSO.findIndex(
        (
          configuracion
        ) =>
          configuracion
            .numeroMes ===
          mesCorte
      );

    if (
      indiceCorte <
      0
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "El mes seleccionado no puede utilizarse para generar el Anexo V.",
        },
        {
          status: 400,
        }
      );
    }

    const inicioCurso =
      obtenerAnioInicioCurso(
        cursoAcademico.fechaInicio
      );

    const anioEsperadoCorte =
      obtenerAnioMesCurso(
        inicioCurso,
        mesCorte
      );

    if (
      anioEsperadoCorte !==
      anioCorte
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

    const mesesAGenerar =
      MESES_CURSO.slice(
        0,
        indiceCorte +
          1
      );

    /* =====================================================
       ABRIR PLANTILLA MAESTRA
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
            "No se ha podido localizar public/plantillas/anexo-v-vacio.pdf.",
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
      plantillaPdf.getPageCount() <
      1
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "La plantilla maestra del Anexo V no contiene ninguna página.",
        },
        {
          status: 500,
        }
      );
    }

    /* =====================================================
       CREAR PDF FINAL

       Una página hasta ENERO.
       Dos páginas desde FEBRERO.
       ===================================================== */

    const numeroPaginas =
      indiceCorte <=
      4
        ? 1
        : 2;

    const pdf =
      await PDFDocument.create();

    for (
      let indicePagina =
        0;

      indicePagina <
      numeroPaginas;

      indicePagina++
    ) {
      const [
        paginaCopiada,
      ] =
        await pdf.copyPages(
          plantillaPdf,
          [
            0,
          ]
        );

      pdf.addPage(
        paginaCopiada
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
      rellenarCabecera(
        pagina,
        font,
        fontBold,
        cursoAcademico.nombre,
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

          expediente:
            matricula.expediente ??
            "",

          gradoNombre:
            matricula.grado.nombre,
        },
        {
          codigo:
            asignatura.codigo ??
            "",

          nombre:
            asignatura.nombre,

          profesorNombre:
            asignatura.profesor.nombre,

          profesorApellidos:
            asignatura.profesor.apellidos,
        }
      );
    }

    /* =====================================================
       ASISTENCIA DE TODOS LOS MESES EN UNA SOLA CONSULTA
       (antes: una consulta por mes)
       ===================================================== */

    const periodosAnexo =
      mesesAGenerar.map(
        (mesConfigurado) => ({
          anio:
            obtenerAnioMesCurso(
              inicioCurso,
              mesConfigurado.numeroMes
            ),

          mes:
            mesConfigurado.numeroMes,
        })
      );

    const asistenciasAnexo =
      await prisma.asistencia.findMany({
        where: {
          matriculaId,
          asignaturaId,

          OR: periodosAnexo,
        },

        select: {
          anio: true,
          mes: true,

          observaciones:
            true,

          dias: {
            orderBy: {
              fecha:
                "asc",
            },

            select: {
              fecha:
                true,

              horasAsistidas:
                true,

              horasNoAsistidas:
                true,
            },
          },
        },
      });

    const asistenciaPorPeriodo =
      new Map(
        asistenciasAnexo.map(
          (registro) => [
            `${registro.anio}-${registro.mes}`,
            registro,
          ]
        )
      );

    /* =====================================================
       RELLENAR MESES HASTA EL CORTE
       ===================================================== */

    for (
      let indiceMesCurso =
        0;

      indiceMesCurso <
      mesesAGenerar.length;

      indiceMesCurso++
    ) {
      const mesConfigurado =
        mesesAGenerar[
          indiceMesCurso
        ];

      const paginaIndice =
        indiceMesCurso <
        5
          ? 0
          : 1;

      const bloqueIndice =
        indiceMesCurso %
        5;

      const pagina =
        paginas[
          paginaIndice
        ];

      const bloque =
        BLOQUES[
          bloqueIndice
        ];

      if (
        !pagina ||
        !bloque
      ) {
        throw new Error(
          `No existe la posición necesaria para ${mesConfigurado.nombre}.`
        );
      }

      const anioMes =
        obtenerAnioMesCurso(
          inicioCurso,
          mesConfigurado.numeroMes
        );

      const asistencia =
        asistenciaPorPeriodo.get(
          `${anioMes}-${mesConfigurado.numeroMes}`
        );

      const registros:
        RegistroAsistencia[] =
        (
          asistencia?.dias ??
          []
        ).map(
          (
            registro
          ) => ({
            fecha:
              convertirFechaISO(
                registro.fecha
              ),

            horasAsistidas:
              Number(
                registro.horasAsistidas
              ),

            horasNoAsistidas:
              Number(
                registro.horasNoAsistidas
              ),
          })
        );

      rellenarMes(
        pagina,
        font,
        fontBold,
        bloque,
        mesConfigurado.nombre,
        mesConfigurado.numeroMes,
        anioMes,
        registros,
        asistencia
          ?.observaciones ??
          ""
      );
    }

    /* =====================================================
       GUARDAR
       ===================================================== */

    const pdfFinal =
      await pdf.save();

    const nombreAlumno =
      limpiarNombreArchivo(
        `${matricula.alumno.apellidos}_${matricula.alumno.nombre}`
      );

    const nombreAsignatura =
      limpiarNombreArchivo(
        asignatura.codigo
          ? `${asignatura.codigo}_${asignatura.nombre}`
          : asignatura.nombre
      );

    const nombreMes =
      MESES_CURSO[
        indiceCorte
      ].nombre;

    const nombreArchivo =
      `ANEXO_V_${nombreAlumno}_${nombreAsignatura}_${nombreMes}_${anioCorte}.pdf`;

    return new Response(
      Buffer.from(
        pdfFinal
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
        },
      }
    );
  } catch (
    error
  ) {
    console.error(
      "Error generando Anexo V:",
      error
    );

    return NextResponse.json(
      {
        ok: false,

        error:
          error instanceof
          Error
            ? error.message
            : "No se ha podido generar el Anexo V.",
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

function rellenarCabecera(
  pagina:
    PDFPage,

  font:
    PDFFont,

  fontBold:
    PDFFont,

  cursoAcademico:
    string,

  centro: {
    nombre: string;
    codigo: string;
  },

  alumno: {
    nombre: string;
    apellidos: string;
    expediente: string;
    gradoNombre: string;
  },

  asignatura: {
    codigo: string;
    nombre: string;
    profesorNombre: string;
    profesorApellidos: string;
  }
) {
  escribirTextoMM(
    pagina,
    `CURSO ${cursoAcademico.toUpperCase()}`,
    COORDENADAS_CABECERA.curso.x,
    COORDENADAS_CABECERA.curso.y,
    9,
    fontBold
  );

  escribirTextoAjustadoMM(
    pagina,
    centro.codigo,
    COORDENADAS_CABECERA.codigoCentro.x,
    COORDENADAS_CABECERA.codigoCentro.y,
    COORDENADAS_CABECERA.codigoCentro.xMax -
      COORDENADAS_CABECERA.codigoCentro.x,
    9,
    6,
    font
  );

  escribirTextoAjustadoMM(
    pagina,
    centro.nombre,
    COORDENADAS_CABECERA.nombreCentro.x,
    COORDENADAS_CABECERA.nombreCentro.y,
    COORDENADAS_CABECERA.nombreCentro.xMax -
      COORDENADAS_CABECERA.nombreCentro.x,
    9,
    6,
    font
  );

  escribirTextoAjustadoMM(
    pagina,
    `${alumno.nombre} ${alumno.apellidos}`,
    COORDENADAS_CABECERA.nombreAlumno.x,
    COORDENADAS_CABECERA.nombreAlumno.y,
    COORDENADAS_CABECERA.nombreAlumno.xMax -
      COORDENADAS_CABECERA.nombreAlumno.x,
    9,
    5.5,
    font
  );

  escribirTextoAjustadoMM(
    pagina,
    alumno.expediente,
    COORDENADAS_CABECERA.expediente.x,
    COORDENADAS_CABECERA.expediente.y,
    COORDENADAS_CABECERA.expediente.xMax -
      COORDENADAS_CABECERA.expediente.x,
    9,
    6,
    font
  );

  escribirTextoAjustadoMM(
    pagina,
    alumno.gradoNombre,
    COORDENADAS_CABECERA.ensenanza.x,
    COORDENADAS_CABECERA.ensenanza.y,
    COORDENADAS_CABECERA.ensenanza.xMax -
      COORDENADAS_CABECERA.ensenanza.x,
    9,
    5.5,
    font
  );

  const textoAsignatura =
    asignatura.codigo
      ? `${asignatura.codigo} - ${asignatura.nombre}`
      : asignatura.nombre;

  escribirTextoAjustadoMM(
    pagina,
    textoAsignatura,
    COORDENADAS_CABECERA.asignatura.x,
    COORDENADAS_CABECERA.asignatura.y,
    COORDENADAS_CABECERA.asignatura.xMax -
      COORDENADAS_CABECERA.asignatura.x,
    9,
    5,
    font
  );

  escribirTextoAjustadoMM(
    pagina,
    `${asignatura.profesorNombre} ${asignatura.profesorApellidos}`,
    COORDENADAS_CABECERA.profesor.x,
    COORDENADAS_CABECERA.profesor.y,
    COORDENADAS_CABECERA.profesor.xMax -
      COORDENADAS_CABECERA.profesor.x,
    9,
    5.5,
    font
  );
}

/* =========================================================
   RELLENAR MES
   ========================================================= */

function rellenarMes(
  pagina:
    PDFPage,

  font:
    PDFFont,

  fontBold:
    PDFFont,

  bloque:
    ConfiguracionBloque,

  nombreMes:
    string,

  numeroMes:
    number,

  anio:
    number,

  registros:
    RegistroAsistencia[],

  observaciones:
    string
) {
  /* =======================================================
     NOMBRE DEL MES
     ======================================================= */

  escribirTextoCentradoEnCajaMM(
    pagina,
    nombreMes.toUpperCase(),
    bloque.mes.xInicio,
    bloque.mes.yInicio,
    bloque.mes.xFin,
    bloque.mes.yFin,
    9,
    fontBold,
    rgb(
      0,
      0,
      0
    )
  );

  /* =======================================================
     SEMANAS REALES DEL MES
     ======================================================= */

  const semanas =
    obtenerSemanasLectivasMes(
      anio,
      numeroMes
    );

  for (
    let indice =
      0;

    indice <
      Math.min(
        semanas.length,
        5
      );

    indice++
  ) {
    const semana =
      semanas[
        indice
      ];

    const y =
      bloque.yFilas[
        indice
      ];

    const etiqueta =
      `${formatearDiaMes(
        semana.inicio
      )} a ${formatearDiaMes(
        semana.fin
      )}`;

    /*
     * El fondo de la plantilla es negro.
     * Texto blanco, negrita y centrado.
     */
    escribirTextoCentradoMM(
      pagina,
      etiqueta,
      (
        15.2 +
        34.3
      ) /
        2,
      y,
      6.2,
      fontBold,
      rgb(
        1,
        1,
        1
      )
    );
  }

  let horasAsistidas =
    0;

  let horasNoAsistidas =
    0;

  /* =======================================================
     DETALLE DIARIO
     ======================================================= */

  for (
    const registro
    of registros
  ) {
    const fecha =
      fechaLocalDesdeISO(
        registro.fecha
      );

    const diaSemana =
      fecha.getDay();

    const coordenadas =
      obtenerCoordenadasDia(
        diaSemana
      );

    /*
     * Sábado y domingo no tienen columna.
     */
    if (
      !coordenadas
    ) {
      continue;
    }

    const indiceSemana =
      semanas.findIndex(
        (
          semana
        ) =>
          fecha >=
            semana.inicio &&
          fecha <=
            semana.fin
      );

    if (
      indiceSemana <
        0 ||
      indiceSemana >
        4
    ) {
      continue;
    }

    const y =
      bloque.yFilas[
        indiceSemana
      ];

    escribirTextoCentradoMM(
      pagina,
      formatearHoras(
        registro.horasAsistidas
      ),
      coordenadas.asiste,
      y,
      6.8,
      font
    );

    escribirTextoCentradoMM(
      pagina,
      formatearHoras(
        registro.horasNoAsistidas
      ),
      coordenadas.noAsiste,
      y,
      6.8,
      font
    );

    horasAsistidas +=
      Number(
        registro.horasAsistidas
      ) ||
      0;

    horasNoAsistidas +=
      Number(
        registro.horasNoAsistidas
      ) ||
      0;
  }

  /* =======================================================
     TOTALES
     ======================================================= */

  const horasTotales =
    horasAsistidas +
    horasNoAsistidas;

  const porcentaje =
    horasTotales >
    0
      ? (
          horasAsistidas /
          horasTotales
        ) *
        100
      : 0;

  escribirTextoMM(
    pagina,
    formatearHoras(
      horasTotales
    ),
    bloque.resumen.horasTotales.x,
    bloque.resumen.horasTotales.y,
    7,
    font
  );

  escribirTextoMM(
    pagina,
    formatearHoras(
      horasAsistidas
    ),
    bloque.resumen.horasAsistidas.x,
    bloque.resumen.horasAsistidas.y,
    7,
    font
  );

  /*
   * La etiqueta del modelo ya indica "% Asistencia:".
   * Aquí conservamos el símbolo porque el valor aparece
   * junto a la etiqueta y no existe un % impreso separado.
   */
  const textoPorcentaje =
    horasTotales >
    0
      ? `${porcentaje.toLocaleString(
          "es-ES",
          {
            minimumFractionDigits:
              2,

            maximumFractionDigits:
              2,
          }
        )}%`
      : "0,00%";

  escribirTextoMM(
    pagina,
    textoPorcentaje,
    bloque.resumen.porcentaje.x,
    bloque.resumen.porcentaje.y,
    7,
    font
  );

  if (
    observaciones.trim()
  ) {
    escribirTextoAjustadoMM(
      pagina,
      observaciones.trim(),
      bloque.resumen.observaciones.xInicio,
      bloque.resumen.observaciones.y,
      bloque.resumen.observaciones.xFin -
        bloque.resumen.observaciones.xInicio,
      7,
      5,
      font
    );
  }
}

/* =========================================================
   SEMANAS DEL MES
   =========================================================

   Se construyen por semanas lunes-domingo.

   Si el mes empieza en sábado o domingo, esa franja inicial
   no contiene ningún día lectivo lunes-viernes y se descarta.
   Con este criterio un mes lectivo cabe en las cinco filas
   del modelo sin mezclar dos lunes, dos martes, etc. en una
   misma fila.
   ========================================================= */

function obtenerSemanasLectivasMes(
  anio:
    number,

  mes:
    number
) {
  const primerDia =
    new Date(
      anio,
      mes - 1,
      1
    );

  const ultimoDia =
    new Date(
      anio,
      mes,
      0
    );

  const inicioPrimeraSemana =
    obtenerLunesSemana(
      primerDia
    );

  const semanas:
    SemanaMes[] =
    [];

  let cursor =
    new Date(
      inicioPrimeraSemana
    );

  while (
    cursor <=
    ultimoDia
  ) {
    const lunes =
      new Date(
        cursor
      );

    const domingo =
      new Date(
        cursor
      );

    domingo.setDate(
      domingo.getDate() +
        6
    );

    const inicio =
      maxFecha(
        lunes,
        primerDia
      );

    const fin =
      minFecha(
        domingo,
        ultimoDia
      );

    /*
     * Solo conservamos la franja si contiene al menos
     * un día de lunes a viernes dentro del mes.
     */
    if (
      contieneDiaLectivo(
        inicio,
        fin
      )
    ) {
      semanas.push({
        inicio,
        fin,
      });
    }

    cursor =
      new Date(
        cursor
      );

    cursor.setDate(
      cursor.getDate() +
        7
    );
  }

  return semanas.slice(
    0,
    5
  );
}

function contieneDiaLectivo(
  inicio:
    Date,

  fin:
    Date
) {
  const cursor =
    new Date(
      inicio
    );

  while (
    cursor <=
    fin
  ) {
    const dia =
      cursor.getDay();

    if (
      dia >=
        1 &&
      dia <=
        5
    ) {
      return true;
    }

    cursor.setDate(
      cursor.getDate() +
        1
    );
  }

  return false;
}

function obtenerLunesSemana(
  fecha:
    Date
) {
  const resultado =
    new Date(
      fecha.getFullYear(),
      fecha.getMonth(),
      fecha.getDate()
    );

  const diaSemana =
    resultado.getDay();

  const desplazamiento =
    diaSemana ===
    0
      ? -6
      : 1 -
        diaSemana;

  resultado.setDate(
    resultado.getDate() +
      desplazamiento
  );

  return resultado;
}

/* =========================================================
   DÍA DE SEMANA
   ========================================================= */

function obtenerCoordenadasDia(
  diaSemana:
    number
): CoordenadasDia | null {
  switch (
    diaSemana
  ) {
    case 1:
      return COLUMNAS_ASISTENCIA
        .lunes;

    case 2:
      return COLUMNAS_ASISTENCIA
        .martes;

    case 3:
      return COLUMNAS_ASISTENCIA
        .miercoles;

    case 4:
      return COLUMNAS_ASISTENCIA
        .jueves;

    case 5:
      return COLUMNAS_ASISTENCIA
        .viernes;

    default:
      return null;
  }
}

/* =========================================================
   TEXTO
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

function escribirTextoCentradoMM(
  pagina:
    PDFPage,

  texto:
    string,

  centroXMM:
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
  const textoSeguro =
    texto ??
    "";

  const ancho =
    font.widthOfTextAtSize(
      textoSeguro,
      size
    );

  const posicion =
    posicionDesdeMM(
      centroXMM,
      yMM
    );

  pagina.drawText(
    textoSeguro,
    {
      x:
        posicion.x -
        ancho /
          2,

      y:
        posicion.y,

      size,

      font,

      color,
    }
  );
}

function escribirTextoCentradoEnCajaMM(
  pagina:
    PDFPage,

  texto:
    string,

  xInicioMM:
    number,

  yInicioMM:
    number,

  xFinMM:
    number,

  yFinMM:
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
  const centroX =
    (
      xInicioMM +
      xFinMM
    ) /
    2;

  /*
   * En coordenadas medidas desde arriba, utilizamos
   * aproximadamente el centro vertical de la caja y
   * compensamos la línea base de pdf-lib.
   */
  const centroY =
    (
      yInicioMM +
      yFinMM
    ) /
      2 +
    1.2;

  escribirTextoCentradoMM(
    pagina,
    texto,
    centroX,
    centroY,
    size,
    font,
    color
  );
}

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
   MM → PDF
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

/* =========================================================
   HORAS / FECHAS
   ========================================================= */

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

function formatearDiaMes(
  fecha:
    Date
) {
  return `${String(
    fecha.getDate()
  ).padStart(
    2,
    "0"
  )}/${String(
    fecha.getMonth() +
      1
  ).padStart(
    2,
    "0"
  )}`;
}

function fechaLocalDesdeISO(
  valor:
    string
) {
  const [
    anio,
    mes,
    dia,
  ] =
    valor.split(
      "-"
    ).map(
      Number
    );

  return new Date(
    anio,
    mes -
      1,
    dia
  );
}

function maxFecha(
  a:
    Date,

  b:
    Date
) {
  return a >
    b
    ? new Date(
        a
      )
    : new Date(
        b
      );
}

function minFecha(
  a:
    Date,

  b:
    Date
) {
  return a <
    b
    ? new Date(
        a
      )
    : new Date(
        b
      );
}

/* =========================================================
   AÑO REAL DE CADA MES
   ========================================================= */

function obtenerAnioInicioCurso(
  fechaInicio:
    Date
) {
  return fechaInicio.getUTCFullYear();
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

/* =========================================================
   FECHA MYSQL → YYYY-MM-DD
   ========================================================= */

function convertirFechaISO(
  fecha:
    Date
) {
  return `${fecha.getUTCFullYear()}-${String(
    fecha.getUTCMonth() +
      1
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

/* =========================================================
   NOMBRE DE ARCHIVO
   ========================================================= */

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
   del servidor (Anexo V).
   ========================================================= */

export function POST(
  request: Request
) {
  return semaforoPdf.ejecutar(
    () => generarDocumento(request)
  );
}
