import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { obtenerSesion } from "@/lib/session";

export async function GET() {
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

    const envios =
      await prisma.envioFirma.findMany({
        where: {
          centroId:
            sesion.centroId,

          /*
           * =====================================================
           * SOLO ENVÍOS OPERATIVOS
           * =====================================================
           *
           * Cuando se elimina un curso académico, EnvioFirma
           * NO se elimina porque forma parte de la estructura
           * necesaria para conservar la evidencia histórica.
           *
           * La relación CursoAcademico -> EnvioFirma utiliza
           * onDelete: SetNull, por lo que al borrar el curso:
           *
           *   cursoAcademicoId = null
           *
           * Esos envíos históricos deben permanecer en la base
           * de datos para sostener:
           * - DocumentoFirma
           * - FirmaDocumento
           * - FirmanteEnvio
           * - EventoFirma
           * - CSV
           * - SHA-256
           * - snapshot histórico
           *
           * Pero ya NO forman parte de la gestión diaria del
           * centro y, por tanto, no deben aparecer en
           * "ENVÍOS REALIZADOS".
           *
           * Este filtro también limpia visualmente los envíos
           * pertenecientes a cursos que ya fueron eliminados
           * antes de incorporar esta lógica.
           */
          cursoAcademicoId: {
            not:
              null,
          },
        },

        orderBy: {
          createdAt:
            "desc",
        },

        select: {
          id: true,
          nombre: true,
          tipo: true,
          estado: true,
          anio: true,
          mes: true,
          createdAt: true,

          _count: {
            select: {
              documentos:
                true,

              firmantes:
                true,
            },
          },
        },
      });

    return NextResponse.json({
      ok: true,
      envios,
    });
  } catch (error) {
    console.error(
      "Error cargando envíos de firma:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          "No se han podido cargar los envíos de firma.",
      },
      {
        status: 500,
      }
    );
  }
}
