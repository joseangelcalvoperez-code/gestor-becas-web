/*
 * Capturas adicionales del manual: importación masiva de grados y
 * asignaturas (plantilla, errores, resultado) y panel de administración.
 *
 * ATENCIÓN: modifica los datos del centro de demostración (añade un grado
 * con asignaturas) y genera una contraseña provisional para la cuenta
 * MANUAL_CUENTA_RESTABLECER. Úselo solo con datos de prueba.
 *
 *   MANUAL_URL=http://localhost:3000
 *   MANUAL_EMAIL=...            MANUAL_PASSWORD=...        (centro de demostración)
 *   MANUAL_ADMIN_EMAIL=...      MANUAL_ADMIN_PASSWORD=...  (administrador)
 *   MANUAL_CUENTA_RESTABLECER=correo  MANUAL_CODIGO_RESTABLECER=código de su centro
 *   node scripts/manual/capturas-extra.mjs
 *
 * La imagen de la plantilla Excel requiere LibreOffice (soffice) y pdftoppm.
 */
import { createRequire } from "module";
import { execFileSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const ExcelJS = require("exceljs");

const env = (n) => {
  const v = process.env[n];
  if (!v) {
    console.error(`Falta la variable ${n}.`);
    process.exit(1);
  }
  return v;
};

const BASE = process.env.MANUAL_URL ?? "http://localhost:3000";
const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SALIDA = path.join(raiz, "docs/manual/img");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "manual-"));

const navegador = await chromium.launch();
const contexto = await navegador.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.2 });
const p = await contexto.newPage();
p.on("dialog", (d) => d.accept());

const jpg = (nombre) => path.join(SALIDA, `${nombre}.jpg`);
const captura = async (nombre, opciones = {}) => {
  await p.waitForTimeout(600);
  await p.screenshot({ path: jpg(nombre), type: "jpeg", quality: 84, ...opciones });
  console.log("✔", nombre);
};

/* ---------------- Centro: plantilla de grados ---------------- */

await p.goto(`${BASE}/login`);
await p.fill("input[name=email]", env("MANUAL_EMAIL"));
await p.fill("input[name=password]", env("MANUAL_PASSWORD"));
await p.click("button[type=submit]");
await p.waitForURL("**/inicio");

const respuesta = await p.request.get(`${BASE}/api/grados/plantilla`);
const original = Buffer.from(await respuesta.body());

async function libroDesde(buffer) {
  const libro = new ExcelJS.Workbook();
  await libro.xlsx.load(buffer);
  return libro;
}

/** Escribe una fila celda a celda (conserva el formato de la plantilla). */
function escribirFila(hoja, numero, valores) {
  valores.forEach((v, i) => (hoja.getRow(numero).getCell(i + 1).value = v));
}

function ultimaFila(hoja) {
  let n = 6;
  while (hoja.getRow(n + 1).getCell(1).value) n++;
  return n;
}

// Ejemplo: nuevo grado con sus módulos y profesorado (uno ya registrado)
const EJEMPLO = [
  ["Técnico en Sistemas Microinformáticos y Redes", 1, "0221", "Montaje y mantenimiento de equipos", "Rosa", "Pérez León", "12345678Z"],
  ["Técnico en Sistemas Microinformáticos y Redes", 1, "0222", "Sistemas operativos monopuesto", "Rosa", "Pérez León", "12345678Z"],
  ["Técnico en Sistemas Microinformáticos y Redes", 1, "0223", "Aplicaciones ofimáticas", "Ana", "Ruiz Moreno", "00000000T"],
  ["Técnico en Sistemas Microinformáticos y Redes", 1, "0225", "Redes locales", "Diego", "Santos Vidal", "87654321X"],
];

const ejemplo = await libroDesde(original);
const hojaEjemplo = ejemplo.getWorksheet("ASIGNATURAS");
let n = ultimaFila(hojaEjemplo);
for (const fila of EJEMPLO) escribirFila(hojaEjemplo, ++n, fila);

// Configuración de impresión para la imagen de la plantilla
hojaEjemplo.pageSetup = { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0, printArea: `A1:G${n + 2}` };
const rutaEjemplo = path.join(tmp, "plantilla-ejemplo.xlsx");
await ejemplo.xlsx.writeFile(rutaEjemplo);

try {
  execFileSync("soffice", ["--headless", "--convert-to", "pdf", "--outdir", tmp, rutaEjemplo], { stdio: "ignore" });
  execFileSync("pdftoppm", ["-r", "150", "-jpeg", "-jpegopt", "quality=88", "-f", "1", "-l", "1", "-singlefile",
    path.join(tmp, "plantilla-ejemplo.pdf"), path.join(tmp, "plantilla")], { stdio: "ignore" });
  await recortarBlancos(path.join(tmp, "plantilla.jpg"), jpg("15-plantilla-grados"));
  console.log("✔ 15-plantilla-grados");
} catch {
  console.warn("⚠ Sin LibreOffice/pdftoppm: no se genera la imagen de la plantilla.");
}

/** Recorta los márgenes en blanco de una imagen usando el propio navegador. */
async function recortarBlancos(origen, destino) {
  const pagina = await navegador.newPage();
  const datos = fs.readFileSync(origen).toString("base64");
  await pagina.setContent(`<img id="i" src="data:image/jpeg;base64,${datos}">`);
  const caja = await pagina.evaluate(async () => {
    const img = document.getElementById("i");
    await img.decode();
    const c = document.createElement("canvas");
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    const ctx = c.getContext("2d");
    ctx.drawImage(img, 0, 0);
    const { data } = ctx.getImageData(0, 0, c.width, c.height);
    let x0 = c.width, y0 = c.height, x1 = 0, y1 = 0;
    for (let y = 0; y < c.height; y++) {
      for (let x = 0; x < c.width; x++) {
        const k = (y * c.width + x) * 4;
        if (data[k] < 235 || data[k + 1] < 235 || data[k + 2] < 235) {
          if (x < x0) x0 = x;
          if (x > x1) x1 = x;
          if (y < y0) y0 = y;
          if (y > y1) y1 = y;
        }
      }
    }
    const m = 12;
    const x = Math.max(0, x0 - m), y = Math.max(0, y0 - m);
    c.width = Math.min(img.naturalWidth, x1 + m) - x;
    c.height = Math.min(img.naturalHeight, y1 + m) - y;
    c.getContext("2d").drawImage(img, -x, -y);
    return c.toDataURL("image/jpeg", 0.88);
  });
  fs.writeFileSync(destino, Buffer.from(caja.split(",")[1], "base64"));
  await pagina.close();
}

// Versión con errores típicos
const errores = await libroDesde(original);
const hojaErrores = errores.getWorksheet("ASIGNATURAS");
n = ultimaFila(hojaErrores);
for (const fila of [
  EJEMPLO[0],
  ["Técnico en Sistemas Microinformáticos y Redes", 3, "0222", "Sistemas operativos monopuesto", "Rosa", "Pérez León", "12345678Z"],
  ["Técnico en Sistemas Microinformáticos y Redes", 1, "0223", "Aplicaciones ofimáticas", "Ana", "Ruiz", "00000000T"],
  ["Técnico en Sistemas Microinformáticos y Redes", 1, "0225", "Redes locales", "Diego", "Santos Vidal", "87654321A"],
  ["Técnico en Sistemas Microinformáticos y Redes", 1, "0226", "Servicios en red", "", "", ""],
]) escribirFila(hojaErrores, ++n, fila);
const rutaErrores = path.join(tmp, "plantilla-errores.xlsx");
await errores.xlsx.writeFile(rutaErrores);

/* ---------------- Importación en la aplicación ---------------- */

const CONTENIDO = { x: 250, y: 72, width: 1190 };

await p.goto(`${BASE}/grados-asignaturas`);
await p.waitForLoadState("networkidle");

await p.locator("input[type=file]").setInputFiles(rutaErrores);
await p.getByText("ERRORES DE IMPORTACIÓN").waitFor();
await captura("16-importacion-errores", { clip: { ...CONTENIDO, height: 560 } });

await p.getByRole("button", { name: "CERRAR", exact: true }).click();
await p.locator("input[type=file]").setInputFiles(rutaEjemplo);
await p.getByText("Importación correcta").waitFor();
await captura("17-importacion-correcta", { clip: { ...CONTENIDO, height: 300 } });

/* ---------------- Panel de administración ---------------- */

await p.request.post(`${BASE}/api/recuperar-clave`, {
  data: { email: env("MANUAL_CUENTA_RESTABLECER"), codigoCentro: env("MANUAL_CODIGO_RESTABLECER") },
});

const admin = await navegador.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.2 });
const a = await admin.newPage();
await a.goto(`${BASE}/admin/login`);
await a.screenshot({ path: jpg("18-admin-acceso"), type: "jpeg", quality: 84, clip: { x: 720, y: 0, width: 720, height: 900 } });
console.log("✔ 18-admin-acceso");
await a.fill("input[name=email]", env("MANUAL_ADMIN_EMAIL"));
await a.fill("input[name=password]", env("MANUAL_ADMIN_PASSWORD"));
await a.click("button[type=submit]");
await a.waitForURL(`${BASE}/admin`);
await a.waitForLoadState("networkidle");
await a.waitForTimeout(800);
await a.screenshot({ path: jpg("19-admin-panel"), type: "jpeg", quality: 84 });
console.log("✔ 19-admin-panel");

await a.getByRole("button", { name: "Generar contraseña" }).first().click();
await a.waitForTimeout(400);
const ventana = await a.getByRole("dialog").boundingBox();
await a.screenshot({ path: jpg("20-admin-confirmar"), type: "jpeg", quality: 84, clip: ventana });
console.log("✔ 20-admin-confirmar");

await a.getByRole("dialog").getByRole("button", { name: "Generar contraseña" }).click();
await a.getByText("Contraseña provisional generada").waitFor();
await a.waitForTimeout(400);
const resultado = await a.getByRole("dialog").boundingBox();
await a.screenshot({ path: jpg("21-admin-resultado"), type: "jpeg", quality: 84, clip: resultado });
console.log("✔ 21-admin-resultado");

await navegador.close();
fs.rmSync(tmp, { recursive: true, force: true });
