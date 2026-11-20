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

async function probar(opciones) {
  const conn = await mariadb.createConnection({
    host,
    port,
    user,
    password: process.env.DATABASE_PASSWORD,
    database,
    connectTimeout: 8000,
    ...opciones,
  });
  const [fila] = await conn.query(
    "SELECT VERSION() AS version, CURRENT_USER() AS cuenta, (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE()) AS tablas"
  );
  let plugin = "";
  try {
    const [p] = await conn.query(
      "SELECT plugin FROM mysql.user WHERE CONCAT(user, '@', host) = CURRENT_USER()"
    );
    plugin = p?.plugin ?? "";
  } catch {
    // Sin permiso para leer mysql.user: no es necesario.
  }
  await conn.end();
  return { ...fila, plugin };
}

/*
 * Se prueban varias formas de conexión para distinguir:
 *  - contraseña realmente incorrecta (fallan todas), o
 *  - problema de autenticación de MySQL 8 sin cifrar (funciona con SSL).
 */
const variantes = [
  {
    nombre: "Configuración de la aplicación (sin SSL)",
    opciones: { allowPublicKeyRetrieval: true },
    env: process.env.DATABASE_SSL === "1" ? null : "",
  },
  {
    nombre: "Con SSL (conexión cifrada)",
    opciones: { allowPublicKeyRetrieval: true, ssl: { rejectUnauthorized: false } },
    env: 'DATABASE_SSL="1"',
  },
];

let correcta = null;
const errores = [];

for (const variante of variantes) {
  try {
    const r = await probar(variante.opciones);
    console.log(`\n✔ ${variante.nombre}: conexión correcta.`);
    console.log(`  Servidor ${r.version} · cuenta ${r.cuenta}${r.plugin ? ` · autenticación ${r.plugin}` : ""} · tablas: ${r.tablas}`);
    correcta = { variante, r };
    break;
  } catch (e) {
    errores.push(e);
    console.error(`\n✖ ${variante.nombre}: ${e.code ?? "-"}\n  ${e.message}`);
  }
}

if (correcta) {
  if (correcta.variante.env) {
    console.log(`\n→ SOLUCIÓN: añada esta línea al .env y reinicie la aplicación:\n\n    ${correcta.variante.env}\n`);
  } else if (process.env.DATABASE_SSL === "1") {
    console.log("\n  (El .env ya tiene DATABASE_SSL=\"1\".)");
  }
  if (Number(correcta.r.tablas) === 0) {
    console.log("  La base de datos está vacía: ejecute  npx prisma migrate deploy");
  }
} else {
  const e = errores[0];
  const pistas = {
    ER_ACCESS_DENIED_ERROR:
      "MySQL rechaza el usuario/contraseña con TODAS las formas de conexión: la contraseña del usuario en MySQL\n    no es la del .env. Restablézcala como root (ver docs/INSTALACION_LOCAL.md, problemas frecuentes):\n\n    ALTER USER 'USUARIO'@'localhost' IDENTIFIED BY 'CLAVE_DEL_ENV';\n    ALTER USER 'USUARIO'@'127.0.0.1' IDENTIFIED BY 'CLAVE_DEL_ENV';\n    FLUSH PRIVILEGES;",
    ER_BAD_DB_ERROR: "La base de datos indicada en DATABASE_NAME no existe.",
    ER_DBACCESS_DENIED_ERROR: "El usuario no tiene permisos sobre esa base de datos (falta el GRANT).",
    ECONNREFUSED: "MySQL no está arrancado o no escucha en ese puerto (Servicios de Windows → MySQL80).",
    ER_CONNECTION_TIMEOUT: "MySQL no responde: compruebe host, puerto y cortafuegos.",
  };
  const pista = pistas[e.code];
  console.error(`\n→ ${pista ?? "Revise los datos de conexión del .env."}`);
  process.exit(1);
}
