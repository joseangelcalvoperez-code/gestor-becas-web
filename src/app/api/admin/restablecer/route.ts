import { NextResponse } from "next/server";

import { obtenerSesionAdmin } from "@/lib/sesionAdmin";
import {
  ErrorRestablecimiento,
  HORAS_VALIDEZ_PERMITIDAS,
  restablecerClaveUsuario,
} from "@/lib/restablecimiento";

/* POST {usuarioId, horas} — genera una contraseña provisional para la cuenta de un centro */

export async function POST(request: Request) {
  const admin = await obtenerSesionAdmin();

  if (!admin) {
    return NextResponse.json({ ok: false, error: "No hay una sesión de administración." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const usuarioId = Number(body.usuarioId);
    const horas = Number(body.horas ?? 72);

    if (!Number.isInteger(usuarioId) || usuarioId <= 0) {
      return NextResponse.json({ ok: false, error: "Cuenta no válida." }, { status: 400 });
    }

    if (!(HORAS_VALIDEZ_PERMITIDAS as readonly number[]).includes(horas)) {
      return NextResponse.json({ ok: false, error: "Validez no permitida." }, { status: 400 });
    }

    const resultado = await restablecerClaveUsuario(usuarioId, horas, admin.administradorId);

    return NextResponse.json(
      { ok: true, ...resultado },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    if (error instanceof ErrorRestablecimiento) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }

    console.error("Error restableciendo contraseña:", error);
    return NextResponse.json({ ok: false, error: "No se ha podido restablecer la contraseña." }, { status: 500 });
  }
}
