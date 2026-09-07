import { Resend } from "resend";

export type EnviarEmailParams = {
  para: string | string[];
  asunto: string;
  html: string;
  texto?: string;
};

export type ResultadoEnvioEmail = {
  id?: string;
};

function obtenerConfiguracionEmail() {
  const provider = process.env.EMAIL_PROVIDER?.trim().toLowerCase();
  const from = process.env.EMAIL_FROM?.trim();

  if (!provider) {
    throw new Error("EMAIL_PROVIDER no está configurado.");
  }

  if (!from) {
    throw new Error("EMAIL_FROM no está configurado.");
  }

  return {
    provider,
    from,
  };
}

async function enviarConResend(
  params: EnviarEmailParams,
  from: string
): Promise<ResultadoEnvioEmail> {
  const apiKey = process.env.RESEND_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("RESEND_API_KEY no está configurado.");
  }

  const resend = new Resend(apiKey);

  const { data, error } = await resend.emails.send({
    from,
    to: params.para,
    subject: params.asunto,
    html: params.html,
    ...(params.texto ? { text: params.texto } : {}),
  });

  if (error) {
    console.error("Error de Resend:", error);
    throw new Error(`No se pudo enviar el correo: ${error.message}`);
  }

  return {
    id: data?.id,
  };
}

export async function enviarEmail(
  params: EnviarEmailParams
): Promise<ResultadoEnvioEmail> {
  const { provider, from } = obtenerConfiguracionEmail();

  switch (provider) {
    case "resend":
      return enviarConResend(params, from);

    default:
      throw new Error(
        `Proveedor de correo no soportado: ${provider}`
      );
  }
}