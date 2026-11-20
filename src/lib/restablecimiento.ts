import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { generarClaveProvisional } from "@/lib/clave";

/* =========================================================
   RESTABLECIMIENTO DE CONTRASEÑA DE UN USUARIO DE CENTRO
   Lógica común del panel de administración. (El comando
   scripts/gestion-claves.mjs aplica las mismas reglas.)
   ========================================================= */

export const HORAS_VALIDEZ_PERMITIDAS = [24, 72, 168] as const;

/** Momento actual redondeado al segundo (ver lib/session.ts). */
export function ahoraAlSegundo() {
  return new Date(Math.floor(Date.now() / 1000) * 1000);
}

export async function restablecerClaveUsuario(
  usuarioId: number,
  horas: number,
  administradorId: number
) {
  const usuario = await prisma.usuario.findUnique({
    where: { id: usuarioId },
    select: {
      id: true,
      email: true,
      nombre: true,
      activo: true,
      centro: { select: { id: true, nombre: true, codigo: true, activo: true } },
    },
  });

  if (!usuario) throw new ErrorRestablecimiento("No se ha encontrado el usuario.", 404);

  if (!usuario.activo || !usuario.centro.activo) {
    throw new ErrorRestablecimiento("El usuario o su centro están desactivados.", 409);
  }

  const provisional = generarClaveProvisional();
  const ahora = ahoraAlSegundo();
  const expira = new Date(ahora.getTime() + horas * 3600 * 1000);
  const hash = await bcrypt.hash(provisional, 12);

  const [, solicitudes] = await prisma.$transaction([
    prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        passwordHash: hash,
        debeCambiarClave: true,
        claveTemporalExpira: expira,
        claveActualizadaAt: ahora,
      },
    }),
    prisma.solicitudRestablecimiento.updateMany({
      where: { usuarioId: usuario.id, atendidaAt: null },
      data: { atendidaAt: new Date() },
    }),
    prisma.registroAdministracion.create({
      data: {
        administradorId,
        accion: "RESTABLECER_CLAVE",
        centroId: usuario.centro.id,
        usuarioId: usuario.id,
        detalle: `Contraseña provisional (${horas} h) para ${usuario.email} · ${usuario.centro.nombre} (${usuario.centro.codigo})`,
      },
    }),
  ]);

  return {
    provisional,
    expira,
    email: usuario.email,
    nombre: usuario.nombre,
    centro: usuario.centro.nombre,
    codigoCentro: usuario.centro.codigo,
    solicitudesAtendidas: solicitudes.count,
  };
}

export class ErrorRestablecimiento extends Error {
  constructor(
    mensaje: string,
    public status: number
  ) {
    super(mensaje);
  }
}
