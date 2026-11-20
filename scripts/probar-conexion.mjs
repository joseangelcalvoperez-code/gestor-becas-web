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
