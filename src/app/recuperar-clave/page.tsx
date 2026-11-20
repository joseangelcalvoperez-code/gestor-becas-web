"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

import PanelAcceso from "@/components/PanelAcceso";

const SOPORTE = process.env.NEXT_PUBLIC_SOPORTE_CONTACTO ?? "";

export default function RecuperarClavePage() {
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [confirmacion, setConfirmacion] = useState("");

  const enviar = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    const datos = new FormData(event.currentTarget);

    try {
      setEnviando(true);

      const respuesta = await fetch("/api/recuperar-clave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: datos.get("email"),
          codigoCentro: datos.get("codigoCentro"),
        }),
      });

      const resultado = await respuesta.json();

      if (!respuesta.ok) {
        setError(resultado.error ?? "No se ha podido registrar la solicitud.");
        return;
      }

      setConfirmacion(resultado.mensaje);
    } catch {
      setError("No se ha podido conectar con el servidor.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <main className="cm-acceso">
      <PanelAcceso />

      <section className="cm-acceso-formulario">
        <div className="cm-acceso-tarjeta">
          <h1>Restablecer contraseña</h1>

          <p className="cm-subtitulo">
            Indique el correo de acceso y el código de su centro. El servicio de soporte le
            facilitará una <b>contraseña provisional</b>, que deberá cambiar al entrar.
          </p>

          {confirmacion ? (
            <div style={{ marginTop: "24px", display: "grid", gap: "16px" }}>
              <div className="cm-alerta cm-alerta-exito" role="status">
                {confirmacion}
              </div>

              {SOPORTE && (
                <p style={{ fontSize: "14px", color: "var(--cm-texto-2)" }}>
                  Contacto de soporte: <b>{SOPORTE}</b>
                </p>
              )}

              <Link href="/login" className="cm-btn cm-btn-secundario cm-btn-bloque">
                Volver al inicio de sesión
              </Link>
            </div>
          ) : (
            <form onSubmit={enviar} style={{ marginTop: "24px", display: "grid", gap: "18px" }}>
              <label className="cm-campo">
                <span>Correo electrónico de acceso</span>
                <input
                  required
                  type="email"
                  name="email"
                  autoComplete="email"
                  className="cm-input"
                  placeholder="usuario@centro.es"
                />
              </label>

              <label className="cm-campo">
                <span>Código de centro</span>
                <input
                  required
                  name="codigoCentro"
                  inputMode="numeric"
                  className="cm-input"
                  placeholder="28000000"
                />
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
                {enviando ? "Enviando…" : "Solicitar restablecimiento"}
              </button>

              <div style={{ textAlign: "center", fontSize: "14px" }}>
                <Link href="/login" style={{ color: "var(--cm-texto-3)", textDecoration: "underline" }}>
                  Volver al inicio de sesión
                </Link>
              </div>

              {SOPORTE && (
                <p style={{ fontSize: "13px", color: "var(--cm-texto-3)", textAlign: "center" }}>
                  Soporte: {SOPORTE}
                </p>
              )}
            </form>
          )}
        </div>
      </section>
    </main>
  );
}
