import { NextResponse } from "next/server";

import { eliminarSesionAdmin } from "@/lib/sesionAdmin";

export async function POST() {
  await eliminarSesionAdmin();
  return NextResponse.json({ ok: true });
}
