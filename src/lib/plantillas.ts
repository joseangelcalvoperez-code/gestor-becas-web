import { readFile } from "fs/promises";

/* =========================================================
   CACHÉ DE PLANTILLAS PDF EN MEMORIA

   Antes, cada Anexo generado leía la plantilla del disco.
   En un expediente masivo eso suponía cientos de lecturas
   idénticas. Ahora se lee una sola vez por proceso.
   Si la lectura falla, no se cachea el error.
   ========================================================= */

const globalPlantillas =
  globalThis as unknown as {
    cachePlantillas?: Map<string, Promise<Buffer>>;
  };

const cache =
  globalPlantillas.cachePlantillas ??
  new Map<string, Promise<Buffer>>();

globalPlantillas.cachePlantillas = cache;

export function leerPlantilla(
  ruta: string
): Promise<Buffer> {
  let promesa = cache.get(ruta);

  if (!promesa) {
    promesa = readFile(ruta);

    cache.set(ruta, promesa);

    promesa.catch(() => cache.delete(ruta));
  }

  return promesa;
}
