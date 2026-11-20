import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { obtenerSesionAdmin } from "@/lib/sesionAdmin";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await obtenerSesionAdmin())) {
    return NextResponse.json({ ok: false, error: "No hay una sesión de administración." }, { status: 401 });
  }

  const actividad = await prisma.registroAdministracion.findMany({
    orderBy: { createdAt: "desc" },
    take: 30,
    select: {
      id: true,
      accion: true,
      detalle: true,
      createdAt: true,
      administrador: { select: { nombre: true } },
    },
  });

  return NextResponse.json({ ok: true, actividad });
}
