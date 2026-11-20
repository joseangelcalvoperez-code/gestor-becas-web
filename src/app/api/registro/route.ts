import {
  NextResponse,
} from "next/server";

import bcrypt from "bcryptjs";

import { validarNuevaClave } from "@/lib/clave";

import {
  prisma,
} from "@/lib/prisma";

export async function POST(
  request: Request
) {
  try {
    const body =
      await request.json();

    const {
      nombreCentro,
      codigoCentro,
      cif,
      direccion,
      localidad,
      provincia,
      telefono,
      emailCentro,

      nombreResponsable,
      emailAcceso,
      password,
      repetirPassword,
    } = body;

    /* ============================
       VALIDACIONES
       ============================ */

    if (
      !nombreCentro ||
      !codigoCentro ||
      !cif ||
      !direccion ||
      !localidad ||
      !provincia ||
      !telefono ||
      !emailCentro ||
      !nombreResponsable ||
      !emailAcceso ||
      !password ||
      !repetirPassword
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Debe completar todos los campos.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      password !==
      repetirPassword
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Las contraseñas no coinciden.",
        },
        {
          status: 400,
        }
      );
    }

    const problemaClave =
      validarNuevaClave(
        String(password),
        {
          email:
            String(emailAcceso),
        }
      );

    if (
      problemaClave
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            problemaClave,
        },
        {
          status: 400,
        }
      );
    }

    const emailNormalizado =
      String(
        emailAcceso
      )
        .trim()
        .toLowerCase();

    const emailCentroNormalizado =
      String(
        emailCentro
      )
        .trim()
        .toLowerCase();

    const codigoNormalizado =
      String(
        codigoCentro
      )
        .trim();

    const usuarioExistente =
      await prisma.usuario.findUnique({
        where: {
          email:
            emailNormalizado,
        },
      });

    if (
      usuarioExistente
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Ya existe una cuenta con ese email.",
        },
        {
          status: 409,
        }
      );
    }

    const centroExistente =
      await prisma.centro.findUnique({
        where: {
          codigo:
            codigoNormalizado,
        },
      });

    if (
      centroExistente
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Ya existe un centro con ese código.",
        },
        {
          status: 409,
        }
      );
    }

    const passwordHash =
      await bcrypt.hash(
        password,
        12
      );

    /* ============================
       CREACIÓN EN TRANSACCIÓN
       ============================ */

    const resultado =
      await prisma.$transaction(
        async (
          tx
        ) => {
          const centro =
            await tx.centro.create({
              data: {
                nombre:
                  nombreCentro.trim(),

                codigo:
                  codigoNormalizado,

                cif:
                  cif.trim(),

                direccion:
                  direccion.trim(),

                localidad:
                  localidad.trim(),

                provincia:
                  provincia.trim(),

                telefono:
                  telefono.trim(),

                email:
                  emailCentroNormalizado,

                activo:
                  true,
              },
            });

const usuario = await tx.usuario.create({
  data: {
    centroId: centro.id,
    nombre: nombreResponsable.trim(),
    email: emailNormalizado,
    passwordHash,
    activo: true,
  },
});

          return {
            centro,
            usuario,
          };
        }
      );

    return NextResponse.json(
      {
        ok: true,

        centro: {
          id:
            resultado.centro.id,

          nombre:
            resultado.centro.nombre,

          codigo:
            resultado.centro.codigo,
        },

usuario: {
  id: resultado.usuario.id,
  nombre: resultado.usuario.nombre,
  email: resultado.usuario.email,
},
      },
      {
        status: 201,
      }
    );
  } catch (
    error
  ) {
    console.error(
      "Error registrando centro:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          "No se ha podido completar el registro.",
      },
      {
        status: 500,
      }
    );
  }
}