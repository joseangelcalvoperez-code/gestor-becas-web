import {
  randomUUID,
} from "node:crypto";

export type EstadoTrabajoDescarga =
  | "PENDIENTE"
  | "PROCESANDO"
  | "COMPLETADO"
  | "ERROR";

export interface TrabajoDescarga {
  id: string;

  centroId:
    number;

  estado:
    EstadoTrabajoDescarga;

  total:
    number;

  procesados:
    number;

  porcentaje:
    number;

  mensaje:
    string;

  archivoZip:
    string | null;

  error:
    string | null;

  createdAt:
    number;

  updatedAt:
    number;
}

declare global {
  var __trabajosDescargaFirmas:
    Map<
      string,
      TrabajoDescarga
    > | undefined;
}

const trabajos =
  globalThis
    .__trabajosDescargaFirmas ??
  new Map<
    string,
    TrabajoDescarga
  >();

if (
  !globalThis
    .__trabajosDescargaFirmas
) {
  globalThis.__trabajosDescargaFirmas =
    trabajos;
}

export function crearTrabajoDescarga(
  centroId:
    number,

  total:
    number
) {
  const ahora =
    Date.now();

  const trabajo:
    TrabajoDescarga =
    {
      id:
        randomUUID(),

      centroId,

      estado:
        "PENDIENTE",

      total,

      procesados:
        0,

      porcentaje:
        0,

      mensaje:
        "Preparando descarga...",

      archivoZip:
        null,

      error:
        null,

      createdAt:
        ahora,

      updatedAt:
        ahora,
    };

  trabajos.set(
    trabajo.id,
    trabajo
  );

  return trabajo;
}

export function obtenerTrabajoDescarga(
  id:
    string
) {
  return (
    trabajos.get(
      id
    ) ??
    null
  );
}

export function actualizarTrabajoDescarga(
  id:
    string,

  cambios:
    Partial<
      Omit<
        TrabajoDescarga,
        "id" |
        "centroId" |
        "createdAt"
      >
    >
) {
  const trabajo =
    trabajos.get(
      id
    );

  if (!trabajo) {
    return null;
  }

  const actualizado:
    TrabajoDescarga =
    {
      ...trabajo,
      ...cambios,

      updatedAt:
        Date.now(),
    };

  trabajos.set(
    id,
    actualizado
  );

  return actualizado;
}

export function limpiarTrabajosCaducados() {
  const limite =
    Date.now() -
    60 *
      60 *
      1000;

  for (
    const [
      id,
      trabajo,
    ] of trabajos
  ) {
    if (
      trabajo.updatedAt <
      limite
    ) {
      trabajos.delete(
        id
      );
    }
  }
}
