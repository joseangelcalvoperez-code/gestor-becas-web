import {
  rm,
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

/* =========================================================
   GET
   DETALLE DE UN ENVÍO
   ========================================================= */

export async function GET(
  _request: Request,
  context: {
    params:
      Promise<{
        id: string;
      }>;
  }
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
      envioId <= 0
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
          nombre: true,
          tipo: true,
          estado: true,
          anio: true,
          mes: true,
          createdAt: true,
          updatedAt: true,

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
              archivoOriginalKey:
                true,
              hashOriginal:
                true,
              archivoFirmadoKey:
                true,
              hashFirmado:
                true,
              csv: true,
              estado: true,
              anio: true,
              mes: true,

              matricula: {
                select: {
                  id: true,
                  expediente:
                    true,

                  alumno: {
                    select: {
                      id: true,
                      nombre: true,
                      apellidos:
                        true,
                      dni: true,
                    },
                  },
                },
              },

              asignatura: {
                select: {
                  id: true,
                  codigo: true,
                  nombre: true,
                },
              },

              rechazos: {
                orderBy: {
                  fechaRechazo:
                    "desc",
                },

                select: {
                  id: true,
                  observaciones:
                    true,
                  fechaRechazo:
                    true,

                  firmante: {
                    select: {
                      id: true,
                      nombre: true,
                      apellidos:
                        true,
                      dni: true,
                      email: true,
                    },
                  },
                },
              },
            },
          },

          firmantes: {
            orderBy: [
              {
                apellidos:
                  "asc",
              },
              {
                nombre:
                  "asc",
              },
            ],

            select: {
              id: true,
              profesorId:
                true,
              tipo: true,
              nombre: true,
              apellidos:
                true,
              dni: true,
              email: true,
              token: true,
              estado: true,
              fechaFirma:
                true,
              createdAt:
                true,
            },
          },

          eventos: {
            orderBy: {
              createdAt:
                "desc",
            },

            select: {
              id: true,
              tipo: true,
              descripcion:
                true,
              ip: true,
              createdAt:
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

    return NextResponse.json({
      ok: true,
      envio,
    });
  } catch (
    error
  ) {
    console.error(
      "Error cargando detalle del envío:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          "No se ha podido cargar el detalle del envío.",
      },
      {
        status: 500,
      }
    );
  }
}

/* =========================================================
   DELETE
   ELIMINAR ENVÍO + DATOS ASOCIADOS + ARCHIVOS FÍSICOS
   ========================================================= */

export async function DELETE(
  _request: Request,
  context: {
    params:
      Promise<{
        id: string;
      }>;
  }
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
      envioId <= 0
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
          nombre: true,
          estado: true,
          centroId: true,

          _count: {
            select: {
              documentos:
                true,
              firmantes:
                true,
              eventos:
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

    /*
     * Un envío completado forma ya parte de la evidencia
     * del proceso de firma y no debe poder borrarse.
     */
    if (
      envio.estado ===
      "COMPLETADO"
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Un envío COMPLETADO no puede eliminarse porque forma parte del histórico y de la trazabilidad de firma.",
        },
        {
          status: 409,
        }
      );
    }

    /*
     * Primero eliminamos el registro principal.
     *
     * El schema de firmas utiliza onDelete: Cascade para:
     * - documentos_firma
     * - firmantes_envio
     * - firmas_documentos
     * - eventos_firma
     *
     * Por tanto, al borrar EnvioFirma desaparecen todos
     * sus datos dependientes.
     */
    await prisma.envioFirma.delete({
      where: {
        id:
          envio.id,
      },
    });

    /*
     * Después eliminamos los PDF físicos.
     *
     * rm(..., recursive: true, force: true) no falla si
     * la carpeta no existe.
     */
    const carpetas =
      [
        path.join(
          process.cwd(),
          "storage",
          "firmas",
          "originales",
          `centro_${envio.centroId}`,
          `envio_${envio.id}`
        ),

        path.join(
          process.cwd(),
          "storage",
          "firmas",
          "firmados",
          `centro_${envio.centroId}`,
          `envio_${envio.id}`
        ),
      ];

    const erroresArchivos:
      string[] =
      [];

    for (
      const carpeta of
        carpetas
    ) {
      try {
        await rm(
          carpeta,
          {
            recursive:
              true,
            force:
              true,
          }
        );
      } catch (
        error
      ) {
        console.error(
          `No se ha podido eliminar la carpeta ${carpeta}:`,
          error
        );

        erroresArchivos.push(
          carpeta
        );
      }
    }

    return NextResponse.json({
      ok: true,

      envioEliminado: {
        id:
          envio.id,
        nombre:
          envio.nombre,
      },

      datosEliminados: {
        documentos:
          envio._count.documentos,
        firmantes:
          envio._count.firmantes,
        eventos:
          envio._count.eventos,
      },

      advertencia:
        erroresArchivos.length >
        0
          ? "El envío y sus datos se han eliminado, pero alguna carpeta física no ha podido borrarse. Revise storage/firmas."
          : null,
    });
  } catch (
    error
  ) {
    console.error(
      "Error eliminando envío de firma:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          "No se ha podido eliminar el envío de firma.",
      },
      {
        status: 500,
      }
    );
  }
}
