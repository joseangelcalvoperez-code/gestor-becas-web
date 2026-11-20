import os from "os";

/* =========================================================
   LIMITADOR DE CONCURRENCIA (SEMÁFORO)

   La generación de PDF (pdf-lib) y la compresión ZIP son
   tareas de CPU que bloquean el hilo de Node.js. Si 233
   centros generan documentación a la vez, sin límite el
   proceso deja de atender al resto de peticiones (login,
   guardado de asistencia...).

   Este semáforo limita cuántas generaciones se ejecutan
   simultáneamente en cada proceso. El resto esperan en cola
   (FIFO) sin consumir CPU.
   ========================================================= */

export class Semaforo {
  private activos = 0;

  private readonly cola: (() => void)[] = [];

  constructor(
    private readonly maximo: number
  ) {}

  async ejecutar<T>(
    tarea: () => Promise<T>
  ): Promise<T> {
    if (this.activos >= this.maximo) {
      await new Promise<void>((resolver) =>
        this.cola.push(resolver)
      );
    }

    this.activos++;

    try {
      return await tarea();
    } finally {
      this.activos--;

      const siguiente = this.cola.shift();

      if (siguiente) {
        siguiente();
      }
    }
  }

  get enCola() {
    return this.cola.length;
  }

  get enEjecucion() {
    return this.activos;
  }
}

function enteroEntorno(
  nombre: string,
  porDefecto: number
) {
  const valor = Number(process.env[nombre]);

  return Number.isInteger(valor) && valor > 0
    ? valor
    : porDefecto;
}

const globalLimitador =
  globalThis as unknown as {
    semaforoPdf?: Semaforo;
  };

/*
 * Un único semáforo por proceso para toda la generación
 * documental (Anexo I y Anexo V).
 */
export const semaforoPdf =
  globalLimitador.semaforoPdf ??
  new Semaforo(
    enteroEntorno(
      "PDF_CONCURRENCIA",
      Math.max(2, os.cpus().length)
    )
  );

globalLimitador.semaforoPdf = semaforoPdf;

/* =========================================================
   PROCESAR UNA LISTA CON PARALELISMO ACOTADO
   Mantiene el orden de los resultados.
   ========================================================= */

export async function procesarConConcurrencia<E, R>(
  elementos: readonly E[],
  concurrencia: number,
  tarea: (elemento: E, indice: number) => Promise<R>
): Promise<R[]> {
  const resultados = new Array<R>(elementos.length);

  let siguiente = 0;

  const trabajadores = Array.from(
    {
      length: Math.max(
        1,
        Math.min(concurrencia, elementos.length)
      ),
    },
    async () => {
      while (siguiente < elementos.length) {
        const indice = siguiente++;

        resultados[indice] = await tarea(
          elementos[indice],
          indice
        );
      }
    }
  );

  await Promise.all(trabajadores);

  return resultados;
}

export const CONCURRENCIA_EXPEDIENTES =
  enteroEntorno("EXPEDIENTES_CONCURRENCIA", 3);
