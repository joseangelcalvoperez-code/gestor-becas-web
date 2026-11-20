/* Constantes compartidas por la plantilla de grados y su importación. */

export const TIPO_PLANTILLA_GRADOS = "PLANTILLA_IMPORTACION_GRADOS_ASIGNATURAS";

export const CABECERAS_GRADOS = [
  "GRADO",
  "CURSO",
  "CÓDIGO",
  "ASIGNATURA",
  "NOMBRE PROFESOR",
  "APELLIDOS PROFESOR",
  "DNI/NIE PROFESOR",
] as const;

/** Fila de la cabecera de columnas en la hoja ASIGNATURAS. */
export const FILA_CABECERA_GRADOS = 6;

/** Límite de filas de datos por importación. */
export const MAX_FILAS_GRADOS = 1500;
