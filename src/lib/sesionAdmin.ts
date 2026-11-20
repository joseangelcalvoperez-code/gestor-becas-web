import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

import { prisma } from "@/lib/prisma";

/* =========================================================
   SESIÓN DE ADMINISTRACIÓN

   Independiente de la sesión de los centros: otra cookie y un
   token marcado como "admin". Un usuario de centro nunca puede
   usarla, ni un administrador las pantallas de un centro.
   Se valida contra la base de datos en cada petición.
   ========================================================= */

const COOKIE_ADMIN = "gestor_becas_admin";
const DURACION_SEGUNDOS = 60 * 60 * 8;

const secreto = process.env.AUTH_SECRET;

if (!secreto) {
  throw new Error("Falta AUTH_SECRET en las variables de entorno.");
}

const clave = new TextEncoder().encode(secreto);

export interface SesionAdmin {
  administradorId: number;
  nombre: string;
  email: string;
}

export async function crearSesionAdmin(datos: SesionAdmin) {
  const token = await new SignJWT({ ...datos, tipo: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(clave);

  (await cookies()).set(COOKIE_ADMIN, token, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/",
    maxAge: DURACION_SEGUNDOS,
  });
}

export async function eliminarSesionAdmin() {
  (await cookies()).delete(COOKIE_ADMIN);
}

type EstadoAdmin =
  | { tipo: "valida"; sesion: SesionAdmin }
  | { tipo: "cambio-clave"; sesion: SesionAdmin }
  | { tipo: "ninguna" };

export async function estadoSesionAdmin(): Promise<EstadoAdmin> {
  try {
    const token = (await cookies()).get(COOKIE_ADMIN)?.value;

    if (!token) return { tipo: "ninguna" };

    const { payload } = await jwtVerify(token, clave);

    if (payload.tipo !== "admin") return { tipo: "ninguna" };

    const administradorId = Number(payload.administradorId);

    if (!administradorId) return { tipo: "ninguna" };

    const admin = await prisma.administrador.findUnique({
      where: { id: administradorId },
      select: { nombre: true, email: true, activo: true, debeCambiarClave: true, claveActualizadaAt: true },
    });

    if (!admin || !admin.activo) return { tipo: "ninguna" };

    if (admin.claveActualizadaAt && (payload.iat ?? 0) * 1000 < admin.claveActualizadaAt.getTime()) {
      return { tipo: "ninguna" };
    }

    const sesion = { administradorId, nombre: admin.nombre, email: admin.email };

    return admin.debeCambiarClave ? { tipo: "cambio-clave", sesion } : { tipo: "valida", sesion };
  } catch {
    return { tipo: "ninguna" };
  }
}

/** Sesión de administración operativa (sin cambio de contraseña pendiente). */
export async function obtenerSesionAdmin(): Promise<SesionAdmin | null> {
  const estado = await estadoSesionAdmin();
  return estado.tipo === "valida" ? estado.sesion : null;
}
