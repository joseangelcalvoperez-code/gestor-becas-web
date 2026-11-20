"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import ImportExportGrados from "@/components/ImportExportGrados";

/* =========================================================
   TIPOS
   ========================================================= */

interface Grado {
  id: number;
  nombre: string;
  activo: boolean;

  _count: {
    asignaturas: number;
  };
}

interface Profesor {
  id: number;
  nombre: string;
  apellidos: string;
  dni: string;

  _count: {
    asignaturas: number;
  };
}

interface ProfesorAsignatura {
  id: number;
  nombre: string;
  apellidos: string;
  dni: string;
}

interface Asignatura {
  id: number;
  codigo: string;
  nombre: string;
  curso: number;

  profesor:
    ProfesorAsignatura;
}

/* =========================================================
   COMPONENTE
   ========================================================= */

export default function GradosAsignaturasPage() {
  const [
    grados,
    setGrados,
  ] =
    useState<Grado[]>(
      []
    );

  const [
    profesores,
    setProfesores,
  ] =
    useState<Profesor[]>(
      []
    );

  const [
    asignaturas,
    setAsignaturas,
  ] =
    useState<
      Asignatura[]
    >([]);

  const [
    gradoSeleccionadoId,
    setGradoSeleccionadoId,
  ] =
    useState<number | null>(
      null
    );

  const [
    curso,
    setCurso,
  ] =
    useState<1 | 2>(
      1
    );

  const [
    nuevoGrado,
    setNuevoGrado,
  ] =
    useState("");

  const [
    mostrarNuevoGrado,
    setMostrarNuevoGrado,
  ] =
    useState(false);

  const [
    mostrarNuevaAsignatura,
    setMostrarNuevaAsignatura,
  ] =
    useState(false);

  const [
    codigoAsignatura,
    setCodigoAsignatura,
  ] =
    useState("");

  const [
    nombreAsignatura,
    setNombreAsignatura,
  ] =
    useState("");

  const [
    modoProfesor,
    setModoProfesor,
  ] =
    useState<
      "existente" |
      "nuevo"
    >("existente");

  const [
    profesorSeleccionadoId,
    setProfesorSeleccionadoId,
  ] =
    useState<number | null>(
      null
    );

  const [
    profesorNombre,
    setProfesorNombre,
  ] =
    useState("");

  const [
    profesorApellidos,
    setProfesorApellidos,
  ] =
    useState("");

  const [
    profesorDni,
    setProfesorDni,
  ] =
    useState("");

  const [
    cargando,
    setCargando,
  ] =
    useState(true);

  const [
    cargandoAsignaturas,
    setCargandoAsignaturas,
  ] =
    useState(false);

  const [
    guardando,
    setGuardando,
  ] =
    useState(false);

  const [
    eliminando,
    setEliminando,
  ] =
    useState(false);

  const [
    mensaje,
    setMensaje,
  ] =
    useState("");

  const [
    tipoMensaje,
    setTipoMensaje,
  ] =
    useState<
      "success" |
      "error" |
      ""
    >("");

  /* =========================================================
     MENSAJES AUTOMÁTICOS
     ========================================================= */

  useEffect(() => {
    if (!mensaje) {
      return;
    }

    const temporizador =
      window.setTimeout(
        () => {
          setMensaje("");
          setTipoMensaje("");
        },
        10000
      );

    return () => {
      window.clearTimeout(
        temporizador
      );
    };
  }, [mensaje]);

  /* =========================================================
     CARGAR DATOS INICIALES
     ========================================================= */

  useEffect(() => {
    cargarDatosIniciales();
  }, []);

  const cargarDatosIniciales =
    async () => {
      try {
        setCargando(
          true
        );

        await Promise.all([
          cargarGrados(),
          cargarProfesores(),
        ]);
      } finally {
        setCargando(
          false
        );
      }
    };

  /* =========================================================
     CARGAR GRADOS
     ========================================================= */

  const cargarGrados =
    async () => {
      try {
        const respuesta =
          await fetch(
            "/api/grados",
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
          setTipoMensaje(
            "error"
          );

          setMensaje(
            resultado.error ??
              "No se han podido cargar los grados."
          );

          return;
        }

        const lista:
          Grado[] =
            resultado.grados ??
            [];

        setGrados(
          lista
        );

        setGradoSeleccionadoId(
          (
            anterior
          ) => {
            if (
              anterior &&
              lista.some(
                (
                  grado
                ) =>
                  grado.id ===
                  anterior
              )
            ) {
              return anterior;
            }

            return (
              lista[0]?.id ??
              null
            );
          }
        );
      } catch {
        setTipoMensaje(
          "error"
        );

        setMensaje(
          "No se ha podido conectar con el servidor."
        );
      }
    };

  /* =========================================================
     CARGAR PROFESORES
     ========================================================= */

  const cargarProfesores =
    async () => {
      try {
        const respuesta =
          await fetch(
            "/api/profesores",
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

        const lista:
          Profesor[] =
            resultado.profesores ??
            [];

        setProfesores(
          lista
        );

        setProfesorSeleccionadoId(
          (
            anterior
          ) => {
            if (
              anterior &&
              lista.some(
                (
                  profesor
                ) =>
                  profesor.id ===
                  anterior
              )
            ) {
              return anterior;
            }

            return (
              lista[0]?.id ??
              null
            );
          }
        );
      } catch {
        /*
         * El error general lo mostraremos
         * al intentar guardar.
         */
      }
    };

  /* =========================================================
     CARGAR ASIGNATURAS
     ========================================================= */

  const cargarAsignaturas =
    async (
      gradoId:
        number,
      cursoSeleccionado:
        1 | 2
    ) => {
      try {
        setCargandoAsignaturas(
          true
        );

        const respuesta =
          await fetch(
            `/api/asignaturas?gradoId=${gradoId}&curso=${cursoSeleccionado}`,
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
          setTipoMensaje(
            "error"
          );

          setMensaje(
            resultado.error ??
              "No se han podido cargar las asignaturas."
          );

          return;
        }

        setAsignaturas(
          resultado.asignaturas ??
            []
        );
      } catch {
        setTipoMensaje(
          "error"
        );

        setMensaje(
          "No se ha podido conectar con el servidor."
        );
      } finally {
        setCargandoAsignaturas(
          false
        );
      }
    };

  useEffect(() => {
    if (
      !gradoSeleccionadoId
    ) {
      setAsignaturas(
        []
      );

      return;
    }

    cargarAsignaturas(
      gradoSeleccionadoId,
      curso
    );
  }, [
    gradoSeleccionadoId,
    curso,
  ]);

  /* =========================================================
     CREAR GRADO
     ========================================================= */

  const crearGrado =
    async (
      event:
        FormEvent<HTMLFormElement>
    ) => {
      event.preventDefault();

      const nombre =
        nuevoGrado.trim();

      if (!nombre) {
        setTipoMensaje(
          "error"
        );

        setMensaje(
          "Introduzca el nombre del grado."
        );

        return;
      }

      try {
        setGuardando(
          true
        );

        setMensaje("");
        setTipoMensaje("");

        const respuesta =
          await fetch(
            "/api/grados",
            {
              method:
                "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify({
                  nombre,
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
              "No se ha podido crear el grado."
          );

          return;
        }

        setNuevoGrado("");
        setMostrarNuevoGrado(
          false
        );

        setTipoMensaje(
          "success"
        );

        setMensaje(
          "✓ Grado creado correctamente"
        );

        await cargarGrados();

        if (
          resultado.grado?.id
        ) {
          setGradoSeleccionadoId(
            resultado.grado.id
          );
        }
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

  /* =========================================================
     ELIMINAR GRADO
     ========================================================= */

const eliminarGrado =
  async () => {
    if (
      !gradoSeleccionadoId
    ) {
      return;
    }

    try {
      setEliminando(
        true
      );

      setMensaje("");
      setTipoMensaje("");

      /* ================================================
         CARGAMOS EL RESUMEN ANTES DE ELIMINAR
         ================================================ */

      const respuestaResumen =
        await fetch(
          `/api/grados/${gradoSeleccionadoId}`,
          {
            method:
              "GET",

            cache:
              "no-store",
          }
        );

      const resumen =
        await respuestaResumen.json();

      if (
        !respuestaResumen.ok
      ) {
        setTipoMensaje(
          "error"
        );

        setMensaje(
          resumen.error ??
            "No se ha podido obtener la información del grado."
        );

        return;
      }

      const grado =
        resumen.grado;

      const listaAsignaturas =
        grado.asignaturas.length >
        0
          ? grado.asignaturas
              .map(
                (
                  asignatura: {
                    nombre: string;
                    profesor: string;
                  }
                ) =>
                  `• ${asignatura.nombre} — ${asignatura.profesor}`
              )
              .join("\n")
          : "• Ninguna asignatura";

      const textoConfirmacion =
        `Va a eliminar el grado:\n\n` +
        `${grado.nombre}\n\n` +
        `Asignaturas que se eliminarán: ${grado.totalAsignaturas}\n` +
        `Profesores relacionados: ${grado.totalProfesores}\n\n` +
        `${listaAsignaturas}\n\n` +
        `Los profesores NO se eliminarán y podrán reutilizarse en otros grados.\n\n` +
        `¿Desea continuar?`;

      const confirmar =
        window.confirm(
          textoConfirmacion
        );

      if (!confirmar) {
        return;
      }

      /* ================================================
         ELIMINAMOS
         ================================================ */

      const respuesta =
        await fetch(
          `/api/grados/${gradoSeleccionadoId}`,
          {
            method:
              "DELETE",
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
            "No se ha podido eliminar el grado."
        );

        return;
      }

      setTipoMensaje(
        "success"
      );

      setMensaje(
        "✓ Grado eliminado correctamente"
      );

      setCurso(
        1
      );

      setMostrarNuevaAsignatura(
        false
      );

      await Promise.all([
        cargarGrados(),
        cargarProfesores(),
      ]);
    } catch {
      setTipoMensaje(
        "error"
      );

      setMensaje(
        "No se ha podido conectar con el servidor."
      );
    } finally {
      setEliminando(
        false
      );
    }
  };

  /* =========================================================
     LIMPIAR FORMULARIO DE ASIGNATURA
     ========================================================= */

  const limpiarAsignatura =
    () => {
      setCodigoAsignatura(
        ""
      );

      setNombreAsignatura(
        ""
      );

      setModoProfesor(
        profesores.length > 0
          ? "existente"
          : "nuevo"
      );

      setProfesorSeleccionadoId(
        profesores[0]?.id ??
          null
      );

      setProfesorNombre(
        ""
      );

      setProfesorApellidos(
        ""
      );

      setProfesorDni(
        ""
      );

      setMostrarNuevaAsignatura(
        false
      );
    };

  /* =========================================================
     NUEVA ASIGNATURA
     ========================================================= */

  const crearAsignatura =
    async (
      event:
        FormEvent<HTMLFormElement>
    ) => {
      event.preventDefault();

      if (
        !gradoSeleccionadoId
      ) {
        return;
      }

      try {
        setGuardando(
          true
        );

        setMensaje("");
        setTipoMensaje("");

        const datos = {
          gradoId:
            gradoSeleccionadoId,

          curso,

          codigo:
            codigoAsignatura,

          nombre:
            nombreAsignatura,

          modoProfesor,

          profesorId:
            profesorSeleccionadoId,

          profesorNombre,

          profesorApellidos,

          profesorDni,
        };

        const respuesta =
          await fetch(
            "/api/asignaturas",
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
              "No se ha podido crear la asignatura."
          );

          return;
        }

        setTipoMensaje(
          "success"
        );

        setMensaje(
          "✓ Asignatura creada correctamente"
        );

        limpiarAsignatura();

        await Promise.all([
          cargarAsignaturas(
            gradoSeleccionadoId,
            curso
          ),

          cargarProfesores(),

          cargarGrados(),
        ]);
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

  /* =========================================================
     ELIMINAR ASIGNATURA
     ========================================================= */

  const eliminarAsignatura =
    async (
      asignatura:
        Asignatura
    ) => {
      const confirmar =
        window.confirm(
          `¿Seguro que desea eliminar la asignatura "${asignatura.nombre}"?`
        );

      if (!confirmar) {
        return;
      }

      try {
        const respuesta =
          await fetch(
            `/api/asignaturas/${asignatura.id}`,
            {
              method:
                "DELETE",
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
              "No se ha podido eliminar la asignatura."
          );

          return;
        }

        setTipoMensaje(
          "success"
        );

        setMensaje(
          "✓ Asignatura eliminada correctamente"
        );

        if (
          gradoSeleccionadoId
        ) {
          await Promise.all([
            cargarAsignaturas(
              gradoSeleccionadoId,
              curso
            ),

            cargarProfesores(),

            cargarGrados(),
          ]);
        }
      } catch {
        setTipoMensaje(
          "error"
        );

        setMensaje(
          "No se ha podido conectar con el servidor."
        );
      }
    };

  const gradoSeleccionado =
    grados.find(
      (
        grado
      ) =>
        grado.id ===
        gradoSeleccionadoId
    ) ?? null;

  /* =========================================================
     RENDER
     ========================================================= */

  return (
    <div
      style={{
        background:
          "#ffffff",

        border:
          "1px solid var(--cm-borde)",

        minHeight:
          "calc(100vh - 105px)",

        padding:
          "24px",
      }}
    >
      {/* CABECERA */}

      <div
        style={{
          display:
            "flex",

          justifyContent:
            "space-between",

          alignItems:
            "flex-start",

          gap:
            "20px",

          paddingBottom:
            "18px",

          borderBottom:
            "1px solid var(--cm-borde)",
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              color:
                "var(--cm-texto)",
              fontSize:
                "20px",
            }}
          >
            GRADOS Y ASIGNATURAS
          </h1>

          <p
            style={{
              margin:
                "6px 0 0",

              color:
                "var(--cm-texto-3)",

              fontSize:
                "13px",
            }}
          >
            Configure los grados,
            sus asignaturas de primero
            y segundo curso y el profesor
            responsable de cada una.
          </p>
        </div>

        <div
          style={{
            flexShrink: 0,
            maxWidth: "70%",
          }}
        >
          <ImportExportGrados
            extra={
              <button
                type="button"
                onClick={() =>
                  setMostrarNuevoGrado(
                    true
                  )
                }
                style={
                  botonRojo
                }
              >
                + NUEVO GRADO
              </button>
            }
            onMensaje={(
              tipo,
              texto
            ) => {
              setTipoMensaje(
                tipo
              );
              setMensaje(
                texto
              );
            }}
            onImportacionCorrecta={async () => {
              await cargarDatosIniciales();

              if (
                gradoSeleccionadoId
              ) {
                await cargarAsignaturas(
                  gradoSeleccionadoId,
                  curso
                );
              }
            }}
          />
        </div>
      </div>

      {/* MENSAJES */}

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

      {/* NUEVO GRADO */}

      {mostrarNuevoGrado && (
        <form
          onSubmit={
            crearGrado
          }

          style={{
            marginTop:
              "18px",

            border:
              "1px solid var(--cm-borde)",

            padding:
              "18px",

            background:
              "var(--cm-fondo-suave)",
          }}
        >
          <div
            style={
              tituloFormulario
            }
          >
            NUEVO GRADO
          </div>

          <div
            style={{
              display:
                "flex",

              gap:
                "10px",
            }}
          >
            <input
              autoFocus

              value={
                nuevoGrado
              }

              onChange={(
                event
              ) =>
                setNuevoGrado(
                  event.target.value
                )
              }

              placeholder="Nombre del grado"

              style={{
                ...inputStyle,
                flex: 1,
              }}
            />

            <button
              type="button"

              onClick={() => {
                setMostrarNuevoGrado(
                  false
                );

                setNuevoGrado(
                  ""
                );
              }}

              style={
                botonGris
              }
            >
              CANCELAR
            </button>

            <button
              type="submit"

              disabled={
                guardando
              }

              style={
                botonRojo
              }
            >
              {guardando
                ? "GUARDANDO..."
                : "GUARDAR GRADO"}
            </button>
          </div>
        </form>
      )}

      {/* CONTENIDO */}

      <div
        style={{
          display:
            "grid",

          gridTemplateColumns:
            "270px 1fr",

          minHeight:
            "560px",

          marginTop:
            "18px",

          border:
            "1px solid var(--cm-borde)",
        }}
      >
        {/* GRADOS */}

        <aside
          style={{
            borderRight:
              "1px solid var(--cm-borde)",

            background:
              "var(--cm-fondo-suave)",
          }}
        >
          <div
            style={{
              padding:
                "13px 16px",

              borderBottom:
                "1px solid var(--cm-borde)",

              fontSize:
                "11px",

              fontWeight:
                700,

              color:
                "var(--cm-texto-2)",
            }}
          >
            GRADOS
          </div>

          {cargando ? (
            <div
              style={
                textoVacio
              }
            >
              Cargando...
            </div>
          ) : grados.length ===
            0 ? (
            <div
              style={
                textoVacio
              }
            >
              Todavía no hay grados
              configurados.
            </div>
          ) : (
            grados.map(
              (
                grado
              ) => {
                const activo =
                  grado.id ===
                  gradoSeleccionadoId;

                return (
                  <button
                    key={
                      grado.id
                    }

                    type="button"

                    onClick={() => {
                      setGradoSeleccionadoId(
                        grado.id
                      );

                      setCurso(
                        1
                      );

                      setMostrarNuevaAsignatura(
                        false
                      );
                    }}

                    style={{
                      width:
                        "100%",

                      minHeight:
                        "52px",

                      padding:
                        "8px 14px",

                      border:
                        "none",

                      borderBottom:
                        "1px solid var(--cm-borde)",

                      borderLeft:
                        activo
                          ? "3px solid var(--cm-rojo)"
                          : "3px solid transparent",

                      background:
                        activo
                          ? "#ffffff"
                          : "transparent",

                      cursor:
                        "pointer",

                      textAlign:
                        "left",
                    }}
                  >
                    <div
                      style={{
                        color:
                          "var(--cm-texto)",

                        fontSize:
                          "13px",

                        fontWeight:
                          activo
                            ? 700
                            : 600,
                      }}
                    >
                      {
                        grado.nombre
                      }
                    </div>

                    <div
                      style={{
                        marginTop:
                          "4px",

                        color:
                          "var(--cm-texto-3)",

                        fontSize:
                          "11px",
                      }}
                    >
                      {
                        grado
                          ._count
                          .asignaturas
                      }{" "}
                      asignaturas
                    </div>
                  </button>
                );
              }
            )
          )}
        </aside>

        {/* DETALLE */}

        <section
          style={{
            padding:
              "20px",
          }}
        >
          {!gradoSeleccionado ? (
            <div
              style={
                textoVacio
              }
            >
              Seleccione o cree
              un grado.
            </div>
          ) : (
            <>
              {/* CABECERA GRADO */}

              <div
                style={{
                  display:
                    "flex",

                  alignItems:
                    "center",

                  justifyContent:
                    "space-between",

                  gap:
                    "20px",

                  paddingBottom:
                    "18px",

                  borderBottom:
                    "1px solid var(--cm-borde)",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize:
                        "11px",

                      color:
                        "var(--cm-texto-3)",

                      fontWeight:
                        700,

                      marginBottom:
                        "5px",
                    }}
                  >
                    GRADO SELECCIONADO
                  </div>

                  <h2
                    style={{
                      margin:
                        0,

                      color:
                        "var(--cm-texto)",

                      fontSize:
                        "17px",
                    }}
                  >
                    {
                      gradoSeleccionado.nombre
                    }
                  </h2>
                </div>

                <div
                  style={{
                    display:
                      "flex",

                    gap:
                      "10px",
                  }}
                >
                  <button
                    type="button"

                    onClick={() => {
                      setMostrarNuevaAsignatura(
                        true
                      );

                      setModoProfesor(
                        profesores.length >
                          0
                          ? "existente"
                          : "nuevo"
                      );
                    }}

                    style={
                      botonRojo
                    }
                  >
                    + NUEVA ASIGNATURA
                  </button>

                  <button
                    type="button"

                    disabled={
                      eliminando
                    }

                    onClick={
                      eliminarGrado
                    }

                    style={
                      botonEliminar
                    }
                  >
                    {eliminando
                      ? "ELIMINANDO..."
                      : "ELIMINAR GRADO"}
                  </button>
                </div>
              </div>

              {/* CURSOS */}

              <div
                style={{
                  display:
                    "flex",

                  marginTop:
                    "16px",

                  borderBottom:
                    "1px solid var(--cm-borde)",
                }}
              >
                {[1, 2].map(
                  (
                    numero
                  ) => {
                    const activo =
                      curso ===
                      numero;

                    return (
                      <button
                        key={
                          numero
                        }

                        type="button"

                        onClick={() => {
                          setCurso(
                            numero as
                              | 1
                              | 2
                          );

                          setMostrarNuevaAsignatura(
                            false
                          );
                        }}

                        style={{
                          padding:
                            "11px 40px",

                          border:
                            "none",

                          borderBottom:
                            activo
                              ? "3px solid var(--cm-rojo)"
                              : "3px solid transparent",

                          background:
                            "transparent",

                          color:
                            activo
                              ? "var(--cm-texto)"
                              : "var(--cm-texto-3)",

                          fontSize:
                            "12px",

                          fontWeight:
                            activo
                              ? 700
                              : 600,

                          cursor:
                            "pointer",
                        }}
                      >
                        {numero}.º CURSO
                      </button>
                    );
                  }
                )}
              </div>

              {/* FORMULARIO ASIGNATURA */}

              {mostrarNuevaAsignatura && (
                <form
                  onSubmit={
                    crearAsignatura
                  }

                  style={{
                    marginTop:
                      "18px",

                    padding:
                      "18px",

                    border:
                      "1px solid var(--cm-borde)",

                    background:
                      "var(--cm-fondo-suave)",
                  }}
                >
                  <div
                    style={
                      tituloFormulario
                    }
                  >
                    NUEVA ASIGNATURA
                  </div>

                  <div
                    style={{
                      display:
                        "grid",

                      gridTemplateColumns:
                        "1fr 2fr",

                      gap:
                        "16px",
                    }}
                  >
                    <Campo
                      label="Código"

                      value={
                        codigoAsignatura
                      }

                      onChange={
                        setCodigoAsignatura
                      }

                      placeholder="Ej. 0001"
                    />

                    <Campo
                      label="Asignatura"

                      value={
                        nombreAsignatura
                      }

                      onChange={
                        setNombreAsignatura
                      }

                      placeholder="Nombre de la asignatura"

                      required
                    />
                  </div>

                  {/* PROFESOR */}

                  <div
                    style={{
                      marginTop:
                        "20px",

                      paddingTop:
                        "18px",

                      borderTop:
                        "1px solid var(--cm-borde)",
                    }}
                  >
                    <div
                      style={{
                        fontSize:
                          "11px",

                        fontWeight:
                          700,

                        color:
                          "var(--cm-texto-2)",

                        marginBottom:
                          "13px",
                      }}
                    >
                      PROFESOR DE LA ASIGNATURA
                    </div>

                    {profesores.length >
                      0 && (
                      <label
                        style={
                          radioStyle
                        }
                      >
                        <input
                          type="radio"

                          checked={
                            modoProfesor ===
                            "existente"
                          }

                          onChange={() =>
                            setModoProfesor(
                              "existente"
                            )
                          }
                        />

                        Seleccionar profesor existente
                      </label>
                    )}

                    <label
                      style={
                        radioStyle
                      }
                    >
                      <input
                        type="radio"

                        checked={
                          modoProfesor ===
                          "nuevo"
                        }

                        onChange={() =>
                          setModoProfesor(
                            "nuevo"
                          )
                        }
                      />

                      Añadir nuevo profesor
                    </label>

                    {modoProfesor ===
                    "existente" ? (
                      <div
                        style={{
                          marginTop:
                            "15px",
                        }}
                      >
                        <label>
                          <span
                            style={
                              labelStyle
                            }
                          >
                            PROFESOR
                          </span>

                          <select
                            value={
                              profesorSeleccionadoId ??
                              ""
                            }

                            onChange={(
                              event
                            ) =>
                              setProfesorSeleccionadoId(
                                Number(
                                  event
                                    .target
                                    .value
                                )
                              )
                            }

                            style={{
                              ...inputStyle,
                              width:
                                "100%",
                            }}
                          >
                            {profesores.map(
                              (
                                profesor
                              ) => (
                                <option
                                  key={
                                    profesor.id
                                  }

                                  value={
                                    profesor.id
                                  }
                                >
                                  {
                                    profesor.nombre
                                  }{" "}
                                  {
                                    profesor.apellidos
                                  }{" "}
                                  -{" "}
                                  {
                                    profesor.dni
                                  }
                                </option>
                              )
                            )}
                          </select>
                        </label>
                      </div>
                    ) : (
                      <div
                        style={{
                          display:
                            "grid",

                          gridTemplateColumns:
                            "1fr 1fr",

                          gap:
                            "16px",

                          marginTop:
                            "15px",
                        }}
                      >
                        <Campo
                          label="Nombre"

                          value={
                            profesorNombre
                          }

                          onChange={
                            setProfesorNombre
                          }

                          required
                        />

                        <Campo
                          label="Apellidos"

                          value={
                            profesorApellidos
                          }

                          onChange={
                            setProfesorApellidos
                          }

                          required
                        />

                        <Campo
                          label="DNI / NIE"

                          value={
                            profesorDni
                          }

                          onChange={
                            setProfesorDni
                          }

                          required
                        />
                      </div>
                    )}
                  </div>

                  <div
                    style={{
                      display:
                        "flex",

                      justifyContent:
                        "flex-end",

                      gap:
                        "10px",

                      marginTop:
                        "20px",
                    }}
                  >
                    <button
                      type="button"

                      onClick={
                        limpiarAsignatura
                      }

                      style={
                        botonGris
                      }
                    >
                      CANCELAR
                    </button>

                    <button
                      type="submit"

                      disabled={
                        guardando
                      }

                      style={
                        botonRojo
                      }
                    >
                      {guardando
                        ? "GUARDANDO..."
                        : "GUARDAR ASIGNATURA"}
                    </button>
                  </div>
                </form>
              )}

              {/* LISTA */}

              <div
                style={{
                  marginTop:
                    "18px",

                  border:
                    "1px solid var(--cm-borde)",
                }}
              >
                <div
                  style={{
                    display:
                      "grid",

                    gridTemplateColumns:
                      "120px 2fr 1.5fr 130px 90px",

                    background:
                      "var(--cm-borde)",

                    color:
                      "var(--cm-texto-2)",

                    fontSize:
                      "11px",

                    fontWeight:
                      700,
                  }}
                >
                  <Celda>
                    CÓDIGO
                  </Celda>

                  <Celda>
                    ASIGNATURA
                  </Celda>

                  <Celda>
                    PROFESOR
                  </Celda>

                  <Celda>
                    DNI/NIE
                  </Celda>

                  <Celda>
                    ACCIONES
                  </Celda>
                </div>

                {cargandoAsignaturas ? (
                  <div
                    style={
                      textoVacio
                    }
                  >
                    Cargando asignaturas...
                  </div>
                ) : asignaturas.length ===
                  0 ? (
                  <div
                    style={
                      textoVacio
                    }
                  >
                    No hay asignaturas
                    configuradas para{" "}
                    {curso}.º curso.
                  </div>
                ) : (
                  asignaturas.map(
                    (
                      asignatura
                    ) => (
                      <div
                        key={
                          asignatura.id
                        }

                        style={{
                          display:
                            "grid",

                          gridTemplateColumns:
                            "120px 2fr 1.5fr 130px 90px",

                          borderTop:
                            "1px solid var(--cm-borde)",

                          background:
                            "#ffffff",

                          fontSize:
                            "12px",

                          color:
                            "var(--cm-texto-2)",
                        }}
                      >
                        <Celda>
                          {
                            asignatura.codigo ||
                            "-"
                          }
                        </Celda>

                        <Celda>
                          <strong
                            style={{
                              color:
                                "var(--cm-texto)",
                            }}
                          >
                            {
                              asignatura.nombre
                            }
                          </strong>
                        </Celda>

                        <Celda>
                          {
                            asignatura
                              .profesor
                              .nombre
                          }{" "}
                          {
                            asignatura
                              .profesor
                              .apellidos
                          }
                        </Celda>

                        <Celda>
                          {
                            asignatura
                              .profesor
                              .dni
                          }
                        </Celda>

                        <Celda>
                          <button
                            type="button"

                            onClick={() =>
                              eliminarAsignatura(
                                asignatura
                              )
                            }

                            style={{
                              border:
                                "none",

                              background:
                                "transparent",

                              color:
                                "var(--cm-rojo)",

                              fontSize:
                                "11px",

                              fontWeight:
                                700,

                              cursor:
                                "pointer",
                            }}
                          >
                            ELIMINAR
                          </button>
                        </Celda>
                      </div>
                    )
                  )
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

/* =========================================================
   COMPONENTES AUXILIARES
   ========================================================= */

function Campo({
  label,
  value,
  onChange,
  placeholder = "",
  required = false,
}: {
  label: string;
  value: string;
  onChange:
    (
      value:
        string
    ) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label>
      <span
        style={
          labelStyle
        }
      >
        {label}
      </span>

      <input
        value={
          value
        }

        required={
          required
        }

        placeholder={
          placeholder
        }

        onChange={(
          event
        ) =>
          onChange(
            event.target.value
          )
        }

        style={{
          ...inputStyle,
          width:
            "100%",
        }}
      />
    </label>
  );
}

function Celda({
  children,
}: {
  children:
    React.ReactNode;
}) {
  return (
    <div
      style={{
        padding:
          "11px 12px",

        display:
          "flex",

        alignItems:
          "center",
      }}
    >
      {
        children
      }
    </div>
  );
}

/* =========================================================
   ESTILOS
   ========================================================= */

const inputStyle:
  React.CSSProperties =
{
  minHeight:
    "40px",

  boxSizing:
    "border-box",

  border:
    "1px solid var(--cm-borde-fuerte)",

  padding:
    "0 11px",

  background:
    "#ffffff",

  color:
    "var(--cm-texto)",

  fontSize:
    "13px",

  outline:
    "none",
};

const labelStyle:
  React.CSSProperties =
{
  display:
    "block",

  marginBottom:
    "6px",

  fontSize:
    "11px",

  fontWeight:
    700,

  color:
    "var(--cm-texto-2)",
};

const botonRojo:
  React.CSSProperties =
{
  minHeight:
    "40px",

  padding:
    "0 18px",

  border:
    "none",

  background:
    "var(--cm-rojo)",

  color:
    "#ffffff",

  fontSize:
    "11px",

  fontWeight:
    700,

  cursor:
    "pointer",
};

const botonGris:
  React.CSSProperties =
{
  minHeight:
    "40px",

  padding:
    "0 18px",

  border:
    "none",

  background:
    "var(--cm-texto-2)",

  color:
    "#ffffff",

  fontSize:
    "11px",

  fontWeight:
    700,

  cursor:
    "pointer",
};

const botonEliminar:
  React.CSSProperties =
{
  minHeight:
    "38px",

  padding:
    "0 16px",

  border:
    "1px solid var(--cm-rojo)",

  background:
    "#ffffff",

  color:
    "var(--cm-rojo)",

  fontSize:
    "11px",

  fontWeight:
    700,

  cursor:
    "pointer",
};

const tituloFormulario:
  React.CSSProperties =
{
  marginBottom:
    "14px",

  color:
    "var(--cm-texto)",

  fontSize:
    "13px",

  fontWeight:
    700,
};

const radioStyle:
  React.CSSProperties =
{
  display:
    "flex",

  alignItems:
    "center",

  gap:
    "8px",

  marginTop:
    "9px",

  color:
    "var(--cm-texto-2)",

  fontSize:
    "12px",

  cursor:
    "pointer",
};

const textoVacio:
  React.CSSProperties =
{
  padding:
    "18px",

  color:
    "var(--cm-texto-3)",

  fontSize:
    "13px",

  lineHeight:
    1.6,
};