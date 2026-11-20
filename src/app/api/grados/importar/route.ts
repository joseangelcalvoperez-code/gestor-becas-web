import { NextResponse } from "next/server";
import ExcelJS from "exceljs";

import { prisma } from "@/lib/prisma";
import { obtenerSesion } from "@/lib/session";
import {
  limpiarTexto,
  normalizarTexto,
  textoCelda,
  validarDniNie,
} from "@/lib/excelImportacion";
import {
  CABECERAS_GRADOS,
  FILA_CABECERA_GRADOS,
  MAX_FILAS_GRADOS,
  TIPO_PLANTILLA_GRADOS,
} from "@/lib/plantillaGrados";

export const runtime = "nodejs";

const LONGITUD_MAXIMA = 191;
const TAMANO_MAXIMO = 5 * 1024 * 1024;

interface ErrorFila {
  fila: number;
  mensaje: string;
}

interface FilaAsignatura {
  fila: number;
  grado: string;
  curso: 1 | 2;
  codigo: string;
  asignatura: string;
  profesorNombre: string;
  profesorApellidos: string;
  profesorDni: string;
}

function error(mensaje: string, status = 400, errores?: ErrorFila[]) {
  return NextResponse.json({ ok: false, error: mensaje, ...(errores ? { errores } : {}) }, { status });
}

/* =========================================================
   POST /api/grados/importar
   Importa grados, asignaturas y profesorado desde la
   plantilla Excel. Reglas:
     - Todo o nada: si una fila tiene errores no se guarda nada.
     - Aditiva: nunca elimina grados, asignaturas ni profesores.
     - Grado inexistente → se crea (o se reactiva si estaba
       dado de baja).
     - Profesor por DNI/NIE: si no existe se crea; si existe,
       el nombre debe coincidir.
     - Asignatura existente (mismo grado, curso y nombre) →
       se actualizan código y profesor si han cambiado.
   ========================================================= */

export async function POST(request: Request) {
  const sesion = await obtenerSesion();

  if (!sesion) return error("No hay una sesión activa.", 401);

  try {
    /* ---------------- ARCHIVO ---------------- */

    const form = await request.formData();
    const archivo = form.get("archivo");

    if (!(archivo instanceof File)) return error("No se ha recibido ningún archivo.");
    if (!archivo.name.toLowerCase().endsWith(".xlsx")) return error("El archivo debe tener formato .xlsx.");
    if (archivo.size > TAMANO_MAXIMO) return error("El archivo supera el tamaño máximo de 5 MB.");

    const libro = new ExcelJS.Workbook();

    try {
      await libro.xlsx.load(Buffer.from(await archivo.arrayBuffer()) as never);
    } catch {
      return error("No se ha podido leer el archivo. Compruebe que es un Excel válido.");
    }

    /* ---------------- PLANTILLA ---------------- */

    const centro = await prisma.centro.findUnique({
      where: { id: sesion.centroId },
      select: { codigo: true },
    });

    if (!centro) return error("No se ha encontrado el centro.", 404);

    const meta = libro.getWorksheet("_METADATA");

    if (!meta || textoCelda(meta.getCell("B1").value).trim() !== TIPO_PLANTILLA_GRADOS) {
      return error(
        "El archivo no es una plantilla de grados y asignaturas. Descargue la plantilla desde esta pantalla."
      );
    }

    if (textoCelda(meta.getCell("B2").value).trim() !== centro.codigo) {
      return error("La plantilla pertenece a otro centro. Descargue la plantilla de su centro.", 409);
    }

    const hoja = libro.getWorksheet("ASIGNATURAS");

    if (!hoja) return error('El archivo no contiene la hoja "ASIGNATURAS".');

    const cabeceraCorrecta = CABECERAS_GRADOS.every(
      (esperada, i) =>
        normalizarTexto(textoCelda(hoja.getRow(FILA_CABECERA_GRADOS).getCell(i + 1).value)) ===
        normalizarTexto(esperada)
    );

    if (!cabeceraCorrecta) {
      return error("Las columnas de la plantilla han sido modificadas. Descargue una plantilla nueva.");
    }

    /* ---------------- LECTURA Y VALIDACIÓN DE FILAS ---------------- */

    const errores: ErrorFila[] = [];
    const filas: FilaAsignatura[] = [];

    for (let n = FILA_CABECERA_GRADOS + 1; n <= hoja.rowCount; n++) {
      const r = hoja.getRow(n);
      const valores = CABECERAS_GRADOS.map((_, i) => limpiarTexto(textoCelda(r.getCell(i + 1).value)));

      if (valores.every((v) => v === "")) continue;

      if (filas.length + errores.length >= MAX_FILAS_GRADOS) {
        return error(`La plantilla supera el máximo de ${MAX_FILAS_GRADOS} filas por importación.`);
      }

      const [grado, cursoTexto, codigo, asignatura, profesorNombre, profesorApellidos, dniTexto] = valores;
      const faltan: string[] = [];

      if (!grado) faltan.push("GRADO");
      if (!cursoTexto) faltan.push("CURSO");
      if (!asignatura) faltan.push("ASIGNATURA");
      if (!profesorNombre) faltan.push("NOMBRE PROFESOR");
      if (!profesorApellidos) faltan.push("APELLIDOS PROFESOR");
      if (!dniTexto) faltan.push("DNI/NIE PROFESOR");

      if (faltan.length) {
        errores.push({ fila: n, mensaje: `Faltan datos obligatorios: ${faltan.join(", ")}.` });
        continue;
      }

      if (cursoTexto !== "1" && cursoTexto !== "2") {
        errores.push({ fila: n, mensaje: `El CURSO debe ser 1 o 2 (se ha indicado «${cursoTexto}»).` });
        continue;
      }

      const largos = [grado, codigo, asignatura, profesorNombre, profesorApellidos].some(
        (v) => v.length > LONGITUD_MAXIMA
      );

      if (largos) {
        errores.push({ fila: n, mensaje: `Algún texto supera los ${LONGITUD_MAXIMA} caracteres.` });
        continue;
      }

      filas.push({
        fila: n,
        grado,
        curso: cursoTexto === "1" ? 1 : 2,
        codigo,
        asignatura,
        profesorNombre,
        profesorApellidos,
        profesorDni: dniTexto.replace(/[\s.-]/g, "").toUpperCase(),
      });
    }

    if (filas.length === 0 && errores.length === 0) {
      return error("La plantilla no contiene ninguna asignatura.");
    }

    /* ---------------- DATOS ACTUALES DEL CENTRO ---------------- */

    const [gradosBd, profesoresBd, asignaturasBd] = await Promise.all([
      prisma.grado.findMany({
        where: { centroId: sesion.centroId },
        select: { id: true, nombre: true, activo: true },
      }),
      prisma.profesor.findMany({
        where: { centroId: sesion.centroId },
        select: { id: true, nombre: true, apellidos: true, dni: true, activo: true },
      }),
      prisma.asignatura.findMany({
        where: { centroId: sesion.centroId },
        select: { id: true, gradoId: true, curso: true, codigo: true, nombre: true, profesorId: true },
      }),
    ]);

    const gradoPorNombre = new Map(gradosBd.map((g) => [normalizarTexto(g.nombre), g]));
    const profesorPorDni = new Map(profesoresBd.map((p) => [p.dni.toUpperCase(), p]));

    /* ---------------- VALIDACIONES CRUZADAS ---------------- */

    // Profesor: DNI válido y mismo nombre en todas las filas y en la BD
    const nombrePorDni = new Map<string, { nombre: string; apellidos: string; fila: number }>();

    for (const f of filas) {
      const existente = profesorPorDni.get(f.profesorDni);

      if (!existente && !validarDniNie(f.profesorDni)) {
        errores.push({ fila: f.fila, mensaje: `El DNI/NIE «${f.profesorDni}» no es válido (formato o letra de control).` });
        continue;
      }

      const nombreCompleto = normalizarTexto(`${f.profesorNombre} ${f.profesorApellidos}`);

      if (existente && existente.activo) {
        if (normalizarTexto(`${existente.nombre} ${existente.apellidos}`) !== nombreCompleto) {
          errores.push({
            fila: f.fila,
            mensaje: `El DNI/NIE ${f.profesorDni} ya pertenece a «${existente.nombre} ${existente.apellidos}» en el centro. Corrija el nombre o el DNI/NIE.`,
          });
          continue;
        }
      }

      const previo = nombrePorDni.get(f.profesorDni);

      if (previo && normalizarTexto(`${previo.nombre} ${previo.apellidos}`) !== nombreCompleto) {
        errores.push({
          fila: f.fila,
          mensaje: `El DNI/NIE ${f.profesorDni} aparece con otro nombre en la fila ${previo.fila}.`,
        });
        continue;
      }

      if (!previo) {
        nombrePorDni.set(f.profesorDni, { nombre: f.profesorNombre, apellidos: f.profesorApellidos, fila: f.fila });
      }
    }

    // Asignaturas: sin duplicados en el archivo y códigos únicos por grado y curso
    const claveAsignatura = (grado: string, curso: number, nombre: string) =>
      `${normalizarTexto(grado)}|${curso}|${normalizarTexto(nombre)}`;
    const claveCodigo = (grado: string, curso: number, codigo: string) =>
      `${normalizarTexto(grado)}|${curso}|${normalizarTexto(codigo)}`;

    // 1) Duplicados dentro del archivo
    const vistas = new Map<string, number>();
    const filasUnicas: FilaAsignatura[] = [];

    for (const f of filas) {
      const clave = claveAsignatura(f.grado, f.curso, f.asignatura);
      const repetida = vistas.get(clave);

      if (repetida) {
        errores.push({
          fila: f.fila,
          mensaje: `La asignatura «${f.asignatura}» está repetida en el mismo grado y curso (fila ${repetida}).`,
        });
        continue;
      }

      vistas.set(clave, f.fila);
      filasUnicas.push(f);
    }

    // 2) Códigos: los de la BD cuentan solo para asignaturas que no
    //    vienen en el archivo (así se pueden intercambiar códigos).
    const codigos = new Map<string, { fila: number; asignatura: string }>();
    const nombreGradoPorId = new Map(gradosBd.map((g) => [g.id, g.nombre]));

    for (const a of asignaturasBd) {
      if (!a.codigo) continue;
      const grado = nombreGradoPorId.get(a.gradoId) ?? "";
      if (vistas.has(claveAsignatura(grado, a.curso, a.nombre))) continue;
      codigos.set(claveCodigo(grado, a.curso, a.codigo), { fila: 0, asignatura: a.nombre });
    }

    for (const f of filasUnicas) {
      if (!f.codigo) continue;

      const cc = claveCodigo(f.grado, f.curso, f.codigo);
      const uso = codigos.get(cc);

      if (uso) {
        errores.push({
          fila: f.fila,
          mensaje: `El código ${f.codigo} ya lo usa «${uso.asignatura}»${uso.fila ? ` (fila ${uso.fila})` : ""} en el mismo grado y curso.`,
        });
        continue;
      }

      codigos.set(cc, { fila: f.fila, asignatura: f.asignatura });
    }

    if (errores.length > 0) {
      errores.sort((a, b) => a.fila - b.fila);

      return error(
        `No se ha importado nada: ${errores.length} fila${errores.length === 1 ? "" : "s"} con errores. Corríjalas y vuelva a importar.`,
        400,
        errores.slice(0, 200)
      );
    }

    /* ---------------- GUARDADO (TODO O NADA) ---------------- */

    const resumen = {
      gradosCreados: 0,
      gradosReactivados: 0,
      profesoresCreados: 0,
      profesoresReactivados: 0,
      asignaturasCreadas: 0,
      asignaturasActualizadas: 0,
      asignaturasSinCambios: 0,
    };

    await prisma.$transaction(
      async (tx) => {
        const gradoId = new Map<string, number>();
        const profesorId = new Map<string, number>();

        // Grados
        for (const nombre of new Set(filas.map((f) => f.grado))) {
          const clave = normalizarTexto(nombre);
          if (gradoId.has(clave)) continue;

          const existente = gradoPorNombre.get(clave);

          if (existente) {
            if (!existente.activo) {
              await tx.grado.update({ where: { id: existente.id }, data: { activo: true } });
              resumen.gradosReactivados++;
            }
            gradoId.set(clave, existente.id);
          } else {
            const nuevo = await tx.grado.create({
              data: { centroId: sesion.centroId, nombre },
              select: { id: true },
            });
            gradoId.set(clave, nuevo.id);
            resumen.gradosCreados++;
          }
        }

        // Profesorado
        for (const [dni, datos] of nombrePorDni) {
          const existente = profesorPorDni.get(dni);

          if (existente) {
            if (!existente.activo) {
              await tx.profesor.update({
                where: { id: existente.id },
                data: { nombre: datos.nombre, apellidos: datos.apellidos, activo: true },
              });
              resumen.profesoresReactivados++;
            }
            profesorId.set(dni, existente.id);
          } else {
            const nuevo = await tx.profesor.create({
              data: { centroId: sesion.centroId, nombre: datos.nombre, apellidos: datos.apellidos, dni },
              select: { id: true },
            });
            profesorId.set(dni, nuevo.id);
            resumen.profesoresCreados++;
          }
        }

        // Asignaturas
        const asignaturaExistente = new Map(
          asignaturasBd.map((a) => [`${a.gradoId}|${a.curso}|${normalizarTexto(a.nombre)}`, a])
        );

        for (const f of filas) {
          const gId = gradoId.get(normalizarTexto(f.grado))!;
          const pId = profesorId.get(f.profesorDni)!;
          const existente = asignaturaExistente.get(`${gId}|${f.curso}|${normalizarTexto(f.asignatura)}`);

          if (!existente) {
            await tx.asignatura.create({
              data: {
                centroId: sesion.centroId,
                gradoId: gId,
                curso: f.curso,
                codigo: f.codigo,
                nombre: f.asignatura,
                profesorId: pId,
              },
            });
            resumen.asignaturasCreadas++;
          } else if (existente.codigo !== f.codigo || existente.profesorId !== pId) {
            await tx.asignatura.update({
              where: { id: existente.id },
              data: { codigo: f.codigo, profesorId: pId },
            });
            resumen.asignaturasActualizadas++;
          } else {
            resumen.asignaturasSinCambios++;
          }
        }
      },
      { maxWait: 10000, timeout: 120000 }
    );

    return NextResponse.json({ ok: true, resumen });
  } catch (e) {
    console.error("Error importando grados y asignaturas:", e);

    return error("No se ha podido importar la plantilla. No se ha guardado ningún cambio.", 500);
  }
}
