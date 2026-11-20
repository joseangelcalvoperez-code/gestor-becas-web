import {
  SignJWT,
  jwtVerify,
} from "jose";

import {
  cookies,
} from "next/headers";

import {
  prisma,
} from "@/lib/prisma";

const nombreCookie =
  "gestor_becas_session";

const secret =
  process.env.AUTH_SECRET;

if (!secret) {
  throw new Error(
    "Falta AUTH_SECRET en las variables de entorno."
  );
}

const clave =
  new TextEncoder().encode(
    secret
  );

export interface DatosSesion {
  usuarioId: number;
  centroId: number;

  nombre: string;
  email: string;
}

export async function crearSesion(
  datos: DatosSesion
) {
  const token =
    await new SignJWT({
      usuarioId:
        datos.usuarioId,

      centroId:
        datos.centroId,

      nombre:
        datos.nombre,

      email:
        datos.email,
    })
      .setProtectedHeader({
        alg: "HS256",
      })
      .setIssuedAt()
      .setExpirationTime(
        "8h"
      )
      .sign(
        clave
      );

  const cookieStore =
    await cookies();

  cookieStore.set(
    nombreCookie,
    token,
    {
      httpOnly: true,

      secure:true,

      sameSite: "lax",

      path: "/",

      maxAge:
        60 * 60 * 8,
    }
  );
}

/* =========================================================
   LECTURA DE LA SESIÓN

   Además de validar la firma del token, se comprueba en la base
   de datos (consulta por clave primaria, muy ligera):
     - que el usuario y el centro siguen activos;
     - que la contraseña no ha cambiado después de iniciar
       sesión (un restablecimiento cierra las sesiones abiertas);
     - si el usuario tiene pendiente cambiar una contraseña
       provisional: en ese caso la sesión NO sirve para nada
       salvo para cambiarla.
   ========================================================= */

type EstadoSesion =
  | { tipo: "valida"; sesion: DatosSesion }
  | { tipo: "cambio-clave"; sesion: DatosSesion }
  | { tipo: "ninguna" };

export async function estadoSesion(): Promise<EstadoSesion> {
  try {
    const cookieStore =
      await cookies();

    const token =
      cookieStore.get(
        nombreCookie
      )?.value;

    if (!token) {
      return { tipo: "ninguna" };
    }

    const {
      payload,
    } =
      await jwtVerify(
        token,
        clave
      );

    const usuarioId =
      Number(
        payload.usuarioId
      );

    const centroId =
      Number(
        payload.centroId
      );

    const nombre =
      String(
        payload.nombre ??
          ""
      );

    const email =
      String(
        payload.email ??
          ""
      );

    if (
      !usuarioId ||
      !centroId ||
      !email
    ) {
      return { tipo: "ninguna" };
    }

    const usuario =
      await prisma.usuario.findUnique({
        where: {
          id: usuarioId,
        },

        select: {
          activo: true,
          centroId: true,
          debeCambiarClave: true,
          claveActualizadaAt: true,
          centro: {
            select: {
              activo: true,
            },
          },
        },
      });

    if (
      !usuario ||
      !usuario.activo ||
      !usuario.centro.activo ||
      usuario.centroId !== centroId
    ) {
      return { tipo: "ninguna" };
    }

    // Token emitido antes del último cambio de contraseña
    if (
      usuario.claveActualizadaAt &&
      (payload.iat ?? 0) * 1000 <
        usuario.claveActualizadaAt.getTime()
    ) {
      return { tipo: "ninguna" };
    }

    const sesion = {
      usuarioId,
      centroId,
      nombre,
      email,
    };

    return usuario.debeCambiarClave
      ? { tipo: "cambio-clave", sesion }
      : { tipo: "valida", sesion };
  } catch {
    return { tipo: "ninguna" };
  }
}

/**
 * Sesión para trabajar con la aplicación. Devuelve null si no hay
 * sesión o si el usuario debe cambiar antes su contraseña.
 */
export async function obtenerSesion():
  Promise<
    DatosSesion | null
  > {
  const estado =
    await estadoSesion();

  return estado.tipo === "valida"
    ? estado.sesion
    : null;
}

/**
 * Sesión admitida para cambiar la contraseña: la normal y la de
 * quien entra con una contraseña provisional.
 */
export async function obtenerSesionParaCambioClave():
  Promise<
    DatosSesion | null
  > {
  const estado =
    await estadoSesion();

  return estado.tipo === "ninguna"
    ? null
    : estado.sesion;
}

export async function eliminarSesion() {
  const cookieStore =
    await cookies();

  cookieStore.delete(
    nombreCookie
  );
}