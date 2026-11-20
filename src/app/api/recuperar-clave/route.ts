import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { registrarFallo, segundosBloqueo } from "@/lib/limiteIntentos";

/* =========================================================
   POST /api/recuperar-clave
   Registra una solicitud de restablecimiento de contraseña.
   No envía nada: la atiende el administrador con
     npm run clave:restablecer -- correo@centro.es
   que genera una contraseña provisional para comunicarla al
   centro por un canal oficial.

   La respuesta es siempre la misma (exista o no la cuenta) para
   no revelar qué correos están registrados.
   ========================================================= */

const RESPUESTA = {
  ok: true,
  mensaje:
    "Si los datos corresponden a una cuenta, la solicitud ha quedado registrada. El servicio de soporte le facilitará una contraseña provisional por un canal oficial.",
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body.email ?? "").trim().toLowerCase();
    const codigoCentro = String(body.codigoCentro ?? "").trim();

    if (!email || !codigoCentro) {
      return NextResponse.json(
        { ok: false, error: "Indique el correo de acceso y el código de centro." },
        { status: 400 }
      );
    }

    // Máximo de solicitudes por correo y por ventana de tiempo
    const clave = `recuperar:${email}`;

    if (segundosBloqueo(clave) > 0) {
      return NextResponse.json(RESPUESTA);
    }

    registrarFallo(clave);

    const usuario = await prisma.usuario.findFirst({
      where: { email, activo: true, centro: { codigo: codigoCentro, activo: true } },
      select: { id: true },
    });

    if (usuario) {
      const pendiente = await prisma.solicitudRestablecimiento.findFirst({
        where: { usuarioId: usuario.id, atendidaAt: null },
        select: { id: true },
      });

      if (!pendiente) {
        await prisma.solicitudRestablecimiento.create({ data: { usuarioId: usuario.id } });
      }
    }

    return NextResponse.json(RESPUESTA);
  } catch (error) {
    console.error("Error registrando la solicitud de restablecimiento:", error);

    return NextResponse.json(
      { ok: false, error: "No se ha podido registrar la solicitud." },
      { status: 500 }
    );
  }
}
