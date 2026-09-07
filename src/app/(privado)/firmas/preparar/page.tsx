"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useRouter } from "next/navigation";

interface CursoAcademico {
  id: number;
  nombre: string;
  fechaInicio: string;
  fechaFin: string;
  activo: boolean;
  actual: boolean;
}

interface MesCurso {
  anio: number;
  mes: number;
  nombre: string;
}

interface DocumentoV {
  matriculaId: number;
  expediente: string;

  alumno: {
    id: number;
    nombre: string;
    apellidos: string;
    dni: string;
  };

  asignatura: {
    id: number;
    codigo: string;
    nombre: string;
  };
}

interface GrupoProfesor {
  profesor: {
    id: number;
    nombre: string;
    apellidos: string;
    dni: string;
  };

  documentos:
    DocumentoV[];
}

interface AnexoIAlumno {
  matriculaId: number;
  expediente: string;

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

  curso: number;
  numeroAsignaturas: number;

  profesores: {
    id: number;
    nombre: string;
    apellidos: string;
    dni: string;
  }[];
}

interface DatosPreparacion {
  gruposProfesores:
    GrupoProfesor[];

  anexosI:
    AnexoIAlumno[];
}

export default function PrepararFirmasPage() {
  const router =
    useRouter();

  const [
    cursoAcademico,
    setCursoAcademico,
  ] =
    useState<CursoAcademico | null>(
      null
    );

  const [
    indiceMes,
    setIndiceMes,
  ] =
    useState(0);

  const [
    tipo,
    setTipo,
  ] =
    useState<
      "ANEXO_V" | "ANEXO_I"
    >("ANEXO_V");

  const [
    datos,
    setDatos,
  ] =
    useState<DatosPreparacion>({
      gruposProfesores: [],
      anexosI: [],
    });

  const [
    seleccionV,
    setSeleccionV,
  ] =
    useState<Set<string>>(
      new Set()
    );

  const [
    seleccionI,
    setSeleccionI,
  ] =
    useState<Set<number>>(
      new Set()
    );

  const [
    cargando,
    setCargando,
  ] =
    useState(true);

  const [
    creando,
    setCreando,
  ] =
    useState(false);

  const [
    mensaje,
    setMensaje,
  ] =
    useState("");

  const mesesCurso =
    useMemo(
      () =>
        cursoAcademico
          ? generarMesesCurso(
              cursoAcademico.fechaInicio,
              cursoAcademico.fechaFin
            )
          : [],
      [
        cursoAcademico,
      ]
    );

  const mesActual =
    mesesCurso[
      indiceMes
    ] ??
    null;

  const documentosVSeleccionados =
    useMemo(
      () => {
        const resultado: {
          matriculaId: number;
          asignaturaId: number;
        }[] = [];

        for (
          const grupo of
            datos.gruposProfesores
        ) {
          for (
            const documento of
              grupo.documentos
          ) {
            const clave =
              claveDocumentoV(
                documento
              );

            if (
              seleccionV.has(
                clave
              )
            ) {
              resultado.push({
                matriculaId:
                  documento.matriculaId,

                asignaturaId:
                  documento.asignatura.id,
              });
            }
          }
        }

        return resultado;
      },
      [
        datos.gruposProfesores,
        seleccionV,
      ]
    );

  const totalSeleccionados =
    tipo ===
      "ANEXO_V"
      ? documentosVSeleccionados.length
      : seleccionI.size;

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

          if (
            !curso
          ) {
            const guardado =
              window.sessionStorage.getItem(
                "cursoAcademicoSeleccionado"
              );

            if (
              guardado
            ) {
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

          if (
            !curso
          ) {
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

  useEffect(
    () => {
      const iniciar =
        async () => {
          setCargando(
            true
          );

          await resolverCurso();

          setCargando(
            false
          );
        };

      void iniciar();
    },
    [
      resolverCurso,
    ]
  );

  useEffect(
    () => {
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
            id <=
              0
          ) {
            return;
          }

          setSeleccionV(
            new Set()
          );

          setSeleccionI(
            new Set()
          );

          setDatos({
            gruposProfesores:
              [],
            anexosI:
              [],
          });

          setIndiceMes(
            0
          );

          await resolverCurso(
            id
          );
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
    },
    [
      resolverCurso,
    ]
  );

  useEffect(
    () => {
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

      const indice =
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
        indice >=
          0
          ? indice
          : 0
      );
    },
    [
      cursoAcademico?.id,
      mesesCurso.length,
    ]
  );

  const cargarDatos =
    useCallback(
      async () => {
        if (
          !cursoAcademico ||
          !mesActual
        ) {
          return;
        }

        try {
          setCargando(
            true
          );

          setMensaje(
            ""
          );

          const params =
            new URLSearchParams({
              cursoAcademicoId:
                String(
                  cursoAcademico.id
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
              `/api/firmas/preparar?${params.toString()}`,
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
                "No se han podido preparar los documentos."
            );

            return;
          }

          setDatos({
            gruposProfesores:
              resultado.gruposProfesores ??
              [],

            anexosI:
              resultado.anexosI ??
              [],
          });

          setSeleccionV(
            new Set()
          );

          setSeleccionI(
            new Set()
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
      [
        cursoAcademico,
        mesActual,
      ]
    );

  useEffect(
    () => {
      void cargarDatos();
    },
    [
      cargarDatos,
    ]
  );

  const crearEnvio =
    async () => {
      if (
        !cursoAcademico ||
        !mesActual ||
        totalSeleccionados ===
          0
      ) {
        setMensaje(
          "Debe seleccionar al menos un documento."
        );

        return;
      }

      const confirmar =
        window.confirm(
          tipo ===
            "ANEXO_V"
            ? `Se prepararán ${totalSeleccionados} Anexo${totalSeleccionados === 1 ? "" : "s"} V. El sistema creará un envío independiente por cada profesor implicado.\n\n¿Desea continuar?`
            : `Se prepararán ${totalSeleccionados} Anexo${totalSeleccionados === 1 ? "" : "s"} I. Cada Anexo I tendrá como firmantes a todos los profesores asociados a sus asignaturas.\n\n¿Desea continuar?`
        );

      if (
        !confirmar
      ) {
        return;
      }

      try {
        setCreando(
          true
        );

        setMensaje(
          ""
        );

        const body =
          tipo ===
            "ANEXO_V"
            ? {
                tipo:
                  "ANEXO_V",

                cursoAcademicoId:
                  cursoAcademico.id,

                anio:
                  mesActual.anio,

                mes:
                  mesActual.mes,

                documentos:
                  documentosVSeleccionados,
              }
            : {
                tipo:
                  "ANEXO_I",

                cursoAcademicoId:
                  cursoAcademico.id,

                anio:
                  mesActual.anio,

                mes:
                  mesActual.mes,

                matriculaIds:
                  Array.from(
                    seleccionI
                  ),
              };

        const respuesta =
          await fetch(
            "/api/firmas/envios",
            {
              method:
                "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify(
                  body
                ),
            }
          );

        const resultado =
          await respuesta.json();

        if (
          !respuesta.ok
        ) {
          setMensaje(
            resultado.error ??
              "No se han podido crear los envíos."
          );

          return;
        }

        window.sessionStorage.setItem(
          "mensajeFirmas",
          `✓ Se han creado ${resultado.enviosCreados} envío${resultado.enviosCreados === 1 ? "" : "s"} con ${resultado.documentosCreados} documento${resultado.documentosCreados === 1 ? "" : "s"}.`
        );

        router.push(
          "/firmas"
        );
      } catch {
        setMensaje(
          "No se ha podido conectar con el servidor."
        );
      } finally {
        setCreando(
          false
        );
      }
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
        <button
          type="button"

          onClick={() =>
            router.push(
              "/firmas"
            )
          }

          style={
            volver
          }
        >
          ← VOLVER A FIRMAS
        </button>

        <h1
          style={
            titulo
          }
        >
          PREPARAR DOCUMENTOS
        </h1>

        <p
          style={
            subtitulo
          }
        >
          Seleccione los documentos que
          quiere incorporar al siguiente
          envío de firma.
        </p>

        {cursoAcademico && (
          <div
            style={
              cursoStyle
            }
          >
            CURSO ACADÉMICO:{" "}
            {
              cursoAcademico.nombre
            }
          </div>
        )}
      </div>

      {mensaje && (
        <Mensaje
          texto={
            mensaje
          }
        />
      )}

      <section
        style={
          controles
        }
      >
        <SelectorMes
          indiceMes={
            indiceMes
          }

          total={
            mesesCurso.length
          }

          texto={
            mesActual
              ? `${mesActual.nombre} ${mesActual.anio}`
              : "-"
          }

          anterior={() =>
            setIndiceMes(
              (
                valor
              ) =>
                Math.max(
                  0,
                  valor -
                    1
                )
            )
          }

          siguiente={() =>
            setIndiceMes(
              (
                valor
              ) =>
                Math.min(
                  mesesCurso.length -
                    1,
                  valor +
                    1
                )
            )
          }
        />

        <div>
          <div
            style={
              labelStyle
            }
          >
            TIPO DE DOCUMENTO
          </div>

          <div
            style={
              selectorTipo
            }
          >
            <button
              type="button"

              onClick={() =>
                setTipo(
                  "ANEXO_V"
                )
              }

              style={
                botonTipo(
                  tipo ===
                    "ANEXO_V"
                )
              }
            >
              ANEXOS V
            </button>

            <button
              type="button"

              onClick={() =>
                setTipo(
                  "ANEXO_I"
                )
              }

              style={
                botonTipo(
                  tipo ===
                    "ANEXO_I"
                )
              }
            >
              ANEXOS I
            </button>
          </div>
        </div>
      </section>

      {cargando ? (
        <Cargando />
      ) : tipo ===
        "ANEXO_V" ? (
        <VistaAnexosV
          grupos={
            datos.gruposProfesores
          }

          seleccion={
            seleccionV
          }

          setSeleccion={
            setSeleccionV
          }
        />
      ) : (
        <VistaAnexosI
          anexos={
            datos.anexosI
          }

          seleccion={
            seleccionI
          }

          setSeleccion={
            setSeleccionI
          }
        />
      )}

      {!cargando && (
        <div
          style={
            barraAcciones
          }
        >
          <div>
            <div
              style={
                resumenSeleccion
              }
            >
              {
                totalSeleccionados
              }{" "}
              documento
              {
                totalSeleccionados ===
                1
                  ? ""
                  : "s"
              }{" "}
              seleccionado
              {
                totalSeleccionados ===
                1
                  ? ""
                  : "s"
              }
            </div>

            <div
              style={
                detalleSeleccion
              }
            >
              {tipo ===
                "ANEXO_V"
                ? "Los documentos se agruparán automáticamente en un envío por profesor."
                : "Cada Anexo I será un envío independiente con todos sus profesores como firmantes."}
            </div>
          </div>

          <button
            type="button"

            disabled={
              creando ||
              totalSeleccionados ===
                0
            }

            onClick={
              crearEnvio
            }

            style={{
              ...botonRojo,

              opacity:
                creando ||
                totalSeleccionados ===
                  0
                  ? 0.55
                  : 1,
            }}
          >
            {creando
              ? "CREANDO ENVÍOS..."
              : "CREAR ENVÍO DE FIRMA"}
          </button>
        </div>
      )}
    </div>
  );
}

function VistaAnexosV({
  grupos,
  seleccion,
  setSeleccion,
}: {
  grupos:
    GrupoProfesor[];

  seleccion:
    Set<string>;

  setSeleccion:
    React.Dispatch<
      React.SetStateAction<
        Set<string>
      >
    >;
}) {
  const todos =
    grupos.flatMap(
      (
        grupo
      ) =>
        grupo.documentos
    );

  const todosMarcados =
    todos.length >
      0 &&
    todos.every(
      (
        documento
      ) =>
        seleccion.has(
          claveDocumentoV(
            documento
          )
        )
    );

  const alternarTodos =
    () => {
      if (
        todosMarcados
      ) {
        setSeleccion(
          new Set()
        );
      } else {
        setSeleccion(
          new Set(
            todos.map(
              claveDocumentoV
            )
          )
        );
      }
    };

  return (
    <section
      style={
        seccionListado
      }
    >
      <CabeceraSeccion
        titulo="ANEXOS V POR PROFESOR"

        descripcion="Seleccione documentos individuales, todo un profesor o todos los Anexos V disponibles."
      >
        <label
          style={
            checkGeneral
          }
        >
          <input
            type="checkbox"

            checked={
              todosMarcados
            }

            onChange={
              alternarTodos
            }
          />

          SELECCIONAR TODO
        </label>
      </CabeceraSeccion>

      {grupos.length ===
      0 ? (
        <Vacio
          texto="No se han encontrado Anexos V."
        />
      ) : (
        grupos.map(
          (
            grupo
          ) => {
            const claves =
              grupo.documentos.map(
                claveDocumentoV
              );

            const grupoCompleto =
              claves.every(
                (
                  clave
                ) =>
                  seleccion.has(
                    clave
                  )
              );

            const alternarGrupo =
              () => {
                setSeleccion(
                  (
                    anterior
                  ) => {
                    const siguiente =
                      new Set(
                        anterior
                      );

                    if (
                      grupoCompleto
                    ) {
                      for (
                        const clave of
                          claves
                      ) {
                        siguiente.delete(
                          clave
                        );
                      }
                    } else {
                      for (
                        const clave of
                          claves
                      ) {
                        siguiente.add(
                          clave
                        );
                      }
                    }

                    return siguiente;
                  }
                );
              };

            return (
              <div
                key={
                  grupo.profesor.id
                }

                style={
                  bloqueProfesor
                }
              >
                <div
                  style={
                    cabeceraProfesor
                  }
                >
                  <label
                    style={
                      profesorLabel
                    }
                  >
                    <input
                      type="checkbox"

                      checked={
                        grupoCompleto
                      }

                      onChange={
                        alternarGrupo
                      }
                    />

                    <span>
                      {
                        grupo.profesor
                          .nombre
                      }{" "}
                      {
                        grupo.profesor
                          .apellidos
                      }
                    </span>
                  </label>

                  <div
                    style={
                      contadorRojo
                    }
                  >
                    {
                      grupo.documentos
                        .length
                    }{" "}
                    DOCUMENTOS
                  </div>
                </div>

                <div
                  style={
                    cabeceraDocumentos
                  }
                >
                  <Celda>
                    SELECCIÓN
                  </Celda>

                  <Celda>
                    ALUMNO
                  </Celda>

                  <Celda>
                    ASIGNATURA
                  </Celda>

                  <Celda>
                    EXPEDIENTE
                  </Celda>
                </div>

                {grupo.documentos.map(
                  (
                    documento
                  ) => {
                    const clave =
                      claveDocumentoV(
                        documento
                      );

                    return (
                      <div
                        key={
                          clave
                        }

                        style={
                          filaDocumento
                        }
                      >
                        <Celda>
                          <input
                            type="checkbox"

                            checked={
                              seleccion.has(
                                clave
                              )
                            }

                            onChange={() =>
                              alternarClave(
                                seleccion,
                                setSeleccion,
                                clave
                              )
                            }
                          />
                        </Celda>

                        <Celda>
                          {
                            documento
                              .alumno
                              .apellidos
                          }
                          ,{" "}
                          {
                            documento
                              .alumno
                              .nombre
                          }
                        </Celda>

                        <Celda>
                          {
                            documento
                              .asignatura
                              .codigo
                          }{" "}
                          ·{" "}
                          {
                            documento
                              .asignatura
                              .nombre
                          }
                        </Celda>

                        <Celda>
                          {
                            documento.expediente ||
                            "-"
                          }
                        </Celda>
                      </div>
                    );
                  }
                )}
              </div>
            );
          }
        )
      )}
    </section>
  );
}

function VistaAnexosI({
  anexos,
  seleccion,
  setSeleccion,
}: {
  anexos:
    AnexoIAlumno[];

  seleccion:
    Set<number>;

  setSeleccion:
    React.Dispatch<
      React.SetStateAction<
        Set<number>
      >
    >;
}) {
  const todosMarcados =
    anexos.length >
      0 &&
    anexos.every(
      (
        anexo
      ) =>
        seleccion.has(
          anexo.matriculaId
        )
    );

  const alternarTodos =
    () => {
      if (
        todosMarcados
      ) {
        setSeleccion(
          new Set()
        );
      } else {
        setSeleccion(
          new Set(
            anexos.map(
              (
                anexo
              ) =>
                anexo.matriculaId
            )
          )
        );
      }
    };

  return (
    <section
      style={
        seccionListado
      }
    >
      <CabeceraSeccion
        titulo="ANEXOS I POR ALUMNO"

        descripcion="Cada Anexo I será firmado por todos los profesores únicos de sus asignaturas no convalidadas."
      >
        <label
          style={
            checkGeneral
          }
        >
          <input
            type="checkbox"

            checked={
              todosMarcados
            }

            onChange={
              alternarTodos
            }
          />

          SELECCIONAR TODO
        </label>
      </CabeceraSeccion>

      {anexos.length ===
      0 ? (
        <Vacio
          texto="No se han encontrado Anexos I."
        />
      ) : (
        anexos.map(
          (
            anexo
          ) => (
            <label
              key={
                anexo.matriculaId
              }

              style={
                tarjetaAnexoI
              }
            >
              <input
                type="checkbox"

                checked={
                  seleccion.has(
                    anexo.matriculaId
                  )
                }

                onChange={() =>
                  alternarNumero(
                    setSeleccion,
                    anexo.matriculaId
                  )
                }
              />

              <div
                style={{
                  flex:
                    1,
                }}
              >
                <div
                  style={
                    filaAnexoI
                  }
                >
                  <div>
                    <div
                      style={
                        nombreAlumno
                      }
                    >
                      {
                        anexo.alumno
                          .apellidos
                      }
                      ,{" "}
                      {
                        anexo.alumno
                          .nombre
                      }
                    </div>

                    <div
                      style={
                        textoPequeno
                      }
                    >
                      {
                        anexo.grado
                          .nombre
                      }{" "}
                      ·{" "}
                      {
                        anexo.curso
                      }
                      .º · Expediente{" "}
                      {
                        anexo.expediente ||
                        "-"
                      }
                    </div>
                  </div>

                  <div
                    style={
                      contadorRojo
                    }
                  >
                    {
                      anexo.profesores
                        .length
                    }{" "}
                    FIRMANTES
                  </div>
                </div>

                <div
                  style={
                    firmantesBox
                  }
                >
                  {anexo.profesores.map(
                    (
                      profesor
                    ) => (
                      <span
                        key={
                          profesor.id
                        }

                        style={
                          chip
                        }
                      >
                        {
                          profesor.nombre
                        }{" "}
                        {
                          profesor.apellidos
                        }
                      </span>
                    )
                  )}
                </div>

                <div
                  style={
                    textoPequeno
                  }
                >
                  {
                    anexo.numeroAsignaturas
                  }{" "}
                  asignatura
                  {
                    anexo.numeroAsignaturas ===
                    1
                      ? ""
                      : "s"
                  }{" "}
                  incluida
                  {
                    anexo.numeroAsignaturas ===
                    1
                      ? ""
                      : "s"
                  }.
                </div>
              </div>
            </label>
          )
        )
      )}
    </section>
  );
}

function SelectorMes({
  indiceMes,
  total,
  texto,
  anterior,
  siguiente,
}: {
  indiceMes:
    number;

  total:
    number;

  texto:
    string;

  anterior:
    () => void;

  siguiente:
    () => void;
}) {
  return (
    <div>
      <div
        style={
          labelStyle
        }
      >
        MES
      </div>

      <div
        style={
          selectorMes
        }
      >
        <button
          type="button"

          disabled={
            indiceMes ===
            0
          }

          onClick={
            anterior
          }

          style={
            botonMes
          }
        >
          ‹
        </button>

        <div
          style={
            textoMes
          }
        >
          {texto}
        </div>

        <button
          type="button"

          disabled={
            indiceMes >=
            total -
              1
          }

          onClick={
            siguiente
          }

          style={
            botonMes
          }
        >
          ›
        </button>
      </div>
    </div>
  );
}

function CabeceraSeccion({
  titulo,
  descripcion,
  children,
}: {
  titulo:
    string;

  descripcion:
    string;

  children?:
    React.ReactNode;
}) {
  return (
    <div
      style={
        cabeceraSeccion
      }
    >
      <div>
        <div
          style={
            tituloSeccion
          }
        >
          {titulo}
        </div>

        <div
          style={
            descripcionSeccion
          }
        >
          {descripcion}
        </div>
      </div>

      {children}
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
          "9px 10px",

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

function Mensaje({
  texto,
}: {
  texto:
    string;
}) {
  return (
    <div
      style={{
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
      }}
    >
      {texto}
    </div>
  );
}

function Cargando() {
  return (
    <div
      style={{
        marginTop:
          "20px",

        padding:
          "40px",

        border:
          "1px solid #d7dde5",

        color:
          "#7a879a",

        fontSize:
          "10px",

        textAlign:
          "center",
      }}
    >
      Cargando documentos...
    </div>
  );
}

function Vacio({
  texto,
}: {
  texto:
    string;
}) {
  return (
    <div
      style={{
        minHeight:
          "130px",

        padding:
          "24px",

        display:
          "flex",

        alignItems:
          "center",

        justifyContent:
          "center",

        color:
          "#8793a5",

        fontSize:
          "9px",
      }}
    >
      {texto}
    </div>
  );
}

function claveDocumentoV(
  documento:
    DocumentoV
) {
  return `${documento.matriculaId}-${documento.asignatura.id}`;
}

function alternarClave(
  seleccion:
    Set<string>,

  setSeleccion:
    React.Dispatch<
      React.SetStateAction<
        Set<string>
      >
    >,

  clave:
    string
) {
  const siguiente =
    new Set(
      seleccion
    );

  if (
    siguiente.has(
      clave
    )
  ) {
    siguiente.delete(
      clave
    );
  } else {
    siguiente.add(
      clave
    );
  }

  setSeleccion(
    siguiente
  );
}

function alternarNumero(
  setSeleccion:
    React.Dispatch<
      React.SetStateAction<
        Set<number>
      >
    >,

  id:
    number
) {
  setSeleccion(
    (
      anterior
    ) => {
      const siguiente =
        new Set(
          anterior
        );

      if (
        siguiente.has(
          id
        )
      ) {
        siguiente.delete(
          id
        );
      } else {
        siguiente.add(
          id
        );
      }

      return siguiente;
    }
  );
}

function generarMesesCurso(
  inicioTexto:
    string,

  finTexto:
    string
):
  MesCurso[] {
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
      nombre,
    });

    fecha.setMonth(
      fecha.getMonth() +
        1
    );
  }

  return resultado;
}

/* ESTILOS */

const contenedor:
  React.CSSProperties =
{
  background:
    "#ffffff",

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

const volver:
  React.CSSProperties =
{
  padding:
    0,

  border:
    "none",

  background:
    "transparent",

  color:
    "#65758d",

  fontSize:
    "9px",

  fontWeight:
    700,

  cursor:
    "pointer",
};

const titulo:
  React.CSSProperties =
{
  margin:
    "12px 0 0",

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

const cursoStyle:
  React.CSSProperties =
{
  marginTop:
    "7px",

  color:
    "#e9423a",

  fontSize:
    "9px",

  fontWeight:
    700,
};

const controles:
  React.CSSProperties =
{
  marginTop:
    "18px",

  padding:
    "16px",

  border:
    "1px solid #d7dde5",

  background:
    "#f8fafc",

  display:
    "grid",

  gridTemplateColumns:
    "1fr 1fr",

  gap:
    "14px",
};

const labelStyle:
  React.CSSProperties =
{
  marginBottom:
    "6px",

  color:
    "#65758d",

  fontSize:
    "8px",

  fontWeight:
    700,
};

const selectorMes:
  React.CSSProperties =
{
  minHeight:
    "39px",

  display:
    "grid",

  gridTemplateColumns:
    "40px 1fr 40px",

  border:
    "1px solid #cbd3df",

  background:
    "#ffffff",
};

const botonMes:
  React.CSSProperties =
{
  border:
    "none",

  background:
    "#f8fafc",

  color:
    "#455166",

  cursor:
    "pointer",

  fontSize:
    "14px",
};

const textoMes:
  React.CSSProperties =
{
  display:
    "flex",

  alignItems:
    "center",

  justifyContent:
    "center",

  color:
    "#303b50",

  fontSize:
    "10px",

  fontWeight:
    700,
};

const selectorTipo:
  React.CSSProperties =
{
  display:
    "grid",

  gridTemplateColumns:
    "1fr 1fr",

  minHeight:
    "39px",

  border:
    "1px solid #cbd3df",

  background:
    "#ffffff",
};

function botonTipo(
  activo:
    boolean
):
  React.CSSProperties {
  return {
    border:
      "none",

    borderRight:
      "1px solid #cbd3df",

    background:
      activo
        ? "#e9423a"
        : "#ffffff",

    color:
      activo
        ? "#ffffff"
        : "#455166",

    fontSize:
      "9px",

    fontWeight:
      700,

    cursor:
      "pointer",
  };
}

const seccionListado:
  React.CSSProperties =
{
  marginTop:
    "20px",

  border:
    "1px solid #d7dde5",
};

const cabeceraSeccion:
  React.CSSProperties =
{
  minHeight:
    "52px",

  padding:
    "12px 16px",

  background:
    "#f8fafc",

  display:
    "flex",

  alignItems:
    "center",

  justifyContent:
    "space-between",

  gap:
    "20px",
};

const tituloSeccion:
  React.CSSProperties =
{
  color:
    "#303b50",

  fontSize:
    "11px",

  fontWeight:
    700,
};

const descripcionSeccion:
  React.CSSProperties =
{
  marginTop:
    "4px",

  color:
    "#8793a5",

  fontSize:
    "8px",
};

const checkGeneral:
  React.CSSProperties =
{
  display:
    "flex",

  alignItems:
    "center",

  gap:
    "7px",

  color:
    "#455166",

  fontSize:
    "8px",

  fontWeight:
    700,

  cursor:
    "pointer",
};

const bloqueProfesor:
  React.CSSProperties =
{
  padding:
    "16px",

  borderTop:
    "1px solid #d7dde5",
};

const cabeceraProfesor:
  React.CSSProperties =
{
  display:
    "flex",

  justifyContent:
    "space-between",

  alignItems:
    "center",

  gap:
    "20px",
};

const profesorLabel:
  React.CSSProperties =
{
  display:
    "flex",

  alignItems:
    "center",

  gap:
    "8px",

  color:
    "#303b50",

  fontSize:
    "11px",

  fontWeight:
    700,

  cursor:
    "pointer",
};

const contadorRojo:
  React.CSSProperties =
{
  color:
    "#e9423a",

  fontSize:
    "9px",

  fontWeight:
    700,
};

const cabeceraDocumentos:
  React.CSSProperties =
{
  marginTop:
    "14px",

  display:
    "grid",

  gridTemplateColumns:
    "90px 1.4fr 1fr 1fr",

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
  display:
    "grid",

  gridTemplateColumns:
    "90px 1.4fr 1fr 1fr",

  borderTop:
    "1px solid #d7dde5",

  color:
    "#4b576b",

  fontSize:
    "9px",
};

const tarjetaAnexoI:
  React.CSSProperties =
{
  padding:
    "16px",

  borderTop:
    "1px solid #d7dde5",

  display:
    "flex",

  alignItems:
    "flex-start",

  gap:
    "12px",

  cursor:
    "pointer",
};

const filaAnexoI:
  React.CSSProperties =
{
  display:
    "flex",

  alignItems:
    "center",

  justifyContent:
    "space-between",

  gap:
    "20px",
};

const nombreAlumno:
  React.CSSProperties =
{
  color:
    "#303b50",

  fontSize:
    "11px",

  fontWeight:
    700,
};

const textoPequeno:
  React.CSSProperties =
{
  marginTop:
    "4px",

  color:
    "#8793a5",

  fontSize:
    "8px",
};

const firmantesBox:
  React.CSSProperties =
{
  margin:
    "10px 0 4px",

  display:
    "flex",

  flexWrap:
    "wrap",

  gap:
    "6px",
};

const chip:
  React.CSSProperties =
{
  padding:
    "5px 7px",

  border:
    "1px solid #d7dde5",

  background:
    "#f8fafc",

  color:
    "#455166",

  fontSize:
    "8px",
};

const barraAcciones:
  React.CSSProperties =
{
  marginTop:
    "20px",

  padding:
    "16px",

  border:
    "1px solid #c8d0db",

  background:
    "#f4f6f8",

  display:
    "flex",

  alignItems:
    "center",

  justifyContent:
    "space-between",

  gap:
    "20px",
};

const resumenSeleccion:
  React.CSSProperties =
{
  color:
    "#303b50",

  fontSize:
    "11px",

  fontWeight:
    700,
};

const detalleSeleccion:
  React.CSSProperties =
{
  marginTop:
    "4px",

  color:
    "#8793a5",

  fontSize:
    "8px",
};

const botonRojo:
  React.CSSProperties =
{
  minHeight:
    "38px",

  padding:
    "0 16px",

  border:
    "1px solid #d73d36",

  background:
    "#e9423a",

  color:
    "#ffffff",

  fontSize:
    "9px",

  fontWeight:
    700,

  cursor:
    "pointer",
};
