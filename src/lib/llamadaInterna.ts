/* =========================================================
   LLAMADAS INTERNAS ENTRE RUTAS

   Las generaciones agrupadas (todos los Anexos V, expediente,
   expediente masivo) llamaban antes a otras rutas de la API
   mediante fetch HTTP contra el propio servidor. Eso añadía,
   por cada documento, una conexión HTTP nueva, serialización
   y, detrás de un proxy inverso, un viaje de ida y vuelta
   completo (incluso TLS).

   Ahora se invoca directamente el manejador de la ruta en el
   mismo proceso. La sesión se sigue validando igual, porque
   cookies() lee la cookie de la petición original.
   ========================================================= */

export const CABECERA_INTERNA = "x-gestor-llamada-interna";

type Manejador = (request: Request) => Promise<Response>;

export function llamadaInterna(
  manejador: Manejador,
  url: URL | string,
  init: RequestInit
): Promise<Response> {
  const headers = new Headers(init.headers);

  headers.set(CABECERA_INTERNA, "1");

  return manejador(
    new Request(url, {
      ...init,
      headers,
    })
  );
}

/*
 * Un ZIP que solo se genera para ser descomprimido de nuevo
 * por otra ruta interna no necesita compresión: se usa STORE.
 */
export function opcionesZip(request: Request) {
  const interno =
    request.headers.get(CABECERA_INTERNA) === "1";

  return interno
    ? ({ compression: "STORE" } as const)
    : ({
        compression: "DEFLATE",
        compressionOptions: { level: 6 },
      } as const);
}
