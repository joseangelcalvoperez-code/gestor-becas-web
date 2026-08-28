import {
  SignJWT,
  jwtVerify,
} from "jose";

import {
  cookies,
} from "next/headers";

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

export async function obtenerSesion():
  Promise<
    DatosSesion | null
  > {
  try {
    const cookieStore =
      await cookies();

    const token =
      cookieStore.get(
        nombreCookie
      )?.value;

    if (!token) {
      return null;
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
      return null;
    }

    return {
      usuarioId,
      centroId,
      nombre,
      email,
    };
  } catch {
    return null;
  }
}

export async function eliminarSesion() {
  const cookieStore =
    await cookies();

  cookieStore.delete(
    nombreCookie
  );
}