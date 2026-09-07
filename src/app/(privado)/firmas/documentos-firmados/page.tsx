"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type TipoDocumento =
  | "ANEXO_I"
  | "ANEXO_V"
  | "PDF_EXTERNO";

type EstadoTrabajo =
  | "PENDIENTE"
  | "PROCESANDO"
  | "COMPLETADO"
  | "ERROR";

interface DocumentoFirmado {
  id: number;
  envioFirmaId:
    number;
  tipo:
    TipoDocumento;
  nombreArchivo:
    string;
  fechaFirma:
    string | null;
  estado:
    "FIRMADO";
  anio:
    number | null;
  mes:
    number | null;
  updatedAt:
    string;

  envioFirma: {
    id: number;
    nombre: string;

    cursoAcademico: {
      id: number;
      nombre:
        string;
    } | null;
  };

  matricula: {
    id: number;
    expediente:
      string;
    curso: number;

    alumno: {
      nombre: string;
      apellidos:
        string;
      dni: string;
    };

    grado: {
      nombre:
        string;
    };
  } | null;

  asignatura: {
    codigo: string;
    nombre: string;
  } | null;
}

interface ProgresoDescarga {
  trabajoId:
    string;

  estado:
    EstadoTrabajo;

  total:
    number;

  procesados:
    number;

  porcentaje:
    number;

  mensaje:
    string;

  error:
    string | null;
}

export default function DocumentosFirmadosPage() {
  const [
    documentos,
    setDocumentos,
  ] =
    useState<
      DocumentoFirmado[]
    >([]);

  const [
    cargando,
    setCargando,
  ] =
    useState(
      true
    );

  const [
    mensaje,
    setMensaje,
  ] =
    useState(
      ""
    );

  const [
    busqueda,
    setBusqueda,
  ] =
    useState(
      ""
    );

  const [
    tipo,
    setTipo,
  ] =
    useState<
      "TODOS" |
      TipoDocumento
    >(
      "TODOS"
    );

  const [
    cursoAcademico,
    setCursoAcademico,
  ] =
    useState(
      "TODOS"
    );

  const [
    mes,
    setMes,
  ] =
    useState(
      "TODOS"
    );

  const [
    seleccionados,
    setSeleccionados,
  ] =
    useState<
      number[]
    >([]);

  const [
    progreso,
    setProgreso,
  ] =
    useState<
      ProgresoDescarga | null
    >(
      null
    );

  const [
    eliminandoId,
    setEliminandoId,
  ] =
    useState<
      number | null
    >(
      null
    );

  const intervaloRef =
    useRef<
      ReturnType<
        typeof setInterval
      > | null
    >(
      null
    );

  useEffect(
    () => {
      const cargar =
        async () => {
          try {
            setCargando(
              true
            );

            const respuesta =
              await fetch(
                "/api/firmas/documentos-firmados",
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
                  "No se han podido cargar los documentos firmados."
              );

              return;
            }

            setDocumentos(
              resultado.documentos ??
                []
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
        };

      void cargar();

      return () => {
        if (
          intervaloRef.current
        ) {
          clearInterval(
            intervaloRef.current
          );
        }
      };
    },
    []
  );

  const cursos =
    useMemo(
      () => {
        const mapa =
          new Map<
            string,
            string
          >();

        documentos.forEach(
          (
            documento
          ) => {
            const curso =
              documento
                .envioFirma
                .cursoAcademico;

            if (curso) {
              mapa.set(
                String(
                  curso.id
                ),
                curso.nombre
              );
            }
          }
        );

        return Array.from(
          mapa.entries()
        ).sort(
          (
            a,
            b
          ) =>
            b[1].localeCompare(
              a[1],
              "es"
            )
        );
      },
      [
        documentos,
      ]
    );

  const documentosFiltrados =
    useMemo(
      () => {
        const q =
          busqueda
            .trim()
            .toLocaleLowerCase(
              "es"
            );

        return documentos.filter(
          (
            documento
          ) => {
            if (
              tipo !==
                "TODOS" &&
              documento.tipo !==
                tipo
            ) {
              return false;
            }

            if (
              cursoAcademico !==
                "TODOS" &&
              String(
                documento
                  .envioFirma
                  .cursoAcademico
                  ?.id ??
                  ""
              ) !==
                cursoAcademico
            ) {
              return false;
            }

            if (
              mes !==
                "TODOS" &&
              String(
                documento.mes ??
                  ""
              ) !==
                mes
            ) {
              return false;
            }

            if (!q) {
              return true;
            }

            const alumno =
              documento.matricula
                ? `${documento.matricula.alumno.nombre} ${documento.matricula.alumno.apellidos} ${documento.matricula.alumno.dni} ${documento.matricula.expediente}`
                : "";

            const asignatura =
              documento.asignatura
                ? `${documento.asignatura.codigo} ${documento.asignatura.nombre}`
                : "";

            return `${documento.nombreArchivo} ${documento.envioFirma.nombre} ${alumno} ${asignatura}`
              .toLocaleLowerCase(
                "es"
              )
              .includes(
                q
              );
          }
        );
      },
      [
        documentos,
        busqueda,
        tipo,
        cursoAcademico,
        mes,
      ]
    );

  const idsFiltrados =
    useMemo(
      () =>
        documentosFiltrados.map(
          (
            documento
          ) =>
            documento.id
        ),
      [
        documentosFiltrados,
      ]
    );

  const todosFiltradosSeleccionados =
    idsFiltrados.length >
      0 &&
    idsFiltrados.every(
      (
        id
      ) =>
        seleccionados.includes(
          id
        )
    );

  const seleccionadosVisibles =
    documentosFiltrados.filter(
      (
        documento
      ) =>
        seleccionados.includes(
          documento.id
        )
    ).length;

  const descargando =
    progreso !==
      null &&
    (
      progreso.estado ===
        "PENDIENTE" ||
      progreso.estado ===
        "PROCESANDO"
    );

  const urlPdf =
    (
      documento:
        DocumentoFirmado
    ) =>
      `/api/firmas/envios/${documento.envioFirmaId}/documentos/${documento.id}/pdf`;

  const alternarSeleccion =
    (
      id:
        number
    ) => {
      if (
        descargando
      ) {
        return;
      }

      setSeleccionados(
        (
          actuales
        ) =>
          actuales.includes(
            id
          )
            ? actuales.filter(
                (
                  item
                ) =>
                  item !==
                  id
              )
            : [
                ...actuales,
                id,
              ]
      );
    };

  const alternarTodosFiltrados =
    () => {
      if (
        descargando
      ) {
        return;
      }

      setSeleccionados(
        (
          actuales
        ) => {
          if (
            todosFiltradosSeleccionados
          ) {
            return actuales.filter(
              (
                id
              ) =>
                !idsFiltrados.includes(
                  id
                )
            );
          }

          return Array.from(
            new Set([
              ...actuales,
              ...idsFiltrados,
            ])
          );
        }
      );
    };

  const eliminarDocumento =
    async (
      documento:
        DocumentoFirmado
    ) => {
      if (
        descargando ||
        eliminandoId !==
          null
      ) {
        return;
      }

      const confirmar =
        window.confirm(
          `Va a eliminar el PDF almacenado:\n\n${documento.nombreArchivo}\n\nEl documento dejará de estar disponible para consulta y descarga en este buzón.\n\nIMPORTANTE: no se eliminarán el CSV, los hashes, el firmante, la fecha/hora ni las evidencias de firma. Estas evidencias se conservarán durante 5 años.\n\nEsta acción sobre el PDF no se puede deshacer.\n\n¿Desea continuar?`
        );

      if (
        !confirmar
      ) {
        return;
      }

      try {
        setEliminandoId(
          documento.id
        );

        setMensaje(
          ""
        );

        const respuesta =
          await fetch(
            `/api/firmas/documentos-firmados/${documento.id}`,
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
          setMensaje(
            resultado.error ??
              "No se ha podido eliminar el PDF."
          );

          return;
        }

        /*
         * El PDF deja de aparecer en DOCUMENTOS FIRMADOS
         * porque la API de listado solo devuelve documentos
         * que todavía disponen de archivo firmado.
         *
         * La evidencia permanece en la base de datos.
         */
        setDocumentos(
          (
            actuales
          ) =>
            actuales.filter(
              (
                item
              ) =>
                item.id !==
                documento.id
            )
        );

        setSeleccionados(
          (
            actuales
          ) =>
            actuales.filter(
              (
                id
              ) =>
                id !==
                documento.id
            )
        );

        setMensaje(
          "✓ El PDF se ha eliminado del almacenamiento. La evidencia de firma se conserva durante 5 años."
        );
      } catch {
        setMensaje(
          "No se ha podido conectar con el servidor para eliminar el PDF."
        );
      } finally {
        setEliminandoId(
          null
        );
      }
    };

  const iniciarDescarga =
    async (
      ids:
        number[]
    ) => {
      if (
        ids.length ===
          0 ||
        descargando
      ) {
        return;
      }

      if (
        ids.length >
        1000
      ) {
        setMensaje(
          "Puede descargar como máximo 1000 documentos en una misma operación."
        );

        return;
      }

      try {
        setMensaje(
          ""
        );

        setProgreso({
          trabajoId:
            "",

          estado:
            "PENDIENTE",

          total:
            ids.length,

          procesados:
            0,

          porcentaje:
            0,

          mensaje:
            "Iniciando descarga...",

          error:
            null,
        });

        const respuesta =
          await fetch(
            "/api/firmas/documentos-firmados/descargar/iniciar",
            {
              method:
                "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify({
                  documentoIds:
                    ids,
                }),
            }
          );

        const resultado =
          await respuesta.json();

        if (
          !respuesta.ok
        ) {
          setProgreso(
            null
          );

          setMensaje(
            resultado.error ??
              "No se ha podido iniciar la descarga múltiple."
          );

          return;
        }

        const trabajoId =
          String(
            resultado.trabajoId
          );

        setProgreso({
          trabajoId,

          estado:
            "PROCESANDO",

          total:
            resultado.total ??
            ids.length,

          procesados:
            0,

          porcentaje:
            0,

          mensaje:
            "Preparando documentos...",

          error:
            null,
        });

        empezarSeguimiento(
          trabajoId
        );
      } catch {
        setProgreso(
          null
        );

        setMensaje(
          "No se ha podido conectar con el servidor para preparar la descarga."
        );
      }
    };

  const empezarSeguimiento =
    (
      trabajoId:
        string
    ) => {
      if (
        intervaloRef.current
      ) {
        clearInterval(
          intervaloRef.current
        );
      }

      const consultar =
        async () => {
          try {
            const respuesta =
              await fetch(
                `/api/firmas/documentos-firmados/descargar/${encodeURIComponent(
                  trabajoId
                )}/estado`,
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
              detenerSeguimiento();

              setProgreso(
                (
                  actual
                ) =>
                  actual
                    ? {
                        ...actual,

                        estado:
                          "ERROR",

                        error:
                          resultado.error ??
                          "No se ha podido consultar el progreso.",

                        mensaje:
                          "Error preparando la descarga.",
                      }
                    : null
              );

              return;
            }

            const trabajo =
              resultado.trabajo;

            setProgreso({
              trabajoId,

              estado:
                trabajo.estado,

              total:
                trabajo.total,

              procesados:
                trabajo.procesados,

              porcentaje:
                trabajo.porcentaje,

              mensaje:
                trabajo.mensaje,

              error:
                trabajo.error ??
                null,
            });

            if (
              trabajo.estado ===
              "COMPLETADO"
            ) {
              detenerSeguimiento();

              /*
               * Iniciamos la descarga únicamente
               * cuando el servidor confirma 100 %.
               */
              window.location.href =
                `/api/firmas/documentos-firmados/descargar/${encodeURIComponent(
                  trabajoId
                )}/archivo`;

              window.setTimeout(
                () => {
                  setProgreso(
                    null
                  );
                },
                2500
              );
            }

            if (
              trabajo.estado ===
              "ERROR"
            ) {
              detenerSeguimiento();
            }
          } catch {
            detenerSeguimiento();

            setProgreso(
              (
                actual
              ) =>
                actual
                  ? {
                      ...actual,

                      estado:
                        "ERROR",

                      error:
                        "Se ha perdido la conexión mientras se preparaba la descarga.",

                      mensaje:
                        "Error preparando la descarga.",
                    }
                  : null
            );
          }
        };

      /*
       * Primera consulta inmediata.
       */
      void consultar();

      intervaloRef.current =
        setInterval(
          () => {
            void consultar();
          },
          700
        );
    };

  const detenerSeguimiento =
    () => {
      if (
        intervaloRef.current
      ) {
        clearInterval(
          intervaloRef.current
        );

        intervaloRef.current =
          null;
      }
    };

  const cerrarProgreso =
    () => {
      if (
        descargando
      ) {
        return;
      }

      setProgreso(
        null
      );
    };

  return (
    <div
      style={
        contenedor
      }
    >
      <div
        style={
          cabecera
        }
      >
        <h1
          style={
            titulo
          }
        >
          DOCUMENTOS FIRMADOS
        </h1>

        <p
          style={
            subtitulo
          }
        >
          Buzón de documentos cuyo proceso de firma ha finalizado y están disponibles para consulta o descarga.
        </p>
      </div>

      <section
        style={
          avisoRetencion
        }
      >
        <strong>
          DISPONIBILIDAD DE DOCUMENTOS:
        </strong>{" "}
        los PDF firmados estarán disponibles para consulta y descarga durante 6 meses desde la fecha de firma. Transcurrido ese plazo, el PDF se eliminará del almacenamiento, pero la evidencia de firma se conservará durante 5 años.
      </section>

      {mensaje && (
        <div
          style={
            mensajeError
          }
        >
          {mensaje}
        </div>
      )}

      <section
        style={
          filtrosBox
        }
      >
        <div
          style={{
            minWidth:
              0,
          }}
        >
          <label
            style={
              label
            }
          >
            BUSCAR
          </label>

          <input
            value={
              busqueda
            }

            disabled={
              descargando
            }

            onChange={(
              event
            ) =>
              setBusqueda(
                event.target.value
              )
            }

            placeholder="Alumno, expediente, asignatura o documento..."

            style={
              input
            }
          />
        </div>

        <div>
          <label
            style={
              label
            }
          >
            TIPO
          </label>

          <select
            value={
              tipo
            }

            disabled={
              descargando
            }

            onChange={(
              event
            ) =>
              setTipo(
                event.target.value as
                  typeof tipo
              )
            }

            style={
              select
            }
          >
            <option value="TODOS">
              Todos
            </option>

            <option value="ANEXO_I">
              Anexo I
            </option>

            <option value="ANEXO_V">
              Anexo V
            </option>

            <option value="PDF_EXTERNO">
              PDF externo
            </option>
          </select>
        </div>

        <div>
          <label
            style={
              label
            }
          >
            CURSO ACADÉMICO
          </label>

          <select
            value={
              cursoAcademico
            }

            disabled={
              descargando
            }

            onChange={(
              event
            ) =>
              setCursoAcademico(
                event.target.value
              )
            }

            style={
              select
            }
          >
            <option value="TODOS">
              Todos
            </option>

            {cursos.map(
              (
                [
                  id,
                  nombre,
                ]
              ) => (
                <option
                  key={
                    id
                  }
                  value={
                    id
                  }
                >
                  {nombre}
                </option>
              )
            )}
          </select>
        </div>

        <div>
          <label
            style={
              label
            }
          >
            MES
          </label>

          <select
            value={
              mes
            }

            disabled={
              descargando
            }

            onChange={(
              event
            ) =>
              setMes(
                event.target.value
              )
            }

            style={
              select
            }
          >
            <option value="TODOS">
              Todos
            </option>

            {[
              1,
              2,
              3,
              4,
              5,
              6,
              9,
              10,
              11,
              12,
            ].map(
              (
                numeroMes
              ) => (
                <option
                  key={
                    numeroMes
                  }
                  value={
                    numeroMes
                  }
                >
                  {
                    nombreMes(
                      numeroMes
                    )
                  }
                </option>
              )
            )}
          </select>
        </div>
      </section>

      <section
        style={
          barraAcciones
        }
      >
        <div
          style={
            resumenSeleccion
          }
        >
          {seleccionados.length ===
          0
            ? "Seleccione uno o varios documentos para descargarlos juntos."
            : `${seleccionados.length} documento${seleccionados.length === 1 ? "" : "s"} seleccionado${seleccionados.length === 1 ? "" : "s"}${seleccionadosVisibles !== seleccionados.length ? ` · ${seleccionadosVisibles} visible${seleccionadosVisibles === 1 ? "" : "s"} con los filtros actuales` : ""}.`}
        </div>

        <div
          style={
            accionesMultiples
          }
        >
          <button
            type="button"

            onClick={
              alternarTodosFiltrados
            }

            disabled={
              idsFiltrados.length ===
                0 ||
              descargando
            }

            style={{
              ...botonSeleccionar,

              opacity:
                idsFiltrados.length ===
                  0 ||
                descargando
                  ? 0.5
                  : 1,
            }}
          >
            {todosFiltradosSeleccionados
              ? "DESELECCIONAR VISIBLES"
              : "SELECCIONAR VISIBLES"}
          </button>

          <button
            type="button"

            onClick={() =>
              iniciarDescarga(
                seleccionados
              )
            }

            disabled={
              seleccionados.length ===
                0 ||
              descargando
            }

            style={{
              ...botonDescargaMultiple,

              opacity:
                seleccionados.length ===
                  0 ||
                descargando
                  ? 0.5
                  : 1,
            }}
          >
            {`DESCARGAR SELECCIONADOS${seleccionados.length ? ` (${seleccionados.length})` : ""}`}
          </button>

          <button
            type="button"

            onClick={() =>
              iniciarDescarga(
                idsFiltrados
              )
            }

            disabled={
              idsFiltrados.length ===
                0 ||
              idsFiltrados.length >
                1000 ||
              descargando
            }

            title={
              idsFiltrados.length >
              1000
                ? "Aplique filtros para reducir la descarga a un máximo de 1000 documentos."
                : undefined
            }

            style={{
              ...botonDescargaTodos,

              opacity:
                idsFiltrados.length ===
                  0 ||
                idsFiltrados.length >
                  1000 ||
                descargando
                  ? 0.5
                  : 1,
            }}
          >
            {`DESCARGAR TODOS (${idsFiltrados.length})`}
          </button>
        </div>
      </section>

      {progreso && (
        <section
          style={
            progresoBox
          }
        >
          <div
            style={
              progresoCabecera
            }
          >
            <div>
              <div
                style={
                  progresoTitulo
                }
              >
                {progreso.estado ===
                "COMPLETADO"
                  ? "DESCARGA PREPARADA"
                  : progreso.estado ===
                      "ERROR"
                    ? "ERROR EN LA DESCARGA"
                    : "PREPARANDO DESCARGA"}
              </div>

              <div
                style={
                  progresoMensaje
                }
              >
                {
                  progreso.mensaje
                }
              </div>
            </div>

            <div
              style={
                porcentajeTexto
              }
            >
              {
                progreso.porcentaje
              }
              %
            </div>
          </div>

          <div
            style={
              barraExterior
            }
          >
            <div
              style={{
                ...barraInterior,

                width:
                  `${Math.max(
                    0,
                    Math.min(
                      100,
                      progreso.porcentaje
                    )
                  )}%`,

                background:
                  progreso.estado ===
                  "ERROR"
                    ? "#b9362f"
                    : "#e9423a",
              }}
            />
          </div>

          <div
            style={
              progresoPie
            }
          >
            <span>
              {progreso.procesados} de{" "}
              {progreso.total} documentos preparados
            </span>

            {progreso.estado ===
              "ERROR" && (
              <span
                style={
                  errorProgreso
                }
              >
                {progreso.error ??
                  "No se ha podido generar el archivo."}
              </span>
            )}

            {!descargando && (
              <button
                type="button"

                onClick={
                  cerrarProgreso
                }

                style={
                  botonCerrar
                }
              >
                CERRAR
              </button>
            )}
          </div>
        </section>
      )}

      <section
        style={
          tablaBox
        }
      >
        <div
          style={
            cabeceraTabla
          }
        >
          <div>
            <div
              style={
                tituloTabla
              }
            >
              DOCUMENTOS DISPONIBLES
            </div>

            <div
              style={
                subtituloTabla
              }
            >
              {
                documentosFiltrados.length
              }{" "}
              documento
              {
                documentosFiltrados.length ===
                1
                  ? ""
                  : "s"
              }
            </div>
          </div>
        </div>

        <div
          style={
            filaCabecera
          }
        >
          <Celda>
            <input
              type="checkbox"

              checked={
                todosFiltradosSeleccionados
              }

              onChange={
                alternarTodosFiltrados
              }

              disabled={
                idsFiltrados.length ===
                  0 ||
                descargando
              }

              aria-label="Seleccionar todos los documentos visibles"
            />
          </Celda>

          <Celda>
            DOCUMENTO
          </Celda>

          <Celda>
            ALUMNO
          </Celda>

          <Celda>
            ASIGNATURA
          </Celda>

          <Celda>
            PERIODO
          </Celda>

          <Celda>
            FECHA FIRMA
          </Celda>

          <Celda>
            ACCIONES
          </Celda>
        </div>

        {cargando ? (
          <div
            style={
              vacio
            }
          >
            Cargando documentos firmados...
          </div>
        ) : documentosFiltrados.length ===
          0 ? (
          <div
            style={
              vacio
            }
          >
            No hay documentos firmados que coincidan con los filtros seleccionados.
          </div>
        ) : (
          documentosFiltrados.map(
            (
              documento
            ) => (
              <div
                key={
                  documento.id
                }

                style={{
                  ...filaDocumento,

                  background:
                    seleccionados.includes(
                      documento.id
                    )
                      ? "#fff8f7"
                      : "#fff",
                }}
              >
                <Celda>
                  <input
                    type="checkbox"

                    checked={
                      seleccionados.includes(
                        documento.id
                      )
                    }

                    disabled={
                      descargando
                    }

                    onChange={() =>
                      alternarSeleccion(
                        documento.id
                      )
                    }

                    aria-label={`Seleccionar ${documento.nombreArchivo}`}
                  />
                </Celda>

                <Celda>
                  <div>
                    <div
                      style={
                        textoPrincipal
                      }
                    >
                      {
                        documento.nombreArchivo
                      }
                    </div>

                    <div
                      style={
                        textoSecundario
                      }
                    >
                      {
                        etiquetaTipo(
                          documento.tipo
                        )
                      }{" "}
                      ·{" "}
                      {
                        documento.envioFirma
                          .nombre
                      }
                    </div>
                  </div>
                </Celda>

                <Celda>
                  {documento.matricula ? (
                    <div>
                      <div
                        style={
                          textoPrincipal
                        }
                      >
                        {
                          documento.matricula
                            .alumno
                            .apellidos
                        }
                        ,{" "}
                        {
                          documento.matricula
                            .alumno
                            .nombre
                        }
                      </div>

                      <div
                        style={
                          textoSecundario
                        }
                      >
                        EXP.{" "}
                        {documento.matricula
                          .expediente ||
                          "—"}{" "}
                        ·{" "}
                        {
                          documento.matricula
                            .grado
                            .nombre
                        }
                      </div>
                    </div>
                  ) : (
                    "—"
                  )}
                </Celda>

                <Celda>
                  {documento.asignatura
                    ? `${documento.asignatura.codigo} · ${documento.asignatura.nombre}`
                    : documento.tipo ===
                        "ANEXO_I"
                      ? "ANEXO I GLOBAL"
                      : "—"}
                </Celda>

                <Celda>
                  {documento.mes &&
                  documento.anio
                    ? `${nombreMes(
                        documento.mes
                      )} ${documento.anio}`
                    : "—"}
                </Celda>

                <Celda>
                  <div>
                    <div
                      style={
                        textoPrincipal
                      }
                    >
                      {documento.fechaFirma
                        ? formatearFecha(
                            documento.fechaFirma
                          )
                        : "—"}
                    </div>

                    <div
                      style={
                        textoSecundario
                      }
                    >
                      Inicio del plazo de 6 meses
                    </div>
                  </div>
                </Celda>

                <Celda>
                  <div
                    style={{
                      display:
                        "flex",

                      gap:
                        "6px",

                      flexWrap:
                        "wrap",
                    }}
                  >
                    <button
                      type="button"

                      disabled={
                        descargando
                      }

                      style={{
                        ...botonSecundario,

                        opacity:
                          descargando
                            ? 0.5
                            : 1,
                      }}

                      onClick={() =>
                        window.open(
                          urlPdf(
                            documento
                          ),
                          "_blank",
                          "noopener,noreferrer"
                        )
                      }
                    >
                      VER
                    </button>

                    <a
                      href={
                        urlPdf(
                          documento
                        )
                      }

                      download={
                        documento.nombreArchivo
                      }

                      style={{
                        ...botonDescargar,

                        pointerEvents:
                          descargando
                            ? "none"
                            : "auto",

                        opacity:
                          descargando
                            ? 0.5
                            : 1,
                      }}
                    >
                      DESCARGAR
                    </a>

                    <button
                      type="button"

                      disabled={
                        descargando ||
                        eliminandoId !==
                          null
                      }

                      onClick={() =>
                        eliminarDocumento(
                          documento
                        )
                      }

                      style={{
                        ...botonEliminar,

                        opacity:
                          descargando ||
                          eliminandoId !==
                            null
                            ? 0.5
                            : 1,
                      }}
                    >
                      {eliminandoId ===
                      documento.id
                        ? "ELIMINANDO..."
                        : "ELIMINAR"}
                    </button>
                  </div>
                </Celda>
              </div>
            )
          )
        )}
      </section>

      <section
        style={
          info
        }
      >
        <strong>
          DESCARGA MÚLTIPLE:
        </strong>{" "}
        puede descargar hasta 1000 PDF en una misma operación. DESCARGAR SELECCIONADOS utiliza únicamente los documentos marcados. DESCARGAR TODOS utiliza todos los documentos visibles según el buscador y los filtros actuales. Los PDF permanecen disponibles durante 6 meses desde su firma y pueden eliminarse manualmente antes de ese plazo. La eliminación del PDF no elimina la evidencia de firma.
      </section>
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

        minWidth:
          0,

        overflowWrap:
          "anywhere",
      }}
    >
      {children}
    </div>
  );
}

function formatearFecha(
  valor:
    string
) {
  const fecha =
    new Date(
      valor
    );

  if (
    Number.isNaN(
      fecha.getTime()
    )
  ) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "es-ES",
    {
      day:
        "2-digit",

      month:
        "2-digit",

      year:
        "numeric",

      hour:
        "2-digit",

      minute:
        "2-digit",
    }
  ).format(
    fecha
  );
}

function nombreMes(
  mes:
    number
) {
  return [
    "",
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ][mes] ??
    "";
}

function etiquetaTipo(
  tipo:
    TipoDocumento
) {
  return tipo ===
    "ANEXO_I"
    ? "ANEXO I"
    : tipo ===
        "ANEXO_V"
      ? "ANEXO V"
      : "PDF EXTERNO";
}

const contenedor:
  React.CSSProperties =
{
  background:
    "#fff",

  border:
    "1px solid #d7dde5",

  minHeight:
    "calc(100vh - 105px)",

  padding:
    "24px",

  boxSizing:
    "border-box",
};

const cabecera:
  React.CSSProperties =
{
  paddingBottom:
    "18px",

  borderBottom:
    "1px solid #d7dde5",
};

const titulo:
  React.CSSProperties =
{
  margin:
    0,

  color:
    "#303b50",

  fontSize:
    "20px",
};

const subtitulo:
  React.CSSProperties =
{
  margin:
    "6px 0 0",

  color:
    "#8190a8",

  fontSize:
    "11px",
};

const mensajeError:
  React.CSSProperties =
{
  marginTop:
    "15px",

  padding:
    "10px 12px",

  border:
    "1px solid #efb0aa",

  background:
    "#fff0ef",

  color:
    "#b9362f",

  fontSize:
    "10px",
};

const filtrosBox:
  React.CSSProperties =
{
  marginTop:
    "20px",

  padding:
    "14px",

  border:
    "1px solid #d7dde5",

  background:
    "#f8fafc",

  display:
    "grid",

  gridTemplateColumns:
    "minmax(250px, 1fr) 150px 180px 150px",

  gap:
    "12px",

  alignItems:
    "end",
};

const label:
  React.CSSProperties =
{
  display:
    "block",

  marginBottom:
    "6px",

  color:
    "#596474",

  fontSize:
    "8px",

  fontWeight:
    700,
};

const input:
  React.CSSProperties =
{
  width:
    "100%",

  height:
    "34px",

  boxSizing:
    "border-box",

  border:
    "1px solid #cbd3df",

  padding:
    "0 10px",

  background:
    "#fff",

  color:
    "#303b50",

  fontSize:
    "9px",

  outline:
    "none",
};

const select:
  React.CSSProperties =
{
  width:
    "100%",

  height:
    "34px",

  border:
    "1px solid #cbd3df",

  padding:
    "0 8px",

  background:
    "#fff",

  color:
    "#303b50",

  fontSize:
    "9px",
};

const barraAcciones:
  React.CSSProperties =
{
  marginTop:
    "14px",

  padding:
    "12px 14px",

  border:
    "1px solid #d7dde5",

  display:
    "flex",

  alignItems:
    "center",

  justifyContent:
    "space-between",

  gap:
    "12px",

  flexWrap:
    "wrap",
};

const resumenSeleccion:
  React.CSSProperties =
{
  color:
    "#65758d",

  fontSize:
    "9px",
};

const accionesMultiples:
  React.CSSProperties =
{
  display:
    "flex",

  gap:
    "7px",

  flexWrap:
    "wrap",
};

const botonSeleccionar:
  React.CSSProperties =
{
  minHeight:
    "32px",

  padding:
    "0 10px",

  border:
    "1px solid #cbd3df",

  background:
    "#fff",

  color:
    "#455166",

  fontSize:
    "7px",

  fontWeight:
    700,

  cursor:
    "pointer",
};

const botonDescargaMultiple:
  React.CSSProperties =
{
  minHeight:
    "32px",

  padding:
    "0 12px",

  border:
    "1px solid #d73d36",

  background:
    "#e9423a",

  color:
    "#fff",

  fontSize:
    "7px",

  fontWeight:
    700,

  cursor:
    "pointer",
};

const botonDescargaTodos:
  React.CSSProperties =
{
  minHeight:
    "32px",

  padding:
    "0 12px",

  border:
    "1px solid #4f5d73",

  background:
    "#4f5d73",

  color:
    "#fff",

  fontSize:
    "7px",

  fontWeight:
    700,

  cursor:
    "pointer",
};

const progresoBox:
  React.CSSProperties =
{
  marginTop:
    "14px",

  padding:
    "15px",

  border:
    "1px solid #d7dde5",

  background:
    "#f8fafc",
};

const progresoCabecera:
  React.CSSProperties =
{
  display:
    "flex",

  alignItems:
    "flex-start",

  justifyContent:
    "space-between",

  gap:
    "14px",
};

const progresoTitulo:
  React.CSSProperties =
{
  color:
    "#303b50",

  fontSize:
    "9px",

  fontWeight:
    700,
};

const progresoMensaje:
  React.CSSProperties =
{
  marginTop:
    "4px",

  color:
    "#65758d",

  fontSize:
    "9px",
};

const porcentajeTexto:
  React.CSSProperties =
{
  color:
    "#303b50",

  fontSize:
    "18px",

  fontWeight:
    700,

  whiteSpace:
    "nowrap",
};

const barraExterior:
  React.CSSProperties =
{
  height:
    "12px",

  marginTop:
    "13px",

  overflow:
    "hidden",

  border:
    "1px solid #d6dce5",

  background:
    "#e8ecf1",
};

const barraInterior:
  React.CSSProperties =
{
  height:
    "100%",

  transition:
    "width 180ms ease",
};

const progresoPie:
  React.CSSProperties =
{
  marginTop:
    "9px",

  display:
    "flex",

  alignItems:
    "center",

  justifyContent:
    "space-between",

  gap:
    "12px",

  flexWrap:
    "wrap",

  color:
    "#7c8899",

  fontSize:
    "8px",
};

const errorProgreso:
  React.CSSProperties =
{
  flex:
    1,

  color:
    "#b9362f",

  fontWeight:
    600,
};

const botonCerrar:
  React.CSSProperties =
{
  minHeight:
    "28px",

  padding:
    "0 9px",

  border:
    "1px solid #cbd3df",

  background:
    "#fff",

  color:
    "#455166",

  fontSize:
    "7px",

  fontWeight:
    700,

  cursor:
    "pointer",
};

const tablaBox:
  React.CSSProperties =
{
  marginTop:
    "16px",

  border:
    "1px solid #d7dde5",

  overflowX:
    "auto",
};

const cabeceraTabla:
  React.CSSProperties =
{
  minHeight:
    "48px",

  padding:
    "0 16px",

  display:
    "flex",

  alignItems:
    "center",

  background:
    "#f8fafc",

  borderBottom:
    "1px solid #d7dde5",
};

const tituloTabla:
  React.CSSProperties =
{
  color:
    "#303b50",

  fontSize:
    "11px",

  fontWeight:
    700,
};

const subtituloTabla:
  React.CSSProperties =
{
  marginTop:
    "3px",

  color:
    "#8793a5",

  fontSize:
    "8px",
};

const filaCabecera:
  React.CSSProperties =
{
  minWidth:
    "1240px",

  display:
    "grid",

  gridTemplateColumns:
    "44px 1.7fr 1.4fr 1.4fr 110px 150px 220px",

  background:
    "#e1e5eb",

  color:
    "#455166",

  fontSize:
    "8px",

  fontWeight:
    700,
};

const filaDocumento:
  React.CSSProperties =
{
  minWidth:
    "1240px",

  display:
    "grid",

  gridTemplateColumns:
    "44px 1.7fr 1.4fr 1.4fr 110px 150px 220px",

  borderTop:
    "1px solid #d7dde5",

  color:
    "#4b576b",

  fontSize:
    "9px",
};

const vacio:
  React.CSSProperties =
{
  minHeight:
    "150px",

  display:
    "flex",

  alignItems:
    "center",

  justifyContent:
    "center",

  padding:
    "24px",

  color:
    "#8793a5",

  fontSize:
    "9px",
};

const textoPrincipal:
  React.CSSProperties =
{
  color:
    "#303b50",

  fontSize:
    "9px",

  fontWeight:
    600,
};

const textoSecundario:
  React.CSSProperties =
{
  marginTop:
    "3px",

  color:
    "#96a1b1",

  fontSize:
    "7px",
};

const botonSecundario:
  React.CSSProperties =
{
  minHeight:
    "30px",

  padding:
    "0 9px",

  border:
    "1px solid #cbd3df",

  background:
    "#fff",

  color:
    "#455166",

  fontSize:
    "7px",

  fontWeight:
    700,

  cursor:
    "pointer",
};

const botonDescargar:
  React.CSSProperties =
{
  minHeight:
    "30px",

  padding:
    "0 9px",

  border:
    "1px solid #d73d36",

  background:
    "#e9423a",

  color:
    "#fff",

  fontSize:
    "7px",

  fontWeight:
    700,

  textDecoration:
    "none",

  display:
    "inline-flex",

  alignItems:
    "center",

  justifyContent:
    "center",
};


const avisoRetencion:
  React.CSSProperties =
{
  marginTop:
    "16px",

  padding:
    "12px 14px",

  border:
    "1px solid #d7dde5",

  background:
    "#f8fafc",

  color:
    "#65758d",

  fontSize:
    "9px",

  lineHeight:
    1.6,
};

const botonEliminar:
  React.CSSProperties =
{
  minHeight:
    "30px",

  padding:
    "0 9px",

  border:
    "1px solid #d73d36",

  background:
    "#fff",

  color:
    "#d73d36",

  fontSize:
    "7px",

  fontWeight:
    700,

  cursor:
    "pointer",
};

const info:
  React.CSSProperties =
{
  marginTop:
    "20px",

  padding:
    "14px 16px",

  border:
    "1px solid #d7dde5",

  background:
    "#f8fafc",

  color:
    "#65758d",

  fontSize:
    "9px",

  lineHeight:
    1.6,
};
