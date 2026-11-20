/*
 * GESTIÓN DE CONTRASEÑAS (uso exclusivo del administrador)
 *
 * Se ejecuta en el servidor de la aplicación, con acceso a la base de
 * datos (.env). No se conecta a ningún servicio externo ni envía correos.
 *
 *   Ver solicitudes pendientes hechas desde «¿Ha olvidado su contraseña?»:
 *     npm run clave:solicitudes
 *
 *   Generar una contraseña provisional para un usuario:
 *     npm run clave:restablecer -- correo@centro.es
 *     npm run clave:restablecer -- correo@centro.es --horas 48 --si
 *
 * La contraseña provisional:
 *   - es aleatoria (generador criptográfico) y solo se muestra una vez;
 *   - caduca a las 72 horas (o las indicadas con --horas, máx. 168);
 *   - obliga a establecer una contraseña personal al entrar;
 *   - cierra todas las sesiones abiertas de ese usuario.
 * Comuníquela al centro por un canal oficial (teléfono, correo
 * corporativo...), nunca junto con el correo de acceso en el mismo mensaje.
 */
import "dotenv/config";
import { randomInt } from "crypto";
import readline from "readline/promises";
import { stdin, stdout } from "process";
import bcrypt from "bcryptjs";
import mariadb from "mariadb";

/* ---------- Contraseña provisional (misma regla que src/lib/clave.ts) ---------- */

const ALFABETO = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";

function generarClaveProvisional() {
  for (;;) {
    const clave = Array.from({ length: 3 }, () =>
      Array.from({ length: 4 }, () => ALFABETO[randomInt(ALFABETO.length)]).join("")
    ).join("-");

    if (/\d/.test(clave) && /[A-Z]/.test(clave) && /[a-z]/.test(clave)) return clave;
  }
}

/* ---------- Conexión (mismos parámetros que la aplicación) ---------- */

async function conectar() {
  const host = process.env.DATABASE_HOST ?? "127.0.0.1";
  const local = ["127.0.0.1", "localhost", "::1"].includes(host);
  const clavePublica = process.env.DATABASE_ALLOW_PUBLIC_KEY_RETRIEVAL;

  return mariadb.createConnection({
    host,
    port: Number(process.env.DATABASE_PORT ?? 3306),
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    allowPublicKeyRetrieval: clavePublica ? clavePublica === "1" || clavePublica === "true" : local,
    ...(process.env.DATABASE_SSL === "1"
      ? { ssl: { rejectUnauthorized: process.env.DATABASE_SSL_VERIFY === "1" } }
      : {}),
    // Las fechas se guardan en UTC, igual que Prisma
    timezone: "Z",
  });
}

const fecha = (d) =>
  d ? new Date(d).toLocaleString("es-ES", { timeZone: "Europe/Madrid", dateStyle: "short", timeStyle: "short" }) : "-";

/* ---------- Comandos ---------- */

async function listarSolicitudes(conn) {
  const filas = await conn.query(`
    SELECT s.created_at, u.email, u.nombre, c.nombre AS centro, c.codigo
    FROM solicitudes_restablecimiento s
    JOIN usuarios u ON u.id = s.usuario_id
    JOIN centros c ON c.id = u.centro_id
    WHERE s.atendida_at IS NULL
    ORDER BY s.created_at`);

  if (filas.length === 0) {
    console.log("\nNo hay solicitudes de restablecimiento pendientes.\n");
    return;
  }

  console.log(`\nSolicitudes pendientes (${filas.length}):\n`);
  console.table(
    filas.map((f) => ({
      Fecha: fecha(f.created_at),
      Correo: f.email,
      Responsable: f.nombre,
      Centro: f.centro,
      Código: f.codigo,
    }))
  );
  console.log("Para atender una:  npm run clave:restablecer -- CORREO\n");
}

async function restablecer(conn, email, horas, sinConfirmar) {
  const [usuario] = await conn.query(
    `SELECT u.id, u.email, u.nombre, u.activo, c.nombre AS centro, c.codigo, c.activo AS centro_activo
     FROM usuarios u JOIN centros c ON c.id = u.centro_id
     WHERE u.email = ?`,
    [email]
  );

  if (!usuario) {
    console.error(`\n✖ No existe ningún usuario con el correo ${email}.\n`);
    process.exitCode = 1;
    return;
  }

  console.log(`\nUsuario:  ${usuario.nombre} <${usuario.email}>`);
  console.log(`Centro:   ${usuario.centro} (código ${usuario.codigo})`);

  if (!usuario.activo || !usuario.centro_activo) {
    console.error("\n✖ El usuario o su centro están desactivados. No se restablece la contraseña.\n");
    process.exitCode = 1;
    return;
  }

  if (!sinConfirmar) {
    const rl = readline.createInterface({ input: stdin, output: stdout });
    const respuesta = await rl.question(
      `\nSe generará una contraseña provisional válida ${horas} h y se cerrarán sus sesiones abiertas. ¿Continuar? (s/N) `
    );
    rl.close();

    if (!/^s(i|í)?$/i.test(respuesta.trim())) {
      console.log("Operación cancelada.\n");
      return;
    }
  }

  const provisional = generarClaveProvisional();
  const hash = await bcrypt.hash(provisional, 12);

  await conn.beginTransaction();

  try {
    await conn.query(
      `UPDATE usuarios
         SET password_hash = ?,
             debe_cambiar_clave = 1,
             clave_temporal_expira = UTC_TIMESTAMP(3) + INTERVAL ? HOUR,
             clave_actualizada_at = UTC_TIMESTAMP(),
             updated_at = UTC_TIMESTAMP(3)
       WHERE id = ?`,
      [hash, horas, usuario.id]
    );

    const res = await conn.query(
      `UPDATE solicitudes_restablecimiento SET atendida_at = UTC_TIMESTAMP(3)
       WHERE usuario_id = ? AND atendida_at IS NULL`,
      [usuario.id]
    );

    await conn.commit();

    const [{ expira }] = await conn.query(`SELECT clave_temporal_expira AS expira FROM usuarios WHERE id = ?`, [usuario.id]);

    console.log("\n✔ Contraseña provisional generada (no se volverá a mostrar):\n");
    console.log(`      ${provisional}\n`);
    console.log(`  Caduca: ${fecha(expira)} (hora peninsular)`);
    if (res.affectedRows > 0) console.log(`  Solicitudes marcadas como atendidas: ${res.affectedRows}`);
    console.log("\n  Comuníquela al centro por un canal oficial. Al entrar se le pedirá una contraseña nueva.\n");
  } catch (error) {
    await conn.rollback();
    throw error;
  }
}

/* ---------- Entrada ---------- */

const [comando, ...resto] = process.argv.slice(2);

const ayuda = `
Uso:
  npm run clave:solicitudes
  npm run clave:restablecer -- correo@centro.es [--horas 72] [--si]
`;

let conn;

try {
  if (comando === "solicitudes") {
    conn = await conectar();
    await listarSolicitudes(conn);
  } else if (comando === "restablecer") {
    const email = resto.find((a) => !a.startsWith("--"))?.trim().toLowerCase();
    const iHoras = resto.indexOf("--horas");
    const horas = iHoras >= 0 ? Number(resto[iHoras + 1]) : 72;

    if (!email || !email.includes("@")) {
      console.error("\n✖ Indique el correo del usuario." + ayuda);
      process.exitCode = 1;
    } else if (!Number.isInteger(horas) || horas < 1 || horas > 168) {
      console.error("\n✖ --horas debe ser un número entero entre 1 y 168.\n");
      process.exitCode = 1;
    } else {
      conn = await conectar();
      await restablecer(conn, email, horas, resto.includes("--si"));
    }
  } else {
    console.log(ayuda);
  }
} catch (error) {
  console.error(`\n✖ Error: ${error.message}\n  Compruebe la conexión con:  npm run probar:bd\n`);
  process.exitCode = 1;
} finally {
  await conn?.end();
}
