import {
  createHash,
} from "node:crypto";

import {
  readFile,
} from "node:fs/promises";

import path from "node:path";

import {
  PDFDocument,
  PDFFont,
  PDFPage,
  StandardFonts,
  rgb,
} from "pdf-lib";

import {
  prisma,
} from "@/lib/prisma";

const MM_A_PUNTOS =
  72 / 25.4;

const ALTURA_A4_MM =
  297;

/*
 * =========================================================
 * URL PÚBLICA DE VERIFICACIÓN
 * =========================================================
 *
 * En desarrollo:
 * APP_URL=http://localhost:3000
 *
 * En producción:
 * APP_URL=https://tu-dominio.es
 *
 * Más adelante construiremos la pantalla:
 * /verificar/[csv]
 */
const APP_URL =
  (
    process.env.APP_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000"
  ).replace(
    /\/+$/,
    ""
  );

/*
 * =========================================================
 * ANEXO I
 * =========================================================
 *
 * La firma del profesor se coloca dentro de la columna
 * FIRMA PROFESOR correspondiente a cada asignatura.
 *
 * La verificación se coloca en la misma hoja:
 * X 10 / Y 272.
 */
const ANEXO_I = {
  primeraFilaY:
    120.5,

  separacionFilas:
    10.1,

  maxAsignaturasPagina:
    10,

  firmaProfesor: {
    x:
      140.2,

    ancho:
      54.5,

    nombreSize:
      5.2,

    datosSize:
      4.4,
  },

  verificacion: {
    x:
      15.4,

    y:
      271.8,

    ancho:
      77.4,

    size:
      5.2,
  },

  firmaDirector: {
    x: 123,
    y: 270.5,
    ancho: 72,
    alto: 18,
    selloX: 173,
    selloY: 264,
    selloAncho: 22,
    selloAlto: 22,
  },
};

/*
 * =========================================================
 * ANEXO V
 * =========================================================
 *
 * IMPORTANTE:
 * Cada mes tiene sus propias coordenadas.
 * No se agrupan para que podamos ajustar cada uno de forma
 * independiente después de las pruebas visuales.
 *
 * Página 1:
 * septiembre - enero
 *
 * Página 2:
 * febrero - junio
 *
 * Febrero-Junio se han replicado inicialmente con las
 * mismas posiciones de Septiembre-Enero respectivamente
 */
const ANEXO_V = {
  meses: {
    /* SEPTIEMBRE */
    9: {
      pagina:
        0,

      firma: {
        x:
          168.9,

        y:
          87.9,

        xFinal:
          196.1,

        yFinal:
          100.4,
      },

      observaciones: {
        x:
          142.2,

        y:
          108.7,

        xFinal:
          196.3,

        yFinal:
          111.9,
      },
    },

    /* OCTUBRE */
    10: {
      pagina:
        0,

      firma: {
        x:
          168.9,

        y:
          132.2,

        xFinal:
          196.1,

        yFinal:
          145.6,
      },

      observaciones: {
        x:
          142.2,

        y:
          151.8,

        xFinal:
          196.3,

        yFinal:
          156.2,
      },
    },

    /* NOVIEMBRE */
    11: {
      pagina:
        0,

      firma: {
        x:
          168.9,

        y:
          177,

        xFinal:
          196.1,

        yFinal:
          190.4,
      },

      observaciones: {
        x:
          142.2,

        y:
          196.6,

        xFinal:
          196.3,

        yFinal:
          201.0,
      },
    },

    /* DICIEMBRE */
    12: {
      pagina:
        0,

      firma: {
        x:
          168.9,

        y:
          221.3,

        xFinal:
          196.1,

        yFinal:
          234.7,
      },

      observaciones: {
        x:
          142.2,

        y:
          240.9,

        xFinal:
          196.3,

        yFinal:
          245.3,
      },
    },

    /* ENERO */
    1: {
      pagina:
        0,

      firma: {
        x:
          168.9,

        y:
          266.3,

        xFinal:
          196.1,

        yFinal:
          279.7,
      },

      observaciones: {
        x:
          142.2,

        y:
          285.9,

        xFinal:
          196.3,

        yFinal:
          290.3,
      },
    },

    /* FEBRERO */
    2: {
      pagina:
        1,

      firma: {
        x:
          168.9,

        y:
          87.9,

        xFinal:
          196.1,

        yFinal:
          100.4,
      },

      observaciones: {
        x:
          142.2,

        y:
          108.7,

        xFinal:
          196.3,

        yFinal:
          111.9,
      },
    },

    /* MARZO */
    3: {
      pagina:
        1,

      firma: {
        x:
          168.9,

        y:
          132.2,

        xFinal:
          196.1,

        yFinal:
          145.6,
      },

      observaciones: {
        x:
          142.2,

        y:
          151.8,

        xFinal:
          196.3,

        yFinal:
          156.2,
      },
    },

    /* ABRIL */
    4: {
      pagina:
        1,

      firma: {
        x:
          168.9,

        y:
          177,

        xFinal:
          196.1,

        yFinal:
          190.4,
      },

      observaciones: {
        x:
          142.2,

        y:
          196.6,

        xFinal:
          196.3,

        yFinal:
          201.0,
      },
    },

    /* MAYO */
    5: {
      pagina:
        1,

      firma: {
        x:
          168.9,

        y:
          221.3,

        xFinal:
          196.1,

        yFinal:
          234.7,
      },

      observaciones: {
        x:
          142.2,

        y:
          240.9,

        xFinal:
          196.3,

        yFinal:
          245.3,
      },
    },

    /* JUNIO */
    6: {
      pagina:
        1,

      firma: {
        x:
          168.9,

        y:
          266.3,

        xFinal:
          196.1,

        yFinal:
          279.7,
      },

      observaciones: {
        x:
          142.2,

        y:
          285.9,

        xFinal:
          196.3,

        yFinal:
          290.3,
      },
    },

  } as Record<
    number,
    {
      pagina:
        number;

      firma: {
        x:
          number;

        y:
          number;

        xFinal:
          number;

        yFinal:
          number;
      };

      observaciones: {
        x:
          number;

        y:
          number;

        xFinal:
          number;

        yFinal:
          number;
      };
    }
  >,
};

export interface ResultadoEstampacion {
  documentoId:
    number;

  archivoFirmadoKey:
    string;

  rutaDestino:
    string;

  bytesFirmados:
    Uint8Array;

  hashBase:
    string;

  hashFirmado:
    string;
}

export async function prepararEstampacionDocumento(
  documentoId:
    number,

  firmanteEnvioId:
    number,

  fechaFirma:
    Date
): Promise<
  ResultadoEstampacion
> {
  const documento =
    await prisma.documentoFirma.findUnique({
      where: {
        id:
          documentoId,
      },

      select: {
        id: true,

        envioFirmaId:
          true,

        matriculaId:
          true,

        asignaturaId:
          true,

        tipo:
          true,

        mes:
          true,

        csv:
          true,

        archivoOriginalKey:
          true,

        archivoFirmadoKey:
          true,

        hashOriginal:
          true,

        hashFirmado:
          true,

        envioFirma: {
          select: {
            id: true,

            centroId:
              true,

            cursoAcademicoId:
              true,

            centro: {
              select: {
                selloFirmaUrl: true,
              },
            },
          },
        },
      },
    });

  if (!documento) {
    throw new Error(
      `No se ha encontrado el documento ${documentoId}.`
    );
  }

  const firmante =
    await prisma.firmanteEnvio.findUnique({
      where: {
        id:
          firmanteEnvioId,
      },

      select: {
        id: true,

        envioFirmaId:
          true,

        profesorId:
          true,

        tipo:
          true,

        nombre:
          true,

        apellidos:
          true,

        dni:
          true,
      },
    });

  if (!firmante) {
    throw new Error(
      "No se ha encontrado el firmante."
    );
  }

  if (
    firmante.envioFirmaId !==
    documento.envioFirmaId
  ) {
    throw new Error(
      "El firmante no pertenece al envío del documento."
    );
  }

  /*
   * Si el documento ya tiene una firma anterior,
   * utilizamos la versión firmada más reciente.
   *
   * Así los Anexos I pueden acumular las firmas
   * de varios profesores.
   */
  const archivoBaseKey =
    documento.archivoFirmadoKey ??
    documento.archivoOriginalKey;

  const hashEsperado =
    documento.hashFirmado ??
    documento.hashOriginal;

  if (
    !archivoBaseKey ||
    !hashEsperado
  ) {
    throw new Error(
      `El documento ${documento.id} no dispone de un PDF base válido.`
    );
  }

  const rutaBase =
    resolverRutaPrivada(
      archivoBaseKey
    );

  const bytesBase =
    await readFile(
      rutaBase
    );

  const hashBase =
    calcularSha256(
      bytesBase
    );

  /*
   * Comprobamos que el fichero físico no ha sido modificado
   * desde que se registró su SHA-256.
   */
  if (
    hashBase !==
    hashEsperado
  ) {
    throw new Error(
      `La huella del documento ${documento.id} no coincide con la registrada. Se ha detenido la firma por seguridad.`
    );
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

  if (
    documento.tipo ===
    "ANEXO_V"
  ) {
    /*
     * =====================================================
     * FIRMAS HISTÓRICAS DE MESES ANTERIORES
     * =====================================================
     *
     * El ANEXO V es acumulativo: al generar, por ejemplo,
     * ENERO, el PDF contiene SEP + OCT + NOV + DIC + ENE.
     *
     * Por coherencia, antes de colocar la firma del mes actual
     * recuperamos la ÚLTIMA firma válida registrada para cada
     * mes anterior del mismo:
     *
     * - centro;
     * - curso académico;
     * - matrícula;
     * - asignatura.
     *
     * No copiamos firmas desde PDFs antiguos. Se reconstruyen
     * desde la evidencia guardada en FirmaDocumento, por lo que
     * siguen pudiendo aparecer aunque el PDF antiguo ya haya
     * sido eliminado por la política de conservación.
     */
    if (
      documento.matriculaId &&
      documento.asignaturaId &&
      documento.mes &&
      documento.envioFirma
        .cursoAcademicoId
    ) {
      const firmasAnteriores =
        await cargarFirmasAnterioresAnexoV({
          documentoActualId:
            documento.id,

          centroId:
            documento.envioFirma
              .centroId,

          cursoAcademicoId:
            documento.envioFirma
              .cursoAcademicoId,

          matriculaId:
            documento.matriculaId,

          asignaturaId:
            documento.asignaturaId,

          mesActual:
            documento.mes,
        });

      for (
        const firmaAnterior
        of firmasAnteriores
      ) {
        estamparAnexoV(
          pdf,
          font,
          fontBold,
          firmaAnterior
        );
      }
    }

    /*
     * Finalmente estampamos la firma correspondiente al
     * documento que se está firmando ahora.
     */
    estamparAnexoV(
      pdf,
      font,
      fontBold,
      {
        nombre:
          firmante.nombre,

        apellidos:
          firmante.apellidos,

        dni:
          firmante.dni,

        fechaFirma,

        csv:
          documento.csv,

        mes:
          documento.mes,
      }
    );
  } else if (
    documento.tipo ===
    "ANEXO_I"
  ) {
    if (
      !documento.matriculaId
    ) {
      throw new Error(
        `El Anexo I ${documento.id} no tiene matrícula asociada.`
      );
    }

    if (firmante.tipo === "DIRECTOR") {
      await estamparDirectorAnexoI(pdf, font, fontBold, {
        nombre: firmante.nombre,
        apellidos: firmante.apellidos,
        dni: firmante.dni,
        fechaFirma,
        selloFirmaUrl: documento.envioFirma.centro.selloFirmaUrl,
      });
    } else {
      if (!firmante.profesorId) {
        throw new Error("El profesor firmante del Anexo I no está asociado a un profesor.");
      }

      await estamparAnexoI(pdf, font, fontBold, {
        matriculaId:
          documento.matriculaId,

        profesorId:
          firmante.profesorId,

        nombre:
          firmante.nombre,

        apellidos:
          firmante.apellidos,

        dni:
          firmante.dni,

        fechaFirma,

        csv:
          documento.csv,
      });
    }
  } else {
    throw new Error(
      `El tipo de documento ${documento.tipo} todavía no admite estampación automática.`
    );
  }

  const bytesFirmados =
    await pdf.save();

  const hashFirmado =
    calcularSha256(
      bytesFirmados
    );

  const archivoFirmadoKey =
    normalizarRuta(
      path.join(
        "storage",
        "firmas",
        "firmados",
        `centro_${documento.envioFirma.centroId}`,
        `envio_${documento.envioFirma.id}`,
        `documento_${documento.id}.pdf`
      )
    );

  const rutaDestino =
    path.join(
      process.cwd(),
      archivoFirmadoKey
    );

  return {
    documentoId:
      documento.id,

    archivoFirmadoKey,

    rutaDestino,

    bytesFirmados,

    hashBase,

    hashFirmado,
  };
}

/* =========================================================
   FIRMAS ANTERIORES DEL ANEXO V
   ========================================================= */

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

async function cargarFirmasAnterioresAnexoV(
  datos: {
    documentoActualId:
      number;

    centroId:
      number;

    cursoAcademicoId:
      number;

    matriculaId:
      number;

    asignaturaId:
      number;

    mesActual:
      number;
  }
) {
  const indiceMesActual =
    ORDEN_MESES_ANEXO_V.indexOf(
      datos.mesActual as
        (typeof ORDEN_MESES_ANEXO_V)[number]
    );

  if (
    indiceMesActual <=
    0
  ) {
    /*
     * SEPTIEMBRE no tiene meses anteriores.
     * También evitamos actuar ante un mes no configurado.
     */
    return [];
  }

  const mesesAnteriores =
    ORDEN_MESES_ANEXO_V
      .slice(
        0,
        indiceMesActual
      );

  /*
   * Puede existir más de un DocumentoFirma para un mismo mes
   * si el documento se volvió a generar/enviar.
   *
   * Recuperamos todos los candidatos FIRMADOS y después
   * conservamos únicamente la firma más reciente de cada mes.
   */
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
          in:
            [
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
        id:
          true,

        mes:
          true,

        csv:
          true,

        firmas: {
          orderBy: {
            fechaFirma:
              "desc",
          },

          take:
            1,

          select: {
            fechaFirma:
              true,

            firmante: {
              select: {
                nombre:
                  true,

                apellidos:
                  true,

                dni:
                  true,
              },
            },
          },
        },
      },
    });

  type FirmaAnterior = {
    nombre:
      string;

    apellidos:
      string;

    dni:
      string;

    fechaFirma:
      Date;

    csv:
      string;

    mes:
      number;
  };

  const ultimaFirmaPorMes =
    new Map<
      number,
      {
        fecha:
          Date;

        firma:
          FirmaAnterior;
      }
    >();

  for (
    const documentoAnterior
    of documentosAnteriores
  ) {
    if (
      !documentoAnterior.mes
    ) {
      continue;
    }

    const evidencia =
      documentoAnterior
        .firmas[
          0
        ];

    if (
      !evidencia
    ) {
      continue;
    }

    const firma: FirmaAnterior = {
      nombre:
        evidencia
          .firmante
          .nombre,

      apellidos:
        evidencia
          .firmante
          .apellidos,

      dni:
        evidencia
          .firmante
          .dni,

      fechaFirma:
        evidencia
          .fechaFirma,

      csv:
        documentoAnterior
          .csv,

      mes:
        documentoAnterior
          .mes,
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

  /*
   * Devolvemos las firmas en orden cronológico del curso
   * (SEP -> JUN), no en el orden arbitrario de la consulta.
   */
  return mesesAnteriores
    .map(
      (
        mes
      ) =>
        ultimaFirmaPorMes
          .get(
            mes
          )
          ?.firma
    )
    .filter(
      (
        firma
      ): firma is FirmaAnterior =>
        Boolean(
          firma
        )
    );
}

/* =========================================================
   ANEXO V
   ========================================================= */

function estamparAnexoV(
  pdf:
    PDFDocument,

  font:
    PDFFont,

  fontBold:
    PDFFont,

  datos: {
    nombre:
      string;

    apellidos:
      string;

    dni:
      string;

    fechaFirma:
      Date;

    csv:
      string;

    mes:
      number | null;
  }
) {
  if (
    !datos.mes
  ) {
    throw new Error(
      "El Anexo V no tiene un mes asociado."
    );
  }

  const configuracion =
    ANEXO_V.meses[
      datos.mes
    ];

  if (!configuracion) {
    throw new Error(
      `El mes ${datos.mes} no está configurado para la estampación del Anexo V.`
    );
  }

  const paginas =
    pdf.getPages();

  const pagina =
    paginas[
      configuracion.pagina
    ];

  if (!pagina) {
    throw new Error(
      "La plantilla del Anexo V no contiene la página necesaria para colocar la firma."
    );
  }

  const nombreCompleto =
    limpiarTextoPdf(
      `${datos.nombre} ${datos.apellidos}`
    );

  const fecha =
    formatearFechaHora(
      datos.fechaFirma
    );

  const urlVerificacion =
    crearUrlVerificacion(
      datos.csv
    );

  const anchoFirma =
    configuracion.firma.xFinal -
    configuracion.firma.x;

  const altoFirma =
    configuracion.firma.yFinal -
    configuracion.firma.y;

  /*
   * Dentro de FIRMA DEL PROFESOR:
   *
   * - Firmado electrónicamente
   * - Nombre completo
   * - DNI/NIE completo
   * - Fecha/hora
   *
   * El CSV y su URL NO se colocan aquí.
   */
  dibujarBloqueEnCaja(
    pagina,
    font,
    fontBold,
    {
      xMM:
        configuracion.firma.x,

      yMM:
        configuracion.firma.y,

      anchoMM:
        anchoFirma,

      altoMM:
        altoFirma,

      lineas: [
        {
          texto:
            "FIRMADO ELECTRONICAMENTE",

          bold:
            true,
        },
        {
          texto:
            nombreCompleto,

          bold:
            true,
        },
        {
          texto:
            `DNI/NIE: ${datos.dni}`,
        },
        {
          texto:
            fecha,
        },
      ],

      sizeInicial:
        5.0,

      sizeMinimo:
        3.6,

      interlineadoMM:
        2.35,
    }
  );

  /*
   * En OBSERVACIONES:
   *
   * CSV + URL de verificación.
   */
  dibujarVerificacionAnexoV(
    pagina,
    font,
    fontBold,
    {
      csv:
        datos.csv,

      url:
        urlVerificacion,

      x:
        configuracion
          .observaciones
          .x,

      y:
        configuracion
          .observaciones
          .y,

      xFinal:
        configuracion
          .observaciones
          .xFinal,

      yFinal:
        configuracion
          .observaciones
          .yFinal,
    }
  );
}

function dibujarVerificacionAnexoV(
  pagina:
    PDFPage,

  font:
    PDFFont,

  fontBold:
    PDFFont,

  datos: {
    csv:
      string;

    url:
      string;

    x:
      number;

    y:
      number;

    xFinal:
      number;

    yFinal:
      number;
  }
) {
  const ancho =
    datos.xFinal -
    datos.x;

  const alto =
    datos.yFinal -
    datos.y;

  /*
   * Las zonas de observaciones son bajas.
   * Por eso usamos un tamaño pequeño pero legible.
   */
  dibujarBloqueEnCaja(
    pagina,
    font,
    fontBold,
    {
      xMM:
        datos.x,

      yMM:
        datos.y,

      anchoMM:
        ancho,

      altoMM:
        alto,

      lineas: [
        {
          texto:
            `CSV: ${datos.csv}`,

          bold:
            true,
        },
        {
          texto:
            datos.url,
        },
      ],

      sizeInicial:
        4.0,

      sizeMinimo:
        2.9,

      interlineadoMM:
        1.7,

      maxLineasPorElemento:
        1,
    }
  );
}

/* =========================================================
   ANEXO I
   ========================================================= */

async function estamparAnexoI(
  pdf:
    PDFDocument,

  font:
    PDFFont,

  fontBold:
    PDFFont,

  datos: {
    matriculaId:
      number;

    profesorId:
      number;

    nombre:
      string;

    apellidos:
      string;

    dni:
      string;

    fechaFirma:
      Date;

    csv:
      string;
  }
) {
  const matricula =
    await prisma.matricula.findUnique({
      where: {
        id:
          datos.matriculaId,
      },

      select: {
        id: true,

        centroId:
          true,

        gradoId:
          true,

        curso:
          true,

        asignaturasConvalidadas: {
          select: {
            asignaturaId:
              true,
          },
        },
      },
    });

  if (!matricula) {
    throw new Error(
      "No se ha encontrado la matrícula del Anexo I."
    );
  }

  const convalidadas =
    matricula
      .asignaturasConvalidadas
      .map(
        (
          item
        ) =>
          item.asignaturaId
      );

  const asignaturas =
    await prisma.asignatura.findMany({
      where: {
        centroId:
          matricula.centroId,

        gradoId:
          matricula.gradoId,

        curso:
          matricula.curso,

        ...(convalidadas.length >
        0
          ? {
              id: {
                notIn:
                  convalidadas,
              },
            }
          : {}),
      },

      orderBy: [
        {
          codigo:
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
      },
    });

  const indices =
    asignaturas
      .map(
        (
          asignatura,
          indice
        ) => ({
          indice,

          profesorId:
            asignatura.profesorId,
        })
      )
      .filter(
        (
          item
        ) =>
          item.profesorId ===
          datos.profesorId
      )
      .map(
        (
          item
        ) =>
          item.indice
      );

  if (
    indices.length ===
    0
  ) {
    throw new Error(
      "El profesor no tiene ninguna asignatura asociada a este Anexo I."
    );
  }

  const paginas =
    pdf.getPages();

  const nombre =
    limpiarTextoPdf(
      `${datos.nombre} ${datos.apellidos}`
    );

  const fecha =
    formatearFechaHoraCorta(
      datos.fechaFirma
    );

  /*
   * IMPORTANTE:
   * En el ANEXO I mostramos el DNI/NIE completo,
   * tal como se ha solicitado.
   */
  for (
    const indiceGlobal
    of indices
  ) {
    const indicePagina =
      Math.floor(
        indiceGlobal /
        ANEXO_I
          .maxAsignaturasPagina
      );

    const indiceFila =
      indiceGlobal %
      ANEXO_I
        .maxAsignaturasPagina;

    const pagina =
      paginas[
        indicePagina
      ];

    if (!pagina) {
      continue;
    }

    const yFila =
      ANEXO_I
        .primeraFilaY +
      (
        indiceFila *
        ANEXO_I
          .separacionFilas
      );

    dibujarFirmaFilaAnexoI(
      pagina,
      font,
      fontBold,
      {
        nombre,

        dni:
          datos.dni,

        fecha,

        yMM:
          yFila,
      }
    );
  }

  /*
   * CSV + URL de verificación.
   *
   * Si el ANEXO I tiene una sola página, todo queda
   * recogido en esa misma hoja.
   *
   * Si tiene varias páginas, se coloca en la última.
   */
  const ultimaPagina =
    paginas[
      paginas.length -
      1
    ];

  if (ultimaPagina) {
    const urlVerificacion =
      crearUrlVerificacion(
        datos.csv
      );

    escribirTextoAjustadoMM(
      ultimaPagina,
      fontBold,
      `VERIFICACION CSV: ${datos.csv}`,
      ANEXO_I
        .verificacion
        .x,
      ANEXO_I
        .verificacion
        .y,
      ANEXO_I
        .verificacion
        .ancho,
      ANEXO_I
        .verificacion
        .size,
      3.75
    );

    escribirTextoAjustadoMM(
      ultimaPagina,
      font,
      `URL: ${urlVerificacion}`,
      ANEXO_I
        .verificacion
        .x,
      ANEXO_I
        .verificacion
        .y +
        3.6,
      ANEXO_I
        .verificacion
        .ancho,
      4.5,
      3.5
    );
  }
}

async function estamparDirectorAnexoI(
  pdf: PDFDocument,
  font: PDFFont,
  fontBold: PDFFont,
  datos: {
    nombre: string;
    apellidos: string;
    dni: string;
    fechaFirma: Date;
    selloFirmaUrl: string | null;
  }
) {
  if (!datos.selloFirmaUrl) {
    throw new Error("El centro no tiene un sello configurado para completar el Anexo I.");
  }

  const paginas = pdf.getPages();
  const pagina = paginas[paginas.length - 1];
  if (!pagina) throw new Error("El Anexo I no contiene ninguna página.");

  const bytesSello = await readFile(resolverRutaSello(datos.selloFirmaUrl));
  const imagen = datos.selloFirmaUrl.toLowerCase().endsWith(".png")
    ? await pdf.embedPng(bytesSello)
    : await pdf.embedJpg(bytesSello);
  const caja = ANEXO_I.firmaDirector;
  const escala = Math.min(
    (caja.selloAncho * MM_A_PUNTOS) / imagen.width,
    (caja.selloAlto * MM_A_PUNTOS) / imagen.height
  );
  const anchoImagen = imagen.width * escala;
  const altoImagen = imagen.height * escala;
  const posicionSello = posicionDesdeMM(caja.selloX, caja.selloY + caja.selloAlto);

  pagina.drawImage(imagen, {
    x: posicionSello.x + (caja.selloAncho * MM_A_PUNTOS - anchoImagen) / 2,
    y: posicionSello.y + (caja.selloAlto * MM_A_PUNTOS - altoImagen) / 2,
    width: anchoImagen,
    height: altoImagen,
  });

  dibujarBloqueEnCaja(pagina, font, fontBold, {
    xMM: caja.x,
    yMM: caja.y,
    anchoMM: caja.ancho,
    altoMM: caja.alto,
    lineas: [
      { texto: "FIRMADO ELECTRONICAMENTE POR EL DIRECTOR", bold: true },
      { texto: `${datos.nombre} ${datos.apellidos}`, bold: true },
      { texto: `DNI/NIE: ${datos.dni}` },
      { texto: formatearFechaHora(datos.fechaFirma) },
    ],
    sizeInicial: 5,
    sizeMinimo: 3.6,
    interlineadoMM: 2.5,
  });
}

function dibujarFirmaFilaAnexoI(
  pagina:
    PDFPage,

  font:
    PDFFont,

  fontBold:
    PDFFont,

  datos: {
    nombre:
      string;

    dni:
      string;

    fecha:
      string;

    yMM:
      number;
  }
) {
  const x =
    ANEXO_I
      .firmaProfesor
      .x;

  const ancho =
    ANEXO_I
      .firmaProfesor
      .ancho;

  const nombreLineas =
    envolverTexto(
      datos.nombre,
      fontBold,
      ANEXO_I
        .firmaProfesor
        .nombreSize,
      ancho *
        MM_A_PUNTOS,
      2
    );

  let y =
    datos.yMM -
    1.25;

  for (
    const linea
    of nombreLineas
  ) {
    escribirTextoMM(
      pagina,
      linea,
      x,
      y,
      ANEXO_I
        .firmaProfesor
        .nombreSize,
      fontBold
    );

    y +=
      2.05;
  }

  escribirTextoMM(
    pagina,
    `${datos.dni} | ${datos.fecha}`,
    x,
    y,
    ANEXO_I
      .firmaProfesor
      .datosSize,
    font
  );
}

/* =========================================================
   DIBUJO COMÚN
   ========================================================= */

function dibujarBloqueEnCaja(
  pagina:
    PDFPage,

  font:
    PDFFont,

  fontBold:
    PDFFont,

  opciones: {
    xMM:
      number;

    yMM:
      number;

    anchoMM:
      number;

    altoMM:
      number;

    lineas: {
      texto:
        string;

      bold?:
        boolean;
    }[];

    sizeInicial:
      number;

    sizeMinimo:
      number;

    interlineadoMM:
      number;

    maxLineasPorElemento?:
      number;
  }
) {
  let size =
    opciones.sizeInicial;

  const maxLineas =
    opciones.maxLineasPorElemento ??
    2;

  while (
    size >=
    opciones.sizeMinimo
  ) {
    const lineasCalculadas:
      {
        texto:
          string;

        bold:
          boolean;
      }[] =
      [];

    for (
      const item
      of opciones.lineas
    ) {
      const fuente =
        item.bold
          ? fontBold
          : font;

      const lineas =
        envolverTexto(
          limpiarTextoPdf(
            item.texto
          ),
          fuente,
          size,
          opciones.anchoMM *
            MM_A_PUNTOS,
          maxLineas
        );

      for (
        const linea
        of lineas
      ) {
        lineasCalculadas.push({
          texto:
            linea,

          bold:
            Boolean(
              item.bold
            ),
        });
      }
    }

    const alturaNecesaria =
      Math.max(
        0,
        (
          lineasCalculadas.length -
          1
        ) *
          opciones
            .interlineadoMM
      );

    if (
      alturaNecesaria <=
      opciones.altoMM
    ) {
      let y =
        opciones.yMM;

      for (
        const linea
        of lineasCalculadas
      ) {
        escribirTextoMM(
          pagina,
          linea.texto,
          opciones.xMM,
          y,
          size,
          linea.bold
            ? fontBold
            : font
        );

        y +=
          opciones
            .interlineadoMM;
      }

      return;
    }

    size -=
      0.2;
  }

  /*
   * Último recurso:
   * si un nombre o URL es extraordinariamente largo,
   * escribimos al tamaño mínimo respetando el ancho.
   */
  let y =
    opciones.yMM;

  for (
    const item
    of opciones.lineas
  ) {
    const fuente =
      item.bold
        ? fontBold
        : font;

    const lineas =
      envolverTexto(
        limpiarTextoPdf(
          item.texto
        ),
        fuente,
        opciones.sizeMinimo,
        opciones.anchoMM *
          MM_A_PUNTOS,
        maxLineas
      );

    for (
      const linea
      of lineas
    ) {
      if (
        y >
        opciones.yMM +
          opciones.altoMM
      ) {
        return;
      }

      escribirTextoMM(
        pagina,
        linea,
        opciones.xMM,
        y,
        opciones.sizeMinimo,
        fuente
      );

      y +=
        opciones
          .interlineadoMM;
    }
  }
}

function escribirTextoAjustadoMM(
  pagina:
    PDFPage,

  font:
    PDFFont,

  texto:
    string,

  xMM:
    number,

  yMM:
    number,

  anchoMM:
    number,

  sizeInicial:
    number,

  sizeMinimo:
    number
) {
  let size =
    sizeInicial;

  const textoSeguro =
    limpiarTextoPdf(
      texto
    );

  const anchoMax =
    anchoMM *
    MM_A_PUNTOS;

  while (
    size >
      sizeMinimo &&
    font.widthOfTextAtSize(
      textoSeguro,
      size
    ) >
      anchoMax
  ) {
    size -=
      0.25;
  }

  escribirTextoMM(
    pagina,
    textoSeguro,
    xMM,
    yMM,
    size,
    font
  );
}

function envolverTexto(
  texto:
    string,

  font:
    PDFFont,

  size:
    number,

  anchoMax:
    number,

  maxLineas:
    number
) {
  const palabras =
    texto
      .trim()
      .split(
        /\s+/
      );

  const lineas:
    string[] =
    [];

  let actual =
    "";

  for (
    const palabra
    of palabras
  ) {
    const prueba =
      actual
        ? `${actual} ${palabra}`
        : palabra;

    if (
      font.widthOfTextAtSize(
        prueba,
        size
      ) <=
      anchoMax
    ) {
      actual =
        prueba;

      continue;
    }

    if (actual) {
      lineas.push(
        actual
      );
    }

    actual =
      palabra;

    if (
      lineas.length >=
      maxLineas
    ) {
      break;
    }
  }

  if (
    actual &&
    lineas.length <
      maxLineas
  ) {
    lineas.push(
      actual
    );
  }

  /*
   * Si hay una palabra/URL más larga que el ancho,
   * la reducimos en fragmentos para evitar que salga
   * fuera de la caja.
   */
  const resultado:
    string[] =
    [];

  for (
    const linea
    of lineas
  ) {
    if (
      font.widthOfTextAtSize(
        linea,
        size
      ) <=
      anchoMax
    ) {
      resultado.push(
        linea
      );

      continue;
    }

    let fragmento =
      "";

    for (
      const caracter
      of linea
    ) {
      const prueba =
        fragmento +
        caracter;

      if (
        font.widthOfTextAtSize(
          prueba,
          size
        ) <=
        anchoMax
      ) {
        fragmento =
          prueba;
      } else {
        if (
          fragmento
        ) {
          resultado.push(
            fragmento
          );
        }

        fragmento =
          caracter;

        if (
          resultado.length >=
          maxLineas
        ) {
          break;
        }
      }
    }

    if (
      fragmento &&
      resultado.length <
        maxLineas
    ) {
      resultado.push(
        fragmento
      );
    }
  }

  return resultado.slice(
    0,
    maxLineas
  );
}

function escribirTextoMM(
  pagina:
    PDFPage,

  texto:
    string,

  xMM:
    number,

  yMM:
    number,

  size:
    number,

  font:
    PDFFont
) {
  const posicion =
    posicionDesdeMM(
      xMM,
      yMM
    );

  pagina.drawText(
    texto,
    {
      x:
        posicion.x,

      y:
        posicion.y,

      size,

      font,

      color:
        rgb(
          0.08,
          0.08,
          0.08
        ),
    }
  );
}

function posicionDesdeMM(
  xMM:
    number,

  yMM:
    number
) {
  return {
    x:
      xMM *
      MM_A_PUNTOS,

    y:
      (
        ALTURA_A4_MM -
        yMM
      ) *
      MM_A_PUNTOS,
  };
}

/* =========================================================
   SEGURIDAD / FORMATO
   ========================================================= */

function resolverRutaPrivada(
  key:
    string
) {
  const keyNormalizada =
    normalizarRuta(
      key
    )
      .replace(
        /^\/+/,
        ""
      );

  if (
    !keyNormalizada.startsWith(
      "storage/firmas/"
    )
  ) {
    throw new Error(
      "La ubicación del PDF no pertenece al almacenamiento privado de firmas."
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
      "La ubicación física del PDF no es válida."
    );
  }

  return ruta;
}

function resolverRutaSello(key: string) {
  const keyNormalizada = normalizarRuta(key).replace(/^\/+/, "");
  if (!keyNormalizada.startsWith("storage/centros/")) {
    throw new Error("La ubicación del sello del centro no es válida.");
  }
  const raiz = path.resolve(process.cwd(), "storage", "centros");
  const ruta = path.resolve(process.cwd(), keyNormalizada);
  if (!ruta.startsWith(`${raiz}${path.sep}`)) {
    throw new Error("La ubicación física del sello del centro no es válida.");
  }
  return ruta;
}

function calcularSha256(
  bytes:
    Uint8Array
) {
  return createHash(
    "sha256"
  )
    .update(
      bytes
    )
    .digest(
      "hex"
    );
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

function crearUrlVerificacion(
  csv:
    string
) {
  return `${APP_URL}/verificar/${encodeURIComponent(
    csv
  )}`;
}

function formatearFechaHora(
  fecha:
    Date
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
    }
  ).format(
    fecha
  );
}

function formatearFechaHoraCorta(
  fecha:
    Date
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
        "2-digit",

      hour:
        "2-digit",

      minute:
        "2-digit",
    }
  ).format(
    fecha
  );
}

function limpiarTextoPdf(
  texto:
    string
) {
  return String(
    texto ??
      ""
  )
    .replace(
      /[\r\n\t]+/g,
      " "
    )
    .replace(
      /\s+/g,
      " "
    )
    .trim();
}
