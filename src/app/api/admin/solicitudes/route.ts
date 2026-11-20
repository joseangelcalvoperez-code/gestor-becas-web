import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { obtenerSesionAdmin } from "@/lib/sesionAdmin";

export const dynamic = "force-dynamic";

/* GET: solicitudes pendientes · POST {id}: descartar una solicitud */

export async function GET() {
  if (!(await obtenerSesionAdmin())) {
    return NextResponse.json({ ok: false, error: "No hay una sesión de administración." }, { status: 401 });
  }

  const solicitudes = await prisma.solicitudRestablecimiento.findMany({
    where: { atendidaAt: null },
    orderBy: { createdAt: "asc" },
    take: 200,
    select: {
      id: true,
      createdAt: true,
      usuario: {
        select: {
          id: true,
          nombre: true,
          email: true,
          centro: { select: { nombre: true, codigo: true, telefono: true } },
        },
      },
    },
  });

  return NextResponse.json({ ok: true, solicitudes });
}

export async function POST(request: Request) {
  const admin = await obtenerSesionAdmin();

  if (!admin) {
    return NextResponse.json({ ok: false, error: "No hay una sesión de administración." }, { status: 401 });
  }

  const { id } = await request.json();
  const solicitud = await prisma.solicitudRestablecimiento.findFirst({
    where: { id: Number(id), atendidaAt: null },
    select: { id: true, usuario: { select: { id: true, email: true, centroId: true } } },
  });

  if (!solicitud) {
    return NextResponse.json({ ok: false, error: "La solicitud no existe o ya está atendida." }, { status: 404 });
  }

  await prisma.$transaction([
    prisma.solicitudRestablecimiento.update({ where: { id: solicitud.id }, data: { atendidaAt: new Date() } }),
    prisma.registroAdministracion.create({
      data: {
        administradorId: admin.administradorId,
        accion: "DESCARTAR_SOLICITUD",
        usuarioId: solicitud.usuario.id,
        centroId: solicitud.usuario.centroId,
        detalle: `Solicitud descartada sin restablecer (${solicitud.usuario.email})`,
      },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
