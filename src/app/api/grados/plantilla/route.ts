import { NextResponse } from "next/server";
import ExcelJS from "exceljs";

import { prisma } from "@/lib/prisma";
import { obtenerSesion } from "@/lib/session";
import { COLOR_EXCEL, filaTexto, relleno } from "@/lib/excelImportacion";
import {
  CABECERAS_GRADOS,
  FILA_CABECERA_GRADOS,
  MAX_FILAS_GRADOS,
  TIPO_PLANTILLA_GRADOS,
} from "@/lib/plantillaGrados";

export const runtime = "nodejs";



/* =========================================================
   GET /api/grados/plantilla
   Plantilla Excel de grados y asignaturas, con la estructura
   actual del centro ya cumplimentada para poder ampliarla.
   ========================================================= */

export async function GET() {
  const sesion = await obtenerSesion();

  if (!sesion) {
    return NextResponse.json(
      { ok: false, error: "No hay una sesión activa." },
      { status: 401 }
    );
  }

  try {
    const [centro, asignaturas, grados, profesores] = await Promise.all([
      prisma.centro.findUnique({
        where: { id: sesion.centroId },
        select: { nombre: true, codigo: true },
      }),
      prisma.asignatura.findMany({
        where: { centroId: sesion.centroId, grado: { activo: true } },
        orderBy: [{ grado: { nombre: "asc" } }, { curso: "asc" }, { codigo: "asc" }, { nombre: "asc" }],
        select: {
          curso: true,
          codigo: true,
          nombre: true,
          grado: { select: { nombre: true } },
          profesor: { select: { nombre: true, apellidos: true, dni: true } },
        },
      }),
      prisma.grado.findMany({
        where: { centroId: sesion.centroId, activo: true },
        orderBy: { nombre: "asc" },
        select: { nombre: true },
      }),
      prisma.profesor.findMany({
        where: { centroId: sesion.centroId, activo: true },
        orderBy: [{ apellidos: "asc" }, { nombre: "asc" }],
        select: { nombre: true, apellidos: true, dni: true },
      }),
    ]);

    if (!centro) {
      return NextResponse.json(
        { ok: false, error: "No se ha encontrado el centro." },
        { status: 404 }
      );
    }

    const libro = new ExcelJS.Workbook();
    libro.creator = "Gestor de Becas";
    libro.company = centro.nombre;
    libro.created = new Date();

    /* ---------------- HOJA ASIGNATURAS ---------------- */

    const columnas = CABECERAS_GRADOS.length;
    const hoja = libro.addWorksheet("ASIGNATURAS", {
      views: [{ state: "frozen", ySplit: FILA_CABECERA_GRADOS }],
    });

    filaTexto(hoja, 1, columnas, "PLANTILLA DE GRADOS Y ASIGNATURAS", {
      font: { bold: true, size: 15, color: { argb: "FFFFFFFF" } },
      fill: relleno(COLOR_EXCEL.oscuro),
    });
    hoja.getRow(1).height = 26;

    filaTexto(hoja, 2, columnas, `${centro.nombre} · Código: ${centro.codigo}`, {
      font: { italic: true, size: 10, color: { argb: COLOR_EXCEL.gris } },
    });

    filaTexto(
      hoja,
      3,
      columnas,
      "Una fila por asignatura. CURSO: 1 o 2. Si el GRADO no existe se crea. El profesor se identifica por su DNI/NIE: si no existe se da de alta.",
      { font: { size: 10, color: { argb: COLOR_EXCEL.aviso } }, fill: relleno(COLOR_EXCEL.avisoFondo) }
    );
    hoja.getRow(3).height = 30;

    filaTexto(
      hoja,
      4,
      columnas,
      "Las filas en gris son la configuración actual del centro: puede cambiar su CÓDIGO o su PROFESOR. La importación NO borra nada: para eliminar un grado o una asignatura use la aplicación.",
      { font: { size: 10, color: { argb: COLOR_EXCEL.info } }, fill: relleno(COLOR_EXCEL.infoFondo) }
    );
    hoja.getRow(4).height = 30;

    filaTexto(
      hoja,
      5,
      columnas,
      "Si alguna fila tiene un error no se importará ninguna. La aplicación indicará la fila y el motivo.",
      { font: { size: 10, bold: true, color: { argb: COLOR_EXCEL.rojo } } }
    );

    const cabecera = hoja.getRow(FILA_CABECERA_GRADOS);
    CABECERAS_GRADOS.forEach((texto, i) => {
      const celda = cabecera.getCell(i + 1);
      celda.value = texto;
      celda.font = { bold: true, size: 10, color: { argb: "FFFFFFFF" } };
      celda.fill = relleno(COLOR_EXCEL.rojo);
      celda.alignment = { vertical: "middle", horizontal: "center" };
    });
    cabecera.height = 22;

    hoja.columns = [
      { width: 42 }, { width: 9 }, { width: 12 }, { width: 50 },
      { width: 20 }, { width: 28 }, { width: 18 },
    ];

    let fila = FILA_CABECERA_GRADOS + 1;

    for (const a of asignaturas) {
      const r = hoja.getRow(fila++);
      r.values = [
        a.grado.nombre,
        a.curso,
        a.codigo,
        a.nombre,
        a.profesor.nombre,
        a.profesor.apellidos,
        a.profesor.dni,
      ];
      r.eachCell((c) => (c.fill = relleno(COLOR_EXCEL.existente)));
    }

    // CURSO y CÓDIGO centrados para que no se lean juntos
    for (let f = FILA_CABECERA_GRADOS + 1; f <= fila + 200; f++) {
      hoja.getCell(`B${f}`).alignment = { horizontal: "center" };
      hoja.getCell(`C${f}`).alignment = { horizontal: "center" };
    }

    const ultimaFila = Math.max(fila + 200, FILA_CABECERA_GRADOS + MAX_FILAS_GRADOS);

    /* ---------------- LISTAS DE AYUDA ---------------- */

    const listas = libro.addWorksheet("LISTAS");
    listas.getCell("A1").value = "GRADOS";
    grados.forEach((g, i) => (listas.getCell(`A${i + 2}`).value = g.nombre));
    listas.state = "veryHidden";

    for (let f = FILA_CABECERA_GRADOS + 1; f <= ultimaFila; f++) {
      // Grado: sugerencia de los existentes, pero admite nombres nuevos
      if (grados.length > 0) {
        hoja.getCell(`A${f}`).dataValidation = {
          type: "list",
          allowBlank: true,
          formulae: [`LISTAS!$A$2:$A$${grados.length + 1}`],
          showErrorMessage: false,
        };
      }

      hoja.getCell(`B${f}`).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: ['"1,2"'],
        showErrorMessage: true,
        errorTitle: "Curso no válido",
        error: "El curso debe ser 1 o 2.",
      };

      hoja.getCell(`C${f}`).numFmt = "@";
      hoja.getCell(`G${f}`).numFmt = "@";
    }

    /* ---------------- PROFESORADO (CONSULTA) ---------------- */

    const hojaProfes = libro.addWorksheet("PROFESORADO");
    hojaProfes.columns = [{ width: 20 }, { width: 30 }, { width: 18 }];
    hojaProfes.getRow(1).values = ["NOMBRE", "APELLIDOS", "DNI/NIE"];
    hojaProfes.getRow(1).eachCell((c) => {
      c.font = { bold: true, color: { argb: "FFFFFFFF" } };
      c.fill = relleno(COLOR_EXCEL.oscuro);
    });
    profesores.forEach((p, i) => (hojaProfes.getRow(i + 2).values = [p.nombre, p.apellidos, p.dni]));

    /* ---------------- METADATOS ---------------- */

    const meta = libro.addWorksheet("_METADATA");
    meta.getCell("A1").value = "TIPO_DOCUMENTO";
    meta.getCell("B1").value = TIPO_PLANTILLA_GRADOS;
    meta.getCell("A2").value = "CENTRO_CODIGO";
    meta.getCell("B2").value = centro.codigo;
    meta.state = "veryHidden";

    const buffer = await libro.xlsx.writeBuffer();

    return new NextResponse(new Uint8Array(buffer as ArrayBuffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="Plantilla_Grados_Asignaturas_${centro.codigo}.xlsx"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Error generando la plantilla de grados:", error);

    return NextResponse.json(
      { ok: false, error: "No se ha podido generar la plantilla." },
      { status: 500 }
    );
  }
}
