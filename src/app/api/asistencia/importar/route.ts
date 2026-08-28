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

interface ErrorImportacion {
  fila: number;
  mensaje: string;
}

interface DiaImportado {
  fecha: Date;
  horasAsistidas: number;
  horasNoAsistidas: number;
}

interface FilaImportada {
  filaExcel: number;
  matriculaId: number;
  asignaturaId: number;
  observaciones: string;
  dias: DiaImportado[];
  totalAsistidas: number;
  totalNoAsistidas: number;
}

/* =========================================================
   POST
   IMPORTAR ASISTENCIA MASIVA DESDE EXCEL
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
       FORM DATA
       ===================================================== */

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

    const anio =
      Number(
        formData.get(
          "anio"
        )
      );

    const mes =
      Number(
        formData.get(
          "mes"
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

    if (
      !archivo.name
        .toLowerCase()
        .endsWith(
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
       CARGAR EXCEL
       ===================================================== */

    const workbook =
      new ExcelJS.Workbook();

    const contenido =
      new Uint8Array(
        await archivo.arrayBuffer()
      );

    await workbook.xlsx.load(
      contenido as unknown as Parameters<
        typeof workbook.xlsx.load
      >[0]
    );

    /* =====================================================
       VALIDAR _CONFIG
       ===================================================== */

    const hojaConfig =
      workbook.getWorksheet(
        "_CONFIG"
      );

    if (!hojaConfig) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "El archivo no es una plantilla válida de asistencia: falta la información interna de configuración.",
        },
        {
          status: 400,
        }
      );
    }

    const config =
      leerConfiguracion(
        hojaConfig
      );

    if (
      config.get(
        "tipo"
      ) !== "ASISTENCIA"
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "El archivo seleccionado no es una plantilla de asistencia.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      config.get(
        "version"
      ) !== "1"
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "La versión de la plantilla de asistencia no es compatible.",
        },
        {
          status: 400,
        }
      );
    }

    const centroPlantilla =
      Number(
        config.get(
          "centro_id"
        )
      );

    if (
      centroPlantilla !==
      sesion.centroId
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "La plantilla pertenece a otro centro y no puede importarse aquí.",
        },
        {
          status: 409,
        }
      );
    }

    const cursoPlantilla =
      Number(
        config.get(
          "curso_academico_id"
        )
      );

    const anioPlantilla =
      Number(
        config.get(
          "anio"
        )
      );

    const mesPlantilla =
      Number(
        config.get(
          "mes"
        )
      );

    if (
      cursoPlantilla !==
      cursoAcademicoId
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            `La plantilla corresponde al curso académico ${config.get("curso_academico") ?? "indicado en el archivo"} y está intentando importarla en ${cursoAcademico.nombre}.`,
        },
        {
          status: 409,
        }
      );
    }

    if (
      anioPlantilla !== anio ||
      mesPlantilla !== mes
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            `La plantilla corresponde a ${nombreMes(mesPlantilla)} ${anioPlantilla} y está intentando importarla en ${nombreMes(mes)} ${anio}.`,
        },
        {
          status: 409,
        }
      );
    }

    /* =====================================================
       HOJA ASISTENCIA
       ===================================================== */

    const hoja =
      workbook.getWorksheet(
        "ASISTENCIA"
      );

    if (!hoja) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "La plantilla no contiene la hoja ASISTENCIA.",
        },
        {
          status: 400,
        }
      );
    }

    const diasLaborables =
      obtenerDiasLaborables(
        anio,
        mes
      );

    const cabecerasEsperadas =
      construirCabeceras(
        diasLaborables,
        mes
      );

    const filaCabecera =
      4;

    const errores:
      ErrorImportacion[] =
      [];

    /* =====================================================
       VALIDAR CABECERAS
       ===================================================== */

    for (
      let columna = 1;
      columna <=
      cabecerasEsperadas.length;
      columna++
    ) {
      const recibido =
        valorTextoCelda(
          hoja.getCell(
            filaCabecera,
            columna
          ).value
        );

      const esperado =
        cabecerasEsperadas[
          columna - 1
        ];

      if (
        recibido !==
        esperado
      ) {
        return NextResponse.json(
          {
            ok: false,
            error:
              `La estructura de la plantilla ha sido modificada. En la columna ${columna} se esperaba "${esperado}" y se ha encontrado "${recibido || "(vacío)"}".`,
          },
          {
            status: 400,
          }
        );
      }
    }

    /* =====================================================
       LEER FILAS
       ===================================================== */

    const filasEsperadas =
      Number(
        config.get(
          "filas"
        )
      );

    const primeraFila =
      5;

    const ultimaFilaEsperada =
      primeraFila +
      filasEsperadas -
      1;

    const filasConDatos:
      number[] =
      [];

    for (
      let fila =
        primeraFila;
      fila <=
      hoja.rowCount;
      fila++
    ) {
      const matriculaTexto =
        valorTextoCelda(
          hoja.getCell(
            fila,
            1
          ).value
        );

      const asignaturaTexto =
        valorTextoCelda(
          hoja.getCell(
            fila,
            2
          ).value
        );

      if (
        matriculaTexto ||
        asignaturaTexto
      ) {
        filasConDatos.push(
          fila
        );
      }
    }

    if (
      !Number.isInteger(
        filasEsperadas
      ) ||
      filasEsperadas < 0
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "La plantilla contiene una configuración interna no válida.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      filasConDatos.length !==
      filasEsperadas
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            `La plantilla esperaba ${filasEsperadas} filas de alumno-asignatura y contiene ${filasConDatos.length}. No añada ni elimine filas de la plantilla.`,
        },
        {
          status: 400,
        }
      );
    }

    if (
      filasEsperadas > 0 &&
      filasConDatos.some(
        (
          fila,
          indice
        ) =>
          fila !==
          primeraFila +
            indice
      )
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Se han detectado filas desplazadas, insertadas o eliminadas. Utilice la plantilla sin modificar su estructura.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      filasEsperadas > 0 &&
      filasConDatos[
        filasConDatos.length - 1
      ] !==
        ultimaFilaEsperada
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "La estructura de filas de la plantilla ha sido modificada.",
        },
        {
          status: 400,
        }
      );
    }

    const filasImportadas:
      FilaImportada[] =
      [];

    const combinacionesExcel =
      new Set<string>();

    for (
      const filaExcel
      of filasConDatos
    ) {
      const matriculaId =
        numeroEnteroCelda(
          hoja.getCell(
            filaExcel,
            1
          ).value
        );

      const asignaturaId =
        numeroEnteroCelda(
          hoja.getCell(
            filaExcel,
            2
          ).value
        );

      if (
        !matriculaId ||
        matriculaId <= 0
      ) {
        errores.push({
          fila:
            filaExcel,
          mensaje:
            "El identificador interno de matrícula no es válido.",
        });

        continue;
      }

      if (
        !asignaturaId ||
        asignaturaId <= 0
      ) {
        errores.push({
          fila:
            filaExcel,
          mensaje:
            "El identificador interno de asignatura no es válido.",
        });

        continue;
      }

      const clave =
        `${matriculaId}-${asignaturaId}`;

      if (
        combinacionesExcel.has(
          clave
        )
      ) {
        errores.push({
          fila:
            filaExcel,
          mensaje:
            "La combinación alumno-asignatura está repetida en la plantilla.",
        });

        continue;
      }

      combinacionesExcel.add(
        clave
      );

      const dias:
        DiaImportado[] =
        [];

      let totalAsistidas =
        0;

      let totalNoAsistidas =
        0;

      for (
        let indiceDia = 0;
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

        const celdaAsiste =
          hoja.getCell(
            filaExcel,
            columnaAsiste
          );

        const celdaNoAsiste =
          hoja.getCell(
            filaExcel,
            columnaNoAsiste
          );

        const resultadoAsiste =
          leerHoras(
            celdaAsiste.value
          );

        const resultadoNoAsiste =
          leerHoras(
            celdaNoAsiste.value
          );

        const etiqueta =
          `${String(
            diasLaborables[
              indiceDia
            ].getDate()
          ).padStart(
            2,
            "0"
          )}/${String(
            mes
          ).padStart(
            2,
            "0"
          )}`;

        if (
          !resultadoAsiste.valido
        ) {
          errores.push({
            fila:
              filaExcel,
            mensaje:
              `${etiqueta} ASISTE: ${resultadoAsiste.error}`,
          });
        }

        if (
          !resultadoNoAsiste.valido
        ) {
          errores.push({
            fila:
              filaExcel,
            mensaje:
              `${etiqueta} NO ASISTE: ${resultadoNoAsiste.error}`,
          });
        }

        if (
          !resultadoAsiste.valido ||
          !resultadoNoAsiste.valido
        ) {
          continue;
        }

        const horasAsistidas =
          resultadoAsiste.valor;

        const horasNoAsistidas =
          resultadoNoAsiste.valor;

        if (
          horasAsistidas +
            horasNoAsistidas >
          24
        ) {
          errores.push({
            fila:
              filaExcel,
            mensaje:
              `${etiqueta}: la suma de ASISTE y NO ASISTE no puede superar 24 horas.`,
          });

          continue;
        }

        totalAsistidas +=
          horasAsistidas;

        totalNoAsistidas +=
          horasNoAsistidas;

        /*
         * Una pareja 0/0 o vacía/vacía representa
         * un día sin registro. Al importar el mes completo
         * se eliminará cualquier dato anterior de ese día.
         */

        if (
          horasAsistidas === 0 &&
          horasNoAsistidas === 0
        ) {
          continue;
        }

        dias.push({
          fecha:
            fechaLocalAUtcMediodia(
              diasLaborables[
                indiceDia
              ]
            ),

          horasAsistidas,
          horasNoAsistidas,
        });
      }

      const columnaObservaciones =
        cabecerasEsperadas.length;

      const observaciones =
        valorTextoCelda(
          hoja.getCell(
            filaExcel,
            columnaObservaciones
          ).value
        );

      filasImportadas.push({
        filaExcel,
        matriculaId,
        asignaturaId,
        observaciones,
        dias,
        totalAsistidas,
        totalNoAsistidas,
      });
    }

    if (
      errores.length > 0
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            `La plantilla contiene ${errores.length} error${errores.length === 1 ? "" : "es"}. No se ha guardado ningún dato.`,
          errores:
            limitarErrores(
              errores
            ),
        },
        {
          status: 400,
        }
      );
    }

    /* =====================================================
       VALIDAR MATRÍCULAS Y ASIGNATURAS CONTRA BD
       ===================================================== */

    const matriculaIds =
      Array.from(
        new Set(
          filasImportadas.map(
            (
              fila
            ) =>
              fila.matriculaId
          )
        )
      );

    const asignaturaIds =
      Array.from(
        new Set(
          filasImportadas.map(
            (
              fila
            ) =>
              fila.asignaturaId
          )
        )
      );

    const matriculas =
      await prisma.matricula.findMany({
        where: {
          id: {
            in:
              matriculaIds,
          },

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

    const matriculasPorId =
      new Map(
        matriculas.map(
          (
            matricula
          ) => [
            matricula.id,
            matricula,
          ]
        )
      );

    const asignaturas =
      await prisma.asignatura.findMany({
        where: {
          id: {
            in:
              asignaturaIds,
          },

          centroId:
            sesion.centroId,
        },

        select: {
          id: true,
          gradoId: true,
          curso: true,
          codigo: true,
          nombre: true,
        },
      });

    const asignaturasPorId =
      new Map(
        asignaturas.map(
          (
            asignatura
          ) => [
            asignatura.id,
            asignatura,
          ]
        )
      );

    const convalidaciones =
      await prisma.matriculaAsignaturaConvalidada.findMany({
        where: {
          matriculaId: {
            in:
              matriculaIds,
          },

          asignaturaId: {
            in:
              asignaturaIds,
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

    for (
      const fila
      of filasImportadas
    ) {
      const matricula =
        matriculasPorId.get(
          fila.matriculaId
        );

      const asignatura =
        asignaturasPorId.get(
          fila.asignaturaId
        );

      if (!matricula) {
        errores.push({
          fila:
            fila.filaExcel,
          mensaje:
            "La matrícula ya no existe, está inactiva o no pertenece al curso académico seleccionado.",
        });

        continue;
      }

      if (!asignatura) {
        errores.push({
          fila:
            fila.filaExcel,
          mensaje:
            "La asignatura ya no existe o no pertenece al centro.",
        });

        continue;
      }

      if (
        matricula.gradoId !==
          asignatura.gradoId ||
        matricula.curso !==
          asignatura.curso
      ) {
        errores.push({
          fila:
            fila.filaExcel,
          mensaje:
            "La asignatura no corresponde al grado y curso de esta matrícula.",
        });

        continue;
      }

      if (
        clavesConvalidadas.has(
          `${fila.matriculaId}-${fila.asignaturaId}`
        )
      ) {
        errores.push({
          fila:
            fila.filaExcel,
          mensaje:
            "Esta asignatura está actualmente convalidada para el alumno y no puede importarse asistencia.",
        });

        continue;
      }

      /*
       * También comprobamos las columnas descriptivas.
       * No se utilizan para identificar los registros,
       * pero detectar cambios aquí ayuda a localizar una
       * plantilla manipulada o desactualizada.
       */

      const alumnoExcel =
        valorTextoCelda(
          hoja.getCell(
            fila.filaExcel,
            4
          ).value
        );

      const dniExcel =
        valorTextoCelda(
          hoja.getCell(
            fila.filaExcel,
            5
          ).value
        ).toUpperCase();

      const gradoExcel =
        valorTextoCelda(
          hoja.getCell(
            fila.filaExcel,
            6
          ).value
        );

      const cursoExcel =
        numeroEnteroCelda(
          hoja.getCell(
            fila.filaExcel,
            7
          ).value
        );

      const codigoExcel =
        valorTextoCelda(
          hoja.getCell(
            fila.filaExcel,
            8
          ).value
        );

      const asignaturaExcel =
        valorTextoCelda(
          hoja.getCell(
            fila.filaExcel,
            9
          ).value
        );

      const alumnoEsperado =
        `${matricula.alumno.apellidos}, ${matricula.alumno.nombre}`;

      if (
        alumnoExcel !==
          alumnoEsperado ||
        dniExcel !==
          matricula.alumno.dni.toUpperCase() ||
        gradoExcel !==
          matricula.grado.nombre ||
        cursoExcel !==
          matricula.curso ||
        codigoExcel !==
          asignatura.codigo ||
        asignaturaExcel !==
          asignatura.nombre
      ) {
        errores.push({
          fila:
            fila.filaExcel,
          mensaje:
            "Los datos identificativos de la fila han sido modificados o ya no coinciden con la aplicación. Exporte una plantilla nueva.",
        });
      }
    }

    if (
      errores.length > 0
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            `La plantilla contiene ${errores.length} error${errores.length === 1 ? "" : "es"}. No se ha guardado ningún dato.`,
          errores:
            limitarErrores(
              errores
            ),
        },
        {
          status: 409,
        }
      );
    }

    /* =====================================================
       GUARDADO ATÓMICO
       ===================================================== */

    let diasGuardados =
      0;

    await prisma.$transaction(
      async (
        tx
      ) => {
        const asistenciaIds:
          number[] =
          [];

        const diasParaCrear: {
          asistenciaId: number;
          fecha: Date;
          horasAsistidas: number;
          horasNoAsistidas: number;
        }[] = [];

        for (
          const fila
          of filasImportadas
        ) {
          const asistencia =
            await tx.asistencia.upsert({
              where: {
                matriculaId_asignaturaId_anio_mes:
                  {
                    matriculaId:
                      fila.matriculaId,

                    asignaturaId:
                      fila.asignaturaId,

                    anio,
                    mes,
                  },
              },

              update: {
                horasAsistidas:
                  fila.totalAsistidas,

                horasNoAsistidas:
                  fila.totalNoAsistidas,

                observaciones:
                  fila.observaciones,
              },

              create: {
                centroId:
                  sesion.centroId,

                matriculaId:
                  fila.matriculaId,

                asignaturaId:
                  fila.asignaturaId,

                anio,
                mes,

                horasAsistidas:
                  fila.totalAsistidas,

                horasNoAsistidas:
                  fila.totalNoAsistidas,

                observaciones:
                  fila.observaciones,
              },

              select: {
                id: true,
              },
            });

          asistenciaIds.push(
            asistencia.id
          );

          for (
            const dia
            of fila.dias
          ) {
            diasParaCrear.push({
              asistenciaId:
                asistencia.id,

              fecha:
                dia.fecha,

              horasAsistidas:
                dia.horasAsistidas,

              horasNoAsistidas:
                dia.horasNoAsistidas,
            });
          }
        }

        if (
          asistenciaIds.length >
          0
        ) {
          await tx.asistenciaDia.deleteMany({
            where: {
              asistenciaId: {
                in:
                  asistenciaIds,
              },
            },
          });
        }

        if (
          diasParaCrear.length >
          0
        ) {
          await tx.asistenciaDia.createMany({
            data:
              diasParaCrear,
          });
        }

        diasGuardados =
          diasParaCrear.length;
      },
      {
        maxWait:
          10000,

        timeout:
          120000,
      }
    );

    return NextResponse.json({
      ok: true,
      importados:
        filasImportadas.length,
      diasGuardados,
      mensaje:
        "Asistencia importada correctamente.",
    });
  } catch (
    error
  ) {
    console.error(
      "Error importando asistencia desde Excel:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "No se ha podido importar la plantilla Excel de asistencia.",
      },
      {
        status: 500,
      }
    );
  }
}

/* =========================================================
   CONFIGURACIÓN
   ========================================================= */

function leerConfiguracion(
  hoja: ExcelJS.Worksheet
) {
  const resultado =
    new Map<
      string,
      string
    >();

  hoja.eachRow(
    (
      fila,
      numeroFila
    ) => {
      if (
        numeroFila === 1
      ) {
        return;
      }

      const clave =
        valorTextoCelda(
          fila.getCell(
            1
          ).value
        );

      const valor =
        valorTextoCelda(
          fila.getCell(
            2
          ).value
        );

      if (clave) {
        resultado.set(
          clave,
          valor
        );
      }
    }
  );

  return resultado;
}

/* =========================================================
   CABECERAS
   ========================================================= */

function construirCabeceras(
  diasLaborables: Date[],
  mes: number
) {
  const cabeceras = [
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

    cabeceras.push(
      `${etiqueta} ASISTE`,
      `${etiqueta} NO ASISTE`
    );
  }

  cabeceras.push(
    "OBSERVACIONES"
  );

  return cabeceras;
}

/* =========================================================
   HORAS
   ========================================================= */

function leerHoras(
  valor: ExcelJS.CellValue
): {
  valido: boolean;
  valor: number;
  error?: string;
} {
  if (
    valor === null ||
    valor === undefined ||
    valor === ""
  ) {
    return {
      valido: true,
      valor: 0,
    };
  }

  let valorReal:
    unknown =
    valor;

  if (
    typeof valor ===
      "object" &&
    valor !== null
  ) {
    if (
      "result" in valor
    ) {
      valorReal =
        valor.result;
    } else {
      return {
        valido: false,
        valor: 0,
        error:
          "la celda no contiene un número válido.",
      };
    }
  }

  if (
    typeof valorReal ===
    "string"
  ) {
    const texto =
      valorReal
        .trim()
        .replace(
          ",",
          "."
        );

    if (!texto) {
      return {
        valido: true,
        valor: 0,
      };
    }

    valorReal =
      Number(
        texto
      );
  }

  const numero =
    Number(
      valorReal
    );

  if (
    !Number.isFinite(
      numero
    )
  ) {
    return {
      valido: false,
      valor: 0,
      error:
        "introduzca un valor numérico.",
    };
  }

  if (
    numero < 0 ||
    numero > 24
  ) {
    return {
      valido: false,
      valor: 0,
      error:
        "el valor debe estar entre 0 y 24.",
    };
  }

  return {
    valido: true,
    valor:
      numero,
  };
}

/* =========================================================
   VALORES DE CELDA
   ========================================================= */

function valorTextoCelda(
  valor: ExcelJS.CellValue
) {
  if (
    valor === null ||
    valor === undefined
  ) {
    return "";
  }

  if (
    typeof valor ===
      "string" ||
    typeof valor ===
      "number" ||
    typeof valor ===
      "boolean"
  ) {
    return String(
      valor
    ).trim();
  }

  if (
    valor instanceof Date
  ) {
    return valor.toISOString();
  }

  if (
    typeof valor ===
      "object" &&
    "text" in valor &&
    typeof valor.text ===
      "string"
  ) {
    return valor.text.trim();
  }

  if (
    typeof valor ===
      "object" &&
    "result" in valor
  ) {
    return String(
      valor.result ??
      ""
    ).trim();
  }

  return String(
    valor
  ).trim();
}

function numeroEnteroCelda(
  valor: ExcelJS.CellValue
) {
  const texto =
    valorTextoCelda(
      valor
    );

  if (!texto) {
    return null;
  }

  const numero =
    Number(
      texto
    );

  return Number.isInteger(
    numero
  )
    ? numero
    : null;
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

function fechaLocalAUtcMediodia(
  fecha: Date
) {
  return new Date(
    Date.UTC(
      fecha.getFullYear(),
      fecha.getMonth(),
      fecha.getDate(),
      12,
      0,
      0,
      0
    )
  );
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
   MES
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
   ERRORES
   ========================================================= */

function limitarErrores(
  errores:
    ErrorImportacion[]
) {
  /*
   * Evitamos devolver miles de mensajes al navegador.
   * El contador principal sí mantiene el número total.
   */

  return errores.slice(
    0,
    200
  );
}