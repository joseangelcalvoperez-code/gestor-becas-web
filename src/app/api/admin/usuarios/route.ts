import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { obtenerSesionAdmin } from "@/lib/sesionAdmin";

export const dynamic = "force-dynamic";

/* GET ?q=texto — busca cuentas de centro por nombre o código de centro, correo o responsable */

export async function GET(request: Request) {
  if (!(await obtenerSesionAdmin())) {
    return NextResponse.json({ ok: false, error: "No hay una sesión de administración." }, { status: 401 });
  }

  const q = (new URL(request.url).searchParams.get("q") ?? "").trim().slice(0, 100);

  if (q.length < 2) {
    return NextResponse.json({ ok: true, usuarios: [] });
  }

  const usuarios = await prisma.usuario.findMany({
    where: {
      OR: [
        { email: { contains: q } },
        { nombre: { contains: q } },
        { centro: { nombre: { contains: q } } },
        { centro: { codigo: { contains: q } } },
      ],
    },
    orderBy: [{ centro: { nombre: "asc" } }, { email: "asc" }],
    take: 50,
    select: {
      id: true,
      nombre: true,
      email: true,
      activo: true,
      debeCambiarClave: true,
      claveTemporalExpira: true,
      claveActualizadaAt: true,
      centro: { select: { nombre: true, codigo: true, activo: true } },
      _count: { select: { solicitudesRestablecimiento: { where: { atendidaAt: null } } } },
    },
  });

  const ahora = Date.now();

  return NextResponse.json({
    ok: true,
    usuarios: usuarios.map((u) => ({
      ...u,
      provisionalCaducada:
        u.debeCambiarClave && !!u.claveTemporalExpira && u.claveTemporalExpira.getTime() < ahora,
    })),
  });
}
