"use client";

import {
  useEffect,
  useState,
} from "react";

interface CursoAcademico {
  id: number;
  nombre: string;
  activo: boolean;
  actual: boolean;
}

export default function SelectorCursoAcademico() {
  const [
    cursos,
    setCursos,
  ] =
    useState<
      CursoAcademico[]
    >([]);

  const [
    seleccionado,
    setSeleccionado,
  ] =
    useState("");

useEffect(() => {
  cargar();

  const actualizarCursos = () => {
    cargar();
  };

  window.addEventListener(
    "cursosAcademicosActualizados",
    actualizarCursos
  );

  return () => {
    window.removeEventListener(
      "cursosAcademicosActualizados",
      actualizarCursos
    );
  };
}, []);

  const cargar =
    async () => {
      try {
        const respuesta =
          await fetch(
            "/api/cursos-academicos",
            {
              cache:
                "no-store",
            }
          );

        const resultado =
          await respuesta.json();

        if (
          !respuesta.ok
        ) {
          return;
        }

        const activos:
          CursoAcademico[] =
          (
            resultado.cursos ??
            []
          ).filter(
            (
              curso:
                CursoAcademico
            ) =>
              curso.activo
          );

        setCursos(
          activos
        );

        if (
          activos.length ===
          0
        ) {
          return;
        }

        /*
         * Si el usuario ya había seleccionado
         * un curso en esta sesión del navegador,
         * lo conservamos.
         */

        const guardado =
          window.sessionStorage.getItem(
            "cursoAcademicoSeleccionado"
          );

        const existeGuardado =
          guardado &&
          activos.some(
            (
              curso
            ) =>
              String(
                curso.id
              ) ===
              guardado
          );

        if (
          existeGuardado
        ) {
          setSeleccionado(
            guardado!
          );

          return;
        }

        /*
         * Si no, utilizamos el curso marcado
         * como actual en la base de datos.
         */

        const actual =
          activos.find(
            (
              curso
            ) =>
              curso.actual
          ) ??
          activos[0];

        const valor =
          String(
            actual.id
          );

        setSeleccionado(
          valor
        );

        window.sessionStorage.setItem(
          "cursoAcademicoSeleccionado",
          valor
        );
      } catch {
        // No bloqueamos el layout
        // por un error del selector.
      }
    };

  const cambiar =
    (
      id:
        string
    ) => {
      setSeleccionado(
        id
      );

      window.sessionStorage.setItem(
        "cursoAcademicoSeleccionado",
        id
      );

      /*
       * Avisamos al resto de componentes
       * abiertos en la página.
       */

      window.dispatchEvent(
        new CustomEvent(
          "cursoAcademicoCambiado",
          {
            detail: {
              id:
                Number(
                  id
                ),
            },
          }
        )
      );
    };

  if (
    cursos.length ===
    0
  ) {
    return (
      <div
        style={{
          color:
            "#c9d0dc",

          fontSize:
            "10px",
        }}
      >
        Sin curso académico
      </div>
    );
  }

  return (
    <div
      style={{
        display:
          "flex",

        alignItems:
          "center",

        gap:
          "8px",
      }}
    >
      <span
        style={{
          color:
            "#c9d0dc",

          fontSize:
            "9px",

          fontWeight:
            600,
        }}
      >
        CURSO ACADÉMICO
      </span>

      <select
        value={
          seleccionado
        }

        onChange={(
          event
        ) =>
          cambiar(
            event.target.value
          )
        }

        style={{
          minHeight:
            "32px",

          border:
            "1px solid #4d5668",

          borderRadius:
            "4px",

          background:
            "#1f2633",

          color:
            "#ffffff",

          padding:
            "0 10px",

          fontSize:
            "10px",

          fontWeight:
            700,

          outline:
            "none",

          cursor:
            "pointer",
        }}
      >
        {cursos.map(
          (
            curso
          ) => (
            <option
              key={
                curso.id
              }

              value={
                curso.id
              }
            >
              {
                curso.nombre
              }
              {curso.actual
                ? " · Actual"
                : ""}
            </option>
          )
        )}
      </select>
    </div>
  );
}