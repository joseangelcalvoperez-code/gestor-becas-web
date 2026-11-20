/*
 * Rehace las capturas del manual (docs/manual/img/*.jpg) desde la
 * aplicación en marcha. Después, generar el PDF con generar-pdf.mjs.
 *
 *   MANUAL_URL=http://localhost:3000 \
 *   MANUAL_EMAIL=secretaria@iesejemplo.es MANUAL_PASSWORD=... \
 *   node scripts/manual/capturas.mjs
 *
 * Se recomienda un centro de demostración con datos ficticios:
 * grado "Técnico en Gestión Administrativa" con módulos (0437...),
 * alumnado inventado (la alumna "Martín Gómez" se usa en Asistencia y
 * Documentación; "Sánchez Romero" con una convalidación) y asistencia
 * registrada en noviembre del curso actual.
 *
 * Requiere Playwright con Chromium (no es dependencia de la aplicación).
 */
import { createRequire } from "module";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const { chromium } = createRequire(import.meta.url)("playwright");

const BASE = process.env.MANUAL_URL ?? "http://localhost:3000";
const EMAIL = process.env.MANUAL_EMAIL;
const PASSWORD = process.env.MANUAL_PASSWORD;
if (!EMAIL || !PASSWORD) {
  console.error("Indique MANUAL_EMAIL y MANUAL_PASSWORD.");
  process.exit(1);
}

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SALIDA = path.join(raiz, "docs/manual/img");
fs.mkdirSync(SALIDA, { recursive: true });

// Zona de contenido (sin cabecera ni menú lateral), en píxeles CSS
const CONTENIDO_X = 250;
const CONTENIDO_Y = 72;
const ANCHO = 1440;
const ALTO_PIE = 75;

const navegador = await chromium.launch();
const contexto = await navegador.newContext({
  viewport: { width: ANCHO, height: 900 },
  deviceScaleFactor: 1.2,
});
const p = await contexto.newPage();

async function captura(nombre, recorte) {
  await p.waitForTimeout(700);
  let clip = recorte;
  if (recorte === "contenido-completo") {
    const alto = await p.evaluate(() => document.documentElement.scrollHeight);
    clip = { x: CONTENIDO_X, y: CONTENIDO_Y, width: ANCHO - CONTENIDO_X, height: alto - CONTENIDO_Y - ALTO_PIE };
  }
  await p.screenshot({
    path: path.join(SALIDA, `${nombre}.jpg`),
    type: "jpeg",
    quality: 84,
    ...(clip ? { clip, fullPage: true } : {}),
  });
  console.log("✔", nombre);
}

const contenido = (hasta, desde = CONTENIDO_Y) => ({
  x: CONTENIDO_X, y: desde, width: ANCHO - CONTENIDO_X, height: hasta - desde,
});

async function ir(ruta) {
  await p.goto(BASE + ruta);
  await p.waitForLoadState("networkidle");
  await p.waitForTimeout(900);
}

async function selectores(minimo) {
  await p.waitForFunction((m) => document.querySelectorAll("main select").length >= m, minimo, { timeout: 15000 });
  return p.locator("main select");
}

async function elegir(selector, texto) {
  const indice = await selector.evaluate(
    (el, t) => [...el.options].findIndex((o) => o.text.includes(t)),
    texto
  );
  if (indice < 0) throw new Error(`No existe la opción "${texto}"`);
  await selector.selectOption({ index: indice });
}

await ir("/login");
await captura("01-acceso");
await ir("/registro");
await captura("02-registro");

await ir("/login");
await p.fill("input[name=email]", EMAIL);
await p.fill("input[name=password]", PASSWORD);
await p.click("button[type=submit]");
await p.waitForURL("**/inicio");
await p.waitForLoadState("networkidle");
await captura("03-inicio");
await captura("04-cabecera", { x: 0, y: 0, width: ANCHO, height: CONTENIDO_Y });

await ir("/centro");
await captura("05-centro", "contenido-completo");

await ir("/grados-asignaturas");
await captura("06-grados", contenido(710));

await ir("/alumnos");
await captura("07-alumnos", contenido(900));
await p.getByRole("button", { name: "+ NUEVO ALUMNO" }).click();
await captura("08-nuevo-alumno", contenido(750));

await ir("/alumnos");
await p.locator("div", { hasText: "Sánchez Romero" })
  .filter({ has: p.getByRole("button", { name: "CONVALIDACIONES" }) })
  .last()
  .getByRole("button", { name: "CONVALIDACIONES" })
  .click();
await captura("09-convalidaciones", contenido(680, 202));

await ir("/asistencia");
await captura("10-asistencia", contenido(500));
let s = await selectores(4);
const n = await s.count();
await elegir(s.nth(n - 3), "Gestión Administrativa");
await p.waitForTimeout(700);
await elegir(s.nth(n - 2), "0437");
await p.waitForTimeout(700);
await elegir(s.nth(n - 1), "Martín Gómez");
await p.waitForLoadState("networkidle");
await captura("11-asistencia-tabla", "contenido-completo");

await ir("/documentos");
s = await selectores(1);
await elegir(s.first(), "Martín Gómez");
await p.waitForLoadState("networkidle");
await p.waitForTimeout(1200);
await p.getByText("RESUMEN DEL MES").first().click().catch(() => {});
await captura("12-documentos", "contenido-completo");

await navegador.close();
