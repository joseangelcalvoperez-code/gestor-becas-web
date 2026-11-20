/* =========================================================
   IDENTIDAD INSTITUCIONAL

   Textos de la cabecera, el pie y la pantalla de acceso.
   Ajustar aquí la denominación oficial vigente del órgano
   (cambia con cada estructura de Gobierno).

   LOGOTIPO OFICIAL: el aplicativo NO incluye el logotipo de
   la Comunidad de Madrid. Si el órgano dispone de
   autorización para usarlo conforme al Manual de Identidad
   Corporativa, copiar el archivo a
     public/marca/logo-institucional.svg
   y poner NEXT_PUBLIC_LOGO_INSTITUCIONAL=1 en .env.
   Mientras tanto se muestra un símbolo neutro.
   ========================================================= */

export const MARCA = {
  organismo:
    process.env.NEXT_PUBLIC_ORGANISMO ??
    "Comunidad de Madrid",

  departamento:
    process.env.NEXT_PUBLIC_DEPARTAMENTO ??
    "Consejería de Educación",

  aplicacion: "Gestor de Becas",

  programa: "Segunda Oportunidad",

  version: "1.1.0",

  logoInstitucional:
    process.env.NEXT_PUBLIC_LOGO_INSTITUCIONAL === "1"
      ? "/marca/logo-institucional.svg"
      : null,
} as const;
