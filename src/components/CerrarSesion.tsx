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
      className="cm-btn cm-btn-secundario cm-btn-bloque"
    >
      <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <path d="m16 17 5-5-5-5" />
        <path d="M21 12H9" />
      </svg>
      <span>
        {cargando
          ? "Cerrando sesión…"
          : "Cerrar sesión"}
      </span>
    </button>
  );
}