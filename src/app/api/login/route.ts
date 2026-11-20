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

import {
  limpiarIntentos,
  registrarFallo,
  segundosBloqueo,
} from "@/lib/limiteIntentos";

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

    const password =
      String(
        body.password ??
          ""
      );

    if (
      !email ||
      !password
    ) {
      return NextResponse.json(
        {
          ok: false,

          error:
            "Introduzca el email y la contraseña.",
        },
        {
          status: 400,
        }
      );
    }

    const esperaSegundos =
      segundosBloqueo(email);

    if (esperaSegundos > 0) {
      return NextResponse.json(
        {
          ok: false,

          error:
            `Demasiados intentos fallidos. Vuelva a intentarlo en ${Math.ceil(esperaSegundos / 60)} minutos.`,
        },
        {
          status: 429,

          headers: {
            "Retry-After":
              String(esperaSegundos),
          },
        }
      );
    }

    const usuario =
      await prisma.usuario.findUnique({
        where: {
          email,
        },

        include: {
          centro: true,
        },
      });

    /*
     * Utilizamos el mismo mensaje cuando
     * el email no existe o la contraseña
     * es incorrecta.
     *
     * Así no revelamos qué emails están
     * registrados en la plataforma.
     */

    if (
      !usuario ||
      !usuario.activo ||
      !usuario.centro.activo
    ) {
      registrarFallo(email);

      return NextResponse.json(
        {
          ok: false,

          error:
            "Email o contraseña incorrectos.",
        },
        {
          status: 401,
        }
      );
    }

    const passwordCorrecta =
      await bcrypt.compare(
        password,
        usuario.passwordHash
      );

    if (
      !passwordCorrecta
    ) {
      registrarFallo(email);

      return NextResponse.json(
        {
          ok: false,

          error:
            "Email o contraseña incorrectos.",
        },
        {
          status: 401,
        }
      );
    }

    limpiarIntentos(email);

    /*
     * Contraseña provisional (restablecimiento): debe estar
     * vigente y obliga a cambiarla antes de usar la aplicación.
     */
    if (usuario.debeCambiarClave) {
      if (
        usuario.claveTemporalExpira &&
        usuario.claveTemporalExpira.getTime() < Date.now()
      ) {
        return NextResponse.json(
          {
            ok: false,

            error:
              "La contraseña provisional ha caducado. Solicite un nuevo restablecimiento desde «¿Ha olvidado su contraseña?».",
          },
          {
            status: 401,
          }
        );
      }
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

      cambioClave:
        usuario.debeCambiarClave,

      usuario: {
        id:
          usuario.id,

        nombre:
          usuario.nombre,

        email:
          usuario.email,
      },

      centro: {
        id:
          usuario.centro.id,

        nombre:
          usuario.centro.nombre,

        codigo:
          usuario.centro.codigo,
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