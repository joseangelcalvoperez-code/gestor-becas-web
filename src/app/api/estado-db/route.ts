import {
  NextResponse,
} from "next/server";

import {
  prisma,
} from "@/lib/prisma";

export async function GET() {
  try {
    const centros =
      await prisma.centro.count();

    const usuarios =
      await prisma.usuario.count();

    return NextResponse.json({
      ok: true,

      database:
        "gestor_becas_web",

      centros,

      usuarios,
    });
  } catch (error) {
    console.error(
      "Error comprobando la base de datos:",
      error
    );

    return NextResponse.json(
      {
        ok: false,

        error:
          "No se ha podido conectar con la base de datos.",
      },
      {
        status: 500,
      }
    );
  }
}