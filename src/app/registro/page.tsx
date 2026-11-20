"use client";

import LogotipoInstitucional from "@/components/LogotipoInstitucional";
import { MARCA } from "@/lib/marca";

import {
  FormEvent,
  useState,
} from "react";

import Link from "next/link";

export default function RegistroPage() {
  const [
    cargando,
    setCargando,
  ] = useState(false);

  const [
    mensaje,
    setMensaje,
  ] = useState("");

  const [
    tipoMensaje,
    setTipoMensaje,
  ] =
    useState<
      "success" | "error" | ""
    >("");

const enviarFormulario = async (
  event: FormEvent<HTMLFormElement>
) => {
  event.preventDefault();

  // Guardamos la referencia al formulario antes de los await
  const formulario = event.currentTarget;

  setMensaje("");
  setTipoMensaje("");
  setCargando(true);

  const form = new FormData(formulario);

      const datos = {
        nombreCentro:
          form.get(
            "nombreCentro"
          ),

        codigoCentro:
          form.get(
            "codigoCentro"
          ),

        cif:
          form.get(
            "cif"
          ),

        direccion:
          form.get(
            "direccion"
          ),

        localidad:
          form.get(
            "localidad"
          ),

        provincia:
          form.get(
            "provincia"
          ),

        telefono:
          form.get(
            "telefono"
          ),

        emailCentro:
          form.get(
            "emailCentro"
          ),

        nombreResponsable:
          form.get(
            "nombreResponsable"
          ),

        emailAcceso:
          form.get(
            "emailAcceso"
          ),

        password:
          form.get(
            "password"
          ),

        repetirPassword:
          form.get(
            "repetirPassword"
          ),
      };

      try {
        const respuesta =
          await fetch(
            "/api/registro",
            {
              method:
                "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify(
                  datos
                ),
            }
          );

        const resultado =
          await respuesta.json();

        if (
          !respuesta.ok
        ) {
          setTipoMensaje(
            "error"
          );

          setMensaje(
            resultado.error ??
              "No se ha podido completar el registro."
          );

          return;
        }

        setTipoMensaje(
          "success"
        );

        setMensaje(
          "Centro registrado correctamente. Ya puede iniciar sesión."
        );

        formulario.reset();
      } catch {
        setTipoMensaje(
          "error"
        );

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
          "var(--cm-fondo)",
        padding:
          "40px 20px",
      }}
    >
      <div
        style={{
          maxWidth: "920px",
          margin: "0 auto 20px",
          display: "flex",
          alignItems: "center",
          gap: "12px",
        }}
      >
        <LogotipoInstitucional ancho={230} />

        <div
          style={{
            marginLeft: "auto",
            textAlign: "right",
            lineHeight: 1.25,
          }}
        >
          <div style={{ fontWeight: 700, fontSize: "15px" }}>
            {MARCA.aplicacion}
          </div>

          <div style={{ fontSize: "13px", color: "var(--cm-rojo)", fontWeight: 600 }}>
            {MARCA.programa}
          </div>
        </div>
      </div>

      <div
        style={{
          width:
            "100%",
          maxWidth:
            "920px",
          margin:
            "0 auto",
          background:
            "#ffffff",
          border:
            "1px solid var(--cm-borde)",
          borderTop:
            "4px solid var(--cm-rojo)",
          borderRadius:
            "var(--cm-radio-grande)",
          boxShadow:
            "var(--cm-sombra)",
        }}
      >
        <div
          style={{
            padding:
              "26px 30px",
            borderBottom:
              "1px solid var(--cm-borde)",
          }}
        >
          <h1
            style={{
              margin:
                0,
              fontSize:
                "24px",
              color:
                "var(--cm-texto)",
            }}
          >
            Crear cuenta de centro
          </h1>

          <p
            style={{
              margin:
                "8px 0 0",
              color:
                "var(--cm-texto-3)",
              fontSize:
                "14px",
            }}
          >
            Registre el centro y cree
            su cuenta principal de acceso.
          </p>
        </div>

        <form
          onSubmit={
            enviarFormulario
          }
          style={{
            padding:
              "28px 30px",
          }}
        >
          <h2
            style={{
              fontSize:
                "14px",
              color:
                "var(--cm-texto)",
              margin:
                "0 0 16px",
            }}
          >
            Datos del centro
          </h2>

          <div
            style={{
              display:
                "grid",
              gridTemplateColumns:
                "1fr 1fr",
              gap:
                "16px",
            }}
          >
            <Campo
              name="nombreCentro"
              label="Nombre del centro"
            />

            <Campo
              name="codigoCentro"
              label="Código de centro"
            />

            <Campo
              name="cif"
              label="CIF"
            />

            <Campo
              name="telefono"
              label="Teléfono"
            />

            <Campo
              name="direccion"
              label="Dirección"
            />

            <Campo
              name="localidad"
              label="Localidad"
            />

            <Campo
              name="provincia"
              label="Provincia"
            />

            <Campo
              name="emailCentro"
              label="Email del centro"
              type="email"
            />
          </div>

          <div
            style={{
              marginTop:
                "30px",
              paddingTop:
                "24px",
              borderTop:
                "1px solid var(--cm-borde)",
            }}
          >
            <h2
              style={{
                fontSize:
                  "14px",
                color:
                  "var(--cm-texto)",
                margin:
                  "0 0 16px",
              }}
            >
              Datos de acceso
            </h2>

            <div
              style={{
                display:
                  "grid",
                gridTemplateColumns:
                  "1fr 1fr",
                gap:
                  "16px",
              }}
            >
              <Campo
                name="nombreResponsable"
                label="Nombre del responsable"
              />

              <Campo
                name="emailAcceso"
                label="Email de acceso"
                type="email"
              />

              <Campo
                name="password"
                label="Contraseña"
                type="password"
              />

              <Campo
                name="repetirPassword"
                label="Repetir contraseña"
                type="password"
              />
            </div>
          </div>

          {mensaje && (
            <div
              style={{
                marginTop:
                  "20px",
                padding:
                  "12px 14px",
                border:
                  tipoMensaje ===
                  "success"
                    ? "1px solid var(--cm-exito-borde)"
                    : "1px solid var(--cm-rojo-borde)",

                background:
                  tipoMensaje ===
                  "success"
                    ? "var(--cm-exito-claro)"
                    : "var(--cm-rojo-claro)",

                color:
                  tipoMensaje ===
                  "success"
                    ? "var(--cm-exito)"
                    : "var(--cm-rojo-oscuro)",

                fontSize:
                  "13px",
              }}
            >
              {
                mensaje
              }
            </div>
          )}

          <div
            style={{
              display:
                "flex",
              alignItems:
                "center",
              justifyContent:
                "space-between",
              marginTop:
                "26px",
            }}
          >
            <Link
              href="/login"
              style={{
                color:
                  "var(--cm-texto-2)",
                fontSize:
                  "13px",
                textDecoration:
                  "none",
              }}
            >
              ¿Ya tiene una cuenta?
              Iniciar sesión
            </Link>

            <button
              type="submit"
              disabled={
                cargando
              }
              style={{
                minHeight:
                  "42px",
                padding:
                  "0 24px",
                border:
                  "none",
                background:
                  "var(--cm-rojo)",
                color:
                  "#ffffff",
                fontSize:
                  "13px",
                fontWeight:
                  700,
                cursor:
                  cargando
                    ? "default"
                    : "pointer",
              }}
            >
              {cargando
                ? "CREANDO CUENTA..."
                : "CREAR CUENTA"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

function Campo({
  name,
  label,
  type = "text",
}: {
  name: string;
  label: string;
  type?: string;
}) {
  return (
    <label
      style={{
        display:
          "flex",
        flexDirection:
          "column",
        gap:
          "6px",
      }}
    >
      <span
        style={{
          fontSize:
            "12px",
          fontWeight:
            700,
          color:
            "var(--cm-texto-2)",
          textTransform:
            "uppercase",
        }}
      >
        {label}
      </span>

      <input
        required
        name={
          name
        }
        type={
          type
        }
        style={{
          minHeight:
            "40px",
          border:
            "1px solid var(--cm-borde-fuerte)",
          padding:
            "0 11px",
          fontSize:
            "14px",
          outline:
            "none",
          background:
            "#ffffff",
        }}
      />
    </label>
  );
}