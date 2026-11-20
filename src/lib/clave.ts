import { randomInt } from "crypto";

/* =========================================================
   POLÍTICA DE CONTRASEÑAS
   ========================================================= */

export const LONGITUD_MINIMA_CLAVE = 10;

export const DESCRIPCION_POLITICA_CLAVE =
  `Al menos ${LONGITUD_MINIMA_CLAVE} caracteres, con letras y números.`;

/** Devuelve el motivo por el que la contraseña no es válida, o null si lo es. */
export function validarNuevaClave(
  clave: string,
  contexto: { email?: string; anterior?: string } = {}
): string | null {
  if (clave.length < LONGITUD_MINIMA_CLAVE) {
    return `La contraseña debe tener al menos ${LONGITUD_MINIMA_CLAVE} caracteres.`;
  }

  if (clave.length > 128) {
    return "La contraseña no puede superar los 128 caracteres.";
  }

  if (!/\p{L}/u.test(clave) || !/\d/.test(clave)) {
    return "La contraseña debe combinar letras y números.";
  }

  const usuarioEmail = contexto.email?.split("@")[0]?.toLowerCase();

  if (usuarioEmail && usuarioEmail.length >= 4 && clave.toLowerCase().includes(usuarioEmail)) {
    return "La contraseña no puede contener su usuario de correo.";
  }

  if (contexto.anterior && clave === contexto.anterior) {
    return "La nueva contraseña debe ser distinta de la actual.";
  }

  return null;
}

/* =========================================================
   CONTRASEÑA PROVISIONAL
   Aleatoria criptográficamente segura, sin caracteres que se
   confundan al dictarla (0/O, 1/l/I). Formato XXXX-XXXX-XXXX.
   ========================================================= */

const ALFABETO = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";

export function generarClaveProvisional() {
  for (;;) {
    const bloques = Array.from({ length: 3 }, () =>
      Array.from({ length: 4 }, () => ALFABETO[randomInt(ALFABETO.length)]).join("")
    );
    const clave = bloques.join("-");

    if (/\d/.test(clave) && /[A-Z]/.test(clave) && /[a-z]/.test(clave)) {
      return clave;
    }
  }
}
