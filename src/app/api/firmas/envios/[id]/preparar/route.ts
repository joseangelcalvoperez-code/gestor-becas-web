import {
  createHash,
} from "node:crypto";

import {
  mkdir,
  rm,
  writeFile,
} from "node:fs/promises";

import path from "node:path";

import {
  NextResponse,
} from "next/server";

import {
  prisma,
} from "@/lib/prisma";

import {
  obtenerSesion,
} from "@/lib/session";

export const runtime =
  "nodejs";

type DocumentoPreparado = {
  documentoId: number;
  rutaAbsoluta: string;
  archivoKey: string;
  hash: string;
};

export async function POST(
  request: Request,
  context: {
    params:
      Promise<{
        id: string;
      }>;
  }
) {
  const archivosCreados:
    DocumentoPreparado[] =
    [];

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

    const {
      id:
        idTexto,
    } =
      await context.params;

    const envioId =
      Number(
        idTexto
      );

    if (
      !Number.isInteger(
        envioId
      ) ||
      envioId <=
        0
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "El envío seleccionado no es válido.",
        },
        {
          status: 400,
        }
      );
    }

    const envio =
      await prisma.envioFirma.findFirst({
        where: {
          id:
            envioId,

          centroId:
            sesion.centroId,
        },

        select: {
          id: true,
          estado: true,
          centroId: true,
          cursoAcademicoId:
            true,
          anio: true,
          mes: true,

          documentos: {
            orderBy: {
              id:
                "asc",
            },

            select: {
              id: true,
              tipo: true,
              matriculaId: true,
              asignaturaId: true,
              nombreArchivo:
                true,
            },
          },
        },
      });

    if (!envio) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "No se ha encontrado el envío seleccionado.",
        },
        {
          status: 404,
        }
      );
    }

    if (
      envio.estado !==
      "BORRADOR"
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Solo se pueden preparar envíos que estén en estado BORRADOR.",
        },
        {
          status: 409,
        }
      );
    }

    if (
      !envio.cursoAcademicoId ||
      !envio.anio ||
      !envio.mes
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "El envío no contiene todos los datos necesarios para generar los documentos.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      envio.documentos.length ===
      0
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "El envío no contiene documentos.",
        },
        {
          status: 400,
        }
      );
    }

    const carpetaRelativa =
      path.join(
        "storage",
        "firmas",
        "originales",
        `centro_${envio.centroId}`,
        `envio_${envio.id}`
      );

    const carpetaAbsoluta =
      path.join(
        process.cwd(),
        carpetaRelativa
      );

    await mkdir(
      carpetaAbsoluta,
      {
        recursive:
          true,
      }
    );

    const cookie =
      request.headers.get(
        "cookie"
      ) ??
      "";

    const urlActual =
      new URL(
        request.url
      );

    for (
      const documento of
        envio.documentos
    ) {
      if (
        !documento.matriculaId
      ) {
        throw new Error(
          `El documento ${documento.id} no tiene matrícula asociada.`
        );
      }

      let endpoint:
        string;

      let body:
        Record<
          string,
          number
        >;

      if (
        documento.tipo ===
        "ANEXO_V"
      ) {
        if (
          !documento.asignaturaId
        ) {
          throw new Error(
            `El Anexo V ${documento.id} no tiene asignatura asociada.`
          );
        }

        endpoint =
          "/api/documentos/anexo-v";

        body = {
          cursoAcademicoId:
            envio.cursoAcademicoId,

          matriculaId:
            documento.matriculaId,

          asignaturaId:
            documento.asignaturaId,

          anio:
            envio.anio,

          mes:
            envio.mes,
        };
      } else if (
        documento.tipo ===
        "ANEXO_I"
      ) {
        endpoint =
          "/api/documentos/anexo-i";

        body = {
          cursoAcademicoId:
            envio.cursoAcademicoId,

          matriculaId:
            documento.matriculaId,

          anio:
            envio.anio,

          mes:
            envio.mes,
        };
      } else {
        throw new Error(
          `El documento ${documento.id} todavía no puede prepararse automáticamente.`
        );
      }

      const urlGenerador =
        new URL(
          endpoint,
          urlActual.origin
        );

      const respuesta =
        await fetch(
          urlGenerador,
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",

              cookie,
            },

            body:
              JSON.stringify(
                body
              ),

            cache:
              "no-store",
          }
        );

      if (
        !respuesta.ok
      ) {
        let detalle =
          `No se ha podido generar ${documento.nombreArchivo}.`;

        try {
          const resultado =
            await respuesta.json();

          detalle =
            resultado.error ??
            detalle;
        } catch {
          // La respuesta no era JSON.
        }

        throw new Error(
          detalle
        );
      }

      const contentType =
        respuesta.headers.get(
          "Content-Type"
        ) ??
        "";

      if (
        !contentType
          .toLowerCase()
          .includes(
            "application/pdf"
          )
      ) {
        throw new Error(
          `El generador de ${documento.nombreArchivo} no ha devuelto un PDF.`
        );
      }

      const arrayBuffer =
        await respuesta.arrayBuffer();

      const buffer =
        Buffer.from(
          arrayBuffer
        );

      if (
        buffer.length ===
        0
      ) {
        throw new Error(
          `El PDF ${documento.nombreArchivo} está vacío.`
        );
      }

      const hash =
        createHash(
          "sha256"
        )
          .update(
            buffer
          )
          .digest(
            "hex"
          );

      const nombreFisico =
        `documento_${documento.id}.pdf`;

      const rutaAbsoluta =
        path.join(
          carpetaAbsoluta,
          nombreFisico
        );

      const archivoKey =
        normalizarRuta(
          path.join(
            carpetaRelativa,
            nombreFisico
          )
        );

      await writeFile(
        rutaAbsoluta,
        buffer
      );

      archivosCreados.push({
        documentoId:
          documento.id,

        rutaAbsoluta,

        archivoKey,

        hash,
      });
    }

    await prisma.$transaction(
      async (
        tx
      ) => {
        for (
          const archivo of
            archivosCreados
        ) {
          await tx.documentoFirma.update({
            where: {
              id:
                archivo.documentoId,
            },

            data: {
              archivoOriginalKey:
                archivo.archivoKey,

              hashOriginal:
                archivo.hash,
            },
          });
        }

        await tx.envioFirma.update({
          where: {
            id:
              envio.id,
          },

          data: {
            estado:
              "PENDIENTE",

            eventos: {
              create: {
                tipo:
                  "ENVIO_ENVIADO",

                descripcion:
                  `Se han generado y bloqueado ${archivosCreados.length} documento${archivosCreados.length === 1 ? "" : "s"} para firma. Los originales quedan protegidos mediante huella SHA-256.`,
              },
            },
          },
        });
      }
    );

    return NextResponse.json({
      ok: true,

      envioId:
        envio.id,

      estado:
        "PENDIENTE",

      documentosPreparados:
        archivosCreados.length,
    });
  } catch (
    error
  ) {
    for (
      const archivo of
        archivosCreados
    ) {
      try {
        await rm(
          archivo.rutaAbsoluta,
          {
            force:
              true,
          }
        );
      } catch {
        // No bloqueamos la respuesta por un fallo de limpieza.
      }
    }

    console.error(
      "Error preparando envío para firma:",
      error
    );

    return NextResponse.json(
      {
        ok: false,

        error:
          error instanceof
          Error
            ? error.message
            : "No se ha podido preparar el envío para firma.",
      },
      {
        status: 500,
      }
    );
  }
}

function normalizarRuta(
  valor:
    string
) {
  return valor.replaceAll(
    "\\",
    "/"
  );
}