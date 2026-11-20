import type { Metadata } from "next";
import { redirect } from "next/navigation";

import PanelAcceso from "@/components/PanelAcceso";
import FormularioCambioClave from "@/components/FormularioCambioClave";
import { estadoSesion } from "@/lib/session";
import { DESCRIPCION_POLITICA_CLAVE } from "@/lib/clave";

export const metadata: Metadata = {
  title: "Cambiar contraseña",
};

export default async function CambiarClavePage() {
  const estado = await estadoSesion();

  if (estado.tipo === "ninguna") {
    redirect("/login");
  }

  const obligatorio = estado.tipo === "cambio-clave";

  return (
    <main className="cm-acceso">
      <PanelAcceso />

      <section className="cm-acceso-formulario">
        <div className="cm-acceso-tarjeta">
          <h1>{obligatorio ? "Establezca su contraseña" : "Cambiar contraseña"}</h1>

          <p className="cm-subtitulo">
            {obligatorio
              ? "Ha accedido con una contraseña provisional. Para continuar debe sustituirla por una contraseña personal."
              : `Usuario: ${estado.sesion.email}`}
          </p>

          <FormularioCambioClave
            obligatorio={obligatorio}
            politica={DESCRIPCION_POLITICA_CLAVE}
          />
        </div>
      </section>
    </main>
  );
}
