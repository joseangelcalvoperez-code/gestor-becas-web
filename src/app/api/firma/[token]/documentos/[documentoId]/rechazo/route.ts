import {
  NextResponse,
} from "next/server";

import {
  prisma,
} from "@/lib/prisma";

export const runtime =
  "nodejs";

export async function POST(
  request: Request,
  context: {
    params:
      Promise<{
        token: string;
        documentoId:
          string;
      }>;
  }
) {
  try {
    const datos =
      await resolverPeticion(
        request,
        context
      );

    if (
      datos instanceof
      NextResponse
    ) {
      return datos;
    }

    const body =
      await request.json();

    const observaciones =
      String(
        body.observaciones ??
          ""
      ).trim();

    if (
      observaciones.length >
      2000
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Las observaciones no pueden superar los 2000 caracteres.",
        },
        {
          status: 400,
        }
      );
    }

    const firmaExistente =
      await prisma.firmaDocumento.findUnique({
        where: {
          documentoFirmaId_firmanteEnvioId: {
            documentoFirmaId:
              datos.documento.id,

            firmanteEnvioId:
              datos.firmante.id,
          },
        },

        select: {
          id: true,
        },
      });

    if (
      firmaExistente
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Este documento ya ha sido firmado y no puede rechazarse.",
        },
        {
          status: 409,
        }
      );
    }

    const ahora =
      new Date();

    await prisma.$transaction(
      async (
        tx
      ) => {
        await tx.rechazoDocumentoFirma.upsert({
          where: {
            documentoFirmaId_firmanteEnvioId: {
              documentoFirmaId:
                datos.documento.id,

              firmanteEnvioId:
                datos.firmante.id,
            },
          },

          update: {
            observaciones:
              observaciones ||
              null,

            fechaRechazo:
              ahora,

            ip:
              obtenerIp(
                request
              ),

            userAgent:
              request.headers.get(
                "user-agent"
              ),
          },

          create: {
            documentoFirmaId:
              datos.documento.id,

            firmanteEnvioId:
              datos.firmante.id,

            observaciones:
              observaciones ||
              null,

            fechaRechazo:
              ahora,

            ip:
              obtenerIp(
                request
              ),

            userAgent:
              request.headers.get(
                "user-agent"
              ),
          },
        });

        await tx.documentoFirma.update({
          where: {
            id:
              datos.documento.id,
          },

          data: {
            estado:
              "RECHAZADO",
          },
        });

        await tx.eventoFirma.create({
          data: {
            envioFirmaId:
              datos.firmante.envioFirma.id,

            tipo:
              "DOCUMENTO_RECHAZADO",

            descripcion:
              `Documento ${datos.documento.id} rechazado por ${datos.firmante.nombre} ${datos.firmante.apellidos}.${observaciones ? ` Observaciones: ${observaciones}` : ""}`,

            ip:
              obtenerIp(
                request
              ),
          },
        });
      }
    );

    return NextResponse.json({
      ok: true,

      rechazo: {
        documentoId:
          datos.documento.id,

        observaciones:
          observaciones ||
          null,

        fechaRechazo:
          ahora,
      },
    });
  } catch (
    error
  ) {
    console.error(
      "Error registrando rechazo:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          "No se ha podido registrar el rechazo del documento.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function DELETE(
  request: Request,
  context: {
    params:
      Promise<{
        token: string;
        documentoId:
          string;
      }>;
  }
) {
  try {
    const datos =
      await resolverPeticion(
        request,
        context
      );

    if (
      datos instanceof
      NextResponse
    ) {
      return datos;
    }

    const rechazo =
      await prisma.rechazoDocumentoFirma.findUnique({
        where: {
          documentoFirmaId_firmanteEnvioId: {
            documentoFirmaId:
              datos.documento.id,

            firmanteEnvioId:
              datos.firmante.id,
          },
        },

        select: {
          id: true,
        },
      });

    if (!rechazo) {
      return NextResponse.json({
        ok: true,
        eliminado:
          false,
      });
    }

    await prisma.$transaction(
      async (
        tx
      ) => {
        await tx.rechazoDocumentoFirma.delete({
          where: {
            id:
              rechazo.id,
          },
        });

        const otrosRechazos =
          await tx.rechazoDocumentoFirma.count({
            where: {
              documentoFirmaId:
                datos.documento.id,
            },
          });

        const firmas =
          await tx.firmaDocumento.count({
            where: {
              documentoFirmaId:
                datos.documento.id,
            },
          });

        const firmantes =
          await tx.firmanteEnvio.count({
            where: {
              envioFirmaId:
                datos.firmante.envioFirma.id,
            },
          });

        let estado:
          "PENDIENTE" |
          "PARCIAL" |
          "FIRMADO" |
          "RECHAZADO";

        if (
          otrosRechazos >
          0
        ) {
          estado =
            "RECHAZADO";
        } else if (
          firmas ===
          0
        ) {
          estado =
            "PENDIENTE";
        } else if (
          firmas >=
          firmantes
        ) {
          estado =
            "FIRMADO";
        } else {
          estado =
            "PARCIAL";
        }

        await tx.documentoFirma.update({
          where: {
            id:
              datos.documento.id,
          },

          data: {
            estado,
          },
        });

        await tx.eventoFirma.create({
          data: {
            envioFirmaId:
              datos.firmante.envioFirma.id,

            tipo:
              "RECHAZO_RETIRADO",

            descripcion:
              `Rechazo retirado del documento ${datos.documento.id} por ${datos.firmante.nombre} ${datos.firmante.apellidos}.`,

            ip:
              obtenerIp(
                request
              ),
          },
        });
      }
    );

    return NextResponse.json({
      ok: true,
      eliminado:
        true,
    });
  } catch (
    error
  ) {
    console.error(
      "Error retirando rechazo:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          "No se ha podido retirar el rechazo del documento.",
      },
      {
        status: 500,
      }
    );
  }
}

async function resolverPeticion(
  request: Request,
  context: {
    params:
      Promise<{
        token: string;
        documentoId:
          string;
      }>;
  }
) {
  const {
    token:
      tokenTexto,

    documentoId:
      documentoIdTexto,
  } =
    await context.params;

  const token =
    String(
      tokenTexto ??
        ""
    ).trim();

  const documentoId =
    Number(
      documentoIdTexto
    );

  if (
    !token ||
    !Number.isInteger(
      documentoId
    ) ||
    documentoId <=
      0
  ) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "La solicitud no es válida.",
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
        estado: true,
        tipo: true,
        fechaFirma:
          true,

        envioFirma: {
          select: {
            id: true,
            estado: true,
            firmantes: {
              select: { tipo: true, estado: true },
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
    firmante.fechaFirma
  ) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Este proceso de firma ya ha sido finalizado y no admite cambios.",
      },
      {
        status: 409,
      }
    );
  }

  if (
    firmante.envioFirma.estado ===
      "BORRADOR" ||
    firmante.envioFirma.estado ===
      "CANCELADO"
  ) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Este envío no admite decisiones de firma.",
      },
      {
        status: 409,
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
      { ok: false, error: "La decisión del director se habilitará cuando hayan firmado todos los profesores." },
      { status: 409 }
    );
  }

  const documento =
    await prisma.documentoFirma.findFirst({
      where: {
        id:
          documentoId,

        envioFirmaId:
          firmante.envioFirma.id,
      },

      select: {
        id: true,
        archivoOriginalKey:
          true,
      },
    });

  if (
    !documento ||
    !documento.archivoOriginalKey
  ) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "El documento no está disponible.",
      },
      {
        status: 404,
      }
    );
  }

  return {
    firmante,
    documento,
  };
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
