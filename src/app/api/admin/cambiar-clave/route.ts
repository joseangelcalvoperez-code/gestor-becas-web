import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { crearSesionAdmin, estadoSesionAdmin } from "@/lib/sesionAdmin";
import { validarNuevaClave } from "@/lib/clave";
import { ahoraAlSegundo } from "@/lib/restablecimiento";
import { limpiarIntentos, registrarFallo, segundosBloqueo } from "@/lib/limiteIntentos";

export async function POST(request: Request) {
  const estado = await estadoSesionAdmin();

  if (estado.tipo === "ninguna") {
    return NextResponse.json({ ok: false, error: "No hay una sesión activa." }, { status: 401 });
  }

  const { sesion } = estado;
  const claveLimite = `admin-cambio:${sesion.administradorId}`;

  if (segundosBloqueo(claveLimite) > 0) {
    return NextResponse.json({ ok: false, error: "Demasiados intentos fallidos. Espere unos minutos." }, { status: 429 });
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

    const admin = await prisma.administrador.findUnique({ where: { id: sesion.administradorId } });

    if (!admin || !(await bcrypt.compare(actual, admin.passwordHash))) {
      registrarFallo(claveLimite);
      return NextResponse.json({ ok: false, error: "La contraseña actual no es correcta." }, { status: 400 });
    }

    const problema = validarNuevaClave(nueva, { email: admin.email, anterior: actual });

    if (problema) {
      return NextResponse.json({ ok: false, error: problema }, { status: 400 });
    }

    await prisma.administrador.update({
      where: { id: admin.id },
      data: {
        passwordHash: await bcrypt.hash(nueva, 12),
        debeCambiarClave: false,
        claveTemporalExpira: null,
        claveActualizadaAt: ahoraAlSegundo(),
      },
    });

    limpiarIntentos(claveLimite);
    await crearSesionAdmin(sesion);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error cambiando la contraseña de administración:", error);
    return NextResponse.json({ ok: false, error: "No se ha podido cambiar la contraseña." }, { status: 500 });
  }
}
