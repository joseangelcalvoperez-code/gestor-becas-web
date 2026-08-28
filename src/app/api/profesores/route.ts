import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { obtenerSesion } from "@/lib/session";

/* =========================================================
   GET
   LISTAR PROFESORES DEL CENTRO
   ========================================================= */

export async function GET() {
  try {
    const sesion = await obtenerSesion();

    if (!sesion) {
      return NextResponse.json(
        {
          ok: false,
          error: "No hay una sesión activa.",
        },
        {
          status: 401,
        }
      );
    }

    const profesores =
      await prisma.profesor.findMany({
        where: {
          centroId: sesion.centroId,
          activo: true,
        },

        orderBy: [
          {
            apellidos: "asc",
          },
          {
            nombre: "asc",
          },
        ],

        select: {
          id: true,
          nombre: true,
          apellidos: true,
          dni: true,

          _count: {
            select: {
              asignaturas: true,
            },
          },
        },
      });

    return NextResponse.json({
      ok: true,
      profesores,
    });
  } catch (error) {
    console.error(
      "Error cargando profesores:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          "No se han podido cargar los profesores.",
      },
      {
        status: 500,
      }
    );
  }
}