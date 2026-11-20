import type { Metadata } from "next";
import { redirect } from "next/navigation";

import PanelAdministracion from "@/components/PanelAdministracion";
import { estadoSesionAdmin } from "@/lib/sesionAdmin";

export const metadata: Metadata = { title: "Administración" };

export const dynamic = "force-dynamic";

export default async function AdministracionPage() {
  const estado = await estadoSesionAdmin();

  if (estado.tipo === "ninguna") redirect("/admin/login");
  if (estado.tipo === "cambio-clave") redirect("/admin/cambiar-clave");

  return <PanelAdministracion nombre={estado.sesion.nombre} email={estado.sesion.email} />;
}
