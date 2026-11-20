/* =========================================================
   LÍMITE DE INTENTOS DE ACCESO (EN MEMORIA, POR PROCESO)

   Frena ataques de fuerza bruta contra el login sin
   afectar al uso normal: tras MAX_INTENTOS fallos para la
   misma clave (email) en VENTANA_MS se bloquea
   temporalmente. Con varios procesos Node el límite es por
   proceso; para un bloqueo global usar el proxy inverso
   (p. ej. limit_req de nginx).
   ========================================================= */

const MAX_INTENTOS = 8;

const VENTANA_MS = 15 * 60 * 1000;

interface Registro {
  fallos: number;
  inicio: number;
}

const globalIntentos =
  globalThis as unknown as {
    intentosLogin?: Map<string, Registro>;
  };

const intentos =
  globalIntentos.intentosLogin ??
  new Map<string, Registro>();

globalIntentos.intentosLogin = intentos;

function limpiarCaducados(ahora: number) {
  if (intentos.size < 5000) {
    return;
  }

  for (const [clave, registro] of intentos) {
    if (ahora - registro.inicio > VENTANA_MS) {
      intentos.delete(clave);
    }
  }
}

/** Devuelve los segundos de espera, o 0 si puede intentarlo. */
export function segundosBloqueo(clave: string) {
  const registro = intentos.get(clave);

  if (!registro) {
    return 0;
  }

  const transcurrido = Date.now() - registro.inicio;

  if (transcurrido > VENTANA_MS) {
    intentos.delete(clave);
    return 0;
  }

  return registro.fallos >= MAX_INTENTOS
    ? Math.ceil((VENTANA_MS - transcurrido) / 1000)
    : 0;
}

export function registrarFallo(clave: string) {
  const ahora = Date.now();

  limpiarCaducados(ahora);

  const registro = intentos.get(clave);

  if (!registro || ahora - registro.inicio > VENTANA_MS) {
    intentos.set(clave, { fallos: 1, inicio: ahora });
    return;
  }

  registro.fallos++;
}

export function limpiarIntentos(clave: string) {
  intentos.delete(clave);
}
