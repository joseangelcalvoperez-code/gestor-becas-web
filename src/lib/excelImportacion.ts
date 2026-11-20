import ExcelJS from "exceljs";

/* =========================================================
   UTILIDADES COMUNES PARA PLANTILLAS EXCEL
   ========================================================= */

/** Texto de una celda, sea cual sea su tipo (fórmula, enlace...). */
export function textoCelda(
  valor: ExcelJS.CellValue
): string {
  if (valor === null || valor === undefined) return "";
  if (typeof valor === "string") return valor;
  if (typeof valor === "number") return String(valor);
  if (typeof valor === "boolean") return valor ? "TRUE" : "FALSE";
  if (valor instanceof Date) return valor.toISOString();

  if (typeof valor === "object") {
    if ("richText" in valor) {
      return (valor as ExcelJS.CellRichTextValue).richText
        .map((t) => t.text)
        .join("");
    }

    if ("text" in valor) {
      return String((valor as { text?: unknown }).text ?? "");
    }

    if ("result" in valor) {
      const r = (valor as { result?: unknown }).result;
      return r === null || r === undefined ? "" : String(r);
    }
  }

  return "";
}

/** Compara textos sin distinguir mayúsculas, tildes ni espacios repetidos. */
export function normalizarTexto(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

/** Limpia espacios sobrantes conservando mayúsculas y tildes. */
export function limpiarTexto(texto: string) {
  return texto.replace(/\s+/g, " ").trim();
}

const LETRAS_DNI = "TRWAGMYFPDXBNJZSQVHLCKE";

/**
 * Valida un DNI o NIE español (formato y letra de control).
 * Devuelve el valor normalizado o null si no es válido.
 */
export function validarDniNie(valor: string): string | null {
  const dni = valor.replace(/[\s.-]/g, "").toUpperCase();

  if (!/^[0-9XYZ][0-9]{7}[A-Z]$/.test(dni)) return null;

  const numero = Number(
    dni.replace(/^X/, "0").replace(/^Y/, "1").replace(/^Z/, "2").slice(0, 8)
  );

  return LETRAS_DNI[numero % 23] === dni[8] ? dni : null;
}

/* ---------- Estilos institucionales de las plantillas ---------- */

export const COLOR_EXCEL = {
  oscuro: "FF2A3340",
  rojo: "FFC8102E",
  gris: "FF5F6B7A",
  aviso: "FF8A5A00",
  avisoFondo: "FFFFF8E6",
  infoFondo: "FFEEF5FB",
  info: "FF1F5F99",
  existente: "FFF3F5F8",
} as const;

export function relleno(argb: string): ExcelJS.Fill {
  return { type: "pattern", pattern: "solid", fgColor: { argb } };
}

/** Escribe y une una fila de texto a lo ancho de la tabla. */
export function filaTexto(
  hoja: ExcelJS.Worksheet,
  fila: number,
  columnas: number,
  texto: string,
  estilo: Partial<ExcelJS.Style> = {}
) {
  const ultima = String.fromCharCode(64 + columnas);
  hoja.mergeCells(`A${fila}:${ultima}${fila}`);
  const celda = hoja.getCell(`A${fila}`);
  celda.value = texto;
  Object.assign(celda, estilo);
  celda.alignment = { vertical: "middle", wrapText: true, ...(estilo.alignment ?? {}) };
}
