"use client";

import {
  FormEvent,
  useState,
} from "react";

import Link from "next/link";

import PanelAcceso from "@/components/PanelAcceso";

import {
  useRouter,
} from "next/navigation";

export default function LoginPage() {
  const router =
    useRouter();

  const [
    cargando,
    setCargando,
  ] =
    useState(
      false
    );

  const [
    mensaje,
    setMensaje,
  ] =
    useState(
      ""
    );

  const iniciarSesion =
    async (
      event:
        FormEvent<HTMLFormElement>
    ) => {
      event.preventDefault();

      setMensaje("");
      setCargando(true);

      const formulario =
        event.currentTarget;

      const form =
        new FormData(
          formulario
        );

      const email =
        String(
          form.get(
            "email"
          ) ??
            ""
        );

      const password =
        String(
          form.get(
            "password"
          ) ??
            ""
        );

      try {
        const respuesta =
          await fetch(
            "/api/login",
            {
              method:
                "POST",

              credentials:
                "include",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify({
                  email,
                  password,
                }),
            }
          );

        const resultado =
          await respuesta.json();

        if (
          !respuesta.ok
        ) {
          setMensaje(
            resultado.error ??
              "No se ha podido iniciar sesión."
          );

          return;
        }

        router.push(
          "/inicio"
        );

        router.refresh();
      } catch {
        setMensaje(
          "No se ha podido conectar con el servidor."
        );
      } finally {
        setCargando(
          false
        );
      }
    };

  return (
    <main className="cm-acceso">
      <PanelAcceso />

      <section className="cm-acceso-formulario">
        <div className="cm-acceso-tarjeta">
          <h1>Iniciar sesión</h1>

          <p className="cm-subtitulo">
            Acceda al espacio de gestión de su centro con su
            cuenta de usuario.
          </p>

          <form
            onSubmit={
              iniciarSesion
            }
            style={{
              marginTop: "26px",
              display: "grid",
              gap: "18px",
            }}
          >
            <label className="cm-campo">
              <span>Correo electrónico</span>

              <input
                required
                type="email"
                name="email"
                autoComplete="email"
                inputMode="email"
                className="cm-input"
                placeholder="usuario@centro.es"
              />
            </label>

            <label className="cm-campo">
              <span>Contraseña</span>

              <input
                required
                type="password"
                name="password"
                autoComplete="current-password"
                className="cm-input"
              />
            </label>

            {mensaje && (
              <div
                className="cm-alerta cm-alerta-error"
                role="alert"
              >
                {mensaje}
              </div>
            )}

            <button
              type="submit"
              disabled={
                cargando
              }
              className="cm-btn cm-btn-primario cm-btn-bloque"
              style={{
                minHeight: "46px",
                fontSize: "15px",
              }}
            >
              {cargando
                ? "Iniciando sesión…"
                : "Iniciar sesión"}
            </button>
          </form>

          <div
            style={{
              marginTop: "24px",
              paddingTop: "18px",
              borderTop:
                "1px solid var(--cm-borde)",
              fontSize: "14px",
              color: "var(--cm-texto-3)",
              textAlign: "center",
            }}
          >
            ¿Su centro todavía no tiene una cuenta?{" "}
            <Link
              href="/registro"
              style={{
                color: "var(--cm-rojo)",
                fontWeight: 700,
                textDecoration: "underline",
                textUnderlineOffset: "3px",
              }}
            >
              Solicitar alta del centro
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
