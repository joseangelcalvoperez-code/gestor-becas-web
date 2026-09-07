import {
  createHash,
  randomBytes,
} from "node:crypto";

import {
  NextResponse,
} from "next/server";

import {
  prisma,
} from "@/lib/prisma";

import {
  enviarEmail,
} from "@/lib/email";

export const runtime =
  "nodejs";

const MINUTOS_VALIDEZ =
  30;

const MENSAJE_NEUTRO =
  "Si los datos introducidos corresponden a una cuenta activa, recibirá un correo con las instrucciones para restablecer su contraseña.";

export async function POST(
  request: Request
) {
  try {
    const body =
      await request
        .json()
        .catch(() => null);

    const email =
      String(body?.email ?? "")
        .trim()
        .toLowerCase();

    const codigoCentro =
      String(
        body?.codigoCentro ?? ""
      ).trim();

    if (
      !email ||
      !codigoCentro
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Introduzca el email y el código de centro.",
        },
        {
          status: 400,
        }
      );
    }

    const centro =
      await prisma.centro.findUnique({
        where: {
          codigo:
            codigoCentro,
        },
        select: {
          id: true,
          codigo: true,
          activo: true,
        },
      });

    if (
      !centro ||
      !centro.activo
    ) {
      return respuestaNeutra();
    }

    const usuario =
      await prisma.usuario.findUnique({
        where: {
          centroId_email: {
            centroId:
              centro.id,
            email,
          },
        },
        select: {
          id: true,
          nombre: true,
          apellidos: true,
          email: true,
          activo: true,
        },
      });

    if (
      !usuario ||
      !usuario.activo
    ) {
      return respuestaNeutra();
    }

    const token =
      randomBytes(32).toString(
        "hex"
      );

    const tokenHash =
      crearHashToken(token);

    const ahora =
      new Date();

    const expiraEn =
      new Date(
        ahora.getTime() +
          MINUTOS_VALIDEZ *
            60 * 1000
      );

    await prisma.recuperacionPassword.updateMany({
      where: {
        usuarioId:
          usuario.id,
        usadoEn: null,
      },
      data: {
        usadoEn:
          ahora,
      },
    });

    await prisma.recuperacionPassword.create({
      data: {
        usuarioId:
          usuario.id,
        tokenHash,
        expiraEn,
      },
    });

    const appUrl =
      obtenerAppUrl();

    const enlace =
      `${appUrl}/recuperar-clave/${encodeURIComponent(
        token
      )}`;

    const emailDemo =
      process.env.EMAIL_DEMO_TO
        ?.trim();

    const destinatario =
      emailDemo || usuario.email;

    try {
      await enviarEmail({
        para:
          destinatario,
        asunto:
          "Recuperación de contraseña - Gestor de Becas",
        html:
          crearHtmlRecuperacion({
            nombre:
              usuario.nombre,
            apellidos:
              usuario.apellidos,
            emailUsuario:
              usuario.email,
            codigoCentro:
              centro.codigo,
            enlace,
            minutos:
              MINUTOS_VALIDEZ,
            esDemo:
              Boolean(emailDemo),
          }),
        texto:
          `Recuperación de contraseña - Gestor de Becas\n\n${enlace}\n\nEl enlace caduca en ${MINUTOS_VALIDEZ} minutos.`,
      });
    } catch (error) {
      await prisma.recuperacionPassword.updateMany({
        where: {
          tokenHash,
          usadoEn: null,
        },
        data: {
          usadoEn:
            new Date(),
        },
      });

      console.error(
        "Error enviando recuperación de contraseña:",
        error
      );

      return NextResponse.json(
        {
          ok: false,
          error:
            "No se ha podido enviar el correo de recuperación.",
        },
        {
          status: 500,
        }
      );
    }

    return respuestaNeutra();
  } catch (error) {
    console.error(
      "Error solicitando recuperación de contraseña:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          "No se ha podido procesar la solicitud de recuperación.",
      },
      {
        status: 500,
      }
    );
  }
}

function respuestaNeutra() {
  return NextResponse.json({
    ok: true,
    mensaje:
      MENSAJE_NEUTRO,
  });
}

function crearHashToken(
  token: string
) {
  return createHash("sha256")
    .update(token, "utf8")
    .digest("hex");
}

function obtenerAppUrl() {
  const appUrl =
    process.env.APP_URL?.trim();

  if (!appUrl) {
    throw new Error(
      "APP_URL no está configurado."
    );
  }

  return appUrl.replace(/\/+$/, "");
}

function crearHtmlRecuperacion(
  datos: {
    nombre: string;
    apellidos: string;
    emailUsuario: string;
    codigoCentro: string;
    enlace: string;
    minutos: number;
    esDemo: boolean;
  }
) {
  const nombreCompleto =
    `${datos.nombre} ${datos.apellidos}`.trim();

  const avisoDemo =
    datos.esDemo
      ? `<div style="margin:0 0 20px;padding:12px 14px;background:#fff6df;border:1px solid #ead49c;color:#775b16;font-size:12px;line-height:1.5;"><strong>Entorno DEMO.</strong><br>Esta recuperación corresponde al usuario <strong>${escaparHtml(datos.emailUsuario)}</strong> del centro <strong>${escaparHtml(datos.codigoCentro)}</strong>. El correo se ha redirigido a la dirección de pruebas configurada.</div>`
      : "";

  return `
    <div style="margin:0;padding:24px;background:#eef1f5;font-family:Arial,sans-serif;color:#29354a;">
      <div style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #d8dee8;">
        <div style="padding:24px 28px;border-bottom:1px solid #e1e5eb;">
          <div style="font-size:18px;font-weight:700;color:#29354a;">Gestor de Becas</div>
          <div style="margin-top:3px;font-size:11px;color:#7b8798;">Segunda Oportunidad</div>
        </div>
        <div style="padding:28px;">
          ${avisoDemo}
          <p style="margin:0 0 14px;font-size:14px;line-height:1.6;">Hola ${escaparHtml(nombreCompleto)},</p>
          <p style="margin:0 0 18px;font-size:14px;line-height:1.6;">Se ha solicitado restablecer la contraseña de su cuenta del Gestor de Becas.</p>
          <p style="margin:0 0 22px;font-size:13px;line-height:1.6;color:#566176;">El enlace será válido durante ${datos.minutos} minutos y solo podrá utilizarse una vez.</p>
          <p style="margin:0 0 24px;"><a href="${datos.enlace}" style="display:inline-block;background:#e9423a;color:#ffffff;text-decoration:none;font-size:12px;font-weight:700;padding:13px 18px;">RESTABLECER CONTRASEÑA</a></p>
          <p style="margin:0;font-size:11px;line-height:1.6;color:#7a879a;word-break:break-all;">Si el botón no funciona, copie esta dirección en el navegador:<br>${datos.enlace}</p>
        </div>
      </div>
    </div>`;
}

function escaparHtml(
  valor: string
) {
  return valor
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
