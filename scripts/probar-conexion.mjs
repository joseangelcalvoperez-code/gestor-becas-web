/*
 * Diagnóstico de la conexión a MySQL con los datos del .env.
 * Uso:  npm run probar:bd   (en Windows: npm.cmd run probar:bd)
 *
 * Muestra el error REAL del servidor (contraseña, permisos,
 * autenticación...), que la aplicación a veces oculta tras un
 * "pool timeout".
 */
import "dotenv/config";
import mariadb from "mariadb";

const host = process.env.DATABASE_HOST ?? "127.0.0.1";
const port = Number(process.env.DATABASE_PORT ?? 3306);
const user = process.env.DATABASE_USER;
const database = process.env.DATABASE_NAME;

console.log(`Conectando a ${user}@${host}:${port}/${database} ...`);

const faltan = ["DATABASE_USER", "DATABASE_PASSWORD", "DATABASE_NAME"].filter(
  (n) => !process.env[n]
);
if (faltan.length) {
  console.error(`\n✖ Faltan en el .env: ${faltan.join(", ")}`);
  process.exit(1);
}

/*
 * Prisma (migraciones) usa DATABASE_URL; la aplicación usa los
 * campos sueltos DATABASE_HOST/USER/PASSWORD... Si no coinciden,
 * las migraciones funcionan pero la aplicación no conecta.
 */
function compararConUrl() {
  const texto = process.env.DATABASE_URL;
  if (!texto) return;

  let url;
  try {
    url = new URL(texto);
  } catch {
    console.error("\n⚠ DATABASE_URL no tiene un formato válido (mysql://usuario:contraseña@host:puerto/base).");
    return;
  }

  const desdeUrl = {
    DATABASE_HOST: url.hostname,
    DATABASE_PORT: url.port || "3306",
    DATABASE_USER: decodeURIComponent(url.username),
    DATABASE_PASSWORD: decodeURIComponent(url.password),
    DATABASE_NAME: url.pathname.replace(/^\//, ""),
  };

  const sueltos = {
    DATABASE_HOST: host,
    DATABASE_PORT: String(port),
    DATABASE_USER: user ?? "",
    DATABASE_PASSWORD: process.env.DATABASE_PASSWORD ?? "",
    DATABASE_NAME: database ?? "",
  };

  const distintos = Object.keys(desdeUrl).filter(
    (clave) => desdeUrl[clave] !== sueltos[clave]
  );

  if (distintos.length === 0) {
    console.log("  (DATABASE_URL y los campos DATABASE_* coinciden)");
    return;
  }

  console.error("\n⚠ DATABASE_URL (usada por Prisma) y los campos sueltos (usados por la aplicación) NO coinciden en:");
  for (const clave of distintos) {
    if (clave === "DATABASE_PASSWORD") {
      const a = desdeUrl[clave];
      const b = sueltos[clave];
      console.error(`   - DATABASE_PASSWORD (longitud en la URL: ${a.length}, en DATABASE_PASSWORD: ${b.length}${a.trim() === b.trim() ? "; difieren solo en espacios" : ""})`);
    } else {
      console.error(`   - ${clave}: en la URL "${desdeUrl[clave]}", en ${clave} "${sueltos[clave]}"`);
    }
  }
  console.error("   Corrija el .env para que ambos usen los mismos datos.");
}

compararConUrl();

async function probar(allowPublicKeyRetrieval) {
  const conn = await mariadb.createConnection({
    host,
    port,
    user,
    password: process.env.DATABASE_PASSWORD,
    database,
    connectTimeout: 8000,
    allowPublicKeyRetrieval,
  });
  const [fila] = await conn.query(
    "SELECT VERSION() AS version, (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE()) AS tablas"
  );
  await conn.end();
  return fila;
}

try {
  const r = await probar(true);
  console.log(`\n✔ Conexión correcta. Servidor ${r.version}. Tablas en la base de datos: ${r.tablas}`);
  if (Number(r.tablas) === 0) {
    console.log("  La base de datos está vacía: ejecute  npx prisma migrate deploy");
  }
} catch (e) {
  console.error(`\n✖ No se puede conectar.\n  Código: ${e.code ?? "-"}\n  Mensaje: ${e.message}`);
  const pistas = {
    ER_ACCESS_DENIED_ERROR: "Usuario o contraseña incorrectos en el .env (o el usuario no existe para 127.0.0.1).",
    ER_BAD_DB_ERROR: "La base de datos indicada en DATABASE_NAME no existe.",
    ER_DBACCESS_DENIED_ERROR: "El usuario no tiene permisos sobre esa base de datos (falta el GRANT).",
    ECONNREFUSED: "MySQL no está arrancado o no escucha en ese puerto (Servicios de Windows → MySQL80).",
    ER_CONNECTION_TIMEOUT: "MySQL no responde: compruebe host, puerto y cortafuegos.",
  };
  const pista = pistas[e.code];
  if (pista) console.error(`\n  → ${pista}`);
  process.exit(1);
}
