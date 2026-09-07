import {
  NextResponse,
} from "next/server";

import {
  prisma,
} from "@/lib/prisma";

import {
  obtenerSesion,
} from "@/lib/session";

/* =========================================================
   PATCH
   EDITAR PROFESOR DEL CENTRO
   ========================================================= */

export async function PATCH(
  request: Request,
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

    const profesorId =
      Number(
        idTexto
      );

    if (
      !Number.isInteger(
        profesorId
      ) ||
      profesorId <= 0
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "El profesor seleccionado no es válido.",
        },
        {
          status: 400,
        }
      );
    }

    const body =
      await request.json();

    const nombre =
      String(
        body.nombre ??
          ""
      ).trim();

    const apellidos =
      String(
        body.apellidos ??
          ""
      ).trim();

    const dni =
      String(
        body.dni ??
          ""
      )
        .trim()
        .toUpperCase();

    const email =
      String(
        body.email ??
          ""
      )
        .trim()
        .toLowerCase();

    if (
      !nombre ||
      !apellidos ||
      !dni
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Debe completar nombre, apellidos y DNI/NIE.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      email &&
      !emailValido(
        email
      )
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "El email introducido no tiene un formato válido.",
        },
        {
          status: 400,
        }
      );
    }

    const profesor =
      await prisma.profesor.findFirst({
        where: {
          id:
            profesorId,

          centroId:
            sesion.centroId,

          activo:
            true,
        },

        select: {
          id: true,
          dni: true,
        },
      });

    if (!profesor) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "No se ha encontrado el profesor.",
        },
        {
          status: 404,
        }
      );
    }

    const dniDuplicado =
      await prisma.profesor.findFirst({
        where: {
          centroId:
            sesion.centroId,

          dni,

          id: {
            not:
              profesorId,
          },
        },

        select: {
          id: true,
        },
      });

    if (
      dniDuplicado
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Ya existe otro profesor con ese DNI/NIE.",
        },
        {
          status: 409,
        }
      );
    }

    const actualizado =
      await prisma.profesor.update({
        where: {
          id:
            profesorId,
        },

        data: {
          nombre,
          apellidos,
          dni,

          email:
            email ||
            null,
        },

        select: {
          id: true,
          nombre: true,
          apellidos: true,
          dni: true,
          email: true,

          _count: {
            select: {
              asignaturas:
                true,
            },
          },
        },
      });

    return NextResponse.json({
      ok: true,

      profesor:
        actualizado,

      mensaje:
        "Profesor actualizado correctamente.",
    });
  } catch (
    error
  ) {
    console.error(
      "Error actualizando profesor:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          "No se ha podido actualizar el profesor.",
      },
      {
        status: 500,
      }
    );
  }
}

function emailValido(
  email: string
) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    email
  );
}