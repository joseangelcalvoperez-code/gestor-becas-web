import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { obtenerSesion } from "@/lib/session";

export async function DELETE(
  request: Request,
  context: {
    params: Promise<{
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
      id,
    } =
      await context.params;

    const asignaturaId =
      Number(id);

    if (
      !Number.isInteger(
        asignaturaId
      ) ||
      asignaturaId <= 0
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "La asignatura no es válida.",
        },
        {
          status: 400,
        }
      );
    }

    const asignatura =
      await prisma.asignatura.findFirst({
        where: {
          id:
            asignaturaId,

          centroId:
            sesion.centroId,
        },

        select: {
          id: true,
          profesorId: true,
        },
      });

    if (!asignatura) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "No se ha encontrado la asignatura.",
        },
        {
          status: 404,
        }
      );
    }

    await prisma.asignatura.delete({
      where: {
        id:
          asignatura.id,
      },
    });

    /*
     * No eliminamos automáticamente al profesor.
     *
     * Puede estar asociado a otras asignaturas.
     * Más adelante añadiremos una gestión
     * específica de profesores si interesa.
     */

    return NextResponse.json({
      ok: true,

      mensaje:
        "Asignatura eliminada correctamente.",
    });
  } catch (error) {
    console.error(
      "Error eliminando asignatura:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          "No se ha podido eliminar la asignatura.",
      },
      {
        status: 500,
      }
    );
  }
}