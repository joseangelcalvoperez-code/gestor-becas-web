"use client";

import {
  FormEvent,
  useState,
} from "react";

import Link from "next/link";

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

      const codigoCentro =
        String(
          form.get(
            "codigoCentro"
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
                  codigoCentro,
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
    <main
      style={{
        minHeight:
          "100vh",

        background:
          "#eef1f5",

        display:
          "flex",

        alignItems:
          "center",

        justifyContent:
          "center",

        padding:
          "30px 20px",
      }}
    >
      <div
        style={{
          width:
            "100%",

          maxWidth:
            "430px",

          background:
            "#ffffff",

          border:
            "1px solid #d8dee8",

          boxShadow:
            "0 8px 30px rgba(34, 45, 65, 0.08)",
        }}
      >
        {/* CABECERA */}

        <div
          style={{
            padding:
              "30px 32px 24px",

            borderBottom:
              "1px solid #e1e5eb",
          }}
        >
          <div
            style={{
              display:
                "flex",

              alignItems:
                "center",

              gap:
                "12px",

              marginBottom:
                "22px",
            }}
          >
            <div
              style={{
                width:
                  "42px",

                height:
                  "42px",

                borderRadius:
                  "50%",

                background:
                  "#e9423a",

                display:
                  "flex",

                alignItems:
                  "center",

                justifyContent:
                  "center",

                color:
                  "#ffffff",

                fontWeight:
                  700,

                fontSize:
                  "18px",
              }}
            >
              G
            </div>

            <div>
              <div
                style={{
                  fontWeight:
                    700,

                  color:
                    "#29354a",

                  fontSize:
                    "15px",
                }}
              >
                Gestor Becas
              </div>

              <div
                style={{
                  marginTop:
                    "2px",

                  color:
                    "#7b8798",

                  fontSize:
                    "10px",
                }}
              >
                Segunda Oportunidad
              </div>
            </div>
          </div>

          <h1
            style={{
              margin:
                0,

              color:
                "#2f3b52",

              fontSize:
                "22px",
            }}
          >
            Iniciar sesión
          </h1>

          <p
            style={{
              margin:
                "7px 0 0",

              color:
                "#7a879a",

              fontSize:
                "12px",

              lineHeight:
                1.5,
            }}
          >
            Acceda al espacio de gestión
            de su centro.
          </p>
        </div>

        {/* FORMULARIO */}

        <form
          onSubmit={
            iniciarSesion
          }

          style={{
            padding:
              "26px 32px 30px",
          }}
        >
          <label
            style={{
              display:
                "flex",

              flexDirection:
                "column",

              gap:
                "7px",
            }}
          >
            <span
              style={{
                fontSize:
                  "10px",

                fontWeight:
                  700,

                color:
                  "#566176",

                textTransform:
                  "uppercase",
              }}
            >
              Email
            </span>

            <input
              required
              type="email"
              name="email"
              autoComplete="email"

              style={{
                minHeight:
                  "42px",

                border:
                  "1px solid #cbd3df",

                padding:
                  "0 11px",

                fontSize:
                  "13px",

                outline:
                  "none",
              }}
            />
          </label>

          <label
            style={{
              display:
                "flex",

              flexDirection:
                "column",

              gap:
                "7px",

              marginTop:
                "17px",
            }}
          >
            <span
              style={{
                fontSize:
                  "10px",

                fontWeight:
                  700,

                color:
                  "#566176",

                textTransform:
                  "uppercase",
              }}
            >
              Código de centro
            </span>

            <input
              required
              type="text"
              name="codigoCentro"
              autoComplete="off"

              style={{
                minHeight:
                  "42px",

                border:
                  "1px solid #cbd3df",

                padding:
                  "0 11px",

                fontSize:
                  "13px",

                outline:
                  "none",
              }}
            />
          </label>

          <label
            style={{
              display:
                "flex",

              flexDirection:
                "column",

              gap:
                "7px",

              marginTop:
                "17px",
            }}
          >
            <span
              style={{
                fontSize:
                  "10px",

                fontWeight:
                  700,

                color:
                  "#566176",

                textTransform:
                  "uppercase",
              }}
            >
              Contraseña
            </span>

            <input
              required
              type="password"
              name="password"
              autoComplete="current-password"

              style={{
                minHeight:
                  "42px",

                border:
                  "1px solid #cbd3df",

                padding:
                  "0 11px",

                fontSize:
                  "13px",

                outline:
                  "none",
              }}
            />
          </label>

          <div
            style={{
              marginTop:
                "10px",

              textAlign:
                "right",
            }}
          >
            <Link
              href="/recuperar-clave"

              style={{
                color:
                  "#e9423a",

                fontSize:
                  "11px",

                fontWeight:
                  700,

                textDecoration:
                  "none",
              }}
            >
              ¿Ha olvidado su contraseña?
            </Link>
          </div>

          {mensaje && (
            <div
              style={{
                marginTop:
                  "17px",

                padding:
                  "11px 13px",

                border:
                  "1px solid #efb0aa",

                background:
                  "#fff0ef",

                color:
                  "#b9362f",

                fontSize:
                  "11px",

                lineHeight:
                  1.5,
              }}
            >
              {
                mensaje
              }
            </div>
          )}

          <button
            type="submit"

            disabled={
              cargando
            }

            style={{
              width:
                "100%",

              minHeight:
                "44px",

              marginTop:
                "22px",

              border:
                "none",

              background:
                "#e9423a",

              color:
                "#ffffff",

              fontSize:
                "11px",

              fontWeight:
                700,

              cursor:
                cargando
                  ? "default"
                  : "pointer",
            }}
          >
            {cargando
              ? "INICIANDO SESIÓN..."
              : "INICIAR SESIÓN"}
          </button>

          <div
            style={{
              marginTop:
                "20px",

              paddingTop:
                "18px",

              borderTop:
                "1px solid #e2e6ec",

              textAlign:
                "center",
            }}
          >
            <span
              style={{
                fontSize:
                  "11px",

                color:
                  "#7a879a",
              }}
            >
              ¿Su centro todavía no tiene
              una cuenta?{" "}
            </span>

            <Link
              href="/registro"

              style={{
                color:
                  "#e9423a",

                fontSize:
                  "11px",

                fontWeight:
                  700,

                textDecoration:
                  "none",
              }}
            >
              Crear cuenta
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}