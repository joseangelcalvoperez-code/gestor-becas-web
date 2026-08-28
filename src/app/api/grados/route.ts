import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { obtenerSesion } from "@/lib/session";

/* =========================================================
   GET
   LISTAR GRADOS DEL CENTRO
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

    const grados = await prisma.grado.findMany({
      where: {
        centroId: sesion.centroId,
        activo: true,
      },

      orderBy: {
        nombre: "asc",
      },

      select: {
        id: true,
        nombre: true,
        activo: true,

        _count: {
          select: {
            asignaturas: true,
          },
        },
      },
    });

    return NextResponse.json({
      ok: true,
      grados,
    });
  } catch (error) {
    console.error(
      "Error cargando grados:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          "No se han podido cargar los grados.",
      },
      {
        status: 500,
      }
    );
  }
}

/* =========================================================
   POST
   CREAR GRADO
   ========================================================= */

export async function POST(
  request: Request
) {
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

    const body = await request.json();

    const nombre = String(
      body.nombre ?? ""
    ).trim();

    if (!nombre) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Debe introducir el nombre del grado.",
        },
        {
          status: 400,
        }
      );
    }

    /* Comprobamos si ya existe */

    const existente =
      await prisma.grado.findFirst({
        where: {
          centroId: sesion.centroId,
          nombre,
        },

        select: {
          id: true,
          activo: true,
        },
      });

    if (existente) {
      /*
       * Si existía pero estaba desactivado,
       * lo recuperamos.
       */

      if (!existente.activo) {
        const grado =
          await prisma.grado.update({
            where: {
              id: existente.id,
            },

            data: {
              activo: true,
            },

            select: {
              id: true,
              nombre: true,
              activo: true,
            },
          });

        return NextResponse.json(
          {
            ok: true,
            grado,
            mensaje:
              "Grado recuperado correctamente.",
          },
          {
            status: 201,
          }
        );
      }

      return NextResponse.json(
        {
          ok: false,
          error:
            "Ya existe un grado con ese nombre.",
        },
        {
          status: 409,
        }
      );
    }

    const grado =
      await prisma.grado.create({
        data: {
          centroId: sesion.centroId,
          nombre,
        },

        select: {
          id: true,
          nombre: true,
          activo: true,
        },
      });

    return NextResponse.json(
      {
        ok: true,
        grado,
        mensaje:
          "Grado creado correctamente.",
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "Error creando grado:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          "No se ha podido crear el grado.",
      },
      {
        status: 500,
      }
    );
  }
}