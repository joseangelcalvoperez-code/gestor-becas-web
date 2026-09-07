import {
  createHash,
} from "node:crypto";

import {
  NextResponse,
} from "next/server";

import bcrypt from "bcryptjs";

import {
  prisma,
} from "@/lib/prisma";

export const runtime =
  "nodejs";

const PASSWORD_MINIMA =
  8;

export async function POST(
  request: Request
) {
  try {
    const body =
      await request
        .json()
        .catch(
          () => null
        );

    const token =
      String(
        body?.token ??
          ""
      ).trim();

    const password =
      String(
        body?.password ??
          ""
      );

    if (
      !token ||
      !password
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "El enlace o la nueva contraseña no son válidos.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      password.length <
      PASSWORD_MINIMA
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            `La contraseña debe tener al menos ${PASSWORD_MINIMA} caracteres.`,
        },
        {
          status: 400,
        }
      );
    }

    const tokenHash =
      createHash(
        "sha256"
      )
        .update(
          token,
          "utf8"
        )
        .digest(
          "hex"
        );

    const recuperacion =
      await prisma.recuperacionPassword.findUnique({
        where: {
          tokenHash,
        },
        include: {
          usuario: {
            include: {
              centro: true,
            },
          },
        },
      });

    const ahora =
      new Date();

    if (
      !recuperacion ||
      recuperacion.usadoEn ||
      recuperacion.expiraEn <=
        ahora ||
      !recuperacion.usuario.activo ||
      !recuperacion.usuario.centro.activo
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "El enlace de recuperación no es válido o ha caducado. Solicite uno nuevo.",
        },
        {
          status: 400,
        }
      );
    }

    const passwordHash =
      await bcrypt.hash(
        password,
        12
      );

    await prisma.$transaction([
      prisma.usuario.update({
        where: {
          id:
            recuperacion.usuarioId,
        },
        data: {
          passwordHash,
        },
      }),

      /*
       * Marcamos como utilizados TODOS los enlaces pendientes
       * del usuario. Así el cambio de contraseña invalida
       * cualquier enlace de recuperación anterior.
       */
      prisma.recuperacionPassword.updateMany({
        where: {
          usuarioId:
            recuperacion.usuarioId,
          usadoEn: null,
        },
        data: {
          usadoEn:
            ahora,
        },
      }),
    ]);

    return NextResponse.json({
      ok: true,
      mensaje:
        "La contraseña se ha actualizado correctamente.",
    });
  } catch (error) {
    console.error(
      "Error restableciendo contraseña:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          "No se ha podido restablecer la contraseña.",
      },
      {
        status: 500,
      }
    );
  }
}
