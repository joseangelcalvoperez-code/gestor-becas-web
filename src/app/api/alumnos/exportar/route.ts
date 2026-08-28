import { NextResponse } from "next/server";
import ExcelJS from "exceljs";

import { prisma } from "@/lib/prisma";
import { obtenerSesion } from "@/lib/session";

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

    /* =====================================================
       CURSO ACADÉMICO SELECCIONADO
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
       CENTRO
       ===================================================== */

    const centro =
      await prisma.centro.findFirst({
        where: {
          id:
            sesion.centroId,
        },

        select: {
          nombre: true,
          codigo: true,
        },
      });

    if (!centro) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "No se ha encontrado el centro.",
        },
        {
          status: 404,
        }
      );
    }

    /* =====================================================
       MATRÍCULAS DEL CURSO SELECCIONADO
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
          expediente: true,
          curso: true,

          alumno: {
            select: {
              nombre: true,
              apellidos: true,
              dni: true,
            },
          },

          grado: {
            select: {
              nombre: true,
            },
          },
        },
      });

    /* =====================================================
       CREAR EXCEL
       ===================================================== */

    const workbook =
      new ExcelJS.Workbook();

    workbook.creator =
      "Gestor Becas";

    workbook.company =
      centro.nombre;

    workbook.created =
      new Date();

    const hoja =
      workbook.addWorksheet(
        "ALUMNOS",
        {
          views: [
            {
              state:
                "frozen",

              ySplit:
                4,
            },
          ],
        }
      );

    /* =====================================================
       TÍTULO
       ===================================================== */

    hoja.mergeCells(
      "A1:F1"
    );

    const titulo =
      hoja.getCell(
        "A1"
      );

    titulo.value =
      "LISTADO DE ALUMNOS";

    titulo.font = {
      bold: true,
      size: 16,
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
    };

    hoja.mergeCells(
      "A2:F2"
    );

    hoja.getCell(
      "A2"
    ).value =
      `${centro.nombre} · Código: ${centro.codigo}`;

    hoja.getCell(
      "A2"
    ).font = {
      italic: true,
      size: 10,
      color: {
        argb:
          "FF65758D",
      },
    };

    hoja.mergeCells(
      "A3:F3"
    );

    hoja.getCell(
      "A3"
    ).value =
      `Curso académico: ${cursoAcademico.nombre}`;

    hoja.getCell(
      "A3"
    ).font = {
      bold: true,
      size: 11,
      color: {
        argb:
          "FFE9423A",
      },
    };

    /* =====================================================
       CABECERAS
       ===================================================== */

    const cabeceras = [
      "NOMBRE",
      "APELLIDOS",
      "DNI/NIE",
      "EXPEDIENTE",
      "GRADO",
      "CURSO",
    ];

    const filaCabecera =
      hoja.getRow(
        4
      );

    cabeceras.forEach(
      (
        texto,
        index
      ) => {
        const celda =
          filaCabecera.getCell(
            index + 1
          );

        celda.value =
          texto;

        celda.font = {
          bold: true,
          size: 10,
          color: {
            argb:
              "FFFFFFFF",
          },
        };

        celda.fill = {
          type:
            "pattern",

          pattern:
            "solid",

          fgColor: {
            argb:
              "FFE9423A",
          },
        };

        celda.alignment = {
          vertical:
            "middle",

          horizontal:
            "center",
        };
      }
    );

    hoja.columns = [
      {
        width: 24,
      },
      {
        width: 34,
      },
      {
        width: 18,
      },
      {
        width: 18,
      },
      {
        width: 42,
      },
      {
        width: 12,
      },
    ];

    /* =====================================================
       ALUMNOS
       ===================================================== */

    let numeroFila =
      5;

    for (
      const matricula
      of matriculas
    ) {
      const fila =
        hoja.getRow(
          numeroFila
        );

      fila.getCell(
        1
      ).value =
        matricula.alumno.nombre;

      fila.getCell(
        2
      ).value =
        matricula.alumno.apellidos;

      fila.getCell(
        3
      ).value =
        matricula.alumno.dni;

      fila.getCell(
        3
      ).numFmt =
        "@";

      fila.getCell(
        4
      ).value =
        matricula.expediente;

      fila.getCell(
        4
      ).numFmt =
        "@";

      fila.getCell(
        5
      ).value =
        matricula.grado.nombre;

      fila.getCell(
        6
      ).value =
        `${matricula.curso}.º`;

      numeroFila++;
    }

    /* =====================================================
       FILTROS
       ===================================================== */

    hoja.autoFilter = {
      from:
        "A4",

      to:
        `F${Math.max(
          4,
          numeroFila - 1
        )}`,
    };

    /* =====================================================
       IDENTIFICAR COMO INFORME NO IMPORTABLE
       ===================================================== */

    const info =
      workbook.addWorksheet(
        "_INFO"
      );

    info.getCell(
      "A1"
    ).value =
      "TIPO_DOCUMENTO";

    info.getCell(
      "B1"
    ).value =
      "LISTADO_ALUMNOS";

    info.getCell(
      "A2"
    ).value =
      "IMPORTABLE";

    info.getCell(
      "B2"
    ).value =
      "NO";

    info.getCell(
      "A3"
    ).value =
      "CURSO_ACADEMICO";

    info.getCell(
      "B3"
    ).value =
      cursoAcademico.nombre;

    info.state =
      "veryHidden";

    /* =====================================================
       DESCARGAR
       ===================================================== */

    const buffer =
      await workbook.xlsx.writeBuffer();

    const nombreArchivo =
      `Listado_Alumnos_${limpiarNombreArchivo(
        cursoAcademico.nombre
      )}_${limpiarNombreArchivo(
        centro.nombre
      )}.xlsx`;

    return new NextResponse(
      buffer,
      {
        status: 200,

        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

          "Content-Disposition":
            `attachment; filename="${nombreArchivo}"`,

          "Cache-Control":
            "no-store",
        },
      }
    );
  } catch (error) {
    console.error(
      "Error exportando alumnos:",
      error
    );

    return NextResponse.json(
      {
        ok: false,

        error:
          "No se ha podido generar el listado de alumnos.",
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