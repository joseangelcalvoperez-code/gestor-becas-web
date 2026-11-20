/* =========================================================
   IDENTIDAD INSTITUCIONAL

   Textos de la cabecera, el pie y la pantalla de acceso.
   Ajustar aquí (o en .env) la denominación oficial vigente
   del órgano: cambia con cada estructura de Gobierno.

   LOGOTIPO (public/marca/):
     - logo-comunidad-madrid.png ...... logotipo completo
       (pantalla de acceso y registro)
     - simbolo-comunidad-madrid.png ... emblema de las
       estrellas (cabecera y favicon)
   Para sustituirlo por una versión de mayor calidad (por
   ejemplo, la vectorial del Manual de Identidad Corporativa)
   basta con reemplazar esos archivos con el mismo nombre.
   NEXT_PUBLIC_LOGO_INSTITUCIONAL=0 lo desactiva y muestra un
   símbolo neutro.
   ========================================================= */

const logoActivo =
  process.env.NEXT_PUBLIC_LOGO_INSTITUCIONAL !== "0";

export const MARCA = {
  organismo:
    process.env.NEXT_PUBLIC_ORGANISMO ??
    "Comunidad de Madrid",

  departamento:
    process.env.NEXT_PUBLIC_DEPARTAMENTO ??
    "Consejería de Educación, Universidades, Ciencia y Portavocía",

  aplicacion: "Gestor de Becas",

  programa: "Segunda Oportunidad",

  version: "1.1.0",

  /** Emblema (cuadrado rojo con estrellas). */
  simbolo: logoActivo
    ? "/marca/simbolo-comunidad-madrid.png"
    : null,

  /** Logotipo completo con la denominación de la Consejería. */
  logotipo: logoActivo
    ? "/marca/logo-comunidad-madrid.png"
    : null,
} as const;
