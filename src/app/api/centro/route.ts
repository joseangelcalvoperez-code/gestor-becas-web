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
   GET
   CARGAR DATOS DEL CENTRO DE LA SESIÓN
   ========================================================= */

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

    const centro =
      await prisma.centro.findFirst({
        where: {
          id:
            sesion.centroId,

          activo:
            true,
        },

        select: {
          id: true,

          nombre: true,
          codigo: true,
          cif: true,
          direccion: true,
          localidad: true,
          provincia: true,
          telefono: true,
          email: true,
        },
      });

    if (!centro) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "No se ha encontrado el centro asociado a la sesión.",
        },
        {
          status: 404,
        }
      );
    }

    return NextResponse.json({
      ok: true,
      centro,
    });
  } catch (error) {
    console.error(
      "Error cargando centro:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          "No se han podido cargar los datos del centro.",
      },
      {
        status: 500,
      }
    );
  }
}

/* =========================================================
   PUT
   ACTUALIZAR DATOS DEL CENTRO DE LA SESIÓN
   ========================================================= */

export async function PUT(
  request: Request
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

    const body =
      await request.json();

    const nombre =
      String(
        body.nombre ??
          ""
      ).trim();

    const codigo =
      String(
        body.codigo ??
          ""
      ).trim();

    const cif =
      String(
        body.cif ??
          ""
      ).trim();

    const direccion =
      String(
        body.direccion ??
          ""
      ).trim();

    const localidad =
      String(
        body.localidad ??
          ""
      ).trim();

    const provincia =
      String(
        body.provincia ??
          ""
      ).trim();

    const telefono =
      String(
        body.telefono ??
          ""
      ).trim();

    const email =
      String(
        body.email ??
          ""
      )
        .trim()
        .toLowerCase();

    /* =====================================================
       VALIDACIONES
       ===================================================== */

    if (
      !nombre ||
      !codigo ||
      !cif ||
      !direccion ||
      !localidad ||
      !provincia ||
      !telefono ||
      !email
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Debe completar todos los campos.",
        },
        {
          status: 400,
        }
      );
    }

    const emailValido =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        email
      );

    if (!emailValido) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "El email del centro no es válido.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Comprobamos si el nuevo código ya lo
     * utiliza otro centro.
     */

    const centroConMismoCodigo =
      await prisma.centro.findFirst({
        where: {
          codigo,

          NOT: {
            id:
              sesion.centroId,
          },
        },

        select: {
          id: true,
        },
      });

    if (
      centroConMismoCodigo
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Ya existe otro centro con ese código.",
        },
        {
          status: 409,
        }
      );
    }

    /*
     * MUY IMPORTANTE:
     *
     * El id del centro NO viene del navegador.
     * Siempre utilizamos sesion.centroId.
     *
     * Así un centro no puede cambiar el id
     * de una petición para modificar otro.
     */

    const resultado =
      await prisma.centro.updateMany({
        where: {
          id:
            sesion.centroId,

          activo:
            true,
        },

        data: {
          nombre,
          codigo,
          cif,
          direccion,
          localidad,
          provincia,
          telefono,
          email,
        },
      });

    if (
      resultado.count !== 1
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "No se ha podido actualizar el centro.",
        },
        {
          status: 404,
        }
      );
    }

    const centroActualizado =
      await prisma.centro.findUnique({
        where: {
          id:
            sesion.centroId,
        },

        select: {
          id: true,

          nombre: true,
          codigo: true,
          cif: true,
          direccion: true,
          localidad: true,
          provincia: true,
          telefono: true,
          email: true,
        },
      });

    return NextResponse.json({
      ok: true,

      mensaje:
        "Datos del centro guardados correctamente.",

      centro:
        centroActualizado,
    });
  } catch (error) {
    console.error(
      "Error guardando centro:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          "No se han podido guardar los datos del centro.",
      },
      {
        status: 500,
      }
    );
  }
}