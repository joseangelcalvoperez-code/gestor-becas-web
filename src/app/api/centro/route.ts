import {
  NextResponse,
} from "next/server";

import {
  prisma,
} from "@/lib/prisma";

import {
  obtenerSesion,
} from "@/lib/session";

export async function GET() {
  try {
    const sesion =
      await obtenerSesion();

    if (!sesion) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "No hay una sesión activa.",
        },
        {
          status: 401,
        }
      );
    }

    const [
      centro,
      usuarioAcceso,
    ] =
      await Promise.all([
        prisma.centro.findFirst({
          where: {
            id:
              sesion.centroId,
            activo: true,
          },
          select: {
            id: true,
            nombre: true,
            codigo: true,
            cif: true,
            direccion: true,
            localidad: true,
            provincia: true,
            telefono: true,
            email: true,
            directorNombre: true,
            directorApellidos: true,
            directorDni: true,
            directorEmail: true,
            selloFirmaUrl: true,
          },
        }),

        prisma.usuario.findFirst({
          where: {
            id:
              sesion.usuarioId,
            centroId:
              sesion.centroId,
            activo: true,
          },
          select: {
            id: true,
            nombre: true,
            apellidos: true,
            email: true,
          },
        }),
      ]);

    if (
      !centro ||
      !usuarioAcceso
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "No se han encontrado los datos asociados a la sesión.",
        },
        {
          status: 404,
        }
      );
    }

    return NextResponse.json({
      ok: true,
      centro,
      usuarioAcceso,
    });
  } catch (error) {
    console.error(
      "Error cargando centro:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          "No se han podido cargar los datos del centro.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function PUT(
  request: Request
) {
  try {
    const sesion =
      await obtenerSesion();

    if (!sesion) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "No hay una sesión activa.",
        },
        {
          status: 401,
        }
      );
    }

    const body =
      await request.json();

    const nombre =
      String(body.nombre ?? "").trim();
    const codigo =
      String(body.codigo ?? "").trim();
    const cif =
      String(body.cif ?? "").trim();
    const direccion =
      String(body.direccion ?? "").trim();
    const localidad =
      String(body.localidad ?? "").trim();
    const provincia =
      String(body.provincia ?? "").trim();
    const telefono =
      String(body.telefono ?? "").trim();
    const email =
      String(body.email ?? "")
        .trim()
        .toLowerCase();
    const directorNombre = String(body.directorNombre ?? "").trim();
    const directorApellidos = String(body.directorApellidos ?? "").trim();
    const directorDni = String(body.directorDni ?? "").trim().toUpperCase();
    const directorEmail = String(body.directorEmail ?? "").trim().toLowerCase();

    const usuarioNombre =
      String(
        body.usuarioNombre ?? ""
      ).trim();
    const usuarioApellidos =
      String(
        body.usuarioApellidos ?? ""
      ).trim();
    const usuarioEmail =
      String(
        body.usuarioEmail ?? ""
      )
        .trim()
        .toLowerCase();

    if (
      !nombre ||
      !codigo ||
      !cif ||
      !direccion ||
      !localidad ||
      !provincia ||
      !telefono ||
      !email ||
      !directorNombre ||
      !directorApellidos ||
      !directorDni ||
      !directorEmail ||
      !usuarioNombre ||
      !usuarioApellidos ||
      !usuarioEmail
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Debe completar todos los datos del centro, del director y del usuario de acceso.",
        },
        {
          status: 400,
        }
      );
    }

    if (!esEmailValido(email)) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "El email del centro no es válido.",
        },
        {
          status: 400,
        }
      );
    }

    if (!esEmailValido(usuarioEmail)) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "El email de acceso no es válido.",
        },
        {
          status: 400,
        }
      );
    }

    if (!esEmailValido(directorEmail)) {
      return NextResponse.json(
        { ok: false, error: "El email del director no es válido." },
        { status: 400 }
      );
    }

    const centroConMismoCodigo =
      await prisma.centro.findFirst({
        where: {
          codigo,
          NOT: {
            id:
              sesion.centroId,
          },
        },
        select: {
          id: true,
        },
      });

    if (centroConMismoCodigo) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Ya existe otro centro con ese código.",
        },
        {
          status: 409,
        }
      );
    }

    /*
     * El mismo email SÍ puede existir en centros distintos.
     * Únicamente impedimos duplicarlo para dos usuarios del
     * mismo centro, por si en el futuro se habilitan varios.
     */
    const usuarioDuplicado =
      await prisma.usuario.findFirst({
        where: {
          centroId:
            sesion.centroId,
          email:
            usuarioEmail,
          NOT: {
            id:
              sesion.usuarioId,
          },
        },
        select: {
          id: true,
        },
      });

    if (usuarioDuplicado) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Ya existe otro usuario con ese email dentro de este centro.",
        },
        {
          status: 409,
        }
      );
    }

    const resultado =
      await prisma.$transaction(
        async (tx) => {
          const centroActualizado =
            await tx.centro.update({
              where: {
                id:
                  sesion.centroId,
              },
              data: {
                nombre,
                codigo,
                cif,
                direccion,
                localidad,
                provincia,
                telefono,
                email,
                directorNombre,
                directorApellidos,
                directorDni,
                directorEmail,
              },
              select: {
                id: true,
                nombre: true,
                codigo: true,
                cif: true,
                direccion: true,
                localidad: true,
                provincia: true,
                telefono: true,
                email: true,
                directorNombre: true,
                directorApellidos: true,
                directorDni: true,
                directorEmail: true,
                selloFirmaUrl: true,
              },
            });

          const usuarioActualizado =
            await tx.usuario.update({
              where: {
                id:
                  sesion.usuarioId,
              },
              data: {
                nombre:
                  usuarioNombre,
                apellidos:
                  usuarioApellidos,
                email:
                  usuarioEmail,
              },
              select: {
                id: true,
                nombre: true,
                apellidos: true,
                email: true,
              },
            });

          return {
            centroActualizado,
            usuarioActualizado,
          };
        }
      );

    return NextResponse.json({
      ok: true,
      mensaje:
        "Datos del centro y de acceso guardados correctamente.",
      centro:
        resultado.centroActualizado,
      usuarioAcceso:
        resultado.usuarioActualizado,
    });
  } catch (error) {
    console.error(
      "Error guardando centro:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          "No se han podido guardar los datos del centro.",
      },
      {
        status: 500,
      }
    );
  }
}

function esEmailValido(
  email: string
) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    email
  );
}
