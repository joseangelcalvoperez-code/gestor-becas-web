import {
  NextResponse,
} from "next/server";

import bcrypt from "bcryptjs";

import {
  prisma,
} from "@/lib/prisma";

import {
  crearSesion,
} from "@/lib/session";

export async function POST(
  request: Request
) {
  try {
    const body =
      await request.json();

    const email =
      String(
        body.email ??
          ""
      )
        .trim()
        .toLowerCase();

    const codigoCentro =
      String(
        body.codigoCentro ??
          ""
      ).trim();

    const password =
      String(
        body.password ??
          ""
      );

    if (
      !email ||
      !codigoCentro ||
      !password
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Introduzca el email, el código de centro y la contraseña.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * El código identifica primero el centro al que el usuario
     * quiere acceder. Esto permite que una misma dirección de
     * email pueda gestionar varios centros diferentes.
     */
    const centro =
      await prisma.centro.findUnique({
        where: {
          codigo:
            codigoCentro,
        },
        select: {
          id: true,
          nombre: true,
          codigo: true,
          activo: true,
        },
      });

    if (
      !centro ||
      !centro.activo
    ) {
      return credencialesIncorrectas();
    }

    const usuario =
      await prisma.usuario.findUnique({
        where: {
          centroId_email: {
            centroId:
              centro.id,
            email,
          },
        },
      });

    /*
     * Mantenemos una respuesta genérica para no revelar si
     * falla el email, el centro o la contraseña.
     */
    if (
      !usuario ||
      !usuario.activo
    ) {
      return credencialesIncorrectas();
    }

    const passwordCorrecta =
      await bcrypt.compare(
        password,
        usuario.passwordHash
      );

    if (!passwordCorrecta) {
      return credencialesIncorrectas();
    }

    await crearSesion({
      usuarioId:
        usuario.id,
      centroId:
        usuario.centroId,
      nombre:
        usuario.nombre,
      email:
        usuario.email,
    });

    return NextResponse.json({
      ok: true,
      usuario: {
        id:
          usuario.id,
        nombre:
          usuario.nombre,
        apellidos:
          usuario.apellidos,
        email:
          usuario.email,
      },
      centro: {
        id:
          centro.id,
        nombre:
          centro.nombre,
        codigo:
          centro.codigo,
      },
    });
  } catch (error) {
    console.error(
      "Error iniciando sesión:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          "No se ha podido iniciar sesión.",
      },
      {
        status: 500,
      }
    );
  }
}

function credencialesIncorrectas() {
  return NextResponse.json(
    {
      ok: false,
      error:
        "Datos de acceso incorrectos.",
    },
    {
      status: 401,
    }
  );
}
