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

    const centro =
      await prisma.centro.findFirst({
        where: {
          id:
            sesion.centroId,

          activo:
            true,
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

    const grados =
      await prisma.grado.findMany({
        where: {
          centroId:
            sesion.centroId,

          activo:
            true,
        },

        orderBy: {
          nombre:
            "asc",
        },

        select: {
          nombre: true,
        },
      });

    if (
      grados.length ===
      0
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Debe crear al menos un grado antes de exportar la plantilla.",
        },
        {
          status: 409,
        }
      );
    }

    const workbook =
      new ExcelJS.Workbook();

    workbook.creator =
      "Gestor Becas";

    workbook.company =
      centro.nombre;

    workbook.created =
      new Date();

    /* =====================================================
       HOJA ALUMNOS
       ===================================================== */

    const hoja =
      workbook.addWorksheet(
        "ALUMNOS",
        {
          views: [
            {
              state:
                "frozen",

              ySplit:
                5,
            },
          ],
        }
      );

    hoja.mergeCells(
      "A1:F1"
    );

    const titulo =
      hoja.getCell(
        "A1"
      );

    titulo.value =
      "PLANTILLA DE IMPORTACIÓN DE ALUMNOS";

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

    hoja.mergeCells(
      "A4:F4"
    );

    hoja.getCell(
      "A4"
    ).value =
      "Introduzca un alumno por fila. El DNI puede existir en otros cursos académicos, pero no puede repetirse dentro de este curso.";

    hoja.getCell(
      "A4"
    ).font = {
      size: 10,
      color: {
        argb:
          "FF856719",
      },
    };

    hoja.getCell(
      "A4"
    ).fill = {
      type:
        "pattern",
      pattern:
        "solid",
      fgColor: {
        argb:
          "FFFFF9E8",
      },
    };

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
        5
      );

    cabeceras.forEach(
      (
        cabecera,
        index
      ) => {
        const celda =
          filaCabecera.getCell(
            index + 1
          );

        celda.value =
          cabecera;

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
        key:
          "nombre",
        width: 22,
      },
      {
        key:
          "apellidos",
        width: 32,
      },
      {
        key:
          "dni",
        width: 18,
      },
      {
        key:
          "expediente",
        width: 18,
      },
      {
        key:
          "grado",
        width: 45,
      },
      {
        key:
          "curso",
        width: 14,
      },
    ];

    /* =====================================================
       LISTAS
       ===================================================== */

    const listas =
      workbook.addWorksheet(
        "LISTAS"
      );

    listas.getCell(
      "A1"
    ).value =
      "GRADOS";

    grados.forEach(
      (
        grado,
        index
      ) => {
        listas.getCell(
          `A${index + 2}`
        ).value =
          grado.nombre;
      }
    );

    listas.getCell(
      "B1"
    ).value =
      "CURSOS";

    listas.getCell(
      "B2"
    ).value =
      1;

    listas.getCell(
      "B3"
    ).value =
      2;

    listas.state =
      "veryHidden";

    const ultimaFilaGrados =
      grados.length + 1;

      /* =====================================================
   METADATOS DE LA PLANTILLA
   ===================================================== */

const metadata =
  workbook.addWorksheet(
    "_METADATA"
  );

metadata.getCell("A1").value =
  "TIPO_DOCUMENTO";

metadata.getCell("B1").value =
  "PLANTILLA_IMPORTACION_ALUMNOS";

metadata.getCell("A2").value =
  "CURSO_ACADEMICO_ID";

metadata.getCell("B2").value =
  cursoAcademico.id;

metadata.getCell("A3").value =
  "CURSO_ACADEMICO_NOMBRE";

metadata.getCell("B3").value =
  cursoAcademico.nombre;

metadata.getCell("A4").value =
  "CENTRO_CODIGO";

metadata.getCell("B4").value =
  centro.codigo;

metadata.state =
  "veryHidden";

    /* =====================================================
       FILAS EDITABLES
       ===================================================== */

    for (
      let fila = 6;
      fila <= 505;
      fila++
    ) {
      const row =
        hoja.getRow(
          fila
        );

      row.getCell(
        3
      ).numFmt =
        "@";

      row.getCell(
        4
      ).numFmt =
        "@";

      row.getCell(
        5
      ).dataValidation =
        {
          type:
            "list",

          allowBlank:
            false,

          formulae: [
            `LISTAS!$A$2:$A$${ultimaFilaGrados}`,
          ],

          showErrorMessage:
            true,

          errorTitle:
            "Grado no válido",

          error:
            "Seleccione un grado de la lista.",
        };

      row.getCell(
        6
      ).dataValidation =
        {
          type:
            "list",

          allowBlank:
            false,

          formulae: [
            "LISTAS!$B$2:$B$3",
          ],

          showErrorMessage:
            true,

          errorTitle:
            "Curso no válido",

          error:
            "El curso debe ser 1 o 2.",
        };
    }

    hoja.autoFilter = {
      from:
        "A5",
      to:
        "F505",
    };

    /* =====================================================
       EXPORTAR
       ===================================================== */

    const buffer =
      await workbook.xlsx.writeBuffer();

    const nombreArchivo =
      `Plantilla_Alumnos_${limpiarNombreArchivo(
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
      "Error generando plantilla:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          "No se ha podido generar la plantilla Excel.",
      },
      {
        status: 500,
      }
    );
  }
}

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