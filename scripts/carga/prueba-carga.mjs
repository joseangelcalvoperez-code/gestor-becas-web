// Prueba de carga extrema: N centros piden a la vez la generación masiva de expedientes.
// Uso: node carga.mjs <salida.json> <nCentros> <url1,url2,...>
import http from "http";
import fs from "fs";
import { execSync } from "child_process";

const [salida, nCentrosTxt, urlsTxt] = process.argv.slice(2);
const N = Number(nCentrosTxt);
const URLS = urlsTxt.split(",");
// Sin reutilizar conexiones: cada centro es un equipo distinto con su propia conexión.
// (Reutilizarlas entre centros provocaba ECONNRESET falsos al cerrar el servidor las inactivas.)
const agente = new http.Agent({ keepAlive: false, maxSockets: Infinity });

function peticion(url, { method = "GET", body, cookie } = {}) {
  return new Promise((resolve) => {
    const t0 = performance.now();
    const u = new URL(url);
    const req = http.request(
      { hostname: u.hostname, port: u.port, path: u.pathname + u.search, method, agent: agente,
        headers: { "Content-Type": "application/json", ...(cookie ? { cookie } : {}) } },
      (res) => {
        let bytes = 0;
        res.on("data", (c) => (bytes += c.length));
        res.on("end", () => resolve({ status: res.statusCode, ms: performance.now() - t0, bytes, headers: res.headers }));
      }
    );
    req.on("error", (e) => resolve({ status: 0, ms: performance.now() - t0, bytes: 0, error: e.message }));
    req.setTimeout(0);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

const pct = (a, p) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : 0; };

// ---- Muestreo de recursos ----
const muestras = [];
const t0 = Date.now();
function procesosNode() {
  try {
    return execSync("ps -eo pid,rss,pcpu,args | grep next-server | grep -v grep", { encoding: "utf8" })
      .trim().split("\n").filter(Boolean).map((l) => { const [pid, rss, cpu] = l.trim().split(/\s+/); return { pid: +pid, rssMB: +rss / 1024, cpu: +cpu }; });
  } catch { return []; }
}
function cpuTotal() {
  const l = fs.readFileSync("/proc/stat", "utf8").split("\n")[0].trim().split(/\s+/).slice(1).map(Number);
  return { idle: l[3] + l[4], total: l.reduce((a, b) => a + b, 0) };
}
let cpuPrev = cpuTotal();
let enCurso = 0, completadas = 0;
async function muestrear() {
  const c = cpuTotal();
  const usoCpu = 100 * (1 - (c.idle - cpuPrev.idle) / (c.total - cpuPrev.total)); cpuPrev = c;
  const procs = procesosNode();
  let mysqlConn = 0;
  try { mysqlConn = +execSync("mysql -uroot -N -e \"show status like 'Threads_connected'\"", { encoding: "utf8" }).split(/\s+/)[1]; } catch {}
  const memLibre = +fs.readFileSync("/proc/meminfo", "utf8").match(/MemAvailable:\s+(\d+)/)[1] / 1024;
  const sonda = await peticion(URLS[0] + "/api/estado-db");
  let cola = null; try { cola = JSON.parse("{}"); } catch {}
  muestras.push({ t: (Date.now() - t0) / 1000, cpu: +usoCpu.toFixed(1), rssMB: +procs.reduce((a, p) => a + p.rssMB, 0).toFixed(0),
    rssMaxProcMB: +Math.max(0, ...procs.map((p) => p.rssMB)).toFixed(0), procesos: procs.length, mysqlConn,
    memDisponibleMB: +memLibre.toFixed(0), sondaMs: +sonda.ms.toFixed(0), sondaStatus: sonda.status, enCurso, completadas });
}
const intervalo = setInterval(muestrear, 2000);

// ---- Fase 1: inicio de sesión simultáneo de todos los centros ----
const tLogin = Date.now();
const logins = await Promise.all(Array.from({ length: N }, (_, i) =>
  peticion(URLS[i % URLS.length] + "/api/login", { method: "POST", body: { email: `carga${i + 1}@carga.local`, password: "CargaExtrema2026" } })));
const cookies = logins.map((r) => (r.headers?.["set-cookie"]?.[0] ?? "").split(";")[0]);
const resLogin = { total_s: (Date.now() - tLogin) / 1000, p50: pct(logins.map((r) => r.ms), 0.5), p95: pct(logins.map((r) => r.ms), 0.95), errores: logins.filter((r) => r.status !== 200).length };
console.log("logins", resLogin);

// ---- Fase 2: generación masiva simultánea ----
const alumnos = JSON.parse(fs.readFileSync(process.env.CARGA_DATOS ?? new URL("./carga.sql.json", import.meta.url))).alumnos_por_centro;
const tMasivo = Date.now();
const resultados = await Promise.all(Array.from({ length: N }, async (_, i) => {
  enCurso++;
  const r = await peticion(URLS[i % URLS.length] + "/api/documentos/expediente-masivo",
    { method: "POST", cookie: cookies[i], body: { cursoAcademicoId: i + 1, anio: 2026, mes: 11 } });
  enCurso--; completadas++;
  return { centro: i + 1, alumnos: alumnos[i], status: r.status, s: +(r.ms / 1000).toFixed(2), MB: +(r.bytes / 1048576).toFixed(2), error: r.error,
    expedientes: +(r.headers?.["x-total-expedientes"] ?? 0), anexosV: +(r.headers?.["x-total-anexos-v"] ?? 0) };
}));
const totalMasivo = (Date.now() - tMasivo) / 1000;
await muestrear(); clearInterval(intervalo);

const ok = resultados.filter((r) => r.status === 200);
const resumen = {
  centros: N, procesos: URLS.length, login: resLogin,
  masivo: { total_s: totalMasivo, correctos: ok.length, errores: resultados.length - ok.length,
    p50_s: pct(ok.map((r) => r.s), 0.5), p90_s: pct(ok.map((r) => r.s), 0.9), max_s: Math.max(0, ...ok.map((r) => r.s)),
    MB_total: +ok.reduce((a, r) => a + r.MB, 0).toFixed(1), alumnos: ok.reduce((a, r) => a + r.alumnos, 0) },
  picos: { cpu: Math.max(...muestras.map((m) => m.cpu)), rssMB: Math.max(...muestras.map((m) => m.rssMB)),
    rssMaxProcMB: Math.max(...muestras.map((m) => m.rssMaxProcMB)), mysqlConn: Math.max(...muestras.map((m) => m.mysqlConn)),
    memDisponibleMinMB: Math.min(...muestras.map((m) => m.memDisponibleMB)), sondaMaxMs: Math.max(...muestras.map((m) => m.sondaMs)),
    sondaP95Ms: pct(muestras.map((m) => m.sondaMs), 0.95), sondaFallos: muestras.filter((m) => m.sondaStatus !== 200).length },
};
fs.writeFileSync(salida, JSON.stringify({ resumen, resultados, muestras }, null, 1));
console.log(JSON.stringify(resumen, null, 1));
