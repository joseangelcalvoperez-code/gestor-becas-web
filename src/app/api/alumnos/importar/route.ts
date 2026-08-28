import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { Buffer } from "node:buffer";

import { prisma } from "@/lib/prisma";
import { obtenerSesion } from "@/lib/session";

interface FilaAlumno {
  fila: number;

  nombre: string;
  apellidos: string;
  dni: string;
  expediente: string;

  grado: string;
  curso: number;
}

interface ErrorFila {
  fila: number;
  mensaje: string;
}

export async function POST(
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

    const formData =
      await request.formData();

    const archivo =
      formData.get(
        "archivo"
      );

    const cursoAcademicoId =
      Number(
        formData.get(
          "cursoAcademicoId"
        )
      );

    if (
      !(archivo instanceof File)
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Debe seleccionar un archivo Excel.",
        },
        {
          status: 400,
        }
      );
    }

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

    const nombreArchivo =
      archivo.name.toLowerCase();

    if (
      !nombreArchivo.endsWith(
        ".xlsx"
      )
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "El archivo debe tener formato .xlsx.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      archivo.size >
      10 * 1024 * 1024
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "El archivo supera el tamaño máximo permitido de 10 MB.",
        },
        {
          status: 400,
        }
      );
    }

    const arrayBuffer =
      await archivo.arrayBuffer();

    const workbook =
      new ExcelJS.Workbook();

    const contenido =
      Buffer.from(
        arrayBuffer
      );

    await workbook.xlsx.load(
      contenido as any
    );

    /* =====================================================
   VALIDAR METADATOS DE LA PLANTILLA
   ===================================================== */

const metadata =
  workbook.getWorksheet(
    "_METADATA"
  );

if (!metadata) {
  return NextResponse.json(
    {
      ok: false,
      error:
        "El archivo no es una plantilla de importación válida. Descargue una nueva plantilla desde la aplicación.",
    },
    {
      status: 400,
    }
  );
}

const tipoDocumento =
  obtenerTextoCelda(
    metadata.getCell(
      "B1"
    ).value
  ).trim();

const cursoPlantillaId =
  Number(
    obtenerTextoCelda(
      metadata.getCell(
        "B2"
      ).value
    )
  );

const cursoPlantillaNombre =
  obtenerTextoCelda(
    metadata.getCell(
      "B3"
    ).value
  ).trim();

if (
  tipoDocumento !==
  "PLANTILLA_IMPORTACION_ALUMNOS"
) {
  return NextResponse.json(
    {
      ok: false,
      error:
        "El archivo seleccionado no es una plantilla válida para importar alumnos.",
    },
    {
      status: 400,
    }
  );
}

/*
 * Comprobamos el curso ANTES
 * de validar ninguna fila.
 */

if (
  cursoPlantillaId !==
  cursoAcademicoId
) {
  return NextResponse.json(
    {
      ok: false,

      error:
        `Esta plantilla pertenece al curso académico ${cursoPlantillaNombre}. ` +
        `Actualmente está seleccionado ${cursoAcademico.nombre}. ` +
        `Seleccione ${cursoPlantillaNombre} para importar este archivo o descargue una nueva plantilla para ${cursoAcademico.nombre}.`,
    },
    {
      status: 409,
    }
  );
}

    const hoja =
      workbook.getWorksheet(
        "ALUMNOS"
      );

    if (!hoja) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'El archivo no contiene la hoja "ALUMNOS".',
        },
        {
          status: 400,
        }
      );
    }

    /* =====================================================
       CABECERAS
       ===================================================== */

    const cabecerasEsperadas = [
      "NOMBRE",
      "APELLIDOS",
      "DNI/NIE",
      "EXPEDIENTE",
      "GRADO",
      "CURSO",
    ];

    const cabecerasRecibidas =
      cabecerasEsperadas.map(
        (
          _,
          index
        ) =>
          obtenerTextoCelda(
            hoja
              .getRow(
                5
              )
              .getCell(
                index + 1
              )
              .value
          )
            .trim()
            .toUpperCase()
      );

    const correctas =
      cabecerasEsperadas.every(
        (
          item,
          index
        ) =>
          item ===
          cabecerasRecibidas[
            index
          ]
      );

    if (!correctas) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "La estructura de la plantilla no es válida. Descargue una nueva plantilla.",
        },
        {
          status: 400,
        }
      );
    }

    /* =====================================================
       GRADOS
       ===================================================== */

    const grados =
      await prisma.grado.findMany({
        where: {
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

    const mapaGrados =
      new Map<
        string,
        {
          id: number;
          nombre: string;
        }
      >();

    for (
      const grado
      of grados
    ) {
      mapaGrados.set(
        normalizarTexto(
          grado.nombre
        ),
        grado
      );
    }

    /* =====================================================
       LEER FILAS
       ===================================================== */

    const filas:
      FilaAlumno[] =
      [];

    const errores:
      ErrorFila[] =
      [];

    for (
      let numeroFila = 6;
      numeroFila <=
      hoja.rowCount;
      numeroFila++
    ) {
      const row =
        hoja.getRow(
          numeroFila
        );

      const nombre =
        obtenerTextoCelda(
          row.getCell(
            1
          ).value
        ).trim();

      const apellidos =
        obtenerTextoCelda(
          row.getCell(
            2
          ).value
        ).trim();

      const dni =
        obtenerTextoCelda(
          row.getCell(
            3
          ).value
        )
          .trim()
          .toUpperCase();

      const expediente =
        obtenerTextoCelda(
          row.getCell(
            4
          ).value
        ).trim();

      const grado =
        obtenerTextoCelda(
          row.getCell(
            5
          ).value
        ).trim();

      const cursoTexto =
        obtenerTextoCelda(
          row.getCell(
            6
          ).value
        ).trim();

      if (
        !nombre &&
        !apellidos &&
        !dni &&
        !expediente &&
        !grado &&
        !cursoTexto
      ) {
        continue;
      }

      const curso =
        Number(
          cursoTexto
        );

      if (!nombre) {
        errores.push({
          fila:
            numeroFila,

          mensaje:
            "Falta el nombre.",
        });
      }

      if (!apellidos) {
        errores.push({
          fila:
            numeroFila,

          mensaje:
            "Faltan los apellidos.",
        });
      }

      if (!dni) {
        errores.push({
          fila:
            numeroFila,

          mensaje:
            "Falta el DNI/NIE.",
        });
      }

      if (!grado) {
        errores.push({
          fila:
            numeroFila,

          mensaje:
            "Falta el grado.",
        });
      } else if (
        !mapaGrados.has(
          normalizarTexto(
            grado
          )
        )
      ) {
        errores.push({
          fila:
            numeroFila,

          mensaje:
            `El grado "${grado}" no existe o no está activo.`,
        });
      }

      if (
        curso !== 1 &&
        curso !== 2
      ) {
        errores.push({
          fila:
            numeroFila,

          mensaje:
            "El curso debe ser 1 o 2.",
        });
      }

      filas.push({
        fila:
          numeroFila,

        nombre,
        apellidos,
        dni,
        expediente,
        grado,
        curso,
      });
    }

    if (
      filas.length ===
      0
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "La plantilla no contiene alumnos para importar.",
        },
        {
          status: 400,
        }
      );
    }

    /* =====================================================
       DNI REPETIDO DENTRO DEL EXCEL
       ===================================================== */

    const dniExcel =
      new Map<
        string,
        number
      >();

    for (
      const fila
      of filas
    ) {
      if (!fila.dni) {
        continue;
      }

      const key =
        fila.dni.toUpperCase();

      const primeraFila =
        dniExcel.get(
          key
        );

      if (
        primeraFila
      ) {
        errores.push({
          fila:
            fila.fila,

          mensaje:
            `El DNI/NIE ${fila.dni} está repetido en la plantilla. También aparece en la fila ${primeraFila}.`,
        });
      } else {
        dniExcel.set(
          key,
          fila.fila
        );
      }
    }

    /* =====================================================
       MATRÍCULAS EXISTENTES EN ESTE CURSO
       ===================================================== */

    const matriculasExistentes =
      await prisma.matricula.findMany({
        where: {
          centroId:
            sesion.centroId,

          cursoAcademicoId,
        },

        select: {
          alumno: {
            select: {
              dni: true,
            },
          },
        },
      });

    const dniYaMatriculados =
      new Set(
        matriculasExistentes.map(
          (
            matricula
          ) =>
            matricula.alumno.dni
              .trim()
              .toUpperCase()
        )
      );

    for (
      const fila
      of filas
    ) {
      if (
        fila.dni &&
        dniYaMatriculados.has(
          fila.dni.toUpperCase()
        )
      ) {
        errores.push({
          fila:
            fila.fila,

          mensaje:
            `El alumno con DNI/NIE ${fila.dni} ya tiene una matrícula en el curso académico ${cursoAcademico.nombre}.`,
        });
      }
    }

    if (
      errores.length >
      0
    ) {
      errores.sort(
        (
          a,
          b
        ) =>
          a.fila -
          b.fila
      );

      return NextResponse.json(
        {
          ok: false,

          error:
            "La plantilla contiene errores. No se ha importado ningún alumno.",

          totalErrores:
            errores.length,

          errores,
        },
        {
          status: 400,
        }
      );
    }

    /* =====================================================
       IMPORTACIÓN
       ===================================================== */

    await prisma.$transaction(
      async (
        tx
      ) => {
        for (
          const fila
          of filas
        ) {
          const grado =
            mapaGrados.get(
              normalizarTexto(
                fila.grado
              )
            );

          if (!grado) {
            throw new Error(
              "Grado no encontrado."
            );
          }

          /*
           * Buscar persona por DNI.
           */

          let alumno =
            await tx.alumno.findFirst({
              where: {
                centroId:
                  sesion.centroId,

                dni:
                  fila.dni,
              },

              select: {
                id: true,
              },
            });

          if (!alumno) {
            alumno =
              await tx.alumno.create({
                data: {
                  centroId:
                    sesion.centroId,

                  nombre:
                    fila.nombre,

                  apellidos:
                    fila.apellidos,

                  dni:
                    fila.dni,

                  activo:
                    true,
                },

                select: {
                  id: true,
                },
              });
          } else {
            await tx.alumno.update({
              where: {
                id:
                  alumno.id,
              },

              data: {
                nombre:
                  fila.nombre,

                apellidos:
                  fila.apellidos,

                activo:
                  true,
              },
            });
          }

          await tx.matricula.create({
            data: {
              centroId:
                sesion.centroId,

              alumnoId:
                alumno.id,

              cursoAcademicoId,

              gradoId:
                grado.id,

              curso:
                fila.curso,

              expediente:
                fila.expediente,

              activo:
                true,
            },
          });
        }
      }
    );

    return NextResponse.json({
      ok: true,

      importados:
        filas.length,

      mensaje:
        `${filas.length} matrícula${filas.length === 1 ? "" : "s"} importada${filas.length === 1 ? "" : "s"} correctamente en ${cursoAcademico.nombre}.`,
    });
  } catch (error) {
    console.error(
      "Error importando alumnos:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          "No se ha podido importar la plantilla.",
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

function obtenerTextoCelda(
  valor:
    ExcelJS.CellValue
): string {
  if (
    valor === null ||
    valor === undefined
  ) {
    return "";
  }

  if (
    typeof valor ===
    "string"
  ) {
    return valor;
  }

  if (
    typeof valor ===
    "number"
  ) {
    return String(
      valor
    );
  }

  if (
    typeof valor ===
    "boolean"
  ) {
    return valor
      ? "TRUE"
      : "FALSE";
  }

  if (
    valor instanceof Date
  ) {
    return valor.toISOString();
  }

  if (
    typeof valor ===
      "object" &&
    valor !== null &&
    "richText" in valor
  ) {
    return (
      valor as ExcelJS.CellRichTextValue
    ).richText
      .map(
        (
          item
        ) =>
          item.text
      )
      .join("");
  }

  if (
    typeof valor ===
      "object" &&
    valor !== null &&
    "text" in valor
  ) {
    return String(
      (
        valor as {
          text?: unknown;
        }
      ).text ?? ""
    );
  }

  if (
    typeof valor ===
      "object" &&
    valor !== null &&
    "result" in valor
  ) {
    const result =
      (
        valor as {
          result?: unknown;
        }
      ).result;

    return result ===
      null ||
      result ===
        undefined
      ? ""
      : String(
          result
        );
  }

  return String(
    valor
  );
}

function normalizarTexto(
  texto:
    string
) {
  return texto
    .trim()
    .toLocaleLowerCase(
      "es-ES"
    )
    .normalize(
      "NFD"
    )
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .replace(
      /\s+/g,
      " "
    );
}