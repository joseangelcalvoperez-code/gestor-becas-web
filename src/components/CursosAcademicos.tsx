"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";

interface CursoAcademico {
  id: number;

  nombre: string;

  fechaInicio: string;
  fechaFin: string;

  activo: boolean;
  actual: boolean;
}

interface FormularioCurso {
  nombre: string;
  fechaInicio: string;
  fechaFin: string;
  actual: boolean;
}

const formularioInicial:
  FormularioCurso =
{
  nombre:
    "2026/2027",

  fechaInicio:
    "2026-09-01",

  fechaFin:
    "2027-08-31",

  actual:
    true,
};

export default function CursosAcademicos() {
  const [
    cursos,
    setCursos,
  ] =
    useState<
      CursoAcademico[]
    >([]);

  const [
    formulario,
    setFormulario,
  ] =
    useState<FormularioCurso>(
      formularioInicial
    );

  const [
    mostrarFormulario,
    setMostrarFormulario,
  ] =
    useState(false);

  const [
    cargando,
    setCargando,
  ] =
    useState(true);

  const [
    guardando,
    setGuardando,
  ] =
    useState(false);

  const [
    eliminandoId,
    setEliminandoId,
  ] =
    useState<number | null>(
      null
    );

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

  /* =====================================================
     MENSAJES AUTOMÁTICOS
     ===================================================== */

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

  /* =====================================================
     CARGAR
     ===================================================== */

  const cargarCursos =
    useCallback(
      async () => {
        try {
          setCargando(
            true
          );

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
            setTipoMensaje(
              "error"
            );

            setMensaje(
              resultado.error ??
                "No se han podido cargar los cursos académicos."
            );

            return;
          }

          setCursos(
            resultado.cursos ??
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
          setCargando(
            false
          );
        }
      },
      []
    );

  useEffect(() => {
    cargarCursos();
  }, [
    cargarCursos,
  ]);

  /* =====================================================
     PROPONER SIGUIENTE CURSO
     ===================================================== */

  const prepararNuevoCurso =
    () => {
      if (
        cursos.length ===
        0
      ) {
        setFormulario(
          formularioInicial
        );

        setMostrarFormulario(
          true
        );

        return;
      }

      const actual =
        cursos.find(
          (
            curso
          ) =>
            curso.actual
        ) ??
        cursos[0];

      const coincidencia =
        actual.nombre.match(
          /^(\d{4})\/(\d{4})$/
        );

      if (
        coincidencia
      ) {
        const primerAnio =
          Number(
            coincidencia[1]
          ) + 1;

        const segundoAnio =
          Number(
            coincidencia[2]
          ) + 1;

        setFormulario({
          nombre:
            `${primerAnio}/${segundoAnio}`,

          fechaInicio:
            `${primerAnio}-09-01`,

          fechaFin:
            `${segundoAnio}-08-31`,

          actual:
            true,
        });
      } else {
        setFormulario({
          nombre:
            "",

          fechaInicio:
            "",

          fechaFin:
            "",

          actual:
            true,
        });
      }

      setMostrarFormulario(
        true
      );
    };

  /* =====================================================
     CREAR
     ===================================================== */

  const crearCurso =
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
            "/api/cursos-academicos",
            {
              method:
                "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify(
                  formulario
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
              "No se ha podido crear el curso académico."
          );

          return;
        }

        setTipoMensaje(
          "success"
        );

        setMensaje(
          "✓ Curso académico creado correctamente"
        );

        setMostrarFormulario(
          false
        );

        window.dispatchEvent(
  new Event("cursosAcademicosActualizados")
);

        await cargarCursos();
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

  /* =====================================================
     MARCAR ACTUAL
     ===================================================== */

  const marcarActual =
    async (
      curso:
        CursoAcademico
    ) => {
      if (
        curso.actual
      ) {
        return;
      }

      const confirmar =
        window.confirm(
          `¿Desea establecer ${curso.nombre} como curso académico actual?\n\nEste será el curso seleccionado por defecto en la aplicación.`
        );

      if (
        !confirmar
      ) {
        return;
      }

      try {
        const respuesta =
          await fetch(
            `/api/cursos-academicos/${curso.id}`,
            {
              method:
                "PATCH",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify({
                  actual:
                    true,
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
              "No se ha podido cambiar el curso actual."
          );

          return;
        }

        setTipoMensaje(
          "success"
        );

        setMensaje(
          `✓ ${curso.nombre} es ahora el curso académico actual`
        );

        await cargarCursos();
      } catch {
        setTipoMensaje(
          "error"
        );
        window.dispatchEvent(
  new Event(
    "cursosAcademicosActualizados"
  )
);

        setMensaje(
          "No se ha podido conectar con el servidor."
        );
      }
    };

  /* =====================================================
     ACTIVAR / DESACTIVAR
     ===================================================== */

  const cambiarActivo =
    async (
      curso:
        CursoAcademico
    ) => {
      try {
        const respuesta =
          await fetch(
            `/api/cursos-academicos/${curso.id}`,
            {
              method:
                "PATCH",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify({
                  activo:
                    !curso.activo,
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
              "No se ha podido modificar el curso académico."
          );

          return;
        }

        setTipoMensaje(
          "success"
        );

        setMensaje(
          curso.activo
            ? "✓ Curso académico desactivado"
            : "✓ Curso académico activado"
        );

        await cargarCursos();
      } catch {
        setTipoMensaje(
          "error"
        );
        window.dispatchEvent(
  new Event(
    "cursosAcademicosActualizados"
  )
);

        setMensaje(
          "No se ha podido conectar con el servidor."
        );
      }
    };

  /* =====================================================
     ELIMINAR CURSO COMPLETO
     ===================================================== */

  const eliminarCurso =
    async (
      curso:
        CursoAcademico
    ) => {
      if (
        curso.activo ||
        curso.actual
      ) {
        setTipoMensaje(
          "error"
        );

        setMensaje(
          "El curso debe estar desactivado y no puede ser el curso actual antes de eliminarlo."
        );

        return;
      }

      const confirmar =
        window.confirm(
          `ATENCIÓN: va a eliminar completamente el curso académico ${curso.nombre}.\n\nSe eliminarán de forma permanente todos los datos guardados para este curso, incluyendo:\n\n- Matrículas de alumnos del curso.\n- Convalidaciones asociadas a esas matrículas.\n- Registros de asistencia mensual.\n- Registros diarios de asistencia.\n- Observaciones de asistencia.\n- Cualquier otro dato dependiente de las matrículas de este curso.\n\nLos alumnos como personas NO se eliminarán y podrán seguir existiendo en otros cursos académicos.\n\nEsta acción es irreversible.\n\n¿Desea continuar?`
        );

      if (
        !confirmar
      ) {
        return;
      }

      const textoConfirmacion =
        `ELIMINAR ${curso.nombre}`;

      const escrito =
        window.prompt(
          `Para confirmar la eliminación definitiva, escriba exactamente:\n\n${textoConfirmacion}`
        );

      if (
        escrito !==
        textoConfirmacion
      ) {
        if (
          escrito !== null
        ) {
          setTipoMensaje(
            "error"
          );

          setMensaje(
            "La confirmación escrita no coincide. No se ha eliminado ningún dato."
          );
        }

        return;
      }

      try {
        setEliminandoId(
          curso.id
        );

        setMensaje("");
        setTipoMensaje("");

        const respuesta =
          await fetch(
            `/api/cursos-academicos/${curso.id}`,
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
              "No se ha podido eliminar el curso académico."
          );

          return;
        }

        setTipoMensaje(
          "success"
        );

        setMensaje(
          `✓ Curso académico ${curso.nombre} y todos sus datos asociados eliminados correctamente`
        );

        window.dispatchEvent(
          new Event(
            "cursosAcademicosActualizados"
          )
        );

        await cargarCursos();
      } catch {
        setTipoMensaje(
          "error"
        );

        setMensaje(
          "No se ha podido conectar con el servidor."
        );
      } finally {
        setEliminandoId(
          null
        );
      }
    };

  return (
    <section
      style={{
        marginTop:
          "24px",

        border:
          "1px solid var(--cm-borde)",

        background:
          "#ffffff",
      }}
    >
      {/* CABECERA */}

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

          padding:
            "18px 20px",

          borderBottom:
            "1px solid var(--cm-borde)",
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,

              color:
                "var(--cm-texto)",

              fontSize:
                "14px",
            }}
          >
            CURSOS ACADÉMICOS
          </h2>

          <p
            style={{
              margin:
                "5px 0 0",

              color:
                "var(--cm-texto-3)",

              fontSize:
                "12px",

              lineHeight:
                1.5,
            }}
          >
            Configure los cursos académicos
            disponibles y seleccione cuál
            debe utilizarse por defecto.
          </p>
        </div>

        <button
          type="button"

          onClick={
            prepararNuevoCurso
          }

          style={
            botonRojo
          }
        >
          + NUEVO CURSO
        </button>
      </div>

      {/* MENSAJES */}

      {mensaje && (
        <div
          style={{
            margin:
              "18px 20px 0",

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

      {/* FORMULARIO */}

      {mostrarFormulario && (
        <form
          onSubmit={
            crearCurso
          }

          style={{
            margin:
              "18px 20px",

            padding:
              "18px",

            border:
              "1px solid var(--cm-borde)",

            background:
              "var(--cm-fondo-suave)",
          }}
        >
          <div
            style={{
              marginBottom:
                "15px",

              color:
                "var(--cm-texto)",

              fontSize:
                "13px",

              fontWeight:
                700,
            }}
          >
            NUEVO CURSO ACADÉMICO
          </div>

          <div
            style={{
              display:
                "grid",

              gridTemplateColumns:
                "1fr 1fr 1fr",

              gap:
                "16px",
            }}
          >
            <Campo
              label="Curso académico"

              value={
                formulario.nombre
              }

              onChange={(
                valor
              ) =>
                setFormulario(
                  (
                    anterior
                  ) => ({
                    ...anterior,

                    nombre:
                      valor,
                  })
                )
              }

              placeholder="2026/2027"
            />

            <Campo
              label="Fecha de inicio"

              type="date"

              value={
                formulario.fechaInicio
              }

              onChange={(
                valor
              ) =>
                setFormulario(
                  (
                    anterior
                  ) => ({
                    ...anterior,

                    fechaInicio:
                      valor,
                  })
                )
              }
            />

            <Campo
              label="Fecha de fin"

              type="date"

              value={
                formulario.fechaFin
              }

              onChange={(
                valor
              ) =>
                setFormulario(
                  (
                    anterior
                  ) => ({
                    ...anterior,

                    fechaFin:
                      valor,
                  })
                )
              }
            />
          </div>

          {cursos.length >
            0 && (
            <label
              style={{
                display:
                  "flex",

                alignItems:
                  "center",

                gap:
                  "8px",

                marginTop:
                  "16px",

                color:
                  "var(--cm-texto-2)",

                fontSize:
                  "12px",
              }}
            >
              <input
                type="checkbox"

                checked={
                  formulario.actual
                }

                onChange={(
                  event
                ) =>
                  setFormulario(
                    (
                      anterior
                    ) => ({
                      ...anterior,

                      actual:
                        event
                          .target
                          .checked,
                    })
                  )
                }
              />

              Establecer como curso académico actual
            </label>
          )}

          <div
            style={{
              display:
                "flex",

              justifyContent:
                "flex-end",

              gap:
                "10px",

              marginTop:
                "18px",
            }}
          >
            <button
              type="button"

              onClick={() =>
                setMostrarFormulario(
                  false
                )
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
                : "GUARDAR CURSO"}
            </button>
          </div>
        </form>
      )}

      {/* TABLA */}

      <div
        style={{
          margin:
            "18px 20px 20px",

          border:
            "1px solid var(--cm-borde)",
        }}
      >
        <div
          style={{
            display:
              "grid",

            gridTemplateColumns:
              "1.2fr 1fr 1fr 110px 220px",

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
            CURSO
          </Celda>

          <Celda>
            INICIO
          </Celda>

          <Celda>
            FIN
          </Celda>

          <Celda>
            ESTADO
          </Celda>

          <Celda>
            ACCIONES
          </Celda>
        </div>

        {cargando ? (
          <div
            style={
              textoVacio
            }
          >
            Cargando cursos académicos...
          </div>
        ) : cursos.length ===
          0 ? (
          <div
            style={
              textoVacio
            }
          >
            Todavía no hay cursos
            académicos configurados.
            El primero que cree se
            establecerá automáticamente
            como curso actual.
          </div>
        ) : (
          cursos.map(
            (
              curso
            ) => (
              <div
                key={
                  curso.id
                }

                style={{
                  display:
                    "grid",

                  gridTemplateColumns:
                    "1.2fr 1fr 1fr 110px 300px",

                  borderTop:
                    "1px solid var(--cm-borde)",

                  background:
                    curso.actual
                      ? "var(--cm-rojo-claro)"
                      : "#ffffff",

                  color:
                    "var(--cm-texto-2)",

                  fontSize:
                    "12px",
                }}
              >
                <Celda>
                  <div>
                    <strong
                      style={{
                        color:
                          "var(--cm-texto)",
                      }}
                    >
                      {
                        curso.nombre
                      }
                    </strong>

                    {curso.actual && (
                      <div
                        style={{
                          marginTop:
                            "4px",

                          color:
                            "var(--cm-rojo)",

                          fontSize:
                            "10px",

                          fontWeight:
                            700,
                        }}
                      >
                        CURSO ACTUAL
                      </div>
                    )}
                  </div>
                </Celda>

                <Celda>
                  {formatearFecha(
                    curso.fechaInicio
                  )}
                </Celda>

                <Celda>
                  {formatearFecha(
                    curso.fechaFin
                  )}
                </Celda>

                <Celda>
                  <span
                    style={{
                      color:
                        curso.activo
                          ? "var(--cm-exito)"
                          : "var(--cm-texto-3)",

                      fontWeight:
                        700,

                      fontSize:
                        "11px",
                    }}
                  >
                    {curso.activo
                      ? "ACTIVO"
                      : "INACTIVO"}
                  </span>
                </Celda>

                <Celda>
                  <div
                    style={{
                      display:
                        "flex",

                      gap:
                        "12px",

                      alignItems:
                        "center",
                    }}
                  >
                    {!curso.actual && (
                      <button
                        type="button"

                        onClick={() =>
                          marcarActual(
                            curso
                          )
                        }

                        style={
                          botonAccion
                        }
                      >
                        HACER ACTUAL
                      </button>
                    )}

                    <button
                      type="button"

                      onClick={() =>
                        cambiarActivo(
                          curso
                        )
                      }

                      style={
                        curso.activo
                          ? botonAccionRojo
                          : botonAccionVerde
                      }
                    >
                      {curso.activo
                        ? "DESACTIVAR"
                        : "ACTIVAR"}
                    </button>


                    {!curso.activo &&
                      !curso.actual && (
                      <button
                        type="button"

                        onClick={() =>
                          eliminarCurso(
                            curso
                          )
                        }

                        disabled={
                          eliminandoId ===
                          curso.id
                        }

                        style={{
                          ...botonAccionEliminar,

                          opacity:
                            eliminandoId ===
                            curso.id
                              ? 0.5
                              : 1,
                        }}
                      >
                        {eliminandoId ===
                        curso.id
                          ? "ELIMINANDO..."
                          : "ELIMINAR CURSO"}
                      </button>
                    )}
                  </div>
                </Celda>
              </div>
            )
          )
        )}
      </div>
    </section>
  );
}

/* =========================================================
   COMPONENTES
   ========================================================= */

function Campo({
  label,
  value,
  onChange,
  type = "text",
  placeholder = "",
}: {
  label: string;
  value: string;
  onChange:
    (
      value:
        string
    ) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label>
      <span
        style={
          labelStyle
        }
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
          value
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
        minWidth:
          0,

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

function formatearFecha(
  fecha:
    string
) {
  return new Intl.DateTimeFormat(
    "es-ES"
  ).format(
    new Date(
      fecha
    )
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

  color:
    "var(--cm-texto-2)",

  fontSize:
    "11px",

  fontWeight:
    700,
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

const botonAccion:
  React.CSSProperties =
{
  padding:
    0,

  border:
    "none",

  background:
    "transparent",

  color:
    "var(--cm-texto-2)",

  fontSize:
    "11px",

  fontWeight:
    700,

  cursor:
    "pointer",
};

const botonAccionRojo:
  React.CSSProperties =
{
  ...botonAccion,

  color:
    "var(--cm-rojo)",
};

const botonAccionVerde:
  React.CSSProperties =
{
  ...botonAccion,

  color:
    "var(--cm-exito)",
};

const botonAccionEliminar:
  React.CSSProperties =
{
  ...botonAccion,

  color:
    "var(--cm-rojo-oscuro)",

  fontWeight:
    800,
};

const textoVacio:
  React.CSSProperties =
{
  padding:
    "22px",

  color:
    "var(--cm-texto-3)",

  fontSize:
    "13px",

  lineHeight:
    1.6,
};