"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

/* =========================================================
   TIPOS
   ========================================================= */

interface CursoAcademico {
  id: number;
  nombre: string;
  fechaInicio: string;
  fechaFin: string;
  activo: boolean;
  actual: boolean;
}

interface Matricula {
  id: number;
  expediente: string;
  curso: number;
  gradoId: number;

  alumno: {
    id: number;
    nombre: string;
    apellidos: string;
    dni: string;
  };

  grado: {
    id: number;
    nombre: string;
  };
}

interface Profesor {
  id: number;
  nombre: string;
  apellidos: string;
  dni: string;
}

interface AsignaturaDocumento {
  id: number;
  codigo: string;
  nombre: string;

  profesor:
    Profesor;

  mes: {
    horasAsistidas:
      number;

    horasNoAsistidas:
      number;

    horasTotales:
      number;
  };
}

interface MesCurso {
  anio: number;
  mes: number;
  valor: string;
  nombre: string;
}

interface Resumen {
  horasTotales:
    number;

  horasAsistidas:
    number;

  porcentaje:
    number;
}

/* =========================================================
   COMPONENTE
   ========================================================= */

export default function DocumentosPage() {
  /* =======================================================
     CURSO
     ======================================================= */

  const [
    cursoAcademico,
    setCursoAcademico,
  ] =
    useState<CursoAcademico | null>(
      null
    );

  /* =======================================================
     MATRÍCULAS
     ======================================================= */

  const [
    matriculas,
    setMatriculas,
  ] =
    useState<
      Matricula[]
    >([]);

  const [
    matriculaId,
    setMatriculaId,
  ] =
    useState<number | null>(
      null
    );

  /* =======================================================
     MES
     ======================================================= */

  const [
    indiceMes,
    setIndiceMes,
  ] =
    useState(0);

  /* =======================================================
     ASIGNATURAS
     ======================================================= */

  const [
    asignaturas,
    setAsignaturas,
  ] =
    useState<
      AsignaturaDocumento[]
    >([]);

  const [
    asignaturaId,
    setAsignaturaId,
  ] =
    useState<number | null>(
      null
    );

  /* =======================================================
     RESUMEN
     ======================================================= */

  const [
    resumen,
    setResumen,
  ] =
    useState<Resumen>({
      horasTotales:
        0,

      horasAsistidas:
        0,

      porcentaje:
        0,
    });

  /* =======================================================
     ESTADOS
     ======================================================= */

  const [
    cargando,
    setCargando,
  ] =
    useState(true);

  const [
    cargandoDatos,
    setCargandoDatos,
  ] =
    useState(false);

  const [
    generandoAnexoV,
    setGenerandoAnexoV,
  ] =
    useState(false);

  const [
    generandoTodosV,
    setGenerandoTodosV,
  ] =
    useState(false);

  const [
    generandoAnexoI,
    setGenerandoAnexoI,
  ] =
    useState(false); 

  const [
    generandoExpediente,
    setGenerandoExpediente,
] =
    useState(false);    

  const [
    generandoMasivo,
    setGenerandoMasivo,
  ] =
    useState(false);

  const [
    mensaje,
    setMensaje,
  ] =
    useState("");

  const [
  resumenAbierto,
  setResumenAbierto,
] =
  useState(false);

  /* =========================================================
     MATRÍCULA ACTUAL
     ========================================================= */

  const matriculaActual =
    useMemo(
      () =>
        matriculas.find(
          (
            item
          ) =>
            item.id ===
            matriculaId
        ) ??
        null,
      [
        matriculas,
        matriculaId,
      ]
    );

  /* =========================================================
     MESES
     ========================================================= */

  const mesesCurso =
    useMemo<
      MesCurso[]
    >(() => {
      if (
        !cursoAcademico
      ) {
        return [];
      }

      return generarMesesCurso(
        cursoAcademico.fechaInicio,
        cursoAcademico.fechaFin
      );
    }, [
      cursoAcademico,
    ]);

  const mesActual =
    mesesCurso[
      indiceMes
    ] ??
    null;

  /* =========================================================
     MENSAJES
     ========================================================= */

  useEffect(() => {
    if (!mensaje) {
      return;
    }

    const timer =
      window.setTimeout(
        () =>
          setMensaje(
            ""
          ),
        10000
      );

    return () =>
      window.clearTimeout(
        timer
      );
  }, [
    mensaje,
  ]);

  /* =========================================================
     CURSO
     ========================================================= */

  const resolverCurso =
    useCallback(
      async (
        idForzado?:
          number
      ) => {
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
            setMensaje(
              resultado.error ??
                "No se han podido cargar los cursos académicos."
            );

            return null;
          }

          const cursos:
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

          if (
            cursos.length ===
            0
          ) {
            setCursoAcademico(
              null
            );

            return null;
          }

          let curso:
            CursoAcademico | undefined;

          if (
            idForzado
          ) {
            curso =
              cursos.find(
                (
                  item
                ) =>
                  item.id ===
                  idForzado
              );
          }

          if (!curso) {
            const guardado =
              window.sessionStorage.getItem(
                "cursoAcademicoSeleccionado"
              );

            if (guardado) {
              curso =
                cursos.find(
                  (
                    item
                  ) =>
                    String(
                      item.id
                    ) ===
                    guardado
                );
            }
          }

          if (!curso) {
            curso =
              cursos.find(
                (
                  item
                ) =>
                  item.actual
              ) ??
              cursos[0];
          }

          setCursoAcademico(
            curso
          );

          window.sessionStorage.setItem(
            "cursoAcademicoSeleccionado",
            String(
              curso.id
            )
          );

          return curso;
        } catch {
          setMensaje(
            "No se ha podido conectar con el servidor."
          );

          return null;
        }
      },
      []
    );

  /* =========================================================
     MATRÍCULAS
     ========================================================= */

  const cargarMatriculas =
    useCallback(
      async (
        cursoId:
          number
      ) => {
        try {
          setCargando(
            true
          );

          const respuesta =
            await fetch(
              `/api/documentos?cursoAcademicoId=${cursoId}`,
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
            setMensaje(
              resultado.error ??
                "No se han podido cargar los alumnos."
            );

            return;
          }

          const lista:
            Matricula[] =
            resultado.matriculas ??
            [];

          setMatriculas(
            lista
          );

          setMatriculaId(
            lista[0]?.id ??
            null
          );
        } catch {
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

  /* =========================================================
     INICIO
     ========================================================= */

  useEffect(() => {
    const iniciar =
      async () => {
        const curso =
          await resolverCurso();

        if (!curso) {
          setCargando(
            false
          );

          return;
        }

        await cargarMatriculas(
          curso.id
        );
      };

    void iniciar();
  }, [
    resolverCurso,
    cargarMatriculas,
  ]);

  /* =========================================================
     CAMBIO CURSO HEADER
     ========================================================= */

  useEffect(() => {
    const cambiarCurso =
      async (
        event:
          Event
      ) => {
        const custom =
          event as CustomEvent<{
            id:
              number;
          }>;

        const id =
          Number(
            custom.detail
              ?.id
          );

        if (
          !Number.isInteger(
            id
          ) ||
          id <= 0
        ) {
          return;
        }

        setMatriculas(
          []
        );

        setMatriculaId(
          null
        );

        setAsignaturas(
          []
        );

        setAsignaturaId(
          null
        );

        setIndiceMes(
          0
        );

        const curso =
          await resolverCurso(
            id
          );

        if (curso) {
          await cargarMatriculas(
            curso.id
          );
        }
      };

    window.addEventListener(
      "cursoAcademicoCambiado",
      cambiarCurso
    );

    return () =>
      window.removeEventListener(
        "cursoAcademicoCambiado",
        cambiarCurso
      );
  }, [
    resolverCurso,
    cargarMatriculas,
  ]);

  /* =========================================================
     MES INICIAL
     ========================================================= */

  useEffect(() => {
    if (
      mesesCurso.length ===
      0
    ) {
      setIndiceMes(
        0
      );

      return;
    }

    const hoy =
      new Date();

    const actual =
      mesesCurso.findIndex(
        (
          item
        ) =>
          item.anio ===
            hoy.getFullYear() &&
          item.mes ===
            hoy.getMonth() +
              1
      );

    setIndiceMes(
      actual >= 0
        ? actual
        : 0
    );
  }, [
    cursoAcademico?.id,
    mesesCurso.length,
  ]);

  /* =========================================================
     DATOS DEL ALUMNO / MES
     ========================================================= */

  const cargarDatos =
    useCallback(
      async () => {
        if (
          !cursoAcademico ||
          !matriculaId ||
          !mesActual
        ) {
          setAsignaturas(
            []
          );

          return;
        }

        try {
          setCargandoDatos(
            true
          );

          const params =
            new URLSearchParams({
              cursoAcademicoId:
                String(
                  cursoAcademico.id
                ),

              matriculaId:
                String(
                  matriculaId
                ),

              anio:
                String(
                  mesActual.anio
                ),

              mes:
                String(
                  mesActual.mes
                ),
            });

          const respuesta =
            await fetch(
              `/api/documentos?${params.toString()}`,
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
            setMensaje(
              resultado.error ??
                "No se han podido cargar los documentos."
            );

            return;
          }

          const lista:
            AsignaturaDocumento[] =
            resultado.asignaturas ??
            [];

          setAsignaturas(
            lista
          );

          setAsignaturaId(
            (
              anterior
            ) => {
              if (
                anterior &&
                lista.some(
                  (
                    item
                  ) =>
                    item.id ===
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

          setResumen(
            resultado.resumen ?? {
              horasTotales:
                0,

              horasAsistidas:
                0,

              porcentaje:
                0,
            }
          );
        } catch {
          setMensaje(
            "No se ha podido conectar con el servidor."
          );
        } finally {
          setCargandoDatos(
            false
          );
        }
      },
      [
        cursoAcademico,
        matriculaId,
        mesActual,
      ]
    );

  useEffect(() => {
    void cargarDatos();
  }, [
    cargarDatos,
  ]);

  /* =========================================================
     CAMBIO MES
     ========================================================= */

  const anterior =
    () => {
      if (
        indiceMes >
        0
      ) {
        setIndiceMes(
          (
            valor
          ) =>
            valor -
            1
        );
      }
    };

  const siguiente =
    () => {
      if (
        indiceMes <
        mesesCurso.length -
          1
      ) {
        setIndiceMes(
          (
            valor
          ) =>
            valor +
            1
        );
      }
    };

  /* =========================================================
     DESCARGAR RESPUESTA
     ========================================================= */

  const descargarRespuesta =
    async (
      respuesta:
        Response,

      nombrePorDefecto:
        string
    ) => {
      const blob =
        await respuesta.blob();

      const disposition =
        respuesta.headers.get(
          "Content-Disposition"
        );

      const coincidencia =
        disposition?.match(
          /filename="([^"]+)"/
        );

      const nombreArchivo =
        coincidencia?.[1] ??
        nombrePorDefecto;

      const url =
        URL.createObjectURL(
          blob
        );

      const enlace =
        document.createElement(
          "a"
        );

      enlace.href =
        url;

      enlace.download =
        nombreArchivo;

      document.body.appendChild(
        enlace
      );

      enlace.click();

      enlace.remove();

      URL.revokeObjectURL(
        url
      );
    };

  /* =========================================================
     ANEXO V INDIVIDUAL
     ========================================================= */

  const generarAnexoVIndividual =
    async () => {
      if (
        !cursoAcademico ||
        !matriculaId ||
        !asignaturaId ||
        !mesActual
      ) {
        setMensaje(
          "Debe seleccionar alumno, mes y asignatura."
        );

        return;
      }

      try {
        setGenerandoAnexoV(
          true
        );

        setMensaje(
          ""
        );

        const respuesta =
          await fetch(
            "/api/documentos/anexo-v",
            {
              method:
                "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify({
                  cursoAcademicoId:
                    cursoAcademico.id,

                  matriculaId,

                  asignaturaId,

                  anio:
                    mesActual.anio,

                  mes:
                    mesActual.mes,
                }),
            }
          );

        if (
          !respuesta.ok
        ) {
          let mensajeError =
            "No se ha podido generar el Anexo V.";

          try {
            const resultado =
              await respuesta.json();

            mensajeError =
              resultado.error ??
              mensajeError;
          } catch {
            // No era JSON.
          }

          setMensaje(
            mensajeError
          );

          return;
        }

        await descargarRespuesta(
          respuesta,
          "ANEXO_V.pdf"
        );

        setMensaje(
          "✓ Anexo V generado correctamente."
        );
      } catch (
        error
      ) {
        console.error(
          "Error generando Anexo V:",
          error
        );

        setMensaje(
          "No se ha podido conectar con el servidor."
        );
      } finally {
        setGenerandoAnexoV(
          false
        );
      }
    };

  /* =========================================================
     TODOS LOS ANEXOS V
     ========================================================= */

  const generarTodosAnexosV =
    async () => {
      if (
        !cursoAcademico ||
        !matriculaId ||
        !mesActual
      ) {
        setMensaje(
          "Debe seleccionar un alumno y un mes."
        );

        return;
      }

      try {
        setGenerandoTodosV(
          true
        );

        setMensaje(
          ""
        );

        const respuesta =
          await fetch(
            "/api/documentos/anexos-v",
            {
              method:
                "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify({
                  cursoAcademicoId:
                    cursoAcademico.id,

                  matriculaId,

                  anio:
                    mesActual.anio,

                  mes:
                    mesActual.mes,
                }),
            }
          );

        if (
          !respuesta.ok
        ) {
          let mensajeError =
            "No se han podido generar los Anexos V.";

          try {
            const resultado =
              await respuesta.json();

            mensajeError =
              resultado.error ??
              mensajeError;
          } catch {
            // No era JSON.
          }

          setMensaje(
            mensajeError
          );

          return;
        }

        const total =
          Number(
            respuesta.headers.get(
              "X-Total-Generados"
            ) ??
            asignaturas.length
          );

        await descargarRespuesta(
          respuesta,
          "ANEXOS_V.zip"
        );

        setMensaje(
          `✓ Se han generado correctamente ${total} Anexo${total === 1 ? "" : "s"} V.`
        );
      } catch (
        error
      ) {
        console.error(
          "Error generando todos los Anexos V:",
          error
        );

        setMensaje(
          "No se ha podido conectar con el servidor."
        );
      } finally {
        setGenerandoTodosV(
          false
        );
      }
    };

    /* =========================================================
   ANEXO I
   ========================================================= */

const generarAnexoI =
  async () => {
    if (
      !cursoAcademico ||
      !matriculaId ||
      !mesActual
    ) {
      setMensaje(
        "Debe seleccionar un alumno y un mes."
      );

      return;
    }

    try {
      setGenerandoAnexoI(
        true
      );

      setMensaje(
        ""
      );

      const respuesta =
        await fetch(
          "/api/documentos/anexo-i",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                cursoAcademicoId:
                  cursoAcademico.id,

                matriculaId,

                anio:
                  mesActual.anio,

                mes:
                  mesActual.mes,
              }),
          }
        );

      if (
        !respuesta.ok
      ) {
        let mensajeError =
          "No se ha podido generar el Anexo I.";

        try {
          const resultado =
            await respuesta.json();

          mensajeError =
            resultado.error ??
            mensajeError;
        } catch {
          // La respuesta no era JSON.
        }

        setMensaje(
          mensajeError
        );

        return;
      }

      const paginas =
        Number(
          respuesta.headers.get(
            "X-Numero-Paginas"
          ) ??
          1
        );

      const numeroAsignaturas =
        Number(
          respuesta.headers.get(
            "X-Numero-Asignaturas"
          ) ??
          asignaturas.length
        );

      await descargarRespuesta(
        respuesta,
        "ANEXO_I.pdf"
      );

      setMensaje(
        `✓ Anexo I generado correctamente. ${numeroAsignaturas} asignatura${numeroAsignaturas === 1 ? "" : "s"} · ${paginas} página${paginas === 1 ? "" : "s"}.`
      );
    } catch (
      error
    ) {
      console.error(
        "Error generando Anexo I:",
        error
      );

      setMensaje(
        "No se ha podido conectar con el servidor."
      );
    } finally {
      setGenerandoAnexoI(
        false
      );
    }
  };

  /* =========================================================
   EXPEDIENTE COMPLETO
   ========================================================= */

const generarExpedienteCompleto =
  async () => {
    if (
      !cursoAcademico ||
      !matriculaId ||
      !mesActual
    ) {
      setMensaje(
        "Debe seleccionar un alumno y un mes."
      );

      return;
    }

    try {
      setGenerandoExpediente(
        true
      );

      setMensaje(
        ""
      );

      const respuesta =
        await fetch(
          "/api/documentos/expediente",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                cursoAcademicoId:
                  cursoAcademico.id,

                matriculaId,

                anio:
                  mesActual.anio,

                mes:
                  mesActual.mes,
              }),
          }
        );

      if (
        !respuesta.ok
      ) {
        let mensajeError =
          "No se ha podido generar el expediente completo.";

        try {
          const resultado =
            await respuesta.json();

          mensajeError =
            resultado.error ??
            mensajeError;
        } catch {
          // La respuesta no era JSON.
        }

        setMensaje(
          mensajeError
        );

        return;
      }

      const totalAnexosV =
        Number(
          respuesta.headers.get(
            "X-Total-Anexos-V"
          ) ??
          0
        );

      await descargarRespuesta(
        respuesta,
        "EXPEDIENTE.zip"
      );

      setMensaje(
        `✓ Expediente completo generado correctamente. ${totalAnexosV} Anexo${totalAnexosV === 1 ? "" : "s"} V + 1 Anexo I.`
      );
    } catch (
      error
    ) {
      console.error(
        "Error generando expediente:",
        error
      );

      setMensaje(
        "No se ha podido conectar con el servidor."
      );
    } finally {
      setGenerandoExpediente(
        false
      );
    }
  };

  /* =========================================================
   GENERACIÓN MASIVA DEL CENTRO
   ========================================================= */

const generarExpedienteMasivo =
  async () => {
    if (
      !cursoAcademico ||
      !mesActual
    ) {
      setMensaje(
        "Debe seleccionar un curso académico y un mes."
      );

      return;
    }

    /* =====================================================
       CONFIRMACIÓN

       Aquí sí recomiendo confirmación porque puede generar
       muchos documentos de una sola vez.
       ===================================================== */

    const confirmar =
      window.confirm(
        `Se generará la documentación completa de todos los alumnos del curso ${cursoAcademico.nombre} para ${mesActual.nombre} ${mesActual.anio}.\n\nSe crearán todos los Anexos V y el Anexo I de cada alumno.\n\n¿Desea continuar?`
      );

    if (
      !confirmar
    ) {
      return;
    }

    try {
      setGenerandoMasivo(
        true
      );

      setMensaje(
        ""
      );

      const respuesta =
        await fetch(
          "/api/documentos/expediente-masivo",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                cursoAcademicoId:
                  cursoAcademico.id,

                anio:
                  mesActual.anio,

                mes:
                  mesActual.mes,
              }),
          }
        );

      /* ===================================================
         ERROR
         =================================================== */

      if (
        !respuesta.ok
      ) {
        let mensajeError =
          "No se ha podido generar la documentación del centro.";

        try {
          const resultado =
            await respuesta.json();

          mensajeError =
            resultado.error ??
            mensajeError;
        } catch {
          // No era JSON.
        }

        setMensaje(
          mensajeError
        );

        return;
      }

      /* ===================================================
         CONTADORES
         =================================================== */

      const totalExpedientes =
        Number(
          respuesta.headers.get(
            "X-Total-Expedientes"
          ) ??
          0
        );

      const totalAnexosV =
        Number(
          respuesta.headers.get(
            "X-Total-Anexos-V"
          ) ??
          0
        );

      const totalAnexosI =
        Number(
          respuesta.headers.get(
            "X-Total-Anexos-I"
          ) ??
          0
        );

      const totalErrores =
        Number(
          respuesta.headers.get(
            "X-Total-Errores"
          ) ??
          0
        );

      /* ===================================================
         DESCARGAR ZIP
         =================================================== */

      await descargarRespuesta(
        respuesta,
        "DOCUMENTACION_CENTRO.zip"
      );

      /* ===================================================
         MENSAJE
         =================================================== */

      if (
        totalErrores >
        0
      ) {
        setMensaje(
          `✓ Generación finalizada. ${totalExpedientes} expediente${totalExpedientes === 1 ? "" : "s"} · ${totalAnexosV} Anexo${totalAnexosV === 1 ? "" : "s"} V · ${totalAnexosI} Anexo${totalAnexosI === 1 ? "" : "s"} I. Se han producido ${totalErrores} error${totalErrores === 1 ? "" : "es"}; consulte ERRORES_GENERACION.txt dentro del ZIP.`
        );
      } else {
        setMensaje(
          `✓ Documentación del centro generada correctamente. ${totalExpedientes} expediente${totalExpedientes === 1 ? "" : "s"} · ${totalAnexosV} Anexo${totalAnexosV === 1 ? "" : "s"} V · ${totalAnexosI} Anexo${totalAnexosI === 1 ? "" : "s"} I.`
        );
      }
    } catch (
      error
    ) {
      console.error(
        "Error generando documentación masiva:",
        error
      );

      setMensaje(
        "No se ha podido conectar con el servidor."
      );
    } finally {
      setGenerandoMasivo(
        false
      );
    }
  };

  /* =========================================================
     ACCIONES TODAVÍA PENDIENTES
     ========================================================= */

  const generacionPendiente =
    (
      tipo:
        string
    ) => {
      setMensaje(
        `✓ ${tipo} preparado.`
      );
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

        boxSizing:
          "border-box",
      }}
    >
      {/* CABECERA */}

      <div
        style={{
          paddingBottom:
            "18px",

          borderBottom:
            "1px solid var(--cm-borde)",
        }}
      >
        <h1
          style={{
            margin: 0,

            color:
              "var(--cm-texto)",

            fontSize:
              "20px",
          }}
        >
          DOCUMENTOS
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
          Genere la documentación
          mensual de los alumnos.
        </p>

        {cursoAcademico && (
          <div
            style={{
              marginTop:
                "7px",

              color:
                "var(--cm-rojo)",

              fontSize:
                "11px",

              fontWeight:
                700,
            }}
          >
            CURSO ACADÉMICO:{" "}
            {
              cursoAcademico.nombre
            }
          </div>
        )}
      </div>

      {/* MENSAJE */}

      {mensaje && (
        <div
          style={{
            marginTop:
              "15px",

            padding:
              "10px 12px",

            border:
              mensaje.startsWith(
                "✓"
              )
                ? "1px solid var(--cm-exito-borde)"
                : "1px solid var(--cm-rojo-borde)",

            background:
              mensaje.startsWith(
                "✓"
              )
                ? "var(--cm-exito-claro)"
                : "var(--cm-rojo-claro)",

            color:
              mensaje.startsWith(
                "✓"
              )
                ? "var(--cm-exito)"
                : "var(--cm-rojo-oscuro)",

            fontSize:
              "12px",
          }}
        >
          {mensaje}
        </div>
      )}

      {/* SELECCIÓN */}

      <div
        style={{
          display:
            "grid",

          gridTemplateColumns:
            "2fr 1fr",

          gap:
            "14px",

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
            ALUMNO
          </span>

          <select
            value={
              matriculaId ??
              ""
            }

            disabled={
              cargando
            }

            onChange={(
              event
            ) =>
              setMatriculaId(
                event
                  .target
                  .value
                  ? Number(
                      event
                        .target
                        .value
                    )
                  : null
              )
            }

            style={{
              ...inputStyle,

              width:
                "100%",
            }}
          >
            {matriculas.length ===
              0 && (
              <option value="">
                No hay alumnos matriculados
              </option>
            )}

            {matriculas.map(
              (
                matricula
              ) => (
                <option
                  key={
                    matricula.id
                  }

                  value={
                    matricula.id
                  }
                >
                  {
                    matricula
                      .alumno
                      .apellidos
                  }
                  ,{" "}
                  {
                    matricula
                      .alumno
                      .nombre
                  }
                </option>
              )
            )}
          </select>
        </label>

        <div>
          <span
            style={
              labelStyle
            }
          >
            MES
          </span>

          <div
            style={{
              minHeight:
                "39px",

              display:
                "grid",

              gridTemplateColumns:
                "40px 1fr 40px",

              border:
                "1px solid var(--cm-borde-fuerte)",

              background:
                "#ffffff",
            }}
          >
            <button
              type="button"

              onClick={
                anterior
              }

              disabled={
                indiceMes ===
                0
              }

              style={
                botonNavegacion
              }
            >
              ‹
            </button>

            <div
              style={{
                display:
                  "flex",

                alignItems:
                  "center",

                justifyContent:
                  "center",

                color:
                  "var(--cm-texto)",

                fontSize:
                  "12px",

                fontWeight:
                  700,
              }}
            >
              {mesActual
                ? `${mesActual.nombre} ${mesActual.anio}`
                : "-"}
            </div>

            <button
              type="button"

              onClick={
                siguiente
              }

              disabled={
                indiceMes ===
                mesesCurso.length -
                  1
              }

              style={
                botonNavegacion
              }
            >
              ›
            </button>
          </div>
        </div>
      </div>

      {/* DATOS ALUMNO */}

      {matriculaActual && (
        <div
          style={{
            display:
              "grid",

            gridTemplateColumns:
              "1.5fr 2fr 0.8fr",

            border:
              "1px solid var(--cm-borde)",

            borderTop:
              "none",
          }}
        >
          <Dato
            label="ALUMNO"
            valor={`${matriculaActual.alumno.nombre} ${matriculaActual.alumno.apellidos}`}
          />

          <Dato
            label="GRADO"
            valor={`${matriculaActual.grado.nombre} · ${matriculaActual.curso}.º`}
          />

          <Dato
            label="EXPEDIENTE"
            valor={
              matriculaActual.expediente ||
              "-"
            }
          />
        </div>
      )}

      {/* RESUMEN */}

      {matriculaActual &&
        mesActual && (
        <section
          style={{
            marginTop:
              "20px",

            border:
              "1px solid var(--cm-borde)",
          }}
        >
        <button
          type="button"

          onClick={() =>
            setResumenAbierto(
              (
                anterior
              ) =>
                !anterior
            )
          }

          aria-expanded={
            resumenAbierto
          }

          style={{
            width:
              "100%",

            minHeight:
              "46px",

            padding:
              "0 14px",

            border:
              "none",

            background:
              "var(--cm-fondo-suave)",

            display:
              "flex",

            alignItems:
              "center",

            justifyContent:
              "space-between",

            color:
              "var(--cm-texto)",

            fontSize:
              "13px",

            fontWeight:
              700,

            cursor:
              "pointer",

            textAlign:
              "left",
          }}
        >
          <span>
            RESUMEN DEL MES
          </span>

          <span
            style={{
              fontSize:
                "14px",

              color:
                "var(--cm-texto-3)",
            }}
          >
            {resumenAbierto
              ? "▲"
              : "▼"}
          </span>
        </button>

          {resumenAbierto && (
            cargandoDatos ? (
              <div
                style={{
                  padding:
                    "24px",

                  color:
                    "var(--cm-texto-3)",

                  fontSize:
                    "12px",
                }}
              >
                Cargando...
              </div>
            ) : (
              <>
              <div
                style={{
                  display:
                    "grid",

                  gridTemplateColumns:
                    "1fr 150px 150px",

                  background:
                    "var(--cm-borde)",

                  color:
                    "var(--cm-texto-2)",

                  fontSize:
                    "10px",

                  fontWeight:
                    700,
                }}
              >
                <Celda>
                  ASIGNATURA
                </Celda>

                <Celda>
                  HORAS TOTALES
                </Celda>

                <Celda>
                  HORAS ASISTIDAS
                </Celda>
              </div>

              {asignaturas.map(
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
                        "1fr 150px 150px",

                      borderTop:
                        "1px solid var(--cm-borde)",

                      color:
                        "var(--cm-texto-2)",

                      fontSize:
                        "11px",
                    }}
                  >
                    <Celda>
                      {
                        asignatura.nombre
                      }
                    </Celda>

                    <Celda>
                      {formatearNumero(
                        asignatura
                          .mes
                          .horasTotales
                      )}
                    </Celda>

                    <Celda>
                      {formatearNumero(
                        asignatura
                          .mes
                          .horasAsistidas
                      )}
                    </Celda>
                  </div>
                )
              )}

              <div
                style={{
                  display:
                    "grid",

                  gridTemplateColumns:
                    "1fr 150px 150px",

                  borderTop:
                    "2px solid var(--cm-borde-fuerte)",

                  background:
                    "var(--cm-fondo-suave)",

                  color:
                    "var(--cm-texto)",

                  fontSize:
                    "11px",

                  fontWeight:
                    700,
                }}
              >
                <Celda>
                  TOTAL ·{" "}
                  {formatearNumero(
                    resumen.porcentaje,
                    2
                  )}
                  % ASISTENCIA
                </Celda>

                <Celda>
                  {formatearNumero(
                    resumen.horasTotales
                  )}
                </Celda>

                <Celda>
                  {formatearNumero(
                    resumen.horasAsistidas
                  )}
                </Celda>
              </div>
              </>
            )
          )}
        </section>
      )}

      {/* GENERACIÓN */}

      {matriculaActual &&
        mesActual && (
        <section
          style={{
            marginTop:
              "20px",

            border:
              "1px solid var(--cm-borde)",

            padding:
              "18px",
          }}
        >
          <h2
            style={{
              margin:
                "0 0 16px",

              color:
                "var(--cm-texto)",

              fontSize:
                "14px",
            }}
          >
            GENERAR DOCUMENTOS
          </h2>

          <div
            style={{
              display:
                "grid",

              gridTemplateColumns:
                "1fr 1fr",

              gap:
                "14px",
            }}
          >
            {/* TODOS ANEXOS V */}

            <div
              style={
                tarjetaStyle
              }
            >
              <div>
                <div
                  style={
                    tituloTarjetaStyle
                  }
                >
                  TODOS LOS ANEXOS V
                </div>

                <div
                  style={
                    descripcionStyle
                  }
                >
                  Genera un Anexo V por
                  cada asignatura del
                  alumno hasta el mes
                  seleccionado.
                </div>
              </div>

              <button
                type="button"

                onClick={
                  generarTodosAnexosV
                }

                disabled={
                  generandoTodosV ||
                  generandoAnexoV ||
                  generandoAnexoI ||
                  generandoExpediente ||
                  generandoMasivo||
                  asignaturas.length === 0
                }

                style={{
                  ...botonRojo,

                  opacity:
                    generandoTodosV ||
                    generandoAnexoV ||
                    asignaturas.length ===
                      0
                      ? 0.6
                      : 1,

                  cursor:
                    generandoTodosV ||
                    generandoAnexoV ||
                    asignaturas.length ===
                      0
                      ? "default"
                      : "pointer",
                }}
              >
                {generandoTodosV
                  ? "GENERANDO..."
                  : "GENERAR ANEXOS V"}
              </button>
            </div>

            {/* ANEXO V INDIVIDUAL */}

            <div
              style={
                tarjetaStyle
              }
            >
              <div>
                <div
                  style={
                    tituloTarjetaStyle
                  }
                >
                  ANEXO V INDIVIDUAL
                </div>

                <div
                  style={
                    descripcionStyle
                  }
                >
                  Genera únicamente el
                  Anexo V de una
                  asignatura.
                </div>

                <select
                  value={
                    asignaturaId ??
                    ""
                  }

                  onChange={(
                    event
                  ) =>
                    setAsignaturaId(
                      event
                        .target
                        .value
                        ? Number(
                            event
                              .target
                              .value
                          )
                        : null
                    )
                  }

                  style={{
                    ...inputStyle,

                    width:
                      "100%",

                    marginTop:
                      "12px",
                  }}
                >
                  {asignaturas.map(
                    (
                      asignatura
                    ) => (
                      <option
                        key={
                          asignatura.id
                        }

                        value={
                          asignatura.id
                        }
                      >
                        {
                          asignatura.codigo
                        }{" "}
                        ·{" "}
                        {
                          asignatura.nombre
                        }
                      </option>
                    )
                  )}
                </select>
              </div>

              <button
                type="button"

                onClick={
                  generarAnexoVIndividual
                }

                disabled={
                  generandoAnexoV ||
                  generandoTodosV ||
                  generandoAnexoI ||
                  generandoExpediente ||
                  generandoMasivo||
                  !asignaturaId
                }

                style={{
                  ...botonRojo,

                  opacity:
                    generandoAnexoV ||
                    generandoTodosV ||
                    !asignaturaId
                      ? 0.6
                      : 1,

                  cursor:
                    generandoAnexoV ||
                    generandoTodosV ||
                    !asignaturaId
                      ? "default"
                      : "pointer",
                }}
              >
                {generandoAnexoV
                  ? "GENERANDO..."
                  : "GENERAR ANEXO V"}
              </button>
            </div>

            {/* ANEXO I */}

            <div
  style={
    tarjetaStyle
  }
>
  <div>
    <div
      style={
        tituloTarjetaStyle
      }
    >
      ANEXO I
    </div>

    <div
      style={
        descripcionStyle
      }
    >
      Genera el Anexo I
      correspondiente al alumno y
      mes seleccionados.
    </div>
  </div>

  <button
    type="button"

    onClick={
      generarAnexoI
    }

    disabled={
      generandoAnexoI ||
      generandoAnexoV ||
      generandoTodosV ||
      generandoExpediente ||
      generandoMasivo||
      generandoTodosV
    }

    style={{
      ...botonRojo,

      opacity:
        generandoAnexoI ||
        generandoAnexoV ||
        generandoTodosV
          ? 0.6
          : 1,

      cursor:
        generandoAnexoI ||
        generandoAnexoV ||
        generandoTodosV
          ? "default"
          : "pointer",
    }}
  >
    {generandoAnexoI
      ? "GENERANDO..."
      : "GENERAR ANEXO I"}
  </button>
</div>

            {/* EXPEDIENTE */}

            <div
  style={
    tarjetaStyle
  }
>
  <div>
    <div
      style={
        tituloTarjetaStyle
      }
    >
      EXPEDIENTE COMPLETO
    </div>

    <div
      style={
        descripcionStyle
      }
    >
      Genera todos los Anexos V y
      el Anexo I del alumno para el
      mes seleccionado.
    </div>
  </div>

  <button
    type="button"

    onClick={
      generarExpedienteCompleto
    }

    disabled={
      generandoExpediente ||
      generandoAnexoI ||
      generandoAnexoV ||
      generandoMasivo||
      generandoTodosV
    }

    style={{
      ...botonRojo,

      opacity:
        generandoExpediente ||
        generandoAnexoI ||
        generandoAnexoV ||
        generandoTodosV
          ? 0.6
          : 1,

      cursor:
        generandoExpediente ||
        generandoAnexoI ||
        generandoAnexoV ||
        generandoTodosV
          ? "default"
          : "pointer",
    }}
  >
    {generandoExpediente
      ? "GENERANDO..."
      : "GENERAR EXPEDIENTE"}
  </button>
</div>
          </div>

          {/* MASIVA */}

          <div
            style={{
              marginTop:
                "14px",

              padding:
                "18px",

              display:
                "flex",

              justifyContent:
                "space-between",

              alignItems:
                "center",

              gap:
                "20px",

              border:
                "1px solid var(--cm-borde-fuerte)",

              background:
                "var(--cm-fondo)",
            }}
          >
            <div>
              <div
                style={
                  tituloTarjetaStyle
                }
              >
                GENERACIÓN MASIVA DEL
                CENTRO
              </div>

              <div
                style={
                  descripcionStyle
                }
              >
                Genera los Anexos V y
                Anexo I de todos los
                alumnos matriculados en
                el curso académico para{" "}
                {mesActual.nombre}{" "}
                {mesActual.anio}.
              </div>
            </div>

            <button
  type="button"

  onClick={
    generarExpedienteMasivo
  }

  disabled={
    generandoMasivo ||
    generandoExpediente ||
    generandoAnexoI ||
    generandoAnexoV ||
    generandoTodosV
  }

  style={{
    ...botonRojo,

    opacity:
      generandoMasivo ||
      generandoExpediente ||
      generandoAnexoI ||
      generandoAnexoV ||
      generandoTodosV
        ? 0.6
        : 1,

    cursor:
      generandoMasivo ||
      generandoExpediente ||
      generandoAnexoI ||
      generandoAnexoV ||
      generandoTodosV
        ? "default"
        : "pointer",
  }}
>
  {generandoMasivo
    ? "GENERANDO DOCUMENTACIÓN..."
    : "GENERAR TODO EL CENTRO"}
</button>
          </div>
        </section>
      )}
    </div>
  );
}

/* =========================================================
   COMPONENTES
   ========================================================= */

function Accion({
  titulo,
  descripcion,
  boton,
  onClick,
}: {
  titulo:
    string;

  descripcion:
    string;

  boton:
    string;

  onClick:
    () => void;
}) {
  return (
    <div
      style={
        tarjetaStyle
      }
    >
      <div>
        <div
          style={
            tituloTarjetaStyle
          }
        >
          {titulo}
        </div>

        <div
          style={
            descripcionStyle
          }
        >
          {descripcion}
        </div>
      </div>

      <button
        type="button"

        onClick={
          onClick
        }

        style={
          botonRojo
        }
      >
        {boton}
      </button>
    </div>
  );
}

function Dato({
  label,
  valor,
}: {
  label:
    string;

  valor:
    string;
}) {
  return (
    <div
      style={{
        padding:
          "11px 12px",

        borderRight:
          "1px solid var(--cm-borde)",
      }}
    >
      <div
        style={{
          color:
            "var(--cm-texto-3)",

          fontSize:
            "9px",

          fontWeight:
            700,
        }}
      >
        {label}
      </div>

      <div
        style={{
          marginTop:
            "5px",

          color:
            "var(--cm-texto)",

          fontSize:
            "11px",

          fontWeight:
            600,
        }}
      >
        {valor}
      </div>
    </div>
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
          "10px 12px",

        display:
          "flex",

        alignItems:
          "center",
      }}
    >
      {children}
    </div>
  );
}

/* =========================================================
   MESES
   ========================================================= */

function generarMesesCurso(
  inicioTexto:
    string,

  finTexto:
    string
): MesCurso[] {
  const inicio =
    new Date(
      inicioTexto
    );

  const fin =
    new Date(
      finTexto
    );

  const fecha =
    new Date(
      inicio.getFullYear(),
      inicio.getMonth(),
      1
    );

  const limite =
    new Date(
      fin.getFullYear(),
      fin.getMonth(),
      1
    );

  const resultado:
    MesCurso[] =
    [];

  while (
    fecha <=
    limite
  ) {
    const anio =
      fecha.getFullYear();

    const mes =
      fecha.getMonth() +
      1;

    const nombre =
      new Intl.DateTimeFormat(
        "es-ES",
        {
          month:
            "long",
        }
      )
        .format(
          fecha
        )
        .toUpperCase();

    resultado.push({
      anio,
      mes,

      valor:
        `${anio}-${String(
          mes
        ).padStart(
          2,
          "0"
        )}`,

      nombre,
    });

    fecha.setMonth(
      fecha.getMonth() +
        1
    );
  }

  return resultado;
}

/* =========================================================
   NÚMEROS
   ========================================================= */

function formatearNumero(
  numero:
    number,

  decimales =
    2
) {
  return numero.toLocaleString(
    "es-ES",
    {
      maximumFractionDigits:
        decimales,

      minimumFractionDigits:
        Number.isInteger(
          numero
        )
          ? 0
          : decimales,
    }
  );
}

/* =========================================================
   ESTILOS
   ========================================================= */

const inputStyle:
  React.CSSProperties =
{
  height:
    "39px",

  boxSizing:
    "border-box",

  border:
    "1px solid var(--cm-borde-fuerte)",

  background:
    "#ffffff",

  padding:
    "0 10px",

  color:
    "var(--cm-texto)",

  fontSize:
    "12px",

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
    "10px",

  fontWeight:
    700,
};

const botonNavegacion:
  React.CSSProperties =
{
  border:
    "none",

  background:
    "var(--cm-fondo-suave)",

  color:
    "var(--cm-texto)",

  fontSize:
    "16px",

  cursor:
    "pointer",
};

const botonRojo:
  React.CSSProperties =
{
  minHeight:
    "38px",

  padding:
    "0 16px",

  border:
    "none",

  background:
    "var(--cm-rojo)",

  color:
    "#ffffff",

  fontSize:
    "10px",

  fontWeight:
    700,

  cursor:
    "pointer",

  whiteSpace:
    "nowrap",
};

const tarjetaStyle:
  React.CSSProperties =
{
  minHeight:
    "125px",

  display:
    "flex",

  flexDirection:
    "column",

  justifyContent:
    "space-between",

  alignItems:
    "flex-start",

  gap:
    "16px",

  padding:
    "17px",

  border:
    "1px solid var(--cm-borde)",

  background:
    "#ffffff",
};

const tituloTarjetaStyle:
  React.CSSProperties =
{
  color:
    "var(--cm-texto)",

  fontSize:
    "12px",

  fontWeight:
    700,
};

const descripcionStyle:
  React.CSSProperties =
{
  marginTop:
    "6px",

  color:
    "var(--cm-texto-3)",

  fontSize:
    "11px",

  lineHeight:
    1.5,
};