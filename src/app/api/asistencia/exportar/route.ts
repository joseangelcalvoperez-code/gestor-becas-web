import {
  NextResponse,
} from "next/server";

import ExcelJS from "exceljs";

import {
  prisma,
} from "@/lib/prisma";

import {
  obtenerSesion,
} from "@/lib/session";

export const runtime =
  "nodejs";

/* =========================================================
   GET
   EXPORTAR ASISTENCIA MASIVA A EXCEL
   ========================================================= */

export async function GET(
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
       PARÁMETROS
       ===================================================== */

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

    const anio =
      Number(
        url.searchParams.get(
          "anio"
        )
      );

    const mes =
      Number(
        url.searchParams.get(
          "mes"
        )
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
       CENTRO
       ===================================================== */

    const centro =
      await prisma.centro.findFirst({
        where: {
          id:
            sesion.centroId,
        },

        select: {
          id: true,
          nombre: true,
          codigo: true,
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
       MATRÍCULAS ACTIVAS
       ===================================================== */

    const matriculas =
      await prisma.matricula.findMany({
        where: {
          centroId:
            sesion.centroId,

          cursoAcademicoId,

          activo: true,
        },

        orderBy: [
          {
            grado: {
              nombre:
                "asc",
            },
          },
          {
            curso:
              "asc",
          },
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
          gradoId: true,
          curso: true,

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

    if (
      matriculas.length ===
      0
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "No hay alumnos matriculados en el curso académico seleccionado.",
        },
        {
          status: 404,
        }
      );
    }

    /* =====================================================
       ASIGNATURAS DEL CENTRO
       ===================================================== */

    const asignaturas =
      await prisma.asignatura.findMany({
        where: {
          centroId:
            sesion.centroId,
        },

        orderBy: [
          {
            grado: {
              nombre:
                "asc",
            },
          },
          {
            curso:
              "asc",
          },
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
          gradoId: true,
          curso: true,
          codigo: true,
          nombre: true,
        },
      });

    /* =====================================================
       CONVALIDACIONES
       ===================================================== */

    const matriculaIds =
      matriculas.map(
        (
          matricula
        ) =>
          matricula.id
      );

    const convalidaciones =
      await prisma.matriculaAsignaturaConvalidada.findMany({
        where: {
          matriculaId: {
            in:
              matriculaIds,
          },
        },

        select: {
          matriculaId:
            true,

          asignaturaId:
            true,
        },
      });

    const clavesConvalidadas =
      new Set(
        convalidaciones.map(
          (
            item
          ) =>
            `${item.matriculaId}-${item.asignaturaId}`
        )
      );

    /* =====================================================
       COMBINACIONES MATRÍCULA + ASIGNATURA
       ===================================================== */

    const combinaciones =
      matriculas.flatMap(
        (
          matricula
        ) =>
          asignaturas
            .filter(
              (
                asignatura
              ) =>
                asignatura.gradoId ===
                  matricula.gradoId &&
                asignatura.curso ===
                  matricula.curso &&
                !clavesConvalidadas.has(
                  `${matricula.id}-${asignatura.id}`
                )
            )
            .map(
              (
                asignatura
              ) => ({
                matricula,
                asignatura,
              })
            )
      );

    if (
      combinaciones.length ===
      0
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "No hay combinaciones alumno-asignatura disponibles para exportar.",
        },
        {
          status: 404,
        }
      );
    }

    /* =====================================================
       ASISTENCIA EXISTENTE DEL MES
       ===================================================== */

    const asignaturaIds =
      Array.from(
        new Set(
          combinaciones.map(
            (
              item
            ) =>
              item.asignatura.id
          )
        )
      );

    const asistencias =
      await prisma.asistencia.findMany({
        where: {
          matriculaId: {
            in:
              matriculaIds,
          },

          asignaturaId: {
            in:
              asignaturaIds,
          },

          anio,
          mes,
        },

        select: {
          id: true,
          matriculaId: true,
          asignaturaId: true,
          observaciones: true,

          dias: {
            orderBy: {
              fecha:
                "asc",
            },

            select: {
              fecha: true,
              horasAsistidas: true,
              horasNoAsistidas: true,
            },
          },
        },
      });

    const asistenciaPorCombinacion =
      new Map(
        asistencias.map(
          (
            asistencia
          ) => [
            `${asistencia.matriculaId}-${asistencia.asignaturaId}`,
            asistencia,
          ]
        )
      );

    /* =====================================================
       DÍAS LABORABLES DEL MES
       De momento: lunes a viernes.
       No se aplican festivos.
       ===================================================== */

    const diasLaborables =
      obtenerDiasLaborables(
        anio,
        mes
      );

    /* =====================================================
       CREAR EXCEL
       ===================================================== */

    const workbook =
      new ExcelJS.Workbook();

    workbook.creator =
      "Gestor de Becas";

    workbook.created =
      new Date();

    workbook.modified =
      new Date();

    const hoja =
      workbook.addWorksheet(
        "ASISTENCIA",
        {
          views: [
            {
              state:
                "frozen",

              xSplit:
                9,

              ySplit:
                4,
            },
          ],
        }
      );

    /* =====================================================
       TÍTULO
       ===================================================== */

    const numeroColumnas =
      9 +
      diasLaborables.length *
        2 +
      1;

    hoja.mergeCells(
      1,
      1,
      1,
      numeroColumnas
    );

    const titulo =
      hoja.getCell(
        1,
        1
      );

    titulo.value =
      "PLANTILLA MASIVA DE ASISTENCIA";

    titulo.font = {
      bold: true,
      size: 14,
      color: {
        argb:
          "FFFFFFFF",
      },
    };

    titulo.fill = {
      type:
        "pattern",
      pattern:
        "solid",
      fgColor: {
        argb:
          "FF303B50",
      },
    };

    titulo.alignment = {
      vertical:
        "middle",
      horizontal:
        "left",
    };

    hoja.getRow(
      1
    ).height =
      26;

    hoja.mergeCells(
      2,
      1,
      2,
      numeroColumnas
    );

    const subtitulo =
      hoja.getCell(
        2,
        1
      );

    subtitulo.value =
      `${centro.nombre} · Curso ${cursoAcademico.nombre} · ${nombreMes(mes)} ${anio}`;

    subtitulo.font = {
      size: 10,
      color: {
        argb:
          "FF596474",
      },
    };

    subtitulo.alignment = {
      vertical:
        "middle",
      horizontal:
        "left",
    };

    hoja.getRow(
      2
    ).height =
      20;

    /* =====================================================
       CABECERAS
       ===================================================== */

    const filaCabecera =
      4;

    const cabecerasIniciales = [
      "_MATRICULA_ID",
      "_ASIGNATURA_ID",
      "EXPEDIENTE",
      "ALUMNO",
      "DNI/NIE",
      "GRADO",
      "CURSO",
      "CÓDIGO ASIGNATURA",
      "ASIGNATURA",
    ];

    let columna =
      1;

    for (
      const cabecera
      of cabecerasIniciales
    ) {
      hoja.getCell(
        filaCabecera,
        columna
      ).value =
        cabecera;

      columna++;
    }

    for (
      const fecha
      of diasLaborables
    ) {
      const etiqueta =
        `${String(
          fecha.getDate()
        ).padStart(
          2,
          "0"
        )}/${String(
          mes
        ).padStart(
          2,
          "0"
        )}`;

      hoja.getCell(
        filaCabecera,
        columna
      ).value =
        `${etiqueta} ASISTE`;

      hoja.getCell(
        filaCabecera,
        columna + 1
      ).value =
        `${etiqueta} NO ASISTE`;

      columna +=
        2;
    }

    hoja.getCell(
      filaCabecera,
      columna
    ).value =
      "OBSERVACIONES";

    const rangoCabecera =
      hoja.getRow(
        filaCabecera
      );

    rangoCabecera.height =
      34;

    rangoCabecera.eachCell(
      {
        includeEmpty:
          true,
      },
      (
        cell
      ) => {
        cell.font = {
          bold: true,
          size: 9,
          color: {
            argb:
              "FFFFFFFF",
          },
        };

        cell.fill = {
          type:
            "pattern",
          pattern:
            "solid",
          fgColor: {
            argb:
              "FF596474",
          },
        };

        cell.alignment = {
          vertical:
            "middle",
          horizontal:
            "center",
          wrapText:
            true,
        };

        cell.border =
          bordeFino();
      }
    );

    /* =====================================================
       FILAS
       ===================================================== */

    const fechaClave =
      (
        fecha: Date
      ) =>
        `${fecha.getFullYear()}-${String(
          fecha.getMonth() +
            1
        ).padStart(
          2,
          "0"
        )}-${String(
          fecha.getDate()
        ).padStart(
          2,
          "0"
        )}`;

    let fila =
      5;

    for (
      const combinacion
      of combinaciones
    ) {
      const {
        matricula,
        asignatura,
      } =
        combinacion;

      const asistencia =
        asistenciaPorCombinacion.get(
          `${matricula.id}-${asignatura.id}`
        );

      const diasGuardados =
        new Map(
          (
            asistencia?.dias ??
            []
          ).map(
            (
              dia
            ) => [
              fechaClave(
                dia.fecha
              ),
              dia,
            ]
          )
        );

      const valoresFila: (
        string |
        number |
        null
      )[] = [
        matricula.id,
        asignatura.id,
        matricula.expediente ??
          "",
        `${matricula.alumno.apellidos}, ${matricula.alumno.nombre}`,
        matricula.alumno.dni,
        matricula.grado.nombre,
        matricula.curso,
        asignatura.codigo,
        asignatura.nombre,
      ];

      for (
        const fecha
        of diasLaborables
      ) {
        const dia =
          diasGuardados.get(
            fechaClave(
              fecha
            )
          );

        valoresFila.push(
          dia
            ? numeroExcel(
                dia.horasAsistidas
              )
            : null
        );

        valoresFila.push(
          dia
            ? numeroExcel(
                dia.horasNoAsistidas
              )
            : null
        );
      }

      valoresFila.push(
        asistencia?.observaciones ??
          ""
      );

      hoja.addRow(
        valoresFila
      );

      const filaExcel =
        hoja.getRow(
          fila
        );

      filaExcel.height =
        20;

      filaExcel.eachCell(
        {
          includeEmpty:
            true,
        },
        (
          cell,
          numeroColumna
        ) => {
          cell.border =
            bordeFino();

          cell.alignment = {
            vertical:
              "middle",
            horizontal:
              numeroColumna >=
                10 &&
              numeroColumna <
                numeroColumnas
                ? "center"
                : "left",
            wrapText:
              numeroColumna ===
                4 ||
              numeroColumna ===
                6 ||
              numeroColumna ===
                9 ||
              numeroColumna ===
                numeroColumnas,
          };

          cell.font = {
            size: 9,
            color: {
              argb:
                "FF303B50",
            },
          };
        }
      );

      /*
       * Sombrear las columnas NO ASISTE.
       */

      for (
        let indiceDia =
          0;
        indiceDia <
        diasLaborables.length;
        indiceDia++
      ) {
        const columnaNoAsiste =
          11 +
          indiceDia *
            2;

        hoja.getCell(
          fila,
          columnaNoAsiste
        ).fill = {
          type:
            "pattern",
          pattern:
            "solid",
          fgColor: {
            argb:
              "FFF1F3F5",
          },
        };
      }

      fila++;
    }

    /* =====================================================
       FORMATOS DE COLUMNAS
       ===================================================== */

    hoja.getColumn(
      1
    ).hidden =
      true;

    hoja.getColumn(
      2
    ).hidden =
      true;

    hoja.getColumn(
      3
    ).width =
      16;

    hoja.getColumn(
      4
    ).width =
      28;

    hoja.getColumn(
      5
    ).width =
      15;

    hoja.getColumn(
      6
    ).width =
      30;

    hoja.getColumn(
      7
    ).width =
      9;

    hoja.getColumn(
      8
    ).width =
      18;

    hoja.getColumn(
      9
    ).width =
      34;

    for (
      let indiceDia =
        0;
      indiceDia <
      diasLaborables.length;
      indiceDia++
    ) {
      const columnaAsiste =
        10 +
        indiceDia *
          2;

      const columnaNoAsiste =
        columnaAsiste +
        1;

      hoja.getColumn(
        columnaAsiste
      ).width =
        11;

      hoja.getColumn(
        columnaNoAsiste
      ).width =
        13;

      hoja.getCell(
        filaCabecera,
        columnaNoAsiste
      ).fill = {
        type:
          "pattern",
        pattern:
          "solid",
        fgColor: {
          argb:
            "FF707987",
        },
      };
    }

    hoja.getColumn(
      numeroColumnas
    ).width =
      34;

    /* =====================================================
       VALIDACIONES NUMÉRICAS
       ===================================================== */

    const ultimaFila =
      4 +
      combinaciones.length;

    for (
      let indiceDia =
        0;
      indiceDia <
      diasLaborables.length;
      indiceDia++
    ) {
      const columnasHoras = [
        10 +
          indiceDia *
            2,
        11 +
          indiceDia *
            2,
      ];

      for (
        const columnaHoras
        of columnasHoras
      ) {
        for (
          let filaValidacion =
            5;
          filaValidacion <=
          ultimaFila;
          filaValidacion++
        ) {
          hoja.getCell(
            filaValidacion,
            columnaHoras
          ).dataValidation = {
            type:
              "decimal",
            operator:
              "between",
            allowBlank:
              true,
            showErrorMessage:
              true,
            errorStyle:
              "stop",
            errorTitle:
              "Valor no válido",
            error:
              "Introduzca un número entre 0 y 24.",
            formulae: [
              0,
              24,
            ],
          };
        }
      }
    }

    /* =====================================================
       AUTOFILTRO
       ===================================================== */

    hoja.autoFilter = {
      from: {
        row:
          filaCabecera,
        column:
          3,
      },
      to: {
        row:
          ultimaFila,
        column:
          numeroColumnas,
      },
    };

    /* =====================================================
       HOJA DE CONFIGURACIÓN OCULTA
       ===================================================== */

    const configuracion =
      workbook.addWorksheet(
        "_CONFIG"
      );

    configuracion.state =
      "veryHidden";

    const datosConfig = [
      [
        "clave",
        "valor",
      ],
      [
        "tipo",
        "ASISTENCIA",
      ],
      [
        "version",
        "1",
      ],
      [
        "centro_id",
        String(
          centro.id
        ),
      ],
      [
        "curso_academico_id",
        String(
          cursoAcademico.id
        ),
      ],
      [
        "curso_academico",
        cursoAcademico.nombre,
      ],
      [
        "anio",
        String(
          anio
        ),
      ],
      [
        "mes",
        String(
          mes
        ),
      ],
      [
        "mes_nombre",
        nombreMes(
          mes
        ),
      ],
      [
        "filas",
        String(
          combinaciones.length
        ),
      ],
      [
        "generado_en",
        new Date().toISOString(),
      ],
    ];

    for (
      const filaConfig
      of datosConfig
    ) {
      configuracion.addRow(
        filaConfig
      );
    }

    /* =====================================================
       GENERAR BUFFER
       ===================================================== */

    const buffer =
      await workbook.xlsx.writeBuffer();

    const nombreArchivo =
      `ASISTENCIA_${nombreMes(mes)}_${anio}_${limpiarNombreArchivo(
        cursoAcademico.nombre
      )}.xlsx`;

    return new Response(
      Buffer.from(
        buffer
      ),
      {
        status: 200,

        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

          "Content-Disposition":
            `attachment; filename="${nombreArchivo}"`,

          "Cache-Control":
            "no-store",

          "X-Total-Filas":
            String(
              combinaciones.length
            ),

          "X-Total-Alumnos":
            String(
              matriculas.length
            ),
        },
      }
    );
  } catch (
    error
  ) {
    console.error(
      "Error exportando asistencia a Excel:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "No se ha podido generar la plantilla Excel de asistencia.",
      },
      {
        status: 500,
      }
    );
  }
}

/* =========================================================
   DÍAS LABORABLES
   ========================================================= */

function obtenerDiasLaborables(
  anio: number,
  mes: number
) {
  const resultado:
    Date[] =
    [];

  const ultimoDia =
    new Date(
      anio,
      mes,
      0
    ).getDate();

  for (
    let dia = 1;
    dia <=
    ultimoDia;
    dia++
  ) {
    const fecha =
      new Date(
        anio,
        mes - 1,
        dia
      );

    const diaSemana =
      fecha.getDay();

    if (
      diaSemana >= 1 &&
      diaSemana <= 5
    ) {
      resultado.push(
        fecha
      );
    }
  }

  return resultado;
}

/* =========================================================
   VALIDAR MES
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
   NOMBRE MES
   ========================================================= */

function nombreMes(
  mes: number
) {
  const nombres = [
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
    nombres[
      mes
    ] ??
    String(
      mes
    )
  );
}

/* =========================================================
   NÚMERO PARA EXCEL
   ========================================================= */

function numeroExcel(
  valor:
    unknown
) {
  const numero =
    Number(
      valor ??
      0
    );

  return Number.isFinite(
    numero
  )
    ? numero
    : 0;
}

/* =========================================================
   NOMBRE DE ARCHIVO
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
   BORDE
   ========================================================= */

function bordeFino() {
  return {
    top: {
      style:
        "thin" as const,

      color: {
        argb:
          "FFD1D5DB",
      },
    },

    left: {
      style:
        "thin" as const,

      color: {
        argb:
          "FFD1D5DB",
      },
    },

    bottom: {
      style:
        "thin" as const,

      color: {
        argb:
          "FFD1D5DB",
      },
    },

    right: {
      style:
        "thin" as const,

      color: {
        argb:
          "FFD1D5DB",
      },
    },
  };
}