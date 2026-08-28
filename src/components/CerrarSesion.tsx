"use client";

import {
  useRouter,
} from "next/navigation";

import {
  useState,
} from "react";

export default function CerrarSesion() {
  const router =
    useRouter();

  const [
    cargando,
    setCargando,
  ] = useState(false);

  const cerrarSesion =
    async () => {
      try {
        setCargando(
          true
        );

        await fetch(
          "/api/logout",
          {
            method:
              "POST",
          }
        );

        router.push(
          "/login"
        );

        router.refresh();
      } finally {
        setCargando(
          false
        );
      }
    };

  return (
    <button
      type="button"
      onClick={
        cerrarSesion
      }
      disabled={
        cargando
      }
      style={{
        minHeight:
          "42px",

        padding:
          "0 18px",

        border:
          "none",

        borderRadius:
          "7px",

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
        ? "CERRANDO..."
        : "CERRAR SESIÓN"}
    </button>
  );
}