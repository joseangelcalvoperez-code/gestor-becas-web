import {
  NextResponse,
} from "next/server";

import {
  prisma,
} from "@/lib/prisma";

export const runtime =
  "nodejs";

export async function GET(
  request: Request,
  context: {
    params:
      Promise<{
        token: string;
      }>;
  }
) {
  try {
    const {
      token:
        tokenTexto,
    } =
      await context.params;

    const token =
      String(
        tokenTexto ??
          ""
      ).trim();

    if (!token) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "El enlace de firma no es válido.",
        },
        {
          status: 400,
        }
      );
    }

    const firmante =
      await prisma.firmanteEnvio.findUnique({
        where: {
          token,
        },

        select: {
          id: true,
          nombre: true,
          apellidos:
            true,
          dni: true,
          email: true,
          tipo: true,
          estado: true,
          fechaFirma:
            true,

          envioFirma: {
            select: {
              id: true,
              nombre: true,
              estado: true,
              anio: true,
              mes: true,
              createdAt:
                true,

              firmantes: {
                select: { tipo: true, estado: true },
              },

              centro: {
                select: {
                  id: true,
                  nombre: true,
                  codigo: true,
                  localidad:
                    true,
                  provincia:
                    true,
                },
              },

              cursoAcademico: {
                select: {
                  id: true,
                  nombre: true,
                },
              },

              documentos: {
                orderBy: {
                  id:
                    "asc",
                },

                select: {
                  id: true,
                  tipo: true,
                  nombreArchivo:
                    true,
                  estado: true,
                  csv: true,
                  archivoOriginalKey:
                    true,

                  matricula: {
                    select: {
                      id: true,
                      expediente:
                        true,

                      alumno: {
                        select: {
                          id: true,
                          nombre:
                            true,
                          apellidos:
                            true,
                        },
                      },
                    },
                  },

                  asignatura: {
                    select: {
                      id: true,
                      codigo:
                        true,
                      nombre:
                        true,
                    },
                  },

                  firmas: {
                    select: {
                      id: true,
                      firmanteEnvioId:
                        true,
                    },
                  },

                  rechazos: {
                    select: {
                      id: true,
                      firmanteEnvioId:
                        true,
                      observaciones:
                        true,
                      fechaRechazo:
                        true,
                    },
                  },
                },
              },
            },
          },
        },
      });

    if (!firmante) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "El enlace de firma no existe o ha dejado de ser válido.",
        },
        {
          status: 404,
        }
      );
    }

    if (
      firmante.envioFirma.estado ===
      "BORRADOR"
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Los documentos de este envío todavía no están preparados para firma.",
        },
        {
          status: 409,
        }
      );
    }

    if (
      firmante.envioFirma.estado ===
      "CANCELADO"
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Este envío de firma ha sido cancelado.",
        },
        {
          status: 410,
        }
      );
    }

    if (
      firmante.tipo === "DIRECTOR" &&
      firmante.envioFirma.firmantes.some(
        (otro) => otro.tipo === "PROFESOR" && otro.estado !== "FIRMADO"
      )
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: "La firma del director se habilitará cuando hayan firmado todos los profesores.",
        },
        { status: 409 }
      );
    }

    const documentos =
      firmante.envioFirma.documentos
        .filter(
          (
            documento
          ) =>
            Boolean(
              documento.archivoOriginalKey
            )
        )
        .map(
          (
            documento
          ) => {
            const rechazoPropio =
              documento.rechazos.find(
                (
                  rechazo
                ) =>
                  rechazo.firmanteEnvioId ===
                  firmante.id
              ) ??
              null;

            const rechazoOtro =
              documento.rechazos.some(
                (
                  rechazo
                ) =>
                  rechazo.firmanteEnvioId !==
                  firmante.id
              );

            const firmadoPorMi =
              documento.firmas.some(
                (
                  firma
                ) =>
                  firma.firmanteEnvioId ===
                  firmante.id
              );

            return {
              id:
                documento.id,

              tipo:
                documento.tipo,

              nombreArchivo:
                documento.nombreArchivo,

              estado:
                documento.estado,

              csv:
                documento.csv,

              firmadoPorMi,

              rechazo:
                rechazoPropio
                  ? {
                      observaciones:
                        rechazoPropio.observaciones,

                      fechaRechazo:
                        rechazoPropio.fechaRechazo,
                    }
                  : null,

              bloqueadoPorOtroRechazo:
                rechazoOtro,

              alumno:
                documento.matricula
                  ? {
                      id:
                        documento
                          .matricula
                          .alumno
                          .id,

                      nombre:
                        documento
                          .matricula
                          .alumno
                          .nombre,

                      apellidos:
                        documento
                          .matricula
                          .alumno
                          .apellidos,

                      expediente:
                        documento
                          .matricula
                          .expediente,
                    }
                  : null,

              asignatura:
                documento.asignatura
                  ? {
                      id:
                        documento
                          .asignatura
                          .id,

                      codigo:
                        documento
                          .asignatura
                          .codigo,

                      nombre:
                        documento
                          .asignatura
                          .nombre,
                    }
                  : null,
            };
          }
        );

    if (
      documentos.length ===
      0
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Este envío no contiene documentos disponibles para revisar.",
        },
        {
          status: 409,
        }
      );
    }

    const totalRechazados =
      documentos.filter(
        (
          documento
        ) =>
          Boolean(
            documento.rechazo
          )
      ).length;

    const totalFirmados =
      documentos.filter(
        (
          documento
        ) =>
          documento.firmadoPorMi
      ).length;

    const totalBloqueados =
      documentos.filter(
        (
          documento
        ) =>
          documento.bloqueadoPorOtroRechazo
      ).length;

    const totalParaFirmar =
      documentos.filter(
        (
          documento
        ) =>
          !documento.rechazo &&
          !documento.bloqueadoPorOtroRechazo &&
          !documento.firmadoPorMi
      ).length;

    await registrarAcceso(
      request,
      firmante.id,
      firmante.nombre,
      firmante.apellidos,
      firmante.envioFirma.id
    );

    return NextResponse.json({
      ok: true,

      firmante: {
        id:
          firmante.id,

        nombre:
          firmante.nombre,

        apellidos:
          firmante.apellidos,

        dni:
          ocultarDni(
            firmante.dni
          ),

        email:
          firmante.email,

        tipo:
          firmante.tipo,

        estado:
          firmante.estado,

        fechaFirma:
          firmante.fechaFirma,
      },

      envio: {
        id:
          firmante.envioFirma.id,

        nombre:
          firmante.envioFirma.nombre,

        estado:
          firmante.envioFirma.estado,

        anio:
          firmante.envioFirma.anio,

        mes:
          firmante.envioFirma.mes,

        createdAt:
          firmante.envioFirma.createdAt,

        cursoAcademico:
          firmante.envioFirma
            .cursoAcademico,

        centro:
          firmante.envioFirma.centro,
      },

      documentos,

      resumen: {
        totalDocumentos:
          documentos.length,

        totalParaFirmar,

        totalRechazados,

        totalFirmados,

        totalBloqueados,

        procesoFinalizado:
          Boolean(
            firmante.fechaFirma
          ),
      },
    });
  } catch (
    error
  ) {
    console.error(
      "Error cargando portal público de firma:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          "No se ha podido cargar la solicitud de firma.",
      },
      {
        status: 500,
      }
    );
  }
}

async function registrarAcceso(
  request: Request,
  firmanteId: number,
  nombre: string,
  apellidos: string,
  envioFirmaId: number
) {
  const descripcion =
    `Acceso al portal de firma de ${nombre} ${apellidos} (firmante ${firmanteId}).`;

  const haceUnMinuto =
    new Date(
      Date.now() -
        60_000
    );

  const existe =
    await prisma.eventoFirma.findFirst({
      where: {
        envioFirmaId,

        tipo:
          "ACCESO_FIRMANTE",

        descripcion,

        createdAt: {
          gte:
            haceUnMinuto,
        },
      },

      select: {
        id: true,
      },
    });

  if (!existe) {
    await prisma.eventoFirma.create({
      data: {
        envioFirmaId,

        tipo:
          "ACCESO_FIRMANTE",

        descripcion,

        ip:
          obtenerIp(
            request
          ),
      },
    });
  }
}

function ocultarDni(
  dni: string
) {
  if (
    dni.length <=
    4
  ) {
    return dni;
  }

  return `${"*".repeat(
    Math.max(
      0,
      dni.length -
        4
    )
  )}${dni.slice(
    -4
  )}`;
}

function obtenerIp(
  request: Request
) {
  const forwarded =
    request.headers.get(
      "x-forwarded-for"
    );

  if (forwarded) {
    return (
      forwarded
        .split(",")[0]
        ?.trim() ??
      null
    );
  }

  return (
    request.headers.get(
      "x-real-ip"
    ) ??
    null
  );
}
