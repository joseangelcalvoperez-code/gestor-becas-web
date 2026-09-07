import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { obtenerSesion } from "@/lib/session";

type PeticionAnexoV = {
  tipo: "ANEXO_V";
  cursoAcademicoId: number;
  anio: number;
  mes: number;
  documentos: {
    matriculaId: number;
    asignaturaId: number;
  }[];
};

type PeticionAnexoI = {
  tipo: "ANEXO_I";
  cursoAcademicoId: number;
  anio: number;
  mes: number;
  matriculaIds: number[];
};

type PeticionCrearEnvios =
  | PeticionAnexoV
  | PeticionAnexoI;

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

    const body =
      (await request.json()) as
        Partial<PeticionCrearEnvios>;

    const cursoAcademicoId =
      Number(
        body.cursoAcademicoId
      );

    const anio =
      Number(body.anio);

    const mes =
      Number(body.mes);

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

    if (
      !Number.isInteger(anio) ||
      !Number.isInteger(mes) ||
      mes < 1 ||
      mes > 12
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "El mes seleccionado no es válido.",
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
          fechaInicio: true,
          fechaFin: true,

          centro: {
            select: {
              nombre: true,
              codigo: true,
            },
          },
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

    if (
      body.tipo ===
      "ANEXO_V"
    ) {
      return await crearEnviosAnexoV({
        sesionCentroId:
          sesion.centroId,

        cursoAcademicoId,

        cursoNombre:
          cursoAcademico.nombre,

        centroNombre:
          cursoAcademico.centro.nombre,

        centroCodigo:
          cursoAcademico.centro.codigo,

        anio,
        mes,

        documentos:
          Array.isArray(
            body.documentos
          )
            ? body.documentos
            : [],
      });
    }

    if (
      body.tipo ===
      "ANEXO_I"
    ) {
      return await crearEnviosAnexoI({
        sesionCentroId:
          sesion.centroId,

        cursoAcademicoId,

        cursoNombre:
          cursoAcademico.nombre,

        centroNombre:
          cursoAcademico.centro.nombre,

        centroCodigo:
          cursoAcademico.centro.codigo,

        anio,
        mes,

        matriculaIds:
          Array.isArray(
            body.matriculaIds
          )
            ? body.matriculaIds
            : [],
      });
    }

    return NextResponse.json(
      {
        ok: false,
        error:
          "El tipo de documento no es válido.",
      },
      {
        status: 400,
      }
    );
  } catch (error) {
    console.error(
      "Error creando envíos de firma:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          "No se han podido crear los envíos de firma.",
      },
      {
        status: 500,
      }
    );
  }
}

async function crearEnviosAnexoV({
  sesionCentroId,
  cursoAcademicoId,
  cursoNombre,
  centroNombre,
  centroCodigo,
  anio,
  mes,
  documentos,
}: {
  sesionCentroId: number;
  cursoAcademicoId: number;
  cursoNombre: string;
  centroNombre: string;
  centroCodigo: string;
  anio: number;
  mes: number;
  documentos: {
    matriculaId: number;
    asignaturaId: number;
  }[];
}) {
  const seleccionUnica =
    Array.from(
      new Map(
        documentos.map(
          (item) => [
            `${Number(
              item.matriculaId
            )}-${Number(
              item.asignaturaId
            )}`,
            {
              matriculaId:
                Number(
                  item.matriculaId
                ),

              asignaturaId:
                Number(
                  item.asignaturaId
                ),
            },
          ]
        )
      ).values()
    ).filter(
      (item) =>
        Number.isInteger(
          item.matriculaId
        ) &&
        item.matriculaId > 0 &&
        Number.isInteger(
          item.asignaturaId
        ) &&
        item.asignaturaId > 0
    );

  if (
    seleccionUnica.length ===
    0
  ) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Debe seleccionar al menos un Anexo V.",
      },
      {
        status: 400,
      }
    );
  }

  const matriculaIds =
    [
      ...new Set(
        seleccionUnica.map(
          (item) =>
            item.matriculaId
        )
      ),
    ];

  const asignaturaIds =
    [
      ...new Set(
        seleccionUnica.map(
          (item) =>
            item.asignaturaId
        )
      ),
    ];

  const matriculas =
    await prisma.matricula.findMany({
      where: {
        id: {
          in:
            matriculaIds,
        },

        centroId:
          sesionCentroId,

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
            nombre: true,
          },
        },

        asignaturasConvalidadas: {
          select: {
            asignaturaId:
              true,
          },
        },
      },
    });

  const asignaturas =
    await prisma.asignatura.findMany({
      where: {
        id: {
          in:
            asignaturaIds,
        },

        centroId:
          sesionCentroId,
      },

      select: {
        id: true,
        gradoId: true,
        curso: true,
        codigo: true,
        nombre: true,

        profesor: {
          select: {
            id: true,
            nombre: true,
            apellidos: true,
            dni: true,
            email: true,
          },
        },
      },
    });

  const matriculasMap =
    new Map(
      matriculas.map(
        (item) => [
          item.id,
          item,
        ]
      )
    );

  const asignaturasMap =
    new Map(
      asignaturas.map(
        (item) => [
          item.id,
          item,
        ]
      )
    );

  const validos: {
    matriculaId: number;
    asignaturaId: number;
    expediente: string;
    alumnoNombre: string;
    alumnoApellidos: string;
    alumnoDni: string;
    gradoNombre: string;
    cursoAlumno: number;
    asignaturaCodigo: string;
    asignaturaNombre: string;
    profesor: {
      id: number;
      nombre: string;
      apellidos: string;
      dni: string;
      email: string | null;
    };
  }[] = [];

  for (
    const seleccionado of
      seleccionUnica
  ) {
    const matricula =
      matriculasMap.get(
        seleccionado.matriculaId
      );

    const asignatura =
      asignaturasMap.get(
        seleccionado.asignaturaId
      );

    if (
      !matricula ||
      !asignatura
    ) {
      continue;
    }

    if (
      matricula.gradoId !==
        asignatura.gradoId ||
      matricula.curso !==
        asignatura.curso
    ) {
      continue;
    }

    const convalidada =
      matricula
        .asignaturasConvalidadas
        .some(
          (item) =>
            item.asignaturaId ===
            asignatura.id
        );

    if (convalidada) {
      continue;
    }

    validos.push({
      matriculaId:
        matricula.id,

      asignaturaId:
        asignatura.id,

      expediente:
        matricula.expediente,

      alumnoNombre:
        matricula.alumno.nombre,

      alumnoApellidos:
        matricula.alumno.apellidos,

      alumnoDni:
        matricula.alumno.dni,

      gradoNombre:
        matricula.grado.nombre,

      cursoAlumno:
        matricula.curso,

      asignaturaCodigo:
        asignatura.codigo,

      asignaturaNombre:
        asignatura.nombre,

      profesor:
        asignatura.profesor,
    });
  }

  if (
    validos.length ===
    0
  ) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Ninguno de los Anexos V seleccionados es válido.",
      },
      {
        status: 400,
      }
    );
  }

  const grupos =
    new Map<
      number,
      {
        profesor:
          (typeof validos)[number]["profesor"];

        documentos:
          typeof validos;
      }
    >();

  for (
    const documento of validos
  ) {
    const existente =
      grupos.get(
        documento.profesor.id
      );

    if (existente) {
      existente.documentos.push(
        documento
      );
    } else {
      grupos.set(
        documento.profesor.id,
        {
          profesor:
            documento.profesor,

          documentos: [
            documento,
          ],
        }
      );
    }
  }

  const nombreMes =
    obtenerNombreMes(
      mes
    );

  const creados =
    await prisma.$transaction(
      async (tx) => {
        const resultados: {
          id: number;
          nombre: string;
        }[] = [];

        for (
          const grupo of
            grupos.values()
        ) {
          const envio =
            await tx.envioFirma.create({
              data: {
                centroId:
                  sesionCentroId,

                cursoAcademicoId,

                tipo:
                  "DOCUMENTOS_GENERADOS",

                estado:
                  "BORRADOR",

                nombre:
                  `Anexos V · ${grupo.profesor.nombre} ${grupo.profesor.apellidos} · ${nombreMes} ${anio}`,

                anio,
                mes,

                firmantes: {
                  create: {
                    profesorId:
                      grupo.profesor.id,

                    nombre:
                      grupo.profesor.nombre,

                    apellidos:
                      grupo.profesor.apellidos,

                    dni:
                      grupo.profesor.dni,

                    email:
                      grupo.profesor.email,

                    token:
                      generarToken(),
                  },
                },

                documentos: {
                  create:
                    grupo.documentos.map(
                      (documento) => ({
                        matriculaId:
                          documento.matriculaId,

                        asignaturaId:
                          documento.asignaturaId,

                        tipo:
                          "ANEXO_V",

                        nombreArchivo:
                          crearNombreAnexoV(
                            documento.alumnoApellidos,
                            documento.alumnoNombre,
                            documento.asignaturaCodigo,
                            documento.asignaturaNombre,
                            anio,
                            mes
                          ),

                        archivoOriginalKey:
                          null,

                        hashOriginal:
                          null,

                        csv:
                          generarCsv(),

                        /*
                         * SNAPSHOT HISTÓRICO
                         * ------------------
                         * Copiamos aquí los datos esenciales tal
                         * y como son en el momento de preparar el
                         * documento. Aunque después desaparezcan
                         * matrícula/curso/asignatura, la evidencia
                         * podrá seguir mostrando estos valores.
                         */
                        snapshotCentroNombre:
                          centroNombre,

                        snapshotCentroCodigo:
                          centroCodigo,

                        snapshotCursoAcademicoNombre:
                          cursoNombre,

                        snapshotAlumnoNombre:
                          documento.alumnoNombre,

                        snapshotAlumnoApellidos:
                          documento.alumnoApellidos,

                        snapshotAlumnoDni:
                          documento.alumnoDni,

                        snapshotExpediente:
                          documento.expediente,

                        snapshotGradoNombre:
                          documento.gradoNombre,

                        snapshotCursoAlumno:
                          documento.cursoAlumno,

                        snapshotAsignaturaCodigo:
                          documento.asignaturaCodigo,

                        snapshotAsignaturaNombre:
                          documento.asignaturaNombre,

                        snapshotCapturadoEn:
                          new Date(),

                        estado:
                          "PENDIENTE",

                        anio,
                        mes,
                      })
                    ),
                },

                eventos: {
                  create: {
                    tipo:
                      "ENVIO_CREADO",

                    descripcion:
                      `Envío preparado con ${grupo.documentos.length} Anexo${grupo.documentos.length === 1 ? "" : "s"} V del curso ${cursoNombre}.`,
                  },
                },
              },

              select: {
                id: true,
                nombre: true,
              },
            });

          resultados.push(
            envio
          );
        }

        return resultados;
      }
    );

  return NextResponse.json({
    ok: true,

    tipo:
      "ANEXO_V",

    enviosCreados:
      creados.length,

    documentosCreados:
      validos.length,

    envios:
      creados,
  });
}

async function crearEnviosAnexoI({
  sesionCentroId,
  cursoAcademicoId,
  cursoNombre,
  centroNombre,
  centroCodigo,
  anio,
  mes,
  matriculaIds,
}: {
  sesionCentroId: number;
  cursoAcademicoId: number;
  cursoNombre: string;
  centroNombre: string;
  centroCodigo: string;
  anio: number;
  mes: number;
  matriculaIds: number[];
}) {
  const centroFirma = await prisma.centro.findUnique({
    where: { id: sesionCentroId },
    select: {
      directorNombre: true,
      directorApellidos: true,
      directorDni: true,
      directorEmail: true,
      selloFirmaUrl: true,
    },
  });

  if (
    !centroFirma?.directorNombre ||
    !centroFirma.directorApellidos ||
    !centroFirma.directorDni ||
    !centroFirma.directorEmail ||
    !centroFirma.selloFirmaUrl
  ) {
    return NextResponse.json(
      {
        ok: false,
        error: "Antes de preparar Anexos I debe completar los datos del director y configurar el sello en CENTRO.",
      },
      { status: 409 }
    );
  }

  const director = {
    nombre: centroFirma.directorNombre,
    apellidos: centroFirma.directorApellidos,
    dni: centroFirma.directorDni,
    email: centroFirma.directorEmail,
  } as const;
  const ids =
    [
      ...new Set(
        matriculaIds
          .map(Number)
          .filter(
            (id) =>
              Number.isInteger(
                id
              ) &&
              id > 0
          )
      ),
    ];

  if (
    ids.length ===
    0
  ) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Debe seleccionar al menos un Anexo I.",
      },
      {
        status: 400,
      }
    );
  }

  const matriculas =
    await prisma.matricula.findMany({
      where: {
        id: {
          in:
            ids,
        },

        centroId:
          sesionCentroId,

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
            nombre: true,
          },
        },

        asignaturasConvalidadas: {
          select: {
            asignaturaId:
              true,
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
          "No se han encontrado matrículas válidas.",
      },
      {
        status: 400,
      }
    );
  }

  const gradosCursos =
    Array.from(
      new Map(
        matriculas.map(
          (matricula) => [
            `${matricula.gradoId}-${matricula.curso}`,
            {
              gradoId:
                matricula.gradoId,

              curso:
                matricula.curso,
            },
          ]
        )
      ).values()
    );

  const asignaturas =
    await prisma.asignatura.findMany({
      where: {
        centroId:
          sesionCentroId,

        OR:
          gradosCursos.map(
            (item) => ({
              gradoId:
                item.gradoId,

              curso:
                item.curso,
            })
          ),
      },

      select: {
        id: true,
        gradoId: true,
        curso: true,

        profesor: {
          select: {
            id: true,
            nombre: true,
            apellidos: true,
            dni: true,
            email: true,
          },
        },
      },
    });

  const nombreMes =
    obtenerNombreMes(
      mes
    );

  const creados =
    await prisma.$transaction(
      async (tx) => {
        const resultados: {
          id: number;
          nombre: string;
        }[] = [];

        for (
          const matricula of
            matriculas
        ) {
          const convalidadas =
            new Set(
              matricula
                .asignaturasConvalidadas
                .map(
                  (item) =>
                    item.asignaturaId
                )
            );

          const asignaturasMatricula =
            asignaturas.filter(
              (asignatura) =>
                asignatura.gradoId ===
                  matricula.gradoId &&
                asignatura.curso ===
                  matricula.curso &&
                !convalidadas.has(
                  asignatura.id
                )
            );

          if (
            asignaturasMatricula.length ===
            0
          ) {
            continue;
          }

          const profesores =
            Array.from(
              new Map(
                asignaturasMatricula.map(
                  (asignatura) => [
                    asignatura.profesor.id,
                    asignatura.profesor,
                  ]
                )
              ).values()
            );

          const envio =
            await tx.envioFirma.create({
              data: {
                centroId:
                  sesionCentroId,

                cursoAcademicoId,

                tipo:
                  "DOCUMENTOS_GENERADOS",

                estado:
                  "BORRADOR",

                nombre:
                  `Anexo I · ${matricula.alumno.apellidos}, ${matricula.alumno.nombre} · ${nombreMes} ${anio}`,

                anio,
                mes,

                documentos: {
                  create: {
                    matriculaId:
                      matricula.id,

                    asignaturaId:
                      null,

                    tipo:
                      "ANEXO_I",

                    nombreArchivo:
                      crearNombreAnexoI(
                        matricula.alumno.apellidos,
                        matricula.alumno.nombre,
                        anio,
                        mes
                      ),

                    archivoOriginalKey:
                      null,

                    hashOriginal:
                      null,

                    csv:
                      generarCsv(),

                    /*
                     * SNAPSHOT HISTÓRICO DEL ANEXO I.
                     *
                     * En ANEXO I no existe una única asignatura,
                     * por eso snapshotAsignaturaCodigo y
                     * snapshotAsignaturaNombre quedan a NULL.
                     */
                    snapshotCentroNombre:
                      centroNombre,

                    snapshotCentroCodigo:
                      centroCodigo,

                    snapshotCursoAcademicoNombre:
                      cursoNombre,

                    snapshotAlumnoNombre:
                      matricula.alumno.nombre,

                    snapshotAlumnoApellidos:
                      matricula.alumno.apellidos,

                    snapshotAlumnoDni:
                      matricula.alumno.dni,

                    snapshotExpediente:
                      matricula.expediente,

                    snapshotGradoNombre:
                      matricula.grado.nombre,

                    snapshotCursoAlumno:
                      matricula.curso,

                    snapshotAsignaturaCodigo:
                      null,

                    snapshotAsignaturaNombre:
                      null,

                    snapshotCapturadoEn:
                      new Date(),

                    estado:
                      "PENDIENTE",

                    anio,
                    mes,
                  },
                },

                firmantes: {
                  create: [
                    ...profesores.map(
                      (profesor) => ({
                        tipo: "PROFESOR" as const,
                        profesorId:
                          profesor.id,

                        nombre:
                          profesor.nombre,

                        apellidos:
                          profesor.apellidos,

                        dni:
                          profesor.dni,

                        email:
                          profesor.email,

                        token:
                          generarToken(),
                      })
                    ),
                    {
                      tipo: "DIRECTOR" as const,
                      profesorId: null,
                      nombre: director.nombre,
                      apellidos: director.apellidos,
                      dni: director.dni,
                      email: director.email,
                      token: generarToken(),
                    },
                  ],
                },

                eventos: {
                  create: {
                    tipo:
                      "ENVIO_CREADO",

                    descripcion:
                      `Anexo I preparado para ${profesores.length} profesor${profesores.length === 1 ? "" : "es"} y la firma final del director del curso ${cursoNombre}.`,
                  },
                },
              },

              select: {
                id: true,
                nombre: true,
              },
            });

          resultados.push(
            envio
          );
        }

        return resultados;
      }
    );

  if (
    creados.length ===
    0
  ) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "No se ha podido crear ningún Anexo I con las matrículas seleccionadas.",
      },
      {
        status: 400,
      }
    );
  }

  return NextResponse.json({
    ok: true,

    tipo:
      "ANEXO_I",

    enviosCreados:
      creados.length,

    documentosCreados:
      creados.length,

    envios:
      creados,
  });
}

function generarToken() {
  return randomUUID()
    .replaceAll(
      "-",
      ""
    );
}

function generarCsv() {
  const valor =
    randomUUID()
      .replaceAll(
        "-",
        ""
      )
      .toUpperCase();

  return [
    valor.slice(
      0,
      8
    ),

    valor.slice(
      8,
      16
    ),

    valor.slice(
      16,
      24
    ),

    valor.slice(
      24,
      32
    ),
  ].join("-");
}

function obtenerNombreMes(
  mes: number
) {
  return new Intl.DateTimeFormat(
    "es-ES",
    {
      month:
        "long",
    }
  )
    .format(
      new Date(
        2026,
        mes - 1,
        1
      )
    )
    .toUpperCase();
}

function limpiarNombreArchivo(
  valor: string
) {
  return valor
    .normalize("NFD")
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

function crearNombreAnexoV(
  apellidos: string,
  nombre: string,
  codigo: string,
  asignatura: string,
  anio: number,
  mes: number
) {
  return `${limpiarNombreArchivo(
    `ANEXO_V_${apellidos}_${nombre}_${codigo}_${asignatura}_${anio}_${String(
      mes
    ).padStart(
      2,
      "0"
    )}`
  )}.pdf`;
}

function crearNombreAnexoI(
  apellidos: string,
  nombre: string,
  anio: number,
  mes: number
) {
  return `${limpiarNombreArchivo(
    `ANEXO_I_${apellidos}_${nombre}_${anio}_${String(
      mes
    ).padStart(
      2,
      "0"
    )}`
  )}.pdf`;
}

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
