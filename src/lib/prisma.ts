import {
  PrismaClient,
} from "@/generated/prisma/client";

import {
  PrismaMariaDb,
} from "@prisma/adapter-mariadb";

/* =========================================================
   CLIENTE PRISMA (SINGLETON POR PROCESO)

   Pool de conexiones dimensionado para uso simultáneo por
   todos los centros. Antes estaba fijado en 5 conexiones,
   lo que provocaba colas en horas punta.

   Regla orientativa:
     DATABASE_POOL_SIZE × nº de procesos Node
       < max_connections de MySQL (dejando margen).
   ========================================================= */

function enteroEntorno(
  nombre: string,
  porDefecto: number
) {
  const valor = Number(process.env[nombre]);

  return Number.isInteger(valor) && valor > 0
    ? valor
    : porDefecto;
}

const globalForPrisma =
  globalThis as unknown as {
    prisma:
      | PrismaClient
      | undefined;
  };

/*
 * MySQL 8 autentica por defecto con caching_sha2_password.
 * Sin SSL, el conector necesita pedir la clave pública al
 * servidor; si no se permite, TODAS las conexiones fallan y
 * el error que se ve es "pool timeout ... active=0 idle=0".
 *
 * Se permite por defecto con base de datos local. En un
 * servidor remoto se recomienda SSL; se puede forzar con
 * DATABASE_ALLOW_PUBLIC_KEY_RETRIEVAL=1 o desactivar con =0.
 */
function permitirClavePublica(host: string) {
  const valor =
    process.env.DATABASE_ALLOW_PUBLIC_KEY_RETRIEVAL;

  if (valor === "1" || valor === "true") {
    return true;
  }

  if (valor === "0" || valor === "false") {
    return false;
  }

  return ["127.0.0.1", "localhost", "::1"].includes(host);
}

function crearCliente() {
  const host =
    process.env.DATABASE_HOST ??
    "127.0.0.1";

  const adapter =
    new PrismaMariaDb({
      host,

      allowPublicKeyRetrieval:
        permitirClavePublica(host),

      port: enteroEntorno(
        "DATABASE_PORT",
        3306
      ),

      user:
        process.env.DATABASE_USER,

      password:
        process.env.DATABASE_PASSWORD,

      database:
        process.env.DATABASE_NAME,

      connectionLimit: enteroEntorno(
        "DATABASE_POOL_SIZE",
        20
      ),

      /*
       * Tiempo máximo esperando una conexión libre del pool
       * antes de devolver error (en lugar de colgarse).
       */
      acquireTimeout: enteroEntorno(
        "DATABASE_ACQUIRE_TIMEOUT_MS",
        15000
      ),

      connectTimeout: 10000,

      /*
       * Cierra conexiones ociosas para no agotar
       * max_connections del servidor MySQL.
       */
      idleTimeout: 60,

      minimumIdle: 2,
    });

  return new PrismaClient({
    adapter,
  });
}

/*
 * Se reutiliza también en producción: evita crear pools
 * duplicados si el módulo se evalúa más de una vez.
 */
export const prisma =
  globalForPrisma.prisma ??
  crearCliente();

globalForPrisma.prisma = prisma;
