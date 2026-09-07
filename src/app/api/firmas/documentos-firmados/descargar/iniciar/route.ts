import {
  mkdir,
  readFile,
  readdir,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";

import path from "node:path";

import {
  NextResponse,
} from "next/server";

import JSZip from "jszip";

import {
  prisma,
} from "@/lib/prisma";

import {
  obtenerSesion,
} from "@/lib/session";

import {
  actualizarTrabajoDescarga,
  crearTrabajoDescarga,
  limpiarTrabajosCaducados,
} from "@/lib/firmas/trabajos-descarga";

export const runtime =
  "nodejs";

const MAX_DOCUMENTOS_ZIP =
  1000;

const CARPETA_TEMPORAL =
  path.join(
    process.cwd(),
    "storage",
    "firmas",
    "descargas-temp"
  );

/*
 * El ZIP NO forma parte del archivo documental.
 *
 * Su vida normal termina en cuanto /archivo lo carga en memoria
 * para devolverlo al navegador. En ese momento se borra del disco.
 *
 * Este plazo de 30 minutos es SOLO una red de seguridad para ZIP
 * abandonados (pestaña cerrada, caída del navegador, reinicio del
 * servidor, etc.). No es un periodo normal de conservación.
 */
const MAX_EDAD_ZIP_HUERFANO_MS =
  30 *
  60 *
  1000;

export async function POST(
  request:
    Request
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

    limpiarTrabajosCaducados();

    /*
     * Limpieza defensiva de ZIP huérfanos.
     * No afecta a los PDF originales ni firmados.
     */
    await limpiarZipsTemporalesHuerfanos();

    const body =
      await request
        .json()
        .catch(
          () =>
            null
        );

    const idsRecibidos =
      Array.isArray(
        body?.documentoIds
      )
        ? body.documentoIds
        : [];

const documentoIds:
  number[] =
  Array.from(
    new Set<number>(
      idsRecibidos
        .map(
          (
            valor:
              unknown
          ) =>
            Number(
              valor
            )
        )
        .filter(
          (
            valor:
              number
          ) =>
            Number.isInteger(
              valor
            ) &&
            valor >
              0
        )
    )
  );

    if (
      documentoIds.length ===
      0
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Debe seleccionar al menos un documento.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      documentoIds.length >
      MAX_DOCUMENTOS_ZIP
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            `Puede descargar como máximo ${MAX_DOCUMENTOS_ZIP} documentos en una misma operación.`,
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Validamos TODOS los documentos antes de crear
     * el trabajo.
     */
    const documentos =
      await prisma.documentoFirma.findMany({
        where: {
          id: {
            in:
              documentoIds,
          },

          estado:
            "FIRMADO",

          archivoFirmadoKey: {
            not:
              null,
          },

          envioFirma: {
            centroId:
              sesion.centroId,
          },
        },

        select: {
          id:
            true,

          nombreArchivo:
            true,

          archivoFirmadoKey:
            true,
        },
      });

    if (
      documentos.length !==
      documentoIds.length
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Uno o varios documentos no existen, no están completamente firmados o no pertenecen al centro actual.",
        },
        {
          status: 403,
        }
      );
    }

    const trabajo =
      crearTrabajoDescarga(
        sesion.centroId,
        documentos.length
      );

    /*
     * Importante:
     * No esperamos a que termine el ZIP.
     * El proceso continúa en el servidor mientras
     * el navegador consulta /estado.
     *
     * Esta estrategia es adecuada para el servidor
     * Node.js persistente del MVP.
     */
    void generarZipEnSegundoPlano(
      trabajo.id,
      documentos
    );

    return NextResponse.json(
      {
        ok: true,

        trabajoId:
          trabajo.id,

        total:
          trabajo.total,
      },
      {
        status: 202,
      }
    );
  } catch (
    error
  ) {
    console.error(
      "Error iniciando descarga múltiple:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          "No se ha podido iniciar la descarga múltiple.",
      },
      {
        status: 500,
      }
    );
  }
}

async function generarZipEnSegundoPlano(
  trabajoId:
    string,

  documentos: {
    id:
      number;

    nombreArchivo:
      string;

    archivoFirmadoKey:
      string | null;
  }[]
) {
  let rutaZip:
    string | null =
    null;

  try {
    actualizarTrabajoDescarga(
      trabajoId,
      {
        estado:
          "PROCESANDO",

        mensaje:
          "Preparando documentos...",
      }
    );

    const zip =
      new JSZip();

    const nombresUsados =
      new Set<
        string
      >();

    for (
      let indice =
        0;
      indice <
      documentos.length;
      indice +=
        1
    ) {
      const documento =
        documentos[
          indice
        ];

      if (
        !documento
          .archivoFirmadoKey
      ) {
        throw new Error(
          `El documento ${documento.id} no dispone de PDF firmado.`
        );
      }

      const ruta =
        resolverRutaPrivada(
          documento
            .archivoFirmadoKey
        );

      const bytes =
        await readFile(
          ruta
        );

      const nombreSeguro =
        crearNombreUnico(
          limpiarNombreArchivo(
            documento
              .nombreArchivo ||
              `documento_${documento.id}.pdf`
          ),
          documento.id,
          nombresUsados
        );

      zip.file(
        nombreSeguro,
        bytes
      );

      const procesados =
        indice +
        1;

      /*
       * Reservamos los primeros 90 % para la carga
       * de documentos. El 10 % final corresponde a
       * la compresión y escritura del ZIP.
       */
      const porcentaje =
        Math.min(
          90,
          Math.round(
            (
              procesados /
              documentos.length
            ) *
              90
          )
        );

      actualizarTrabajoDescarga(
        trabajoId,
        {
          procesados,

          porcentaje,

          mensaje:
            `Preparando documentos... ${procesados} / ${documentos.length}`,
        }
      );
    }

    actualizarTrabajoDescarga(
      trabajoId,
      {
        porcentaje:
          92,

        mensaje:
          "Comprimiendo archivos...",
      }
    );

    const contenidoZip =
      await zip.generateAsync(
        {
          type:
            "uint8array",

          compression:
            "DEFLATE",

          compressionOptions: {
            level:
              6,
          },
        },
        (
          metadata
        ) => {
          /*
           * La propia librería informa del progreso
           * real de compresión.
           */
          const porcentajeCompresion =
            Math.round(
              metadata.percent
            );

          const porcentajeTotal =
            Math.min(
              99,
              90 +
                Math.round(
                  porcentajeCompresion *
                    0.09
                )
            );

          actualizarTrabajoDescarga(
            trabajoId,
            {
              porcentaje:
                porcentajeTotal,

              mensaje:
                `Comprimiendo archivos... ${porcentajeCompresion}%`,
            }
          );
        }
      );

    await mkdir(
      CARPETA_TEMPORAL,
      {
        recursive:
          true,
      }
    );

    rutaZip =
      path.join(
        CARPETA_TEMPORAL,
        `${trabajoId}.zip`
      );

    actualizarTrabajoDescarga(
      trabajoId,
      {
        porcentaje:
          99,

        mensaje:
          "Guardando archivo ZIP...",
      }
    );

    await writeFile(
      rutaZip,
      contenidoZip
    );

    actualizarTrabajoDescarga(
      trabajoId,
      {
        estado:
          "COMPLETADO",

        procesados:
          documentos.length,

        porcentaje:
          100,

        mensaje:
          "ZIP preparado. Iniciando descarga...",

        archivoZip:
          rutaZip,

        error:
          null,
      }
    );

    /*
     * CASO NORMAL:
     * /archivo leerá este ZIP, lo cargará en memoria y lo borrará
     * inmediatamente del disco antes de devolver la respuesta.
     *
     * CASO ANORMAL:
     * si el usuario nunca llega a solicitar /archivo, dejamos una
     * limpieza de respaldo. Así ningún ZIP temporal queda ocupando
     * almacenamiento indefinidamente.
     */
    programarLimpiezaDeRespaldo(
      trabajoId,
      rutaZip
    );
  } catch (
    error
  ) {
    console.error(
      "Error generando ZIP en segundo plano:",
      error
    );

    if (
      rutaZip
    ) {
      try {
        await rm(
          rutaZip,
          {
            force:
              true,
          }
        );
      } catch {
        // No bloqueamos la actualización del estado.
      }
    }

    actualizarTrabajoDescarga(
      trabajoId,
      {
        estado:
          "ERROR",

        mensaje:
          "No se ha podido generar el ZIP.",

        error:
          error instanceof
          Error
            ? error.message
            : "Error desconocido al generar el ZIP.",
      }
    );
  }
}

function programarLimpiezaDeRespaldo(
  trabajoId:
    string,

  rutaZip:
    string
) {
  const temporizador =
    setTimeout(
      () => {
        void (
          async () => {
            try {
              await rm(
                rutaZip,
                {
                  force:
                    true,
                }
              );

              /*
               * Si el ZIP seguía referenciado, dejamos claro
               * que ya no existe físicamente.
               */
              actualizarTrabajoDescarga(
                trabajoId,
                {
                  archivoZip:
                    null,
                }
              );
            } catch (
              error
            ) {
              console.error(
                "No se ha podido limpiar un ZIP temporal abandonado:",
                rutaZip,
                error
              );
            }
          }
        )();
      },
      MAX_EDAD_ZIP_HUERFANO_MS
    );

  /*
   * Evita que este temporizador mantenga vivo por sí solo
   * el proceso Node.js.
   */
  temporizador.unref?.();
}

async function limpiarZipsTemporalesHuerfanos() {
  try {
    await mkdir(
      CARPETA_TEMPORAL,
      {
        recursive:
          true,
      }
    );

    const nombres =
      await readdir(
        CARPETA_TEMPORAL
      );

    const limite =
      Date.now() -
      MAX_EDAD_ZIP_HUERFANO_MS;

    for (
      const nombre of
        nombres
    ) {
      if (
        !nombre
          .toLowerCase()
          .endsWith(
            ".zip"
          )
      ) {
        continue;
      }

      const ruta =
        path.join(
          CARPETA_TEMPORAL,
          nombre
        );

      try {
        const informacion =
          await stat(
            ruta
          );

        if (
          informacion.mtimeMs <
          limite
        ) {
          await rm(
            ruta,
            {
              force:
                true,
            }
          );
        }
      } catch (
        error
      ) {
        console.error(
          "No se ha podido revisar un ZIP temporal:",
          ruta,
          error
        );
      }
    }
  } catch (
    error
  ) {
    /*
     * La limpieza preventiva nunca debe impedir que el usuario
     * genere una nueva descarga.
     */
    console.error(
      "No se ha podido ejecutar la limpieza preventiva de ZIP temporales:",
      error
    );
  }
}

function resolverRutaPrivada(
  key:
    string
) {
  const keyNormalizada =
    key
      .replaceAll(
        "\\",
        "/"
      )
      .replace(
        /^\/+/,
        ""
      );

  if (
    !keyNormalizada.startsWith(
      "storage/firmas/firmados/"
    )
  ) {
    throw new Error(
      "La ubicación del documento firmado no es válida."
    );
  }

  const raiz =
    path.resolve(
      process.cwd(),
      "storage",
      "firmas",
      "firmados"
    );

  const ruta =
    path.resolve(
      process.cwd(),
      keyNormalizada
    );

  if (
    ruta !==
      raiz &&
    !ruta.startsWith(
      `${raiz}${path.sep}`
    )
  ) {
    throw new Error(
      "La ubicación física del documento firmado no es válida."
    );
  }

  return ruta;
}

function limpiarNombreArchivo(
  nombre:
    string
) {
  const limpio =
    nombre
      .replace(
        /[<>:"/\\|?*\x00-\x1F]/g,
        "_"
      )
      .replace(
        /\s+/g,
        " "
      )
      .trim();

  if (!limpio) {
    return "documento.pdf";
  }

  return limpio
    .toLowerCase()
    .endsWith(
      ".pdf"
    )
    ? limpio
    : `${limpio}.pdf`;
}

function crearNombreUnico(
  nombre:
    string,

  id:
    number,

  usados:
    Set<
      string
    >
) {
  if (
    !usados.has(
      nombre
    )
  ) {
    usados.add(
      nombre
    );

    return nombre;
  }

  const extension =
    path.extname(
      nombre
    ) ||
    ".pdf";

  const base =
    path.basename(
      nombre,
      extension
    );

  let candidato =
    `${base}_${id}${extension}`;

  let contador =
    2;

  while (
    usados.has(
      candidato
    )
  ) {
    candidato =
      `${base}_${id}_${contador}${extension}`;

    contador +=
      1;
  }

  usados.add(
    candidato
  );

  return candidato;
}
