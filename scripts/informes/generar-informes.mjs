/*
 * Genera los informes PDF de rendimiento y de necesidades a partir de los
 * resultados de la prueba de carga (docs/informes/datos/*.json).
 *
 *   node scripts/informes/generar-informes.mjs
 *
 * Requiere Playwright con Chromium (igual que el manual).
 */
import { createRequire } from "module";
import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

import { COLORES, barras, dispersion, lineas } from "./graficos.mjs";
import { informeNecesidades, informeRendimiento } from "./contenido.mjs";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const { PDFDocument } = require("pdf-lib");

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const DATOS = path.join(raiz, "docs/informes/datos");
const SALIDA = path.join(raiz, "docs/informes");

const entorno = JSON.parse(fs.readFileSync(path.join(DATOS, "entorno.json"), "utf8"));

const escenarios = entorno.escenarios.map((e, i) => {
  const d = JSON.parse(fs.readFileSync(path.join(DATOS, e.archivo), "utf8"));
  const desfase = d.resumen.login.total_s; // la generación empieza tras los inicios de sesión
  const ok = d.resultados.filter((r) => r.status === 200).sort((a, b) => a.s - b.s);
  const muestras = d.muestras.map((m) => ({ ...m, t: m.t - desfase })).filter((m) => m.t >= 0);
  return {
    ...e,
    color: COLORES[i],
    resumen: d.resumen,
    resultados: d.resultados,
    muestras,
    completados: [[0, 0], ...ok.map((r, k) => [r.s / 60, k + 1])],
  };
});

const fmt = (v, dec = 1) => Number(v).toLocaleString("es-ES", { maximumFractionDigits: dec });
const min = (s) => `${fmt(s / 60, 1)} min`;

const graficos = {
  completados: lineas({
    series: escenarios.map((e) => ({ nombre: e.corto, puntos: e.completados })),
    ejeX: "Minutos desde que los 233 centros pulsan «Generar todo el centro»",
    ejeY: "Centros con su ZIP descargado",
    maxY: 233,
  }),
  memoria: lineas({
    series: escenarios.map((e) => ({ nombre: e.corto, puntos: e.muestras.map((m) => [m.t / 60, m.rssMB / 1024]) })),
    ejeX: "Minutos",
    ejeY: "Memoria de la aplicación (GB)",
  }),
  cpu: lineas({
    series: escenarios.map((e) => ({ nombre: e.corto, puntos: e.muestras.map((m) => [m.t / 60, m.cpu]) })),
    ejeX: "Minutos",
    ejeY: "CPU del servidor (%)",
    maxY: 100,
  }),
  tiempoTotal: barras({
    filas: escenarios.map((e, i) => ({ nombre: e.corto, valor: +(e.resumen.masivo.total_s / 60).toFixed(1), color: i })),
    unidad: " min",
  }),
  memoriaPico: barras({
    filas: escenarios.map((e, i) => ({ nombre: e.corto, valor: +(e.resumen.picos.rssMB / 1024).toFixed(2), color: i })),
    unidad: " GB",
  }),
  dispersion: (() => {
    const e = escenarios.at(-1);
    return dispersion({
      puntos: e.resultados.filter((r) => r.status === 200).map((r) => [r.alumnos, r.s / 60]),
      ejeX: "Alumnos del centro",
      ejeY: "Espera hasta la descarga (min)",
      color: e.color,
    });
  })(),
};

const plantilla = fs.readFileSync(path.join(raiz, "scripts/informes/plantilla.html"), "utf8");
const logo = pathToFileURL(path.join(raiz, "public/marca/logo-comunidad-madrid.png")).href;

const informes = [
  { archivo: "Informe_Rendimiento_Prueba_Extrema.pdf", titulo: "Informe de rendimiento", cuerpo: informeRendimiento({ entorno, escenarios, graficos, fmt, min }) },
  { archivo: "Informe_Necesidades_Infraestructura.pdf", titulo: "Informe de necesidades de infraestructura", cuerpo: informeNecesidades({ entorno, escenarios, fmt, min }) },
];

const navegador = await chromium.launch();

for (const inf of informes) {
  const html = plantilla.replaceAll("{{TITULO}}", inf.titulo).replaceAll("{{LOGO}}", logo).replace("{{CUERPO}}", inf.cuerpo);
  const ruta = path.join(SALIDA, inf.archivo.replace(".pdf", ".html"));
  fs.writeFileSync(ruta, html);

  const pagina = await navegador.newPage();
  await pagina.goto(pathToFileURL(ruta).href, { waitUntil: "networkidle" });

  const opciones = { format: "A4", printBackground: true, preferCSSPageSize: true };
  await pagina.evaluate(() => document.body.classList.add("solo-portada"));
  const portada = await pagina.pdf(opciones);
  await pagina.evaluate(() => {
    document.body.classList.replace("solo-portada", "sin-portada");
    const e = document.createElement("style");
    e.textContent = "@page :first { margin: 18mm 17mm 20mm 17mm; }";
    document.head.appendChild(e);
  });
  const cuerpo = await pagina.pdf({
    ...opciones,
    displayHeaderFooter: true,
    headerTemplate: "<span></span>",
    footerTemplate: `<div style="width:100%;font-family:Segoe UI,Arial,sans-serif;font-size:7.5pt;color:#5f6b7a;padding:0 17mm;display:flex;justify-content:space-between;">
      <span>Gestor de Becas · ${inf.titulo} · ${entorno.fecha}</span>
      <span>Página <span class="pageNumber"></span> de <span class="totalPages"></span></span></div>`,
  });

  const final = await PDFDocument.create();
  for (const bytes of [portada, cuerpo]) {
    const doc = await PDFDocument.load(bytes);
    (await final.copyPages(doc, doc.getPageIndices())).forEach((p) => final.addPage(p));
  }
  final.setTitle(`Gestor de Becas · ${inf.titulo}`);
  final.setAuthor("Comunidad de Madrid · Consejería de Educación, Universidades, Ciencia y Portavocía");
  final.setLanguage("es-ES");
  fs.writeFileSync(path.join(SALIDA, inf.archivo), await final.save());
  fs.unlinkSync(ruta);
  console.log("Generado:", path.join("docs/informes", inf.archivo));
}

await navegador.close();
