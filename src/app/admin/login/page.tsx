"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import PanelAcceso from "@/components/PanelAcceso";

export default function AccesoAdministracionPage() {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");

  const entrar = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    const datos = new FormData(event.currentTarget);

    try {
      setEnviando(true);

      const respuesta = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: datos.get("email"), password: datos.get("password") }),
      });

      const resultado = await respuesta.json();

      if (!respuesta.ok) {
        setError(resultado.error ?? "No se ha podido iniciar sesión.");
        return;
      }

      router.push(resultado.cambioClave ? "/admin/cambiar-clave" : "/admin");
      router.refresh();
    } catch {
      setError("No se ha podido conectar con el servidor.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <main className="cm-acceso">
      <PanelAcceso administracion />

      <section className="cm-acceso-formulario">
        <div className="cm-acceso-tarjeta">
          <span className="cm-insignia cm-insignia-oscura">Administración</span>

          <h1 style={{ marginTop: "12px" }}>Acceso de administración</h1>

          <p className="cm-subtitulo">
            Para el personal de soporte de la plataforma. Los centros acceden desde la página principal.
          </p>

          <form onSubmit={entrar} style={{ marginTop: "24px", display: "grid", gap: "18px" }}>
            <label className="cm-campo">
              <span>Correo electrónico</span>
              <input required type="email" name="email" autoComplete="username" className="cm-input" />
            </label>

            <label className="cm-campo">
              <span>Contraseña</span>
              <input required type="password" name="password" autoComplete="current-password" className="cm-input" />
            </label>

            {error && (
              <div className="cm-alerta cm-alerta-error" role="alert">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={enviando}
              className="cm-btn cm-btn-primario cm-btn-bloque"
              style={{ minHeight: "46px", fontSize: "15px" }}
            >
              {enviando ? "Entrando…" : "Entrar"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
