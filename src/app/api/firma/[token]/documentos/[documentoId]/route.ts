import {
  readFile,
} from "node:fs/promises";

import path from "node:path";

import {
  PDFDocument,
  StandardFonts,
} from "pdf-lib";

import {
  NextResponse,
} from "next/server";

import {
  prisma,
} from "@/lib/prisma";

export const runtime =
  "nodejs";

export async function GET(
  _request: Request,
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
          tipo: true,

          envioFirma: {
            select: {
              id: true,
              estado: true,
              centroId: true,
              cursoAcademicoId: true,
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
      firmante.envioFirma.estado ===
        "BORRADOR" ||
      firmante.envioFirma.estado ===
        "CANCELADO"
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Este documento no está disponible.",
        },
        {
          status: 403,
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
        { ok: false, error: "El documento se habilitará para el director cuando hayan firmado todos los profesores." },
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
          nombreArchivo:
            true,
          tipo: true,
          mes: true,
          matriculaId: true,
          asignaturaId: true,
          archivoOriginalKey:
            true,
          archivoFirmadoKey:
            true,
        },
      });

    if (
      !documento
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "No se ha encontrado el documento solicitado.",
        },
        {
          status: 404,
        }
      );
    }

    /*
     * Si el documento ya acumula firmas visibles,
     * mostramos esa versión.
     *
     * Si todavía no ha firmado nadie, mostramos
     * el original congelado.
     */
    const archivoKey =
      documento.archivoFirmadoKey ??
      documento.archivoOriginalKey;

    if (!archivoKey) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "El PDF del documento no está disponible.",
        },
        {
          status: 404,
        }
      );
    }

    /*
     * La key almacenada siempre debe apuntar a storage/firmas.
     * Esto evita que una ruta manipulada pueda leer otros
     * archivos del servidor.
     */
    const key =
      archivoKey
        .replaceAll(
          "\\",
          "/"
        )
        .replace(
          /^\/+/,
          ""
        );

    if (
      !key.startsWith(
        "storage/firmas/"
      )
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "La ubicación del documento no es válida.",
        },
        {
          status: 500,
        }
      );
    }

    const raiz =
      path.resolve(
        process.cwd(),
        "storage",
        "firmas"
      );

    const ruta =
      path.resolve(
        process.cwd(),
        key
      );

    if (
      ruta !==
        raiz &&
      !ruta.startsWith(
        `${raiz}${path.sep}`
      )
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "La ubicación del documento no es válida.",
        },
        {
          status: 500,
        }
      );
    }

    let bytes:
      Buffer;

    try {
      bytes =
        await readFile(
          ruta
        );
    } catch {
      return NextResponse.json(
        {
          ok: false,
          error:
            "El archivo PDF no está disponible en el servidor.",
        },
        {
          status: 404,
        }
      );
    }

    const nombreSeguro =
      documento.nombreArchivo
        .replace(
          /[\r\n"]/g,
          "_"
        );

    /*
     * =========================================================
     * PREVISUALIZACIÓN ACUMULATIVA DE ANEXOS V
     * =========================================================
     *
     * El PDF almacenado del mes actual sigue intacto.
     * Únicamente para la previsualización pública añadimos
     * en memoria las firmas ya registradas de meses anteriores.
     *
     * Ejemplo:
     * - preview OCTUBRE -> firma histórica de SEPTIEMBRE;
     * - preview ENERO   -> firmas SEP/OCT/NOV/DIC;
     * - el mes actual permanece SIN firma hasta que el profesor
     *   confirme realmente el proceso de firma.
     */
    let pdfBytes: Uint8Array<ArrayBufferLike> =
      Uint8Array.from(
      bytes
    );

    if (
      documento.tipo ===
        "ANEXO_V" &&
      documento.mes &&
      documento.matriculaId &&
      documento.asignaturaId &&
      firmante.envioFirma
        .cursoAcademicoId
    ) {
      pdfBytes =
        await crearPreviewAnexoVConFirmasAnteriores(
          pdfBytes,
          {
            documentoActualId:
              documento.id,

            centroId:
              firmante.envioFirma
                .centroId,

            cursoAcademicoId:
              firmante.envioFirma
                .cursoAcademicoId,

            matriculaId:
              documento.matriculaId,

            asignaturaId:
              documento.asignaturaId,

            mesActual:
              documento.mes,
          }
        );
    }
  const responseBytes =
  new Uint8Array(
    pdfBytes.byteLength
  );

responseBytes.set(
  pdfBytes
);

return new Response(
  responseBytes,
  {
        status: 200,

        headers: {
          "Content-Type":
            "application/pdf",

          "Content-Disposition":
            `inline; filename="${nombreSeguro}"`,

          "Cache-Control":
            "private, no-store, max-age=0",

          "X-Content-Type-Options":
            "nosniff",
        },
      }
    );
  } catch (
    error
  ) {
    console.error(
      "Error mostrando PDF de firma:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          "No se ha podido mostrar el documento.",
      },
      {
        status: 500,
      }
    );
  }
}


/* =========================================================
   PREVIEW ANEXO V - FIRMAS DE MESES ANTERIORES
   ========================================================= */

const MM_TO_PT =
  72 /
  25.4;

const mm = (
  value: number
) =>
  value *
  MM_TO_PT;

const ORDEN_MESES_ANEXO_V = [
  9,
  10,
  11,
  12,
  1,
  2,
  3,
  4,
  5,
  6,
] as const;

/*
 * IMPORTANTE:
 * Estas son las mismas coordenadas y tamaños que están ajustados
 * actualmente en src/lib/firmas/estampar-pdf.ts.
 *
 * Si en el futuro modificas allí la posición/tamaño visual de
 * firma o CSV/URL, replica aquí el mismo cambio para que preview
 * y PDF final sigan siendo idénticos.
 */
const ANEXO_V = {
  meses: {
    9: {
      pagina: 0,
      firma: {
        x: 168.9,
        y: 87.9,
        xFinal: 196.1,
        yFinal: 100.4,
      },
      observaciones: {
        x: 142.2,
        y: 108.7,
        xFinal: 196.3,
        yFinal: 111.9,
      },
    },

    10: {
      pagina: 0,
      firma: {
        x: 168.9,
        y: 132.2,
        xFinal: 196.1,
        yFinal: 145.6,
      },
      observaciones: {
        x: 142.2,
        y: 151.8,
        xFinal: 196.3,
        yFinal: 156.2,
      },
    },

    11: {
      pagina: 0,
      firma: {
        x: 168.9,
        y: 177.0,
        xFinal: 196.1,
        yFinal: 190.4,
      },
      observaciones: {
        x: 142.2,
        y: 196.6,
        xFinal: 196.3,
        yFinal: 201.0,
      },
    },

    12: {
      pagina: 0,
      firma: {
        x: 168.9,
        y: 221.3,
        xFinal: 196.1,
        yFinal: 234.7,
      },
      observaciones: {
        x: 142.2,
        y: 240.9,
        xFinal: 196.3,
        yFinal: 245.3,
      },
    },

    1: {
      pagina: 0,
      firma: {
        x: 168.9,
        y: 266.3,
        xFinal: 196.1,
        yFinal: 279.7,
      },
      observaciones: {
        x: 142.2,
        y: 285.9,
        xFinal: 196.3,
        yFinal: 290.3,
      },
    },

    2: {
      pagina: 1,
      firma: {
        x: 168.9,
        y: 87.9,
        xFinal: 196.1,
        yFinal: 100.4,
      },
      observaciones: {
        x: 142.2,
        y: 108.7,
        xFinal: 196.3,
        yFinal: 111.9,
      },
    },

    3: {
      pagina: 1,
      firma: {
        x: 168.9,
        y: 132.2,
        xFinal: 196.1,
        yFinal: 145.6,
      },
      observaciones: {
        x: 142.2,
        y: 151.8,
        xFinal: 196.3,
        yFinal: 156.2,
      },
    },

    4: {
      pagina: 1,
      firma: {
        x: 168.9,
        y: 177.0,
        xFinal: 196.1,
        yFinal: 190.4,
      },
      observaciones: {
        x: 142.2,
        y: 196.6,
        xFinal: 196.3,
        yFinal: 201.0,
      },
    },

    5: {
      pagina: 1,
      firma: {
        x: 168.9,
        y: 221.3,
        xFinal: 196.1,
        yFinal: 234.7,
      },
      observaciones: {
        x: 142.2,
        y: 240.9,
        xFinal: 196.3,
        yFinal: 245.3,
      },
    },

    6: {
      pagina: 1,
      firma: {
        x: 168.9,
        y: 266.3,
        xFinal: 196.1,
        yFinal: 279.7,
      },
      observaciones: {
        x: 142.2,
        y: 285.9,
        xFinal: 196.3,
        yFinal: 290.3,
      },
    },
  } as Record<
    number,
    {
      pagina: number;
      firma: {
        x: number;
        y: number;
        xFinal: number;
        yFinal: number;
      };
      observaciones: {
        x: number;
        y: number;
        xFinal: number;
        yFinal: number;
      };
    }
  >,
};

async function crearPreviewAnexoVConFirmasAnteriores(
  bytesBase: Uint8Array,
  datos: {
    documentoActualId: number;
    centroId: number;
    cursoAcademicoId: number;
    matriculaId: number;
    asignaturaId: number;
    mesActual: number;
  }
): Promise<Uint8Array> {
  const indiceMesActual =
    ORDEN_MESES_ANEXO_V.indexOf(
      datos.mesActual as
        (typeof ORDEN_MESES_ANEXO_V)[number]
    );

  if (
    indiceMesActual <=
    0
  ) {
    return bytesBase;
  }

  const mesesAnteriores =
    ORDEN_MESES_ANEXO_V.slice(
      0,
      indiceMesActual
    );

  const documentosAnteriores =
    await prisma.documentoFirma.findMany({
      where: {
        id: {
          not:
            datos.documentoActualId,
        },

        tipo:
          "ANEXO_V",

        estado:
          "FIRMADO",

        matriculaId:
          datos.matriculaId,

        asignaturaId:
          datos.asignaturaId,

        mes: {
          in: [
            ...mesesAnteriores,
          ],
        },

        envioFirma: {
          centroId:
            datos.centroId,

          cursoAcademicoId:
            datos.cursoAcademicoId,
        },

        firmas: {
          some: {},
        },
      },

      select: {
        mes: true,
        csv: true,

        firmas: {
          orderBy: {
            fechaFirma:
              "desc",
          },

          take: 1,

          select: {
            fechaFirma:
              true,

            firmante: {
              select: {
                nombre: true,
                apellidos: true,
                dni: true,
              },
            },
          },
        },
      },
    });

  type FirmaAnterior = {
    nombre: string;
    apellidos: string;
    dni: string;
    fechaFirma: Date;
    csv: string;
    mes: number;
  };

  const ultimaFirmaPorMes =
    new Map<
      number,
      {
        fecha: Date;
        firma: FirmaAnterior;
      }
    >();

  for (
    const documentoAnterior of
    documentosAnteriores
  ) {
    if (
      !documentoAnterior.mes
    ) {
      continue;
    }

    const evidencia =
      documentoAnterior
        .firmas[0];

    if (
      !evidencia
    ) {
      continue;
    }

    const firma: FirmaAnterior = {
      nombre:
        evidencia.firmante
          .nombre,

      apellidos:
        evidencia.firmante
          .apellidos,

      dni:
        evidencia.firmante
          .dni,

      fechaFirma:
        evidencia.fechaFirma,

      csv:
        documentoAnterior.csv,

      mes:
        documentoAnterior.mes,
    };

    const existente =
      ultimaFirmaPorMes.get(
        documentoAnterior.mes
      );

    if (
      !existente ||
      evidencia.fechaFirma >
        existente.fecha
    ) {
      ultimaFirmaPorMes.set(
        documentoAnterior.mes,
        {
          fecha:
            evidencia.fechaFirma,

          firma,
        }
      );
    }
  }

  if (
    ultimaFirmaPorMes.size ===
    0
  ) {
    return bytesBase;
  }

  const pdf =
    await PDFDocument.load(
      bytesBase
    );

  const font =
    await pdf.embedFont(
      StandardFonts.Helvetica
    );

  const fontBold =
    await pdf.embedFont(
      StandardFonts.HelveticaBold
    );

  for (
    const mes of
    mesesAnteriores
  ) {
    const firma =
      ultimaFirmaPorMes.get(
        mes
      )?.firma;

    if (
      !firma
    ) {
      continue;
    }

    estamparFirmaHistoricaAnexoV(
      pdf,
      font,
      fontBold,
      firma
    );
  }

  return await pdf.save({
    useObjectStreams:
      false,
  });
}

function estamparFirmaHistoricaAnexoV(
  pdf: PDFDocument,
  font: any,
  fontBold: any,
  datos: {
    nombre: string;
    apellidos: string;
    dni: string;
    fechaFirma: Date;
    csv: string;
    mes: number;
  }
) {
  const config =
    ANEXO_V.meses[
      datos.mes
    ];

  if (!config) {
    return;
  }

  const pages =
    pdf.getPages();

  const page =
    pages[
      config.pagina
    ];

  if (!page) {
    return;
  }

  const {
    height,
  } =
    page.getSize();

  const lineasFirma = [
    `${datos.nombre} ${datos.apellidos}`.trim(),
    `DNI: ${datos.dni}`,
    formatearFechaHora(
      datos.fechaFirma
    ),
  ];

  dibujarBloqueDesdeArriba(
    page,
    font,
    fontBold,
    lineasFirma,
    config.firma.x,
    config.firma.y,
    config.firma.xFinal -
      config.firma.x,
    {
      sizeInicial:
        5.0,

      sizeMinimo:
        4.0,

      interlineadoMM:
        2.45,

      maxLineasPorElemento:
        1,

      boldPrimeraLinea:
        true,
    }
  );

  const lineasVerificacion = [
    `CSV: ${datos.csv}`,
    `Verificación: ${crearUrlVerificacion(
      datos.csv
    )}`,
  ];

  dibujarBloqueDesdeArriba(
    page,
    font,
    fontBold,
    lineasVerificacion,
    config.observaciones.x,
    config.observaciones.y,
    config.observaciones.xFinal -
      config.observaciones.x,
    {
      sizeInicial:
        4.0,

      sizeMinimo:
        3.5,

      interlineadoMM:
        1.65,

      maxLineasPorElemento:
        1,

      boldPrimeraLinea:
        true,
    }
  );

  void height;
}

function dibujarBloqueDesdeArriba(
  page: any,
  font: any,
  fontBold: any,
  elementos: string[],
  xMM: number,
  yTopMM: number,
  anchoMM: number,
  opciones: {
    sizeInicial: number;
    sizeMinimo: number;
    interlineadoMM: number;
    maxLineasPorElemento: number;
    boldPrimeraLinea: boolean;
  }
) {
  const {
    height,
  } =
    page.getSize();

  let size =
    opciones.sizeInicial;

  let lineas: {
    texto: string;
    bold: boolean;
  }[] = [];

  while (
    size >=
    opciones.sizeMinimo
  ) {
    lineas = [];

    elementos.forEach(
      (
        elemento,
        index
      ) => {
        const fuente =
          opciones.boldPrimeraLinea &&
          index ===
            0
            ? fontBold
            : font;

        const trozos =
          dividirTextoEnLineas(
            elemento,
            fuente,
            size,
            mm(
              anchoMM
            )
          );

        trozos
          .slice(
            0,
            opciones
              .maxLineasPorElemento
          )
          .forEach(
            (
              texto
            ) => {
              lineas.push({
                texto,
                bold:
                  opciones.boldPrimeraLinea &&
                  index ===
                    0,
              });
            }
          );
      }
    );

    if (
      lineas.length <=
      elementos.length *
        opciones.maxLineasPorElemento
    ) {
      break;
    }

    size -=
      0.2;
  }

  let y =
    height -
    mm(
      yTopMM
    ) -
    size;

  for (
    const linea of
    lineas
  ) {
    page.drawText(
      linea.texto,
      {
        x:
          mm(
            xMM
          ),

        y,

        size,

        font:
          linea.bold
            ? fontBold
            : font,
      }
    );

    y -=
      mm(
        opciones.interlineadoMM
      );
  }
}

function dividirTextoEnLineas(
  texto: string,
  font: any,
  size: number,
  anchoMaximo: number
) {
  if (
    font.widthOfTextAtSize(
      texto,
      size
    ) <=
    anchoMaximo
  ) {
    return [
      texto,
    ];
  }

  /*
   * CSV y URL no contienen espacios útiles para el ajuste.
   * Reducimos el texto solamente como último recurso visual.
   * La evidencia completa sigue almacenada en base de datos.
   */
  let resultado =
    texto;

  while (
    resultado.length >
      1 &&
    font.widthOfTextAtSize(
      resultado,
      size
    ) >
      anchoMaximo
  ) {
    resultado =
      resultado.slice(
        0,
        -1
      );
  }

  if (
    resultado.length <
    texto.length
  ) {
    resultado =
      `${resultado.slice(
        0,
        Math.max(
          0,
          resultado.length -
            3
        )
      )}...`;
  }

  return [
    resultado,
  ];
}

function crearUrlVerificacion(
  csv: string
) {
  const base =
    (
      process.env
        .NEXT_PUBLIC_APP_URL ??
      "http://localhost:3000"
    ).replace(
      /\/+$/,
      ""
    );

  return `${base}/verificar/${encodeURIComponent(
    csv
  )}`;
}

function formatearFechaHora(
  fecha: Date
) {
  return new Intl.DateTimeFormat(
    "es-ES",
    {
      timeZone:
        "Europe/Madrid",

      day:
        "2-digit",

      month:
        "2-digit",

      year:
        "numeric",

      hour:
        "2-digit",

      minute:
        "2-digit",

      second:
        "2-digit",

      hour12:
        false,
    }
  ).format(
    fecha
  );
}
