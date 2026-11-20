/*
 * Genera el manual de usuario en PDF a partir de docs/manual/manual.html.
 *
 *   node scripts/manual/generar-pdf.mjs
 *
 * Requiere Playwright con Chromium (no es dependencia de la aplicación):
 *   npm install --no-save playwright && npx playwright install chromium
 *
 * Las capturas están en docs/manual/img/. Para rehacerlas tras cambios
 * de interfaz, ver scripts/manual/capturas.mjs.
 */
import { createRequire } from "module";
import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const origen = path.join(raiz, "docs/manual/manual.html");
const destino = path.join(raiz, "public/documentos/Manual_Gestor_Becas_v1.1.pdf");

const navegador = await chromium.launch();
const pagina = await navegador.newPage();
// Las capturas y el logotipo se cargan desde disco.
await pagina.goto(pathToFileURL(origen).href, { waitUntil: "networkidle" });

const opciones = {
  format: "A4",
  printBackground: true,
  preferCSSPageSize: true,
};

// Portada sin pie de página
await pagina.evaluate(() => document.body.classList.add("solo-portada"));
const portada = await pagina.pdf(opciones);

// Resto del manual con pie y numeración
await pagina.evaluate(() => {
  document.body.classList.remove("solo-portada");
  document.body.classList.add("sin-portada");
  // Sin portada, la primera página (índice) lleva los márgenes normales
  const estilo = document.createElement("style");
  estilo.textContent = "@page :first { margin: 20mm 18mm 20mm 18mm; }";
  document.head.appendChild(estilo);
});
const cuerpo = await pagina.pdf({
  ...opciones,
  displayHeaderFooter: true,
  headerTemplate: "<span></span>",
  footerTemplate: `
    <div style="width:100%;font-family:Segoe UI,Arial,sans-serif;font-size:7.5pt;color:#5f6b7a;
                padding:0 18mm;display:flex;justify-content:space-between;">
      <span>Gestor de Becas · Manual de usuario · v1.1</span>
      <span>Página <span class="pageNumber"></span> de <span class="totalPages"></span></span>
    </div>`,
});

// Unir portada + cuerpo con pdf-lib (ya es dependencia de la aplicación)
const { PDFDocument } = require("pdf-lib");
const final = await PDFDocument.create();
for (const bytes of [portada, cuerpo]) {
  const doc = await PDFDocument.load(bytes);
  const paginas = await final.copyPages(doc, doc.getPageIndices());
  paginas.forEach((p) => final.addPage(p));
}
final.setTitle("Gestor de Becas · Manual de usuario v1.1");
final.setAuthor("Comunidad de Madrid · Consejería de Educación, Universidades, Ciencia y Portavocía");
final.setSubject("Becas de Segunda Oportunidad");
final.setLanguage("es-ES");
fs.writeFileSync(destino, await final.save());

await navegador.close();
console.log("Manual generado:", path.relative(raiz, destino));
