"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";

import ImportExportAlumnos from "@/components/ImportExportAlumnos";

/* =========================================================
   TIPOS
   ========================================================= */

interface Grado {
  id: number;
  nombre: string;
}

interface AsignaturaConvalidacion {
  id: number;
  codigo: string;
  nombre: string;
}

interface CursoAcademico {
  id: number;
  nombre: string;
  activo: boolean;
  actual: boolean;
}

interface Matricula {
  id: number;

  curso: number;
  expediente: string;
  activo: boolean;

  gradoId: number;
  cursoAcademicoId: number;

  alumno: {
    id: number;
    nombre: string;
    apellidos: string;
    dni: string;
    activo: boolean;
  };

  grado: {
    id: number;
    nombre: string;
    activo?: boolean;
  };

  asignaturasConvalidadas: {
    asignaturaId: number;

    asignatura: {
      id: number;
      codigo: string;
      nombre: string;
    };
  }[];

  cursoAcademico: {
    id: number;
    nombre: string;
  };
}

interface FormularioAlumno {
  nombre: string;
  apellidos: string;
  dni: string;
  expediente: string;

  gradoId: string;

  curso:
    | "1"
    | "2";
}

const formularioInicial:
  FormularioAlumno =
{
  nombre: "",
  apellidos: "",
  dni: "",
  expediente: "",

  gradoId: "",

  curso: "1",
};

/* =========================================================
   COMPONENTE
   ========================================================= */

export default function AlumnosPage() {
  const [
    matriculas,
    setMatriculas,
  ] =
    useState<
      Matricula[]
    >([]);

  const [
    grados,
    setGrados,
  ] =
    useState<
      Grado[]
    >([]);

  const [
    cursosAcademicos,
    setCursosAcademicos,
  ] =
    useState<
      CursoAcademico[]
    >([]);

  const [
    cursoAcademicoId,
    setCursoAcademicoId,
  ] =
    useState<number | null>(
      null
    );

  const [
    nombreCursoAcademico,
    setNombreCursoAcademico,
  ] =
    useState("");

  const [
    formulario,
    setFormulario,
  ] =
    useState<FormularioAlumno>(
      formularioInicial
    );

  const [
    matriculaEditandoId,
    setMatriculaEditandoId,
  ] =
    useState<number | null>(
      null
    );

  const [
    mostrarFormulario,
    setMostrarFormulario,
  ] =
    useState(false);

  const [
    busqueda,
    setBusqueda,
  ] =
    useState("");

  const [
    filtroGrado,
    setFiltroGrado,
  ] =
    useState("");

  const [
    filtroCurso,
    setFiltroCurso,
  ] =
    useState("");

  const [
    filtroEstado,
    setFiltroEstado,
  ] =
    useState<
      | "activos"
      | "inactivos"
      | "todos"
    >("activos");

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
    matriculaConvalidacionesId,
    setMatriculaConvalidacionesId,
  ] =
    useState<number | null>(
      null
    );

  const [
    alumnoConvalidacionesNombre,
    setAlumnoConvalidacionesNombre,
  ] =
    useState("");

  const [
    asignaturasDisponibles,
    setAsignaturasDisponibles,
  ] =
    useState<
      AsignaturaConvalidacion[]
    >([]);

  const [
    idsConvalidadas,
    setIdsConvalidadas,
  ] =
    useState<number[]>(
      []
    );

  const [
    cargandoConvalidaciones,
    setCargandoConvalidaciones,
  ] =
    useState(false);

  const [
    guardandoConvalidaciones,
    setGuardandoConvalidaciones,
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
      | "success"
      | "error"
      | ""
    >("");

  /* =========================================================
     MENSAJES 10 SEGUNDOS
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
     CARGAR GRADOS
     ========================================================= */

  const cargarGrados =
    useCallback(
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
            return;
          }

          setGrados(
            (
              resultado.grados ??
              []
            ).map(
              (
                grado: {
                  id: number;
                  nombre: string;
                }
              ) => ({
                id:
                  grado.id,

                nombre:
                  grado.nombre,
              })
            )
          );
        } catch {
          // El error principal se
          // mostrará al cargar alumnos.
        }
      },
      []
    );

  /* =========================================================
     RESOLVER CURSO ACADÉMICO
     ========================================================= */

  const resolverCursoAcademico =
    useCallback(
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
            return null;
          }

          const cursos:
            CursoAcademico[] =
            resultado.cursos ??
            [];

          setCursosAcademicos(
            cursos
          );

          const activos =
            cursos.filter(
              (
                item
              ) =>
                item.activo
            );

          if (
            activos.length ===
            0
          ) {
            setCursoAcademicoId(
              null
            );

            setNombreCursoAcademico(
              ""
            );

            return null;
          }

          /*
           * Primero intentamos utilizar
           * la selección del Header.
           */

          const guardado =
            window.sessionStorage.getItem(
              "cursoAcademicoSeleccionado"
            );

          let seleccionado =
            guardado
              ? activos.find(
                  (
                    item
                  ) =>
                    String(
                      item.id
                    ) ===
                    guardado
                )
              : undefined;

          /*
           * Si no hay selección válida,
           * utilizamos el actual.
           */

          if (
            !seleccionado
          ) {
            seleccionado =
              activos.find(
                (
                  item
                ) =>
                  item.actual
              ) ??
              activos[0];

            window.sessionStorage.setItem(
              "cursoAcademicoSeleccionado",
              String(
                seleccionado.id
              )
            );
          }

          setCursoAcademicoId(
            seleccionado.id
          );

          setNombreCursoAcademico(
            seleccionado.nombre
          );

          return seleccionado.id;
        } catch {
          return null;
        }
      },
      []
    );

  /* =========================================================
     CARGAR ALUMNOS / MATRÍCULAS
     ========================================================= */

  const cargarMatriculas =
    useCallback(
      async (
        idCursoAcademico?:
          number | null
      ) => {
        const id =
          idCursoAcademico ??
          cursoAcademicoId;

        if (!id) {
          setMatriculas(
            []
          );

          setCargando(
            false
          );

          return;
        }

        try {
          setCargando(
            true
          );

          const params =
            new URLSearchParams();

          params.set(
            "cursoAcademicoId",
            String(
              id
            )
          );

          params.set(
            "estado",
            filtroEstado
          );

          if (
            busqueda.trim()
          ) {
            params.set(
              "q",
              busqueda.trim()
            );
          }

          if (
            filtroGrado
          ) {
            params.set(
              "gradoId",
              filtroGrado
            );
          }

          if (
            filtroCurso
          ) {
            params.set(
              "curso",
              filtroCurso
            );
          }

          const respuesta =
            await fetch(
              `/api/alumnos?${params.toString()}`,
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
                "No se han podido cargar los alumnos."
            );

            return;
          }

          setMatriculas(
            resultado.matriculas ??
              []
          );

          if (
            resultado
              .cursoAcademico
              ?.nombre
          ) {
            setNombreCursoAcademico(
              resultado
                .cursoAcademico
                .nombre
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
          setCargando(
            false
          );
        }
      },
      [
        busqueda,
        cursoAcademicoId,
        filtroCurso,
        filtroEstado,
        filtroGrado,
      ]
    );

  /* =========================================================
     CARGA INICIAL
     ========================================================= */

  useEffect(() => {
    cargarGrados();

    const iniciar =
      async () => {
        const id =
          await resolverCursoAcademico();

        if (id) {
          await cargarMatriculas(
            id
          );
        } else {
          setCargando(
            false
          );
        }
      };

    iniciar();
  }, []);

  /* =========================================================
     CAMBIO DE CURSO DESDE HEADER
     ========================================================= */

  useEffect(() => {
    const cambiarCurso =
      (
        event:
          Event
      ) => {
        const evento =
          event as CustomEvent<{
            id: number;
          }>;

        const id =
          Number(
            evento.detail?.id
          );

        if (
          !Number.isInteger(
            id
          ) ||
          id <= 0
        ) {
          return;
        }

        const curso =
          cursosAcademicos.find(
            (
              item
            ) =>
              item.id ===
              id
          );

        setCursoAcademicoId(
          id
        );

        if (curso) {
          setNombreCursoAcademico(
            curso.nombre
          );
        }

        setMostrarFormulario(
          false
        );

        cerrarConvalidaciones();

        setMatriculaEditandoId(
          null
        );

        setFiltroGrado(
          ""
        );

        setFiltroCurso(
          ""
        );

        setFiltroEstado(
          "activos"
        );

        setBusqueda(
          ""
        );
      };

    window.addEventListener(
      "cursoAcademicoCambiado",
      cambiarCurso
    );

    return () => {
      window.removeEventListener(
        "cursoAcademicoCambiado",
        cambiarCurso
      );
    };
  }, [
    cursosAcademicos,
  ]);

  /* =========================================================
     RECARGAR AL CAMBIAR CURSO/FILTROS
     ========================================================= */

  useEffect(() => {
    if (
      !cursoAcademicoId
    ) {
      return;
    }

    const temporizador =
      window.setTimeout(
        () => {
          cargarMatriculas(
            cursoAcademicoId
          );
        },
        250
      );

    return () => {
      window.clearTimeout(
        temporizador
      );
    };
  }, [
    cursoAcademicoId,
    busqueda,
    filtroGrado,
    filtroCurso,
    filtroEstado,
  ]);

  /* =========================================================
     CAMBIAR FORMULARIO
     ========================================================= */

  const cambiarCampo =
    (
      campo:
        keyof FormularioAlumno,

      valor:
        string
    ) => {
      setFormulario(
        (
          anterior
        ) => ({
          ...anterior,

          [campo]:
            valor,
        })
      );
    };

  /* =========================================================
     NUEVA MATRÍCULA
     ========================================================= */

  const abrirNuevoAlumno =
    () => {
      if (
        !cursoAcademicoId
      ) {
        setTipoMensaje(
          "error"
        );

        setMensaje(
          "Debe seleccionar un curso académico antes de matricular alumnos."
        );

        return;
      }

      setMatriculaEditandoId(
        null
      );

      setFormulario({
        ...formularioInicial,

        gradoId:
          grados[0]
            ? String(
                grados[0].id
              )
            : "",
      });

      setMostrarFormulario(
        true
      );

      setMensaje("");
      setTipoMensaje("");
    };

  /* =========================================================
     EDITAR MATRÍCULA
     ========================================================= */

  const editarMatricula =
    (
      matricula:
        Matricula
    ) => {
      setMatriculaEditandoId(
        matricula.id
      );

      setFormulario({
        nombre:
          matricula.alumno.nombre,

        apellidos:
          matricula.alumno.apellidos,

        dni:
          matricula.alumno.dni,

        expediente:
          matricula.expediente,

        gradoId:
          String(
            matricula.gradoId
          ),

        curso:
          matricula.curso ===
          2
            ? "2"
            : "1",
      });

      setMostrarFormulario(
        true
      );

      window.scrollTo({
        top: 0,
        behavior:
          "smooth",
      });
    };

  /* =========================================================
     CERRAR FORMULARIO
     ========================================================= */

  const cerrarFormulario =
    () => {
      setMostrarFormulario(
        false
      );

      setMatriculaEditandoId(
        null
      );

      setFormulario(
        formularioInicial
      );
    };

  /* =========================================================
     GUARDAR
     ========================================================= */

  const guardarAlumno =
    async (
      event:
        FormEvent<HTMLFormElement>
    ) => {
      event.preventDefault();

      if (
        !cursoAcademicoId
      ) {
        setTipoMensaje(
          "error"
        );

        setMensaje(
          "No hay un curso académico seleccionado."
        );

        return;
      }

      try {
        setGuardando(
          true
        );

        setMensaje("");
        setTipoMensaje("");

        const editando =
          matriculaEditandoId !==
          null;

        const url =
          editando
            ? `/api/alumnos/${matriculaEditandoId}`
            : "/api/alumnos";

        const metodo =
          editando
            ? "PUT"
            : "POST";

        const respuesta =
          await fetch(
            url,
            {
              method:
                metodo,

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify({
                  nombre:
                    formulario.nombre,

                  apellidos:
                    formulario.apellidos,

                  dni:
                    formulario.dni,

                  expediente:
                    formulario.expediente,

                  gradoId:
                    Number(
                      formulario.gradoId
                    ),

                  curso:
                    Number(
                      formulario.curso
                    ),

                  cursoAcademicoId,
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
              "No se ha podido guardar el alumno."
          );

          return;
        }

        setTipoMensaje(
          "success"
        );

        setMensaje(
          editando
            ? "✓ Alumno actualizado correctamente"
            : "✓ Alumno matriculado correctamente"
        );

        cerrarFormulario();

        await cargarMatriculas(
          cursoAcademicoId
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

  /* =========================================================
     BAJA MATRÍCULA
     ========================================================= */

  const darDeBaja =
    async (
      matricula:
        Matricula
    ) => {
      const confirmar =
        window.confirm(
          `¿Desea dar de baja la matrícula de ${matricula.alumno.nombre} ${matricula.alumno.apellidos} en ${matricula.cursoAcademico.nombre}?\n\nEl alumno seguirá existiendo en el sistema y podrá conservar matrículas de otros cursos académicos.`
        );

      if (!confirmar) {
        return;
      }

      try {
        const respuesta =
          await fetch(
            `/api/alumnos/${matricula.id}`,
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
              "No se ha podido dar de baja la matrícula."
          );

          return;
        }

        setTipoMensaje(
          "success"
        );

        setMensaje(
          "✓ Matrícula dada de baja correctamente"
        );

        await cargarMatriculas(
          cursoAcademicoId
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
     REACTIVAR
     ========================================================= */

  const reactivar =
    async (
      matricula:
        Matricula
    ) => {
      const confirmar =
        window.confirm(
          `¿Desea reactivar la matrícula de ${matricula.alumno.nombre} ${matricula.alumno.apellidos} en ${matricula.cursoAcademico.nombre}?`
        );

      if (!confirmar) {
        return;
      }

      try {
        const respuesta =
          await fetch(
            `/api/alumnos/${matricula.id}`,
            {
              method:
                "PATCH",
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
              "No se ha podido reactivar la matrícula."
          );

          return;
        }

        setTipoMensaje(
          "success"
        );

        setMensaje(
          "✓ Matrícula reactivada correctamente"
        );

        await cargarMatriculas(
          cursoAcademicoId
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
     CONVALIDACIONES
     ========================================================= */

  const abrirConvalidaciones =
    async (
      matricula:
        Matricula
    ) => {
      try {
        setCargandoConvalidaciones(
          true
        );

        setMensaje("");
        setTipoMensaje("");

        const respuesta =
          await fetch(
            `/api/alumnos/${matricula.id}/convalidaciones`,
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
              "No se han podido cargar las convalidaciones."
          );

          return;
        }

        setMatriculaConvalidacionesId(
          matricula.id
        );

        setAlumnoConvalidacionesNombre(
          `${matricula.alumno.nombre} ${matricula.alumno.apellidos}`
        );

        setAsignaturasDisponibles(
          resultado.asignaturas ??
            []
        );

        setIdsConvalidadas(
          resultado.convalidadas ??
            []
        );

        window.scrollTo({
          top: 0,
          behavior:
            "smooth",
        });
      } catch {
        setTipoMensaje(
          "error"
        );

        setMensaje(
          "No se ha podido conectar con el servidor."
        );
      } finally {
        setCargandoConvalidaciones(
          false
        );
      }
    };

  const cerrarConvalidaciones =
    () => {
      setMatriculaConvalidacionesId(
        null
      );

      setAlumnoConvalidacionesNombre(
        ""
      );

      setAsignaturasDisponibles(
        []
      );

      setIdsConvalidadas(
        []
      );
    };

  const alternarConvalidada =
    (
      asignaturaId:
        number
    ) => {
      setIdsConvalidadas(
        (
          anteriores
        ) =>
          anteriores.includes(
            asignaturaId
          )
            ? anteriores.filter(
                (
                  id
                ) =>
                  id !==
                  asignaturaId
              )
            : [
                ...anteriores,
                asignaturaId,
              ]
      );
    };

  const guardarConvalidaciones =
    async () => {
      if (
        !matriculaConvalidacionesId
      ) {
        return;
      }

      try {
        setGuardandoConvalidaciones(
          true
        );

        setMensaje("");
        setTipoMensaje("");

        const respuesta =
          await fetch(
            `/api/alumnos/${matriculaConvalidacionesId}/convalidaciones`,
            {
              method:
                "PUT",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify({
                  asignaturaIds:
                    idsConvalidadas,
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
              "No se han podido guardar las convalidaciones."
          );

          return;
        }

        setTipoMensaje(
          "success"
        );

        setMensaje(
          "✓ Convalidaciones guardadas correctamente"
        );

        cerrarConvalidaciones();

        await cargarMatriculas(
          cursoAcademicoId
        );
      } catch {
        setTipoMensaje(
          "error"
        );

        setMensaje(
          "No se ha podido conectar con el servidor."
        );
      } finally {
        setGuardandoConvalidaciones(
          false
        );
      }
    };

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

          alignItems:
            "flex-start",

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
          <h1
            style={{
              margin: 0,

              color:
                "var(--cm-texto)",

              fontSize:
                "20px",
            }}
          >
            ALUMNOS
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
            Gestione los alumnos
            matriculados en el curso
            académico seleccionado.
          </p>

          {nombreCursoAcademico && (
            <div
              style={{
                marginTop:
                  "8px",

                color:
                  "var(--cm-rojo)",

                fontSize:
                  "12px",

                fontWeight:
                  700,
              }}
            >
              CURSO ACADÉMICO:{" "}
              {
                nombreCursoAcademico
              }
            </div>
          )}
        </div>

<div
  style={{
    display:
      "flex",

    alignItems:
      "center",

    justifyContent:
      "flex-end",

    gap:
      "10px",

    flexWrap:
      "wrap",
  }}
>
  <ImportExportAlumnos
    cursoAcademicoId={
      cursoAcademicoId
    }

    nombreCursoAcademico={
      nombreCursoAcademico
    }

    onImportacionCorrecta={() =>
      cargarMatriculas(
        cursoAcademicoId
      )
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
  />

      <button
        type="button"

        onClick={
          abrirNuevoAlumno
        }

        disabled={
          grados.length ===
            0 ||
          !cursoAcademicoId
        }

        style={{
          ...botonRojo,

          opacity:
            grados.length ===
              0 ||
            !cursoAcademicoId
              ? 0.5
              : 1,
        }}
      >
        + NUEVO ALUMNO
      </button>
    </div>
      </div>

      {/* SIN CURSO */}

      {!cursoAcademicoId && (
        <div
          style={{
            marginTop:
              "18px",

            padding:
              "14px",

            border:
              "1px solid var(--cm-aviso-borde)",

            background:
              "var(--cm-aviso-claro)",

            color:
              "var(--cm-aviso)",

            fontSize:
              "13px",
          }}
        >
          No hay ningún curso académico
          seleccionado. Configure un curso
          académico en CENTRO.
        </div>
      )}

      {/* SIN GRADOS */}

      {grados.length ===
        0 && (
        <div
          style={{
            marginTop:
              "18px",

            padding:
              "14px",

            border:
              "1px solid var(--cm-aviso-borde)",

            background:
              "var(--cm-aviso-claro)",

            color:
              "var(--cm-aviso)",

            fontSize:
              "13px",
          }}
        >
          Antes de matricular alumnos
          debe configurar al menos un
          grado en GRADOS Y ASIGNATURAS.
        </div>
      )}

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
          {mensaje}
        </div>
      )}

      {/* CONVALIDACIONES */}

      {matriculaConvalidacionesId && (
        <div
          style={{
            marginTop:
              "18px",

            padding:
              "20px",

            border:
              "1px solid var(--cm-borde)",

            background:
              "var(--cm-fondo-suave)",
          }}
        >
          <div
            style={{
              paddingBottom:
                "14px",

              marginBottom:
                "16px",

              borderBottom:
                "1px solid var(--cm-borde)",
            }}
          >
            <h2
              style={{
                margin: 0,

                color:
                  "var(--cm-texto)",

                fontSize:
                  "14px",
              }}
            >
              ASIGNATURAS CONVALIDADAS
            </h2>

            <p
              style={{
                margin:
                  "5px 0 0",

                color:
                  "var(--cm-texto-3)",

                fontSize:
                  "12px",
              }}
            >
              {alumnoConvalidacionesNombre}
              {" · "}
              {nombreCursoAcademico}
            </p>
          </div>

          {cargandoConvalidaciones ? (
            <div
              style={
                textoVacio
              }
            >
              Cargando asignaturas...
            </div>
          ) : asignaturasDisponibles.length ===
            0 ? (
            <div
              style={
                textoVacio
              }
            >
              No hay asignaturas configuradas
              para el grado y curso de esta
              matrícula.
            </div>
          ) : (
            <div
              style={{
                display:
                  "grid",

                gridTemplateColumns:
                  "repeat(auto-fit, minmax(260px, 1fr))",

                gap:
                  "10px",
              }}
            >
              {asignaturasDisponibles.map(
                (
                  asignatura
                ) => {
                  const marcada =
                    idsConvalidadas.includes(
                      asignatura.id
                    );

                  return (
                    <label
                      key={
                        asignatura.id
                      }

                      style={{
                        display:
                          "flex",

                        alignItems:
                          "center",

                        gap:
                          "9px",

                        minHeight:
                          "42px",

                        padding:
                          "0 12px",

                        border:
                          marcada
                            ? "1px solid var(--cm-rojo)"
                            : "1px solid var(--cm-borde)",

                        background:
                          marcada
                            ? "var(--cm-rojo-claro)"
                            : "#ffffff",

                        color:
                          "var(--cm-texto)",

                        fontSize:
                          "12px",

                        cursor:
                          "pointer",
                      }}
                    >
                      <input
                        type="checkbox"

                        checked={
                          marcada
                        }

                        onChange={() =>
                          alternarConvalidada(
                            asignatura.id
                          )
                        }
                      />

                      <span>
                        {asignatura.codigo
                          ? `${asignatura.codigo} · `
                          : ""}
                        {asignatura.nombre}
                      </span>
                    </label>
                  );
                }
              )}
            </div>
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

              onClick={
                cerrarConvalidaciones
              }

              disabled={
                guardandoConvalidaciones
              }

              style={
                botonGris
              }
            >
              CANCELAR
            </button>

            <button
              type="button"

              onClick={
                guardarConvalidaciones
              }

              disabled={
                guardandoConvalidaciones ||
                cargandoConvalidaciones
              }

              style={{
                ...botonRojo,

                opacity:
                  guardandoConvalidaciones ||
                  cargandoConvalidaciones
                    ? 0.6
                    : 1,
              }}
            >
              {guardandoConvalidaciones
                ? "GUARDANDO..."
                : "GUARDAR CONVALIDACIONES"}
            </button>
          </div>
        </div>
      )}

      {/* FORMULARIO */}

      {mostrarFormulario && (
        <form
          onSubmit={
            guardarAlumno
          }

          style={{
            marginTop:
              "18px",

            padding:
              "20px",

            border:
              "1px solid var(--cm-borde)",

            background:
              "var(--cm-fondo-suave)",
          }}
        >
          <div
            style={{
              paddingBottom:
                "14px",

              marginBottom:
                "18px",

              borderBottom:
                "1px solid var(--cm-borde)",
            }}
          >
            <h2
              style={{
                margin: 0,

                color:
                  "var(--cm-texto)",

                fontSize:
                  "14px",
              }}
            >
              {matriculaEditandoId
                ? "EDITAR MATRÍCULA"
                : "NUEVA MATRÍCULA"}
            </h2>

            <p
              style={{
                margin:
                  "5px 0 0",

                color:
                  "var(--cm-texto-3)",

                fontSize:
                  "12px",
              }}
            >
              Curso académico:{" "}
              {
                nombreCursoAcademico
              }
            </p>
          </div>

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
              label="Nombre"

              value={
                formulario.nombre
              }

              onChange={(
                valor
              ) =>
                cambiarCampo(
                  "nombre",
                  valor
                )
              }

              required
            />

            <Campo
              label="Apellidos"

              value={
                formulario.apellidos
              }

              onChange={(
                valor
              ) =>
                cambiarCampo(
                  "apellidos",
                  valor
                )
              }

              required
            />

            <Campo
              label="DNI / NIE"

              value={
                formulario.dni
              }

              onChange={(
                valor
              ) =>
                cambiarCampo(
                  "dni",
                  valor
                )
              }

              required
            />

            <Campo
              label="N.º expediente"

              value={
                formulario.expediente
              }

              onChange={(
                valor
              ) =>
                cambiarCampo(
                  "expediente",
                  valor
                )
              }
            />

            <label>
              <span
                style={
                  labelStyle
                }
              >
                GRADO
              </span>

              <select
                required

                value={
                  formulario.gradoId
                }

                onChange={(
                  event
                ) =>
                  cambiarCampo(
                    "gradoId",
                    event.target.value
                  )
                }

                style={{
                  ...inputStyle,

                  width:
                    "100%",
                }}
              >
                <option value="">
                  Seleccione un grado
                </option>

                {grados.map(
                  (
                    grado
                  ) => (
                    <option
                      key={
                        grado.id
                      }

                      value={
                        grado.id
                      }
                    >
                      {
                        grado.nombre
                      }
                    </option>
                  )
                )}
              </select>
            </label>

            <label>
              <span
                style={
                  labelStyle
                }
              >
                CURSO DEL GRADO
              </span>

              <select
                value={
                  formulario.curso
                }

                onChange={(
                  event
                ) =>
                  cambiarCampo(
                    "curso",
                    event.target.value
                  )
                }

                style={{
                  ...inputStyle,

                  width:
                    "100%",
                }}
              >
                <option value="1">
                  1.º CURSO
                </option>

                <option value="2">
                  2.º CURSO
                </option>
              </select>
            </label>
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
                cerrarFormulario
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
                : matriculaEditandoId
                  ? "GUARDAR CAMBIOS"
                  : "MATRICULAR ALUMNO"}
            </button>
          </div>
        </form>
      )}

      {/* FILTROS */}

      {cursoAcademicoId && (
        <div
          style={{
            display:
              "grid",

            gridTemplateColumns:
              "2fr 1.5fr 1fr 1fr",

            gap:
              "12px",

            marginTop:
              "18px",

            padding:
              "16px",

            border:
              "1px solid var(--cm-borde)",

            background:
              "var(--cm-fondo-suave)",
          }}
        >
          <label>
            <span
              style={
                labelStyle
              }
            >
              BUSCAR
            </span>

            <input
              value={
                busqueda
              }

              onChange={(
                event
              ) =>
                setBusqueda(
                  event.target.value
                )
              }

              placeholder="Nombre, apellidos, DNI o expediente"

              style={{
                ...inputStyle,
                width:
                  "100%",
              }}
            />
          </label>

          <label>
            <span
              style={
                labelStyle
              }
            >
              GRADO
            </span>

            <select
              value={
                filtroGrado
              }

              onChange={(
                event
              ) =>
                setFiltroGrado(
                  event.target.value
                )
              }

              style={{
                ...inputStyle,
                width:
                  "100%",
              }}
            >
              <option value="">
                Todos
              </option>

              {grados.map(
                (
                  grado
                ) => (
                  <option
                    key={
                      grado.id
                    }

                    value={
                      grado.id
                    }
                  >
                    {
                      grado.nombre
                    }
                  </option>
                )
              )}
            </select>
          </label>

          <label>
            <span
              style={
                labelStyle
              }
            >
              CURSO
            </span>

            <select
              value={
                filtroCurso
              }

              onChange={(
                event
              ) =>
                setFiltroCurso(
                  event.target.value
                )
              }

              style={{
                ...inputStyle,
                width:
                  "100%",
              }}
            >
              <option value="">
                Todos
              </option>

              <option value="1">
                1.º
              </option>

              <option value="2">
                2.º
              </option>
            </select>
          </label>

          <label>
            <span
              style={
                labelStyle
              }
            >
              ESTADO
            </span>

            <select
              value={
                filtroEstado
              }

              onChange={(
                event
              ) =>
                setFiltroEstado(
                  event.target
                    .value as
                    | "activos"
                    | "inactivos"
                    | "todos"
                )
              }

              style={{
                ...inputStyle,
                width:
                  "100%",
              }}
            >
              <option value="activos">
                Activos
              </option>

              <option value="inactivos">
                Inactivos
              </option>

              <option value="todos">
                Todos
              </option>
            </select>
          </label>
        </div>
      )}

      {/* TABLA */}

      {cursoAcademicoId && (
        <div
          style={{
            marginTop:
              "18px",

            border:
              "1px solid var(--cm-borde)",

            overflowX:
              "auto",
          }}
        >
          <div
            style={{
              minWidth:
                "1060px",
            }}
          >
            <div
              style={{
                display:
                  "grid",

                gridTemplateColumns:
                  "1fr 1.3fr 105px 105px 1.4fr 56px 1.3fr 272px",

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
                NOMBRE
              </Celda>

              <Celda>
                APELLIDOS
              </Celda>

              <Celda>
                DNI/NIE
              </Celda>

              <Celda>
                EXPEDIENTE
              </Celda>

              <Celda>
                GRADO
              </Celda>

              <Celda>
                CURSO
              </Celda>

              <Celda>
                CONVALIDADAS
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
                Cargando alumnos...
              </div>
            ) : matriculas.length ===
              0 ? (
              <div
                style={
                  textoVacio
                }
              >
                No hay alumnos
                matriculados que coincidan
                con los filtros para{" "}
                {
                  nombreCursoAcademico
                }.
              </div>
            ) : (
              matriculas.map(
                (
                  matricula
                ) => (
                  <div
                    key={
                      matricula.id
                    }

                    style={{
                      display:
                        "grid",

                      gridTemplateColumns:
                        "1fr 1.3fr 105px 105px 1.4fr 56px 1.3fr 272px",

                      borderTop:
                        "1px solid var(--cm-borde)",

                      background:
                        matricula.activo
                          ? "#ffffff"
                          : "var(--cm-fondo-suave)",

                      color:
                        matricula.activo
                          ? "var(--cm-texto-2)"
                          : "var(--cm-texto-3)",

                      fontSize:
                        "12px",
                    }}
                  >
                    <Celda>
                      <strong
                        style={{
                          color:
                            matricula.activo
                              ? "var(--cm-texto)"
                              : "var(--cm-texto-3)",
                        }}
                      >
                        {
                          matricula
                            .alumno
                            .nombre
                        }
                      </strong>
                    </Celda>

                    <Celda>
                      {
                        matricula
                          .alumno
                          .apellidos
                      }
                    </Celda>

                    <Celda>
                      {
                        matricula
                          .alumno
                          .dni
                      }
                    </Celda>

                    <Celda>
                      {
                        matricula.expediente ||
                        "-"
                      }
                    </Celda>

                    <Celda>
                      {
                        matricula
                          .grado
                          .nombre
                      }
                    </Celda>

                    <Celda>
                      {
                        matricula.curso
                      }.º
                    </Celda>

                    <Celda>
                      {matricula
                        .asignaturasConvalidadas
                        .length === 0 ? (
                        <span
                          style={{
                            color:
                              "var(--cm-texto-3)",
                          }}
                        >
                          -
                        </span>
                      ) : (
                        <div
                          style={{
                            display:
                              "flex",

                            flexDirection:
                              "column",

                            gap:
                              "4px",
                          }}
                        >
                          {matricula
                            .asignaturasConvalidadas
                            .map(
                              (
                                item
                              ) => (
                                <span
                                  key={
                                    item.asignaturaId
                                  }
                                >
                                  {
                                    item
                                      .asignatura
                                      .nombre
                                  }
                                </span>
                              )
                            )}
                        </div>
                      )}
                    </Celda>

                    <Celda>
                      <div
                        style={{
                          display:
                            "flex",

                          gap:
                            "8px",

                          alignItems:
                            "center",
                        }}
                      >
                        <button
                          type="button"

                          onClick={() =>
                            editarMatricula(
                              matricula
                            )
                          }

                          style={
                            botonAccion
                          }
                        >
                          EDITAR
                        </button>

                        <button
                          type="button"

                          onClick={() =>
                            abrirConvalidaciones(
                              matricula
                            )
                          }

                          disabled={
                            !matricula.activo
                          }

                          style={{
                            ...botonAccion,

                            opacity:
                              matricula.activo
                                ? 1
                                : 0.5,
                          }}
                        >
                          CONVALIDACIONES
                        </button>

                        {matricula.activo ? (
                          <button
                            type="button"

                            onClick={() =>
                              darDeBaja(
                                matricula
                              )
                            }

                            style={
                              botonAccionRojo
                            }
                          >
                            BAJA
                          </button>
                        ) : (
                          <button
                            type="button"

                            onClick={() =>
                              reactivar(
                                matricula
                              )
                            }

                            style={
                              botonAccionVerde
                            }
                          >
                            REACTIVAR
                          </button>
                        )}
                      </div>
                    </Celda>
                  </div>
                )
              )
            )}
          </div>
        </div>
      )}

      {cursoAcademicoId && (
        <div
          style={{
            marginTop:
              "10px",

            color:
              "var(--cm-texto-3)",

            fontSize:
              "12px",
          }}
        >
          {
            matriculas.length
          }{" "}
          matrícula
          {matriculas.length ===
          1
            ? ""
            : "s"}{" "}
          mostrada
          {matriculas.length ===
          1
            ? ""
            : "s"}
        </div>
      )}
    </div>
  );
}

/* =========================================================
   COMPONENTES
   ========================================================= */

function Campo({
  label,
  value,
  onChange,
  required = false,
}: {
  label: string;

  value: string;

  onChange:
    (
      value:
        string
    ) => void;

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
        required={
          required
        }

        value={
          value
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

        minWidth:
          0,
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

const textoVacio:
  React.CSSProperties =
{
  padding:
    "24px",

  color:
    "var(--cm-texto-3)",

  fontSize:
    "13px",

  lineHeight:
    1.6,
};