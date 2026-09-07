"use client";

import {
  FormEvent,
  useState,
} from "react";

import Link from "next/link";
import { useParams } from "next/navigation";

export default function RestablecerClavePage() {
  const params = useParams<{
    token: string;
  }>();

  const token =
    typeof params?.token ===
    "string"
      ? params.token
      : "";

  const [
    cargando,
    setCargando,
  ] = useState(false);

  const [
    completado,
    setCompletado,
  ] = useState(false);

  const [
    mensaje,
    setMensaje,
  ] = useState("");

  const [
    esError,
    setEsError,
  ] = useState(false);

  async function restablecer(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setMensaje("");
    setEsError(false);
    setCargando(true);

    const form =
      new FormData(
        event.currentTarget
      );

    const password =
      String(
        form.get("password") ??
          ""
      );

    const passwordRepetida =
      String(
        form.get(
          "passwordRepetida"
        ) ??
          ""
      );

    if (
      password !==
      passwordRepetida
    ) {
      setEsError(true);
      setMensaje(
        "Las contraseñas no coinciden."
      );
      setCargando(false);
      return;
    }

    try {
      const respuesta =
        await fetch(
          "/api/recuperar-clave/restablecer",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify({
                token,
                password,
              }),
          }
        );

      const resultado =
        await respuesta.json();

      if (!respuesta.ok) {
        setEsError(true);
        setMensaje(
          resultado.error ??
            "No se ha podido cambiar la contraseña."
        );
        return;
      }

      setCompletado(true);
      setMensaje(
        "La contraseña se ha actualizado correctamente. Ya puede iniciar sesión con la nueva contraseña."
      );
    } catch {
      setEsError(true);
      setMensaje(
        "No se ha podido conectar con el servidor."
      );
    } finally {
      setCargando(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#eef1f5",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "30px 20px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "430px",
          background: "#ffffff",
          border: "1px solid #d8dee8",
          boxShadow:
            "0 8px 30px rgba(34, 45, 65, 0.08)",
        }}
      >
        <div
          style={{
            padding: "30px 32px 24px",
            borderBottom:
              "1px solid #e1e5eb",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              marginBottom: "22px",
            }}
          >
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "50%",
                background: "#e9423a",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffffff",
                fontWeight: 700,
                fontSize: "18px",
              }}
            >
              G
            </div>

            <div>
              <div
                style={{
                  fontWeight: 700,
                  color: "#29354a",
                  fontSize: "15px",
                }}
              >
                Gestor Becas
              </div>

              <div
                style={{
                  marginTop: "2px",
                  color: "#7b8798",
                  fontSize: "10px",
                }}
              >
                Segunda Oportunidad
              </div>
            </div>
          </div>

          <h1
            style={{
              margin: 0,
              color: "#2f3b52",
              fontSize: "22px",
            }}
          >
            Nueva contraseña
          </h1>

          <p
            style={{
              margin: "7px 0 0",
              color: "#7a879a",
              fontSize: "12px",
              lineHeight: 1.5,
            }}
          >
            Introduzca la nueva contraseña que desea utilizar.
          </p>
        </div>

        <div
          style={{
            padding: "26px 32px 30px",
          }}
        >
          {!completado ? (
            <form onSubmit={restablecer}>
              <label
                style={{
                  display: "flex",
                  flexDirection:
                    "column",
                  gap: "7px",
                }}
              >
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: 700,
                    color: "#566176",
                    textTransform:
                      "uppercase",
                  }}
                >
                  Nueva contraseña
                </span>

                <input
                  required
                  minLength={8}
                  type="password"
                  name="password"
                  autoComplete="new-password"
                  style={{
                    minHeight: "42px",
                    border:
                      "1px solid #cbd3df",
                    padding:
                      "0 11px",
                    fontSize: "13px",
                    outline: "none",
                  }}
                />
              </label>

              <label
                style={{
                  display: "flex",
                  flexDirection:
                    "column",
                  gap: "7px",
                  marginTop: "17px",
                }}
              >
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: 700,
                    color: "#566176",
                    textTransform:
                      "uppercase",
                  }}
                >
                  Repetir contraseña
                </span>

                <input
                  required
                  minLength={8}
                  type="password"
                  name="passwordRepetida"
                  autoComplete="new-password"
                  style={{
                    minHeight: "42px",
                    border:
                      "1px solid #cbd3df",
                    padding:
                      "0 11px",
                    fontSize: "13px",
                    outline: "none",
                  }}
                />
              </label>

              <div
                style={{
                  marginTop: "9px",
                  color: "#7a879a",
                  fontSize: "10px",
                  lineHeight: 1.5,
                }}
              >
                La contraseña debe tener al menos 8 caracteres.
              </div>

              {mensaje && (
                <div
                  style={{
                    marginTop: "17px",
                    padding:
                      "11px 13px",
                    border:
                      "1px solid #efb0aa",
                    background:
                      "#fff0ef",
                    color: "#b9362f",
                    fontSize: "11px",
                    lineHeight: 1.5,
                  }}
                >
                  {mensaje}
                </div>
              )}

              <button
                type="submit"
                disabled={
                  cargando ||
                  !token
                }
                style={{
                  width: "100%",
                  minHeight: "44px",
                  marginTop: "22px",
                  border: "none",
                  background:
                    "#e9423a",
                  color: "#ffffff",
                  fontSize: "11px",
                  fontWeight: 700,
                  cursor:
                    cargando ||
                    !token
                      ? "default"
                      : "pointer",
                }}
              >
                {cargando
                  ? "ACTUALIZANDO..."
                  : "GUARDAR NUEVA CONTRASEÑA"}
              </button>
            </form>
          ) : (
            <div
              style={{
                padding: "13px",
                border:
                  "1px solid #b8d9c2",
                background: "#f0faf3",
                color: "#2d6a3f",
                fontSize: "11px",
                lineHeight: 1.6,
              }}
            >
              {mensaje}
            </div>
          )}

          <div
            style={{
              marginTop: "20px",
              paddingTop: "18px",
              borderTop:
                "1px solid #e2e6ec",
              textAlign: "center",
            }}
          >
            <Link
              href="/login"
              style={{
                color: "#e9423a",
                fontSize: "11px",
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              Volver a iniciar sesión
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
