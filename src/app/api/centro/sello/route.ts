import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obtenerSesion } from "@/lib/session";

export const runtime = "nodejs";

const MAX_BYTES = 2 * 1024 * 1024;
const TIPOS = new Map([
  ["image/png", "png"],
  ["image/jpeg", "jpg"],
]);

export async function GET() {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ ok: false, error: "No hay una sesión activa." }, { status: 401 });

  const centro = await prisma.centro.findFirst({
    where: { id: sesion.centroId, activo: true },
    select: { selloFirmaUrl: true },
  });
  if (!centro?.selloFirmaUrl) return NextResponse.json({ ok: false, error: "El centro no tiene sello configurado." }, { status: 404 });

  const ruta = resolverRutaSello(centro.selloFirmaUrl, sesion.centroId);
  try {
    const bytes = await readFile(ruta);
    const contentType = centro.selloFirmaUrl.endsWith(".png") ? "image/png" : "image/jpeg";
    return new Response(bytes, { headers: { "Content-Type": contentType, "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ ok: false, error: "No se ha encontrado el archivo del sello." }, { status: 404 });
  }
}

export async function POST(request: Request) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ ok: false, error: "No hay una sesión activa." }, { status: 401 });

  const formData = await request.formData();
  const archivo = formData.get("sello");
  if (!(archivo instanceof File)) return NextResponse.json({ ok: false, error: "Debe seleccionar una imagen de sello." }, { status: 400 });
  const extension = TIPOS.get(archivo.type);
  if (!extension) return NextResponse.json({ ok: false, error: "El sello debe ser una imagen PNG o JPG." }, { status: 400 });
  if (archivo.size === 0 || archivo.size > MAX_BYTES) return NextResponse.json({ ok: false, error: "El sello debe ocupar como máximo 2 MB." }, { status: 400 });

  const bytes = Buffer.from(await archivo.arrayBuffer());
  if (!firmaImagenValida(bytes, extension)) return NextResponse.json({ ok: false, error: "El contenido del archivo no corresponde a una imagen válida." }, { status: 400 });

  const carpeta = path.join(process.cwd(), "storage", "centros", `centro_${sesion.centroId}`);
  const key = normalizar(path.join("storage", "centros", `centro_${sesion.centroId}`, `sello.${extension}`));
  await mkdir(carpeta, { recursive: true });
  await Promise.all(["png", "jpg"].filter((ext) => ext !== extension).map((ext) => rm(path.join(carpeta, `sello.${ext}`), { force: true })));
  await writeFile(path.join(carpeta, `sello.${extension}`), bytes);
  await prisma.centro.update({ where: { id: sesion.centroId }, data: { selloFirmaUrl: key } });

  return NextResponse.json({ ok: true, selloConfigurado: true });
}

function resolverRutaSello(key: string, centroId: number) {
  const raiz = path.resolve(process.cwd(), "storage", "centros", `centro_${centroId}`);
  const ruta = path.resolve(process.cwd(), key);
  if (!ruta.startsWith(`${raiz}${path.sep}`)) throw new Error("Ruta de sello no válida.");
  return ruta;
}

function firmaImagenValida(bytes: Buffer, extension: string) {
  if (extension === "png") return bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[bytes.length - 2] === 0xff && bytes[bytes.length - 1] === 0xd9;
}

function normalizar(valor: string) { return valor.replaceAll("\\", "/"); }
