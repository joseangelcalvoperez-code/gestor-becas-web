import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { crearSesionAdmin } from "@/lib/sesionAdmin";
import { limpiarIntentos, registrarFallo, segundosBloqueo } from "@/lib/limiteIntentos";

const INCORRECTO = "Correo o contraseña incorrectos.";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");

    if (!email || !password) {
      return NextResponse.json({ ok: false, error: "Introduzca el correo y la contraseña." }, { status: 400 });
    }

    const claveLimite = `admin:${email}`;
    const espera = segundosBloqueo(claveLimite);

    if (espera > 0) {
      return NextResponse.json(
        { ok: false, error: `Demasiados intentos fallidos. Vuelva a intentarlo en ${Math.ceil(espera / 60)} minutos.` },
        { status: 429, headers: { "Retry-After": String(espera) } }
      );
    }

    const admin = await prisma.administrador.findUnique({ where: { email } });

    if (!admin || !admin.activo || !(await bcrypt.compare(password, admin.passwordHash))) {
      registrarFallo(claveLimite);
      return NextResponse.json({ ok: false, error: INCORRECTO }, { status: 401 });
    }

    if (admin.debeCambiarClave && admin.claveTemporalExpira && admin.claveTemporalExpira.getTime() < Date.now()) {
      return NextResponse.json(
        { ok: false, error: "La contraseña provisional ha caducado. Pida una nueva a otro administrador o al responsable técnico." },
        { status: 401 }
      );
    }

    limpiarIntentos(claveLimite);

    await prisma.administrador.update({ where: { id: admin.id }, data: { ultimoAcceso: new Date() } });
    await crearSesionAdmin({ administradorId: admin.id, nombre: admin.nombre, email: admin.email });

    return NextResponse.json({ ok: true, cambioClave: admin.debeCambiarClave });
  } catch (error) {
    console.error("Error en el acceso de administración:", error);
    return NextResponse.json({ ok: false, error: "No se ha podido iniciar sesión." }, { status: 500 });
  }
}
