"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import CursosAcademicos from "@/components/CursosAcademicos";

/* =========================================================
   TIPOS
   ========================================================= */

interface Centro {
  id: number;

  nombre: string;
  codigo: string;
  cif: string;
  direccion: string;
  localidad: string;
  provincia: string;
  telefono: string;
  email: string;
}

const centroInicial: Centro = {
  id: 0,

  nombre: "",
  codigo: "",
  cif: "",
  direccion: "",
  localidad: "",
  provincia: "",
  telefono: "",
  email: "",
};

/* =========================================================
   COMPONENTE
   ========================================================= */

export default function CentroPage() {
  const [
    centro,
    setCentro,
  ] =
    useState<Centro>(
      centroInicial
    );

  const [
    cargando,
    setCargando,
  ] =
    useState(
      true
    );

  const [
    guardando,
    setGuardando,
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

  const [
    tipoMensaje,
    setTipoMensaje,
  ] =
    useState<
      "success" |
      "error" |
      ""
    >("");

  /* =======================================================
     CARGAR DATOS
     ======================================================= */

  useEffect(() => {
    cargarCentro();
  }, []);

  const cargarCentro =
    async () => {
      try {
        setCargando(
          true
        );

        setMensaje("");
        setTipoMensaje("");

        const respuesta =
          await fetch(
            "/api/centro",
            {
              method:
                "GET",

              cache:
                "no-store",
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
              "No se han podido cargar los datos del centro."
          );

          return;
        }

        setCentro(
          resultado.centro
        );
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

  /* =======================================================
     CAMBIAR CAMPOS
     ======================================================= */

  const cambiarCampo =
    (
      campo:
        keyof Centro,

      valor:
        string
    ) => {
      setCentro(
        (
          anterior
        ) => ({
          ...anterior,

          [campo]:
            valor,
        })
      );
    };

  /* =======================================================
     GUARDAR
     ======================================================= */

  const guardar =
    async (
      event:
        FormEvent<HTMLFormElement>
    ) => {
      event.preventDefault();

      try {
        setGuardando(
          true
        );

        setMensaje("");
        setTipoMensaje("");

        const respuesta =
          await fetch(
            "/api/centro",
            {
              method:
                "PUT",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify({
                  nombre:
                    centro.nombre,

                  codigo:
                    centro.codigo,

                  cif:
                    centro.cif,

                  direccion:
                    centro.direccion,

                  localidad:
                    centro.localidad,

                  provincia:
                    centro.provincia,

                  telefono:
                    centro.telefono,

                  email:
                    centro.email,
                }),
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
              "No se han podido guardar los datos."
          );

          return;
        }

        if (
          resultado.centro
        ) {
          setCentro(
            resultado.centro
          );
        }

        setTipoMensaje(
          "success"
        );

        setMensaje(
          "✓ Datos del centro guardados correctamente"
        );
      } catch {
        setTipoMensaje(
          "error"
        );

        setMensaje(
          "No se ha podido conectar con el servidor."
        );
      } finally {
        setGuardando(
          false
        );
      }
    };

  /* =======================================================
     CARGANDO
     ======================================================= */

  if (
    cargando
  ) {
    return (
      <div
        style={{
          background:
            "#ffffff",

          border:
            "1px solid #d7dde5",

          minHeight:
            "calc(100vh - 105px)",

          padding:
            "24px",

          color:
            "#65758d",

          fontSize:
            "12px",
        }}
      >
        Cargando datos del centro...
      </div>
    );
  }

  /* =======================================================
     RENDER
     ======================================================= */

  return (
    <div
      style={{
        background:
          "#ffffff",

        border:
          "1px solid #d7dde5",

        minHeight:
          "calc(100vh - 105px)",

        padding:
          "24px",
      }}
    >
      {/* CABECERA */}

      <div
        style={{
          paddingBottom:
            "18px",

          borderBottom:
            "1px solid #d7dde5",
        }}
      >
        <h1
          style={{
            margin:
              0,

            fontSize:
              "20px",

            color:
              "#303b50",
          }}
        >
          CENTRO
        </h1>

        <p
          style={{
            margin:
              "6px 0 0",

            fontSize:
              "11px",

            color:
              "#7a879a",
          }}
        >
          Configure los datos generales
          del centro. Esta información
          se utilizará posteriormente
          en los documentos generados.
        </p>
      </div>

      {/* MENSAJE */}

      {mensaje && (
        <div
          style={{
            marginTop:
              "18px",

            padding:
              "12px 14px",

            border:
              tipoMensaje ===
              "success"
                ? "1px solid #b9dec2"
                : "1px solid #efb0aa",

            background:
              tipoMensaje ===
              "success"
                ? "#edf8f0"
                : "#fff0ef",

            color:
              tipoMensaje ===
              "success"
                ? "#2f7d44"
                : "#b9362f",

            fontSize:
              "11px",
          }}
        >
          {
            mensaje
          }
        </div>
      )}

      {/* FORMULARIO */}

      <form
        onSubmit={
          guardar
        }

        style={{
          marginTop:
            "20px",
        }}
      >
        <div
          style={{
            border:
              "1px solid #d7dde5",

            background:
              "#ffffff",

            padding:
              "20px",
          }}
        >
          <div
            style={{
              paddingBottom:
                "14px",

              borderBottom:
                "1px solid #e1e5ea",

              marginBottom:
                "18px",
            }}
          >
            <h2
              style={{
                margin:
                  0,

                fontSize:
                  "14px",

                color:
                  "#303b50",
              }}
            >
              Datos del centro
            </h2>

            <p
              style={{
                margin:
                  "5px 0 0",

                fontSize:
                  "10px",

                color:
                  "#7a879a",
              }}
            >
              Introduzca la información
              identificativa del centro
              educativo.
            </p>
          </div>

          <div
            style={{
              display:
                "grid",

              gridTemplateColumns:
                "1fr 1fr",

              gap:
                "18px",
            }}
          >
            <Campo
              label="Nombre del centro"

              valor={
                centro.nombre
              }

              onChange={(
                valor
              ) =>
                cambiarCampo(
                  "nombre",
                  valor
                )
              }
            />

            <Campo
              label="Código de centro"

              valor={
                centro.codigo
              }

              onChange={(
                valor
              ) =>
                cambiarCampo(
                  "codigo",
                  valor
                )
              }
            />

            <Campo
              label="CIF"

              valor={
                centro.cif
              }

              onChange={(
                valor
              ) =>
                cambiarCampo(
                  "cif",
                  valor
                )
              }
            />

            <Campo
              label="Dirección"

              valor={
                centro.direccion
              }

              onChange={(
                valor
              ) =>
                cambiarCampo(
                  "direccion",
                  valor
                )
              }
            />

            <Campo
              label="Localidad"

              valor={
                centro.localidad
              }

              onChange={(
                valor
              ) =>
                cambiarCampo(
                  "localidad",
                  valor
                )
              }
            />

            <Campo
              label="Provincia"

              valor={
                centro.provincia
              }

              onChange={(
                valor
              ) =>
                cambiarCampo(
                  "provincia",
                  valor
                )
              }
            />

            <Campo
              label="Teléfono"

              valor={
                centro.telefono
              }

              onChange={(
                valor
              ) =>
                cambiarCampo(
                  "telefono",
                  valor
                )
              }
            />

            <Campo
              label="Email"

              type="email"

              valor={
                centro.email
              }

              onChange={(
                valor
              ) =>
                cambiarCampo(
                  "email",
                  valor
                )
              }
            />
          </div>
        </div>

        {/* BOTÓN */}

        <div
          style={{
            display:
              "flex",

            justifyContent:
              "flex-end",

            marginTop:
              "18px",
          }}
        >
          <button
            type="submit"

            disabled={
              guardando
            }

            style={{
              minHeight:
                "42px",

              padding:
                "0 22px",

              border:
                "none",

              background:
                "#e9423a",

              color:
                "#ffffff",

              fontSize:
                "10px",

              fontWeight:
                700,

              cursor:
                guardando
                  ? "default"
                  : "pointer",
            }}
          >
            {guardando
              ? "GUARDANDO..."
              : "GUARDAR DATOS DEL CENTRO"}
          </button>
        </div>
      </form>
      <CursosAcademicos />
    </div>
  );
}

/* =========================================================
   CAMPO
   ========================================================= */

function Campo({
  label,
  valor,
  onChange,
  type = "text",
}: {
  label: string;

  valor: string;

  onChange:
    (
      valor:
        string
    ) => void;

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
            "9px",

          fontWeight:
            700,

          color:
            "#566176",

          textTransform:
            "uppercase",
        }}
      >
        {
          label
        }
      </span>

      <input
        required

        type={
          type
        }

        value={
          valor
        }

        onChange={(
          event
        ) =>
          onChange(
            event.target.value
          )
        }

        style={{
          minHeight:
            "40px",

          border:
            "1px solid #cbd3df",

          padding:
            "0 11px",

          background:
            "#ffffff",

          color:
            "#303b50",

          fontSize:
            "12px",

          outline:
            "none",
        }}
      />
    </label>
  );
}