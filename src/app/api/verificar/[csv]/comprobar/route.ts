import {
  createHash,
} from "node:crypto";

import {
  NextResponse,
} from "next/server";

import {
  prisma,
} from "@/lib/prisma";

export const runtime =
  "nodejs";

type Context = {
  params:
    Promise<{
      csv:
        string;
    }>;
};

const MAX_PDF_BYTES =
  15 *
  1024 *
  1024;

/*
 * =========================================================
 * POST /api/verificar/[csv]/comprobar
 * =========================================================
 *
 * Recibe una copia del PDF aportada por el usuario, calcula
 * su SHA-256 y la compara con DocumentoFirma.hashFirmado.
 *
 * IMPORTANTE:
 * - el PDF NO se escribe en disco;
 * - el PDF NO se guarda en la base de datos;
 * - el PDF NO se incorpora al almacenamiento documental;
 * - únicamente vive en memoria durante esta petición.
 */
export async function POST(
  request:
    Request,

  context:
    Context
) {
  try {
    const {
      csv:
        csvParametro,
    } =
      await context.params;

    const csv =
      normalizarCsv(
        csvParametro
      );

    if (!csv) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "El código seguro de verificación no es válido.",
        },
        {
          status: 400,
        }
      );
    }

    const documento =
      await prisma.documentoFirma.findUnique({
        where: {
          csv,
        },

        select: {
          estado:
            true,

          hashFirmado:
            true,

          firmas: {
            select: {
              id:
                true,
            },

            take:
              1,
          },
        },
      });

    if (
      !documento ||
      (
        documento.estado !==
          "FIRMADO" &&
        documento.estado !==
          "PARCIAL"
      ) ||
      !documento.hashFirmado ||
      documento.firmas.length ===
        0
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "No existe una evidencia de firma válida para este CSV.",
        },
        {
          status: 404,
        }
      );
    }

    const formData =
      await request.formData();

    const archivo =
      formData.get(
        "archivo"
      );

    if (
      !(archivo instanceof
        File)
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Debe seleccionar un archivo PDF.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      archivo.size <=
        0 ||
      archivo.size >
        MAX_PDF_BYTES
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "El PDF debe tener un tamaño máximo de 15 MB.",
        },
        {
          status: 400,
        }
      );
    }

    const nombre =
      archivo.name
        .toLowerCase();

    const tipoCorrecto =
      archivo.type ===
        "application/pdf" ||
      nombre.endsWith(
        ".pdf"
      );

    if (
      !tipoCorrecto
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "El archivo seleccionado debe ser un PDF.",
        },
        {
          status: 400,
        }
      );
    }

    const arrayBuffer =
      await archivo.arrayBuffer();

    const bytes =
      Buffer.from(
        arrayBuffer
      );

    /*
     * Comprobación mínima de cabecera PDF.
     */
    if (
      bytes.length <
        5 ||
      bytes
        .subarray(
          0,
          5
        )
        .toString(
          "ascii"
        ) !==
        "%PDF-"
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "El archivo no parece contener un PDF válido.",
        },
        {
          status: 400,
        }
      );
    }

    const hashCalculado =
      createHash(
        "sha256"
      )
        .update(
          bytes
        )
        .digest(
          "hex"
        );

    const hashRegistrado =
      documento
        .hashFirmado
        .toLowerCase();

    const coincide =
      hashCalculado ===
      hashRegistrado;

    return NextResponse.json({
      ok: true,

      coincide,

      hashCalculado,

      hashRegistrado,
    });
  } catch (
    error
  ) {
    console.error(
      "Error comprobando PDF por SHA-256:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          "No se ha podido comprobar el PDF.",
      },
      {
        status: 500,
      }
    );
  }
}

function normalizarCsv(
  valor:
    string
) {
  try {
    return decodeURIComponent(
      valor
    )
      .trim()
      .toUpperCase()
      .replace(
        /\s+/g,
        ""
      );
  } catch {
    return valor
      .trim()
      .toUpperCase()
      .replace(
        /\s+/g,
        ""
      );
  }
}
