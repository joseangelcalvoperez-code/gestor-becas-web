import type { Metadata } from "next";
import { redirect } from "next/navigation";

import PanelAcceso from "@/components/PanelAcceso";
import FormularioCambioClave from "@/components/FormularioCambioClave";
import { estadoSesionAdmin } from "@/lib/sesionAdmin";
import { DESCRIPCION_POLITICA_CLAVE } from "@/lib/clave";

export const metadata: Metadata = { title: "Contraseña de administración" };

export default async function CambiarClaveAdminPage() {
  const estado = await estadoSesionAdmin();

  if (estado.tipo === "ninguna") redirect("/admin/login");

  const obligatorio = estado.tipo === "cambio-clave";

  return (
    <main className="cm-acceso">
      <PanelAcceso administracion />

      <section className="cm-acceso-formulario">
        <div className="cm-acceso-tarjeta">
          <span className="cm-insignia cm-insignia-oscura">Administración</span>

          <h1 style={{ marginTop: "12px" }}>
            {obligatorio ? "Establezca su contraseña" : "Cambiar contraseña"}
          </h1>

          <p className="cm-subtitulo">
            {obligatorio
              ? "Ha accedido con una contraseña provisional. Sustitúyala por una contraseña personal para continuar."
              : `Usuario: ${estado.sesion.email}`}
          </p>

          <FormularioCambioClave
            obligatorio={obligatorio}
            politica={DESCRIPCION_POLITICA_CLAVE}
            endpoint="/api/admin/cambiar-clave"
            destino="/admin"
            endpointSalida="/api/admin/logout"
            rutaAcceso="/admin/login"
          />
        </div>
      </section>
    </main>
  );
}
