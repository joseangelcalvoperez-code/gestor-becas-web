import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { crearSesion, obtenerSesionParaCambioClave } from "@/lib/session";
import { validarNuevaClave } from "@/lib/clave";
import { limpiarIntentos, registrarFallo, segundosBloqueo } from "@/lib/limiteIntentos";

/* =========================================================
   POST /api/cambiar-clave
   Cambio de contraseña del usuario conectado. Es también el
   paso obligatorio tras entrar con una contraseña provisional.
   ========================================================= */

export async function POST(request: Request) {
  const sesion = await obtenerSesionParaCambioClave();

  if (!sesion) {
    return NextResponse.json({ ok: false, error: "No hay una sesión activa." }, { status: 401 });
  }

  const claveLimite = `cambio-clave:${sesion.usuarioId}`;
  const espera = segundosBloqueo(claveLimite);

  if (espera > 0) {
    return NextResponse.json(
      {
        ok: false,
        error: `Demasiados intentos fallidos. Vuelva a intentarlo en ${Math.ceil(espera / 60)} minutos.`,
      },
      { status: 429, headers: { "Retry-After": String(espera) } }
    );
  }

  try {
    const body = await request.json();
    const actual = String(body.actual ?? "");
    const nueva = String(body.nueva ?? "");
    const repetir = String(body.repetir ?? "");

    if (!actual || !nueva || !repetir) {
      return NextResponse.json({ ok: false, error: "Complete todos los campos." }, { status: 400 });
    }

    if (nueva !== repetir) {
      return NextResponse.json({ ok: false, error: "Las contraseñas nuevas no coinciden." }, { status: 400 });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id: sesion.usuarioId },
      select: { id: true, email: true, nombre: true, centroId: true, passwordHash: true },
    });

    if (!usuario) {
      return NextResponse.json({ ok: false, error: "No hay una sesión activa." }, { status: 401 });
    }

    if (!(await bcrypt.compare(actual, usuario.passwordHash))) {
      registrarFallo(claveLimite);

      return NextResponse.json({ ok: false, error: "La contraseña actual no es correcta." }, { status: 400 });
    }

    const problema = validarNuevaClave(nueva, { email: usuario.email, anterior: actual });

    if (problema) {
      return NextResponse.json({ ok: false, error: problema }, { status: 400 });
    }

    // Redondeado al segundo: las sesiones emitidas desde este momento
    // (incluida la nueva) siguen siendo válidas; las anteriores no.
    const ahora = new Date(Math.floor(Date.now() / 1000) * 1000);

    await prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        passwordHash: await bcrypt.hash(nueva, 12),
        debeCambiarClave: false,
        claveTemporalExpira: null,
        claveActualizadaAt: ahora,
      },
    });

    limpiarIntentos(claveLimite);

    await crearSesion({
      usuarioId: usuario.id,
      centroId: usuario.centroId,
      nombre: usuario.nombre,
      email: usuario.email,
    });

    return NextResponse.json({ ok: true, mensaje: "Contraseña actualizada correctamente." });
  } catch (error) {
    console.error("Error cambiando la contraseña:", error);

    return NextResponse.json({ ok: false, error: "No se ha podido cambiar la contraseña." }, { status: 500 });
  }
}
