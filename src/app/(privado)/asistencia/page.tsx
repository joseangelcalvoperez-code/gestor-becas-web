"use client";

import {
  ChangeEvent,
  KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
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

interface Profesor {
  id: number;
  nombre: string;
  apellidos: string;
  dni: string;
}

interface Asignatura {
  id: number;
  codigo: string;
  nombre: string;

  gradoId: number;
  curso: number;

  grado: {
    id: number;
    nombre: string;
  };

  profesor: Profesor;
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

interface DiaSemana {
  fecha: Date | null;
  fechaISO: string | null;
  numero: number | null;
  dentroMes: boolean;
}

interface Semana {
  inicio: Date;
  fin: Date;
  etiqueta: string;
  dias: DiaSemana[];
}

interface CeldaAsistencia {
  asistidas: string;
  noAsistidas: string;
}

type TipoCelda =
  | "asistidas"
  | "noAsistidas";

interface CeldaNavegable {
  fechaISO: string;
  tipo: TipoCelda;
}

interface MesCurso {
  anio: number;
  mes: number;
  valor: string;
  nombre: string;
}

interface ErrorImportacionAsistencia {
  fila: number;
  mensaje: string;
}

/* =========================================================
   CONSTANTES
   ========================================================= */

const NOMBRES_DIAS = [
  "LUNES",
  "MARTES",
  "MIÉRCOLES",
  "JUEVES",
  "VIERNES",
];

/* =========================================================
   COMPONENTE
   ========================================================= */

export default function AsistenciaPage() {
  /* =======================================================
     CURSO ACADÉMICO
     ======================================================= */

  const [
    cursoAcademico,
    setCursoAcademico,
  ] =
    useState<CursoAcademico | null>(
      null
    );

  /* =======================================================
     GRADO
     ======================================================= */

  const [
    gradoId,
    setGradoId,
  ] =
    useState<number | null>(
      null
    );

  /* =======================================================
     ASIGNATURAS
     ======================================================= */

  const [
    asignaturas,
    setAsignaturas,
  ] =
    useState<
      Asignatura[]
    >([]);

  const [
    asignaturaId,
    setAsignaturaId,
  ] =
    useState<number | null>(
      null
    );

  /* =======================================================
     MATRÍCULAS / ALUMNOS
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
     DATOS DE ASISTENCIA
     ======================================================= */

  const [
    valores,
    setValores,
  ] =
    useState<
      Record<
        string,
        CeldaAsistencia
      >
    >({});

  const [
    observaciones,
    setObservaciones,
  ] =
    useState("");

  /* =======================================================
     ESTADO DE INTERFAZ
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
    guardando,
    setGuardando,
  ] =
    useState(false);

  const [
    hayCambios,
    setHayCambios,
  ] =
    useState(false);

  const [
    estadoGuardado,
    setEstadoGuardado,
  ] =
    useState<
      | ""
      | "guardando"
      | "guardado"
      | "error"
    >("");

  const [
    mensaje,
    setMensaje,
  ] =
    useState("");

  /* =======================================================
     EXCEL MASIVO
     ======================================================= */

  const [
    exportandoExcel,
    setExportandoExcel,
  ] =
    useState(false);

  const [
    importandoExcel,
    setImportandoExcel,
  ] =
    useState(false);

  const [
    erroresImportacion,
    setErroresImportacion,
  ] =
    useState<
      ErrorImportacionAsistencia[]
    >([]);

  /* =======================================================
     REFERENCIAS INPUTS
     ======================================================= */

  const inputRefs =
    useRef<
      Record<
        string,
        HTMLInputElement | null
      >
    >({});

  const inputArchivoExcelRef =
    useRef<HTMLInputElement>(
      null
    );

  /* =======================================================
     GRADOS DISPONIBLES
     ======================================================= */

  const gradosDisponibles =
    useMemo(
      () => {
        const mapa =
          new Map<
            number,
            {
              id: number;
              nombre: string;
            }
          >();

        asignaturas.forEach(
          (asignatura) => {
            mapa.set(
              asignatura.grado.id,
              {
                id:
                  asignatura.grado.id,

                nombre:
                  asignatura.grado.nombre,
              }
            );
          }
        );

        return Array.from(
          mapa.values()
        ).sort(
          (a, b) =>
            a.nombre.localeCompare(
              b.nombre,
              "es"
            )
        );
      },
      [
        asignaturas,
      ]
    );

  /* =======================================================
     ASIGNATURAS DEL GRADO SELECCIONADO
     ======================================================= */

  const asignaturasDelGrado =
    useMemo(
      () => {
        if (!gradoId) {
          return [];
        }

        return asignaturas.filter(
          (asignatura) =>
            asignatura.gradoId ===
            gradoId
        );
      },
      [
        asignaturas,
        gradoId,
      ]
    );

  /* =======================================================
     ASIGNATURA ACTUAL
     ======================================================= */

  const asignaturaActual =
    useMemo(
      () =>
        asignaturas.find(
          (item) =>
            item.id ===
            asignaturaId
        ) ?? null,
      [
        asignaturas,
        asignaturaId,
      ]
    );

  /* =======================================================
     MATRÍCULA ACTUAL
     ======================================================= */

  const matriculaActual =
    useMemo(
      () =>
        matriculas.find(
          (item) =>
            item.id ===
            matriculaId
        ) ?? null,
      [
        matriculas,
        matriculaId,
      ]
    );

  /* =======================================================
     MESES DEL CURSO
     ======================================================= */

  const mesesCurso =
    useMemo<
      MesCurso[]
    >(() => {
      if (!cursoAcademico) {
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
    ] ?? null;

  /* =======================================================
     SEMANAS DEL MES
     ======================================================= */

  const semanas =
    useMemo(
      () => {
        if (!mesActual) {
          return [];
        }

        return generarSemanas(
          mesActual.anio,
          mesActual.mes - 1
        );
      },
      [
        mesActual,
      ]
    );

  /* =======================================================
     TOTALES EN TIEMPO REAL
     ======================================================= */

  const resumen =
    useMemo(
      () => {
        let asistidas = 0;
        let noAsistidas = 0;

        Object.values(
          valores
        ).forEach(
          (celda) => {
            asistidas +=
              valorANumero(
                celda.asistidas
              );

            noAsistidas +=
              valorANumero(
                celda.noAsistidas
              );
          }
        );

        const total =
          asistidas +
          noAsistidas;

        const porcentaje =
          total > 0
            ? (
                asistidas /
                total
              ) *
              100
            : 0;

        return {
          horasAsistidas:
            asistidas,

          horasNoAsistidas:
            noAsistidas,

          horasTotales:
            total,

          porcentaje,
        };
      },
      [
        valores,
      ]
    );

  /* =======================================================
     MATRIZ PARA NAVEGACIÓN CON TECLADO
     ======================================================= */

  const celdasPorFila =
    useMemo(
      () =>
        semanas.map(
          (semana) => {
            const fila:
              Array<
                CeldaNavegable | null
              > = [];

            semana.dias.forEach(
              (dia) => {
                if (
                  !dia.dentroMes ||
                  !dia.fechaISO
                ) {
                  fila.push(
                    null,
                    null
                  );

                  return;
                }

                fila.push(
                  {
                    fechaISO:
                      dia.fechaISO,

                    tipo:
                      "asistidas",
                  },
                  {
                    fechaISO:
                      dia.fechaISO,

                    tipo:
                      "noAsistidas",
                  }
                );
              }
            );

            return fila;
          }
        ),
      [
        semanas,
      ]
    );

  /* =======================================================
     MENSAJES 10 SEGUNDOS
     ======================================================= */

  useEffect(() => {
    if (!mensaje) {
      return;
    }

    const timer =
      window.setTimeout(
        () => {
          setMensaje("");
        },
        10000
      );

    return () => {
      window.clearTimeout(
        timer
      );
    };
  }, [
    mensaje,
  ]);

  /* =======================================================
     RESOLVER CURSO ACADÉMICO SELECCIONADO
     ======================================================= */

  const resolverCurso =
    useCallback(
      async (
        idForzado?: number
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
                item:
                  CursoAcademico
              ) =>
                item.activo
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

          let seleccionado:
            CursoAcademico | undefined;

          if (idForzado) {
            seleccionado =
              cursos.find(
                (item) =>
                  item.id ===
                  idForzado
              );
          }

          if (
            !seleccionado
          ) {
            const guardado =
              window.sessionStorage.getItem(
                "cursoAcademicoSeleccionado"
              );

            if (guardado) {
              seleccionado =
                cursos.find(
                  (item) =>
                    String(
                      item.id
                    ) ===
                    guardado
                );
            }
          }

          if (
            !seleccionado
          ) {
            seleccionado =
              cursos.find(
                (item) =>
                  item.actual
              ) ??
              cursos[0];
          }

          setCursoAcademico(
            seleccionado
          );

          window.sessionStorage.setItem(
            "cursoAcademicoSeleccionado",
            String(
              seleccionado.id
            )
          );

          return seleccionado;
        } catch {
          setMensaje(
            "No se ha podido conectar con el servidor."
          );

          return null;
        }
      },
      []
    );

  /* =======================================================
     CARGAR ASIGNATURAS
     ======================================================= */

  const cargarAsignaturas =
    useCallback(
      async (
        cursoId: number
      ) => {
        try {
          setCargando(
            true
          );

          const respuesta =
            await fetch(
              `/api/asistencia?cursoAcademicoId=${cursoId}`,
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
                "No se han podido cargar las asignaturas."
            );

            return;
          }

          const lista:
            Asignatura[] =
            resultado.asignaturas ??
            [];

          setAsignaturas(
            lista
          );

          /*
           * La pantalla siempre comienza sin selección.
           * El usuario debe completar:
           * GRADO → ASIGNATURA → ALUMNO.
           */

          setGradoId(
            null
          );

          setAsignaturaId(
            null
          );

          setMatriculas(
            []
          );

          setMatriculaId(
            null
          );

          setValores(
            {}
          );

          setObservaciones(
            ""
          );

          setHayCambios(
            false
          );

          setEstadoGuardado(
            ""
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

  /* =======================================================
     CARGA INICIAL
     ======================================================= */

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

        await cargarAsignaturas(
          curso.id
        );
      };

    void iniciar();
  }, [
    resolverCurso,
    cargarAsignaturas,
  ]);

  /* =======================================================
     CAMBIO DE CURSO DESDE EL HEADER
     ======================================================= */

  useEffect(() => {
    const cambiarCurso =
      async (
        event: Event
      ) => {
        const custom =
          event as CustomEvent<{
            id: number;
          }>;

        const id =
          Number(
            custom.detail?.id
          );

        if (
          !Number.isInteger(
            id
          ) ||
          id <= 0
        ) {
          return;
        }

        setAsignaturas(
          []
        );

        setGradoId(
          null
        );

        setAsignaturaId(
          null
        );

        setMatriculas(
          []
        );

        setMatriculaId(
          null
        );

        setValores(
          {}
        );

        setObservaciones(
          ""
        );

        setIndiceMes(
          0
        );

        setHayCambios(
          false
        );

        setEstadoGuardado(
          ""
        );

        const curso =
          await resolverCurso(
            id
          );

        if (curso) {
          await cargarAsignaturas(
            curso.id
          );
        }
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
    resolverCurso,
    cargarAsignaturas,
  ]);

  /* =======================================================
     MES INICIAL
     ======================================================= */

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

    const indiceActual =
      mesesCurso.findIndex(
        (item) =>
          item.anio ===
            hoy.getFullYear() &&
          item.mes ===
            hoy.getMonth() +
              1
      );

    setIndiceMes(
      indiceActual >= 0
        ? indiceActual
        : 0
    );
  }, [
    cursoAcademico?.id,
    mesesCurso.length,
  ]);

  /* =======================================================
     AL CAMBIAR ASIGNATURA:
     CARGAR SOLO ALUMNOS COMPATIBLES
     ======================================================= */

  useEffect(() => {
    const cargar =
      async () => {
        if (
          !cursoAcademico ||
          !asignaturaId
        ) {
          setMatriculas(
            []
          );

          setMatriculaId(
            null
          );

          return;
        }

        try {
          const params =
            new URLSearchParams({
              cursoAcademicoId:
                String(
                  cursoAcademico.id
                ),

              asignaturaId:
                String(
                  asignaturaId
                ),
            });

          const respuesta =
            await fetch(
              `/api/asistencia?${params.toString()}`,
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

          /*
           * El alumno no se selecciona automáticamente.
           * El usuario debe elegirlo expresamente.
           */

          setMatriculaId(
            null
          );

          setValores(
            {}
          );

          setObservaciones(
            ""
          );

          setHayCambios(
            false
          );

          setEstadoGuardado(
            ""
          );
        } catch {
          setMensaje(
            "No se ha podido conectar con el servidor."
          );
        }
      };

    void cargar();
  }, [
    cursoAcademico,
    asignaturaId,
  ]);

  /* =======================================================
     CARGAR ASISTENCIA DEL MES
     ======================================================= */

  const cargarDatos =
    useCallback(
      async () => {
        if (
          !cursoAcademico ||
          !asignaturaId ||
          !matriculaId ||
          !mesActual
        ) {
          setValores(
            {}
          );

          setObservaciones(
            ""
          );

          return;
        }

        try {
          setCargandoDatos(
            true
          );

          setEstadoGuardado(
            ""
          );

          const params =
            new URLSearchParams({
              cursoAcademicoId:
                String(
                  cursoAcademico.id
                ),

              asignaturaId:
                String(
                  asignaturaId
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
              `/api/asistencia?${params.toString()}`,
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
                "No se ha podido cargar la asistencia."
            );

            return;
          }

          const nuevosValores:
            Record<
              string,
              CeldaAsistencia
            > = {};

          const dias =
            resultado
              .asistencia
              ?.dias ??
            [];

          for (
            const dia
            of dias
          ) {
            nuevosValores[
              dia.fecha
            ] = {
              asistidas:
                numeroAInput(
                  Number(
                    dia.horasAsistidas ??
                      0
                  )
                ),

              noAsistidas:
                numeroAInput(
                  Number(
                    dia.horasNoAsistidas ??
                      0
                  )
                ),
            };
          }

          setValores(
            nuevosValores
          );

          setObservaciones(
            resultado
              .asistencia
              ?.observaciones ??
              ""
          );

          setHayCambios(
            false
          );

          setEstadoGuardado(
            ""
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
        asignaturaId,
        matriculaId,
        mesActual,
      ]
    );

  useEffect(() => {
    void cargarDatos();
  }, [
    cargarDatos,
  ]);

  /* =======================================================
     CAMBIAR UNA CELDA
     ======================================================= */

  const cambiarValor =
    (
      fecha: string,

      tipo:
        TipoCelda,

      valor: string
    ) => {
      /*
       * Aceptamos:
       * ""
       * 4
       * 4.5
       * 4,5
       */

      if (
        valor !== "" &&
        !/^\d*(?:[.,]\d*)?$/.test(
          valor
        )
      ) {
        return;
      }

      setValores(
        (
          anteriores
        ) => {
          const actual =
            anteriores[
              fecha
            ] ?? {
              asistidas:
                "",
              noAsistidas:
                "",
            };

          return {
            ...anteriores,

            [fecha]: {
              ...actual,

              [tipo]:
                valor,
            },
          };
        }
      );

      setHayCambios(
        true
      );

      setEstadoGuardado(
        ""
      );
    };

  /* =======================================================
     GUARDAR MES COMPLETO
     ======================================================= */

  const guardarMes =
    async () => {
      if (
        !cursoAcademico ||
        !asignaturaId ||
        !matriculaId ||
        !mesActual
      ) {
        setMensaje(
          "Debe seleccionar una asignatura y un alumno."
        );

        return;
      }

      try {
        setGuardando(
          true
        );

        setEstadoGuardado(
          "guardando"
        );

        const registros =
          Object.entries(
            valores
          ).map(
            ([
              fecha,
              valor,
            ]) => ({
              fecha,

              horasAsistidas:
                valorANumero(
                  valor.asistidas
                ),

              horasNoAsistidas:
                valorANumero(
                  valor.noAsistidas
                ),
            })
          );

        const respuesta =
          await fetch(
            "/api/asistencia",
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

                  asignaturaId,

                  matriculaId,

                  anio:
                    mesActual.anio,

                  mes:
                    mesActual.mes,

                  observaciones,

                  registros,
                }),
            }
          );

        const resultado =
          await respuesta.json();

        if (
          !respuesta.ok
        ) {
          setEstadoGuardado(
            "error"
          );

          setMensaje(
            resultado.error ??
              "No se ha podido guardar la asistencia."
          );

          return;
        }

        setHayCambios(
          false
        );

        setEstadoGuardado(
          "guardado"
        );

        setMensaje(
          "✓ Asistencia guardada correctamente."
        );

        /*
         * Recargamos desde BD para comprobar
         * que todo ha quedado persistido.
         */

        await cargarDatos();
      } catch {
        setEstadoGuardado(
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
     NAVEGACIÓN POR TECLADO
     ======================================================= */

  const claveCelda =
    (
      fecha: string,

      tipo:
        TipoCelda
    ) =>
      `${fecha}-${tipo}`;

  const enfocarCelda =
    (
      celda:
        CeldaNavegable |
        null
    ) => {
      if (!celda) {
        return;
      }

      const elemento =
        inputRefs.current[
          claveCelda(
            celda.fechaISO,
            celda.tipo
          )
        ];

      if (elemento) {
        elemento.focus();

        elemento.select();
      }
    };

  const buscarHorizontal =
    (
      fila: number,

      columna: number,

      direccion:
        -1 | 1
    ) => {
      const actual =
        celdasPorFila[
          fila
        ];

      if (!actual) {
        return null;
      }

      let nuevaColumna =
        columna +
        direccion;

      while (
        nuevaColumna >= 0 &&
        nuevaColumna <
          actual.length
      ) {
        if (
          actual[
            nuevaColumna
          ]
        ) {
          return actual[
            nuevaColumna
          ];
        }

        nuevaColumna +=
          direccion;
      }

      /*
       * Si llegamos al final de la fila,
       * pasamos a la siguiente/anterior.
       */

      let nuevaFila =
        fila +
        direccion;

      while (
        nuevaFila >= 0 &&
        nuevaFila <
          celdasPorFila.length
      ) {
        const candidata =
          celdasPorFila[
            nuevaFila
          ];

        if (
          direccion ===
          1
        ) {
          for (
            let i = 0;
            i <
            candidata.length;
            i++
          ) {
            if (
              candidata[i]
            ) {
              return candidata[
                i
              ];
            }
          }
        } else {
          for (
            let i =
              candidata.length -
              1;
            i >= 0;
            i--
          ) {
            if (
              candidata[i]
            ) {
              return candidata[
                i
              ];
            }
          }
        }

        nuevaFila +=
          direccion;
      }

      return null;
    };

  const buscarVertical =
    (
      fila: number,

      columna: number,

      direccion:
        -1 | 1
    ) => {
      let nuevaFila =
        fila +
        direccion;

      while (
        nuevaFila >= 0 &&
        nuevaFila <
          celdasPorFila.length
      ) {
        const candidata =
          celdasPorFila[
            nuevaFila
          ]?.[
            columna
          ];

        if (candidata) {
          return candidata;
        }

        nuevaFila +=
          direccion;
      }

      return null;
    };

  const manejarTecla =
    (
      event:
        KeyboardEvent<HTMLInputElement>,

      fila: number,

      columna: number
    ) => {
      let destino:
        CeldaNavegable |
        null =
        null;

      switch (
        event.key
      ) {
        case "ArrowRight":
        case "Enter":
          destino =
            buscarHorizontal(
              fila,
              columna,
              1
            );
          break;

        case "ArrowLeft":
          destino =
            buscarHorizontal(
              fila,
              columna,
              -1
            );
          break;

        case "ArrowDown":
          destino =
            buscarVertical(
              fila,
              columna,
              1
            );
          break;

        case "ArrowUp":
          destino =
            buscarVertical(
              fila,
              columna,
              -1
            );
          break;

        default:
          return;
      }

      event.preventDefault();

      if (destino) {
        requestAnimationFrame(
          () =>
            enfocarCelda(
              destino
            )
        );
      }
    };

  /* =======================================================
     CAMBIAR MES
     ======================================================= */

  const mesAnterior =
    () => {
      if (
        indiceMes >
        0
      ) {
        setIndiceMes(
          (
            anterior
          ) =>
            anterior - 1
        );

        setHayCambios(
          false
        );

        setEstadoGuardado(
          ""
        );
      }
    };

  const mesSiguiente =
    () => {
      if (
        indiceMes <
        mesesCurso.length -
          1
      ) {
        setIndiceMes(
          (
            anterior
          ) =>
            anterior + 1
        );

        setHayCambios(
          false
        );

        setEstadoGuardado(
          ""
        );
      }
    };

  /* =======================================================
     EXPORTAR ASISTENCIA MASIVA A EXCEL
     ======================================================= */

  const exportarPlantillaExcel =
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

      if (importandoExcel) {
        return;
      }

      try {
        setErroresImportacion(
          []
        );

        setExportandoExcel(
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
            `/api/asistencia/exportar?${params.toString()}`,
            {
              cache:
                "no-store",
            }
          );

        if (
          !respuesta.ok
        ) {
          let mensajeError =
            "No se ha podido generar la plantilla Excel de asistencia.";

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
          `ASISTENCIA_${mesActual.nombre}_${mesActual.anio}.xlsx`;

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

        const filas =
          respuesta.headers.get(
            "X-Total-Filas"
          );

        setMensaje(
          `✓ Plantilla Excel generada para ${mesActual.nombre} ${mesActual.anio}${filas ? ` · ${filas} filas` : ""}.`
        );
      } catch (error) {
        console.error(
          "Error exportando asistencia a Excel:",
          error
        );

        setMensaje(
          "No se ha podido conectar con el servidor."
        );
      } finally {
        setExportandoExcel(
          false
        );
      }
    };

  /* =======================================================
     IMPORTAR ASISTENCIA MASIVA DESDE EXCEL
     ======================================================= */

  const seleccionarArchivoExcel =
    () => {
      if (
        !cursoAcademico ||
        !mesActual ||
        importandoExcel ||
        exportandoExcel
      ) {
        return;
      }

      inputArchivoExcelRef.current?.click();
    };

  const importarPlantillaExcel =
    async (
      event:
        ChangeEvent<HTMLInputElement>
    ) => {
      const archivo =
        event.target.files?.[0];

      event.target.value =
        "";

      if (
        !archivo ||
        !cursoAcademico ||
        !mesActual
      ) {
        return;
      }

      const confirmar =
        window.confirm(
          `Va a importar la asistencia de ${mesActual.nombre} ${mesActual.anio} para el curso ${cursoAcademico.nombre}.\n\nArchivo: ${archivo.name}\n\nLa plantilla sustituirá los datos mensuales de las combinaciones alumno-asignatura incluidas. Si existe cualquier error no se guardará ningún cambio.\n\n¿Desea continuar?`
        );

      if (!confirmar) {
        return;
      }

      try {
        setImportandoExcel(
          true
        );

        setErroresImportacion(
          []
        );

        setMensaje(
          ""
        );

        const formData =
          new FormData();

        formData.append(
          "archivo",
          archivo
        );

        formData.append(
          "cursoAcademicoId",
          String(
            cursoAcademico.id
          )
        );

        formData.append(
          "anio",
          String(
            mesActual.anio
          )
        );

        formData.append(
          "mes",
          String(
            mesActual.mes
          )
        );

        const respuesta =
          await fetch(
            "/api/asistencia/importar",
            {
              method:
                "POST",

              body:
                formData,
            }
          );

        const resultado =
          await respuesta.json();

        if (
          !respuesta.ok
        ) {
          if (
            Array.isArray(
              resultado.errores
            )
          ) {
            setErroresImportacion(
              resultado.errores
            );
          }

          setMensaje(
            resultado.error ??
              "No se ha podido importar la plantilla Excel de asistencia."
          );

          return;
        }

        setMensaje(
          `✓ Asistencia importada correctamente para ${mesActual.nombre} ${mesActual.anio} · ${resultado.importados ?? 0} filas · ${resultado.diasGuardados ?? 0} registros diarios.`
        );

        /*
         * Si hay una combinación abierta en pantalla,
         * la recargamos para reflejar inmediatamente
         * los datos importados.
         */

        await cargarDatos();
      } catch (error) {
        console.error(
          "Error importando asistencia desde Excel:",
          error
        );

        setMensaje(
          "No se ha podido conectar con el servidor."
        );
      } finally {
        setImportandoExcel(
          false
        );
      }
    };

  /* =======================================================
     RENDER
     ======================================================= */

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
      {/* ===================================================
          CABECERA
          =================================================== */}

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
          ASISTENCIA
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
          Introduzca y consulte la
          asistencia mensual de los
          alumnos por asignatura.
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

      {/* ===================================================
          MENSAJES
          =================================================== */}

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

      {/* ===================================================
          ASISTENCIA MASIVA POR EXCEL
          =================================================== */}

      {cursoAcademico &&
        mesActual && (
        <div
          style={{
            display:
              "grid",

            gridTemplateColumns:
              "minmax(220px, 0.8fr) minmax(320px, 1.2fr)",

            gap:
              "16px",

            alignItems:
              "end",

            marginTop:
              "18px",

            padding:
              "16px",

            border:
              "1px solid var(--cm-borde)",

            background:
              "var(--cm-fondo)",
          }}
        >
          <label>
            <span
              style={
                labelStyle
              }
            >
              MES PARA EXCEL
            </span>

            <select
              value={
                indiceMes
              }

              onChange={(
                event
              ) => {
                setIndiceMes(
                  Number(
                    event.target.value
                  )
                );

                setHayCambios(
                  false
                );

                setEstadoGuardado(
                  ""
                );
              }}

              disabled={
                exportandoExcel ||
                importandoExcel
              }

              style={{
                ...inputStyle,

                width:
                  "100%",
              }}
            >
              {mesesCurso.map(
                (
                  item,
                  index
                ) => (
                  <option
                    key={
                      item.valor
                    }

                    value={
                      index
                    }
                  >
                    {item.nombre}{" "}
                    {item.anio}
                  </option>
                )
              )}
            </select>
          </label>

          <div>
            <div
              style={{
                marginBottom:
                  "8px",

                color:
                  "var(--cm-texto-2)",

                fontSize:
                  "11px",

                lineHeight:
                  1.45,
              }}
            >
              Genera una plantilla con todos los alumnos y asignaturas del curso para el mes seleccionado. Las asignaturas convalidadas no se incluyen y, si ya existen horas guardadas, aparecerán cumplimentadas.
            </div>

            <div
              style={{
                display:
                  "flex",

                gap:
                  "10px",

                flexWrap:
                  "wrap",
              }}
            >
              <button
                type="button"

                onClick={
                  exportarPlantillaExcel
                }

                disabled={
                  exportandoExcel ||
                  importandoExcel
                }

                style={{
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
                    exportandoExcel ||
                    importandoExcel
                      ? "default"
                      : "pointer",

                  opacity:
                    exportandoExcel ||
                    importandoExcel
                      ? 0.6
                      : 1,
                }}
              >
                {exportandoExcel
                  ? "GENERANDO EXCEL..."
                  : "EXPORTAR PLANTILLA EXCEL"}
              </button>

              <button
                type="button"

                onClick={
                  seleccionarArchivoExcel
                }

                disabled={
                  exportandoExcel ||
                  importandoExcel
                }

                style={{
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
                    exportandoExcel ||
                    importandoExcel
                      ? "default"
                      : "pointer",

                  opacity:
                    exportandoExcel ||
                    importandoExcel
                      ? 0.6
                      : 1,
                }}
              >
                {importandoExcel
                  ? "IMPORTANDO EXCEL..."
                  : "IMPORTAR PLANTILLA EXCEL"}
              </button>

              <input
                ref={
                  inputArchivoExcelRef
                }

                type="file"

                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

                onChange={
                  importarPlantillaExcel
                }

                style={{
                  display:
                    "none",
                }}
              />
            </div>
          </div>
        </div>
      )}

      {erroresImportacion.length >
        0 && (
        <div
          style={{
            width:
              "100%",

            marginTop:
              "14px",

            border:
              "1px solid var(--cm-rojo-borde)",

            background:
              "var(--cm-rojo-claro)",
          }}
        >
          <div
            style={{
              padding:
                "11px 14px",

              color:
                "var(--cm-rojo-oscuro)",

              fontSize:
                "12px",

              fontWeight:
                700,
            }}
          >
            ERRORES DE IMPORTACIÓN (
            {
              erroresImportacion.length
            }
            )
          </div>

          {erroresImportacion.map(
            (
              error,
              index
            ) => (
              <div
                key={`${error.fila}-${index}`}

                style={{
                  display:
                    "grid",

                  gridTemplateColumns:
                    "70px 1fr",

                  padding:
                    "9px 14px",

                  borderTop:
                    "1px solid var(--cm-rojo-borde)",

                  color:
                    "var(--cm-rojo-oscuro)",

                  fontSize:
                    "12px",
                }}
              >
                <strong>
                  Fila{" "}
                  {
                    error.fila
                  }
                </strong>

                <span>
                  {
                    error.mensaje
                  }
                </span>
              </div>
            )
          )}
        </div>
      )}

      {/* ===================================================
          SELECTORES
          =================================================== */}

      {cursoAcademico && (
        <div
          style={{
            display:
              "grid",

            gridTemplateColumns:
              "1fr 1.35fr 1.35fr",

            gap:
              "12px",

            marginTop:
              "18px",

            padding:
              "14px",

            border:
              "1px solid var(--cm-borde)",

            background:
              "var(--cm-fondo-suave)",
          }}
        >
          {/* GRADO */}

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
                gradoId ??
                ""
              }

              disabled={
                cargando
              }

              onChange={(
                event
              ) => {
                const nuevoGradoId =
                  event.target.value
                    ? Number(
                        event.target.value
                      )
                    : null;

                setGradoId(
                  nuevoGradoId
                );

                /*
                 * Al cambiar el grado,
                 * todo lo que depende de él
                 * vuelve a quedar vacío.
                 */

                setAsignaturaId(
                  null
                );

                setMatriculas(
                  []
                );

                setMatriculaId(
                  null
                );

                setValores(
                  {}
                );

                setObservaciones(
                  ""
                );

                setHayCambios(
                  false
                );

                setEstadoGuardado(
                  ""
                );
              }}

              style={{
                ...inputStyle,

                width:
                  "100%",
              }}
            >
              <option value="">
                Seleccione un grado...
              </option>

              {gradosDisponibles.map(
                (grado) => (
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

          {/* ASIGNATURA */}

          <label>
            <span
              style={
                labelStyle
              }
            >
              ASIGNATURA
            </span>

            <select
              value={
                asignaturaId ??
                ""
              }

              disabled={
                !gradoId ||
                cargando
              }

              onChange={(
                event
              ) => {
                setAsignaturaId(
                  event.target.value
                    ? Number(
                        event.target.value
                      )
                    : null
                );

                /*
                 * Nueva asignatura:
                 * alumno vuelve a vacío.
                 */

                setMatriculas(
                  []
                );

                setMatriculaId(
                  null
                );

                setValores(
                  {}
                );

                setObservaciones(
                  ""
                );

                setHayCambios(
                  false
                );

                setEstadoGuardado(
                  ""
                );
              }}

              style={{
                ...inputStyle,

                width:
                  "100%",

                opacity:
                  gradoId
                    ? 1
                    : 0.6,
              }}
            >
              {!gradoId ? (
                <option value="">
                  Seleccione primero un grado
                </option>
              ) : (
                <option value="">
                  Seleccione una asignatura...
                </option>
              )}

              {asignaturasDelGrado.map(
                (asignatura) => (
                  <option
                    key={
                      asignatura.id
                    }

                    value={
                      asignatura.id
                    }
                  >
                    {asignatura.curso}.º
                    {" · "}
                    {
                      asignatura.codigo
                    }
                    {" · "}
                    {
                      asignatura.nombre
                    }
                  </option>
                )
              )}
            </select>
          </label>

          {/* ALUMNO */}

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
                !asignaturaId ||
                matriculas.length ===
                  0
              }

              onChange={(
                event
              ) => {
                setMatriculaId(
                  event.target.value
                    ? Number(
                        event.target.value
                      )
                    : null
                );

                setValores(
                  {}
                );

                setObservaciones(
                  ""
                );

                setHayCambios(
                  false
                );

                setEstadoGuardado(
                  ""
                );
              }}

              style={{
                ...inputStyle,

                width:
                  "100%",

                opacity:
                  asignaturaId
                    ? 1
                    : 0.6,
              }}
            >
              {!asignaturaId ? (
                <option value="">
                  Seleccione primero una asignatura
                </option>
              ) : matriculas.length ===
                0 ? (
                <option value="">
                  No hay alumnos para esta asignatura
                </option>
              ) : (
                <option value="">
                  Seleccione un alumno...
                </option>
              )}

              {matriculas.map(
                (matricula) => (
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
        </div>
      )}

      {/* ===================================================
          DATOS
          =================================================== */}

      {asignaturaActual &&
        matriculaActual && (
        <div
          style={{
            display:
              "grid",

            gridTemplateColumns:
              "1.5fr 2fr 0.7fr 1.4fr",

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

          <Dato
            label="PROFESOR"
            valor={`${asignaturaActual.profesor.nombre} ${asignaturaActual.profesor.apellidos}`}
          />
        </div>
      )}

      {/* ===================================================
          CALENDARIO DE ASISTENCIA
          =================================================== */}

      {asignaturaActual &&
        matriculaActual &&
        mesActual && (
        <>
          <div
            style={{
              marginTop:
                "18px",

              border:
                "1px solid var(--cm-linea-tabla)",

              overflowX:
                "auto",
            }}
          >
            {/* CABECERA DEL MES */}

            <div
              style={{
                display:
                  "grid",

                gridTemplateColumns:
                  "1fr auto 1fr",

                alignItems:
                  "center",

                minHeight:
                  "52px",

                background:
                  "var(--cm-oscuro)",

                color:
                  "#ffffff",
              }}
            >
              <div />

              <div
                style={{
                  display:
                    "flex",

                  alignItems:
                    "center",

                  justifyContent:
                    "center",

                  gap:
                    "18px",
                }}
              >
                <button
                  type="button"

                  onClick={
                    mesAnterior
                  }

                  disabled={
                    indiceMes ===
                    0
                  }

                  style={{
                    ...botonMes,

                    opacity:
                      indiceMes ===
                      0
                        ? 0.4
                        : 1,
                  }}
                >
                  ‹
                </button>

                <div
                  style={{
                    minWidth:
                      "125px",

                    textAlign:
                      "center",
                  }}
                >
                  <div
                    style={{
                      fontWeight:
                        700,

                      fontSize:
                        "13px",
                    }}
                  >
                    {
                      mesActual.nombre
                    }
                  </div>

                  <div
                    style={{
                      marginTop:
                        "2px",

                      fontSize:
                        "11px",
                    }}
                  >
                    {
                      mesActual.anio
                    }
                  </div>
                </div>

                <button
                  type="button"

                  onClick={
                    mesSiguiente
                  }

                  disabled={
                    indiceMes ===
                    mesesCurso.length -
                      1
                  }

                  style={{
                    ...botonMes,

                    opacity:
                      indiceMes ===
                      mesesCurso.length -
                        1
                        ? 0.4
                        : 1,
                  }}
                >
                  ›
                </button>
              </div>

              <div
                style={{
                  paddingRight:
                    "14px",

                  textAlign:
                    "right",

                  fontSize:
                    "11px",
                }}
              >
                {estadoGuardado ===
                  "guardando" &&
                  "Guardando..."}

                {estadoGuardado ===
                  "guardado" &&
                  "✓ Datos guardados"}

                {estadoGuardado ===
                  "error" &&
                  "Error al guardar"}
              </div>
            </div>

            {cargandoDatos ? (
              <div
                style={{
                  padding:
                    "35px",

                  textAlign:
                    "center",

                  color:
                    "var(--cm-texto-3)",

                  fontSize:
                    "13px",
                }}
              >
                Cargando asistencia...
              </div>
            ) : (
              <div
                style={{
                  display:
                    "grid",

                  gridTemplateColumns:
                    "minmax(800px, 1fr) 236px",
                }}
              >
                {/* ===============================
                    TABLA SEMANAL
                    =============================== */}

                <table
                  style={{
                    width:
                      "100%",

                    borderCollapse:
                      "collapse",

                    tableLayout:
                      "fixed",

                    color:
                      "var(--cm-texto)",

                    fontSize:
                      "11px",
                  }}
                >
                  <thead>
                    <tr>
                      <th
                        rowSpan={
                          2
                        }

                        style={{
                          ...thStyle,

                          width:
                            "110px",
                        }}
                      >
                        {
                          mesActual.nombre
                        }
                      </th>

                      {NOMBRES_DIAS.map(
                        (
                          dia
                        ) => (
                          <th
                            key={
                              dia
                            }

                            colSpan={
                              2
                            }

                            style={
                              thStyle
                            }
                          >
                            {dia}
                          </th>
                        )
                      )}
                    </tr>

                    <tr>
                      {NOMBRES_DIAS.flatMap(
                        (
                          dia
                        ) => [
                          <th
                            key={`${dia}-a`}

                            style={
                              subThStyle
                            }
                          >
                            Asiste
                          </th>,

                          <th
                            key={`${dia}-na`}

                            style={
                              subThStyle
                            }
                          >
                            No asiste
                          </th>,
                        ]
                      )}
                    </tr>
                  </thead>

                  <tbody>
                    {semanas.map(
                      (
                        semana,
                        indiceFila
                      ) => (
                        <tr
                          key={`${semana.etiqueta}-${indiceFila}`}
                        >
                          {/* SEMANA */}

                          <td
                            style={
                              semanaStyle
                            }
                          >
                            {
                              semana.etiqueta
                            }
                          </td>

                          {/* DÍAS */}

                          {semana.dias.flatMap(
                            (
                              dia,
                              indiceDia
                            ) => {
                              const columnaBase =
                                indiceDia *
                                2;

                              /*
                               * Día que cae fuera del mes.
                               */

                              if (
                                !dia.dentroMes ||
                                !dia.fechaISO
                              ) {
                                return [
                                  <td
                                    key={`${indiceFila}-${indiceDia}-a-vacio`}

                                    style={
                                      celdaFueraMes
                                    }
                                  />,

                                  <td
                                    key={`${indiceFila}-${indiceDia}-na-vacio`}

                                    style={
                                      celdaFueraMes
                                    }
                                  />,
                                ];
                              }

                              const valor =
                                valores[
                                  dia.fechaISO
                                ] ?? {
                                  asistidas:
                                    "",

                                  noAsistidas:
                                    "",
                                };

                              return [
                                /* ASISTE */

                                <td
                                  key={`${dia.fechaISO}-a`}

                                  style={
                                    celdaEditable
                                  }
                                >
                                  <input
                                    ref={(
                                      elemento
                                    ) => {
                                      inputRefs.current[
                                        claveCelda(
                                          dia.fechaISO!,
                                          "asistidas"
                                        )
                                      ] =
                                        elemento;
                                    }}

                                    value={
                                      valor.asistidas
                                    }

                                    inputMode="decimal"

                                    onChange={(
                                      event
                                    ) =>
                                      cambiarValor(
                                        dia.fechaISO!,
                                        "asistidas",
                                        event.target.value
                                      )
                                    }

                                    onKeyDown={(
                                      event
                                    ) =>
                                      manejarTecla(
                                        event,
                                        indiceFila,
                                        columnaBase
                                      )
                                    }

                                    style={
                                      inputCelda
                                    }
                                  />
                                </td>,

                                /* NO ASISTE */

                                <td
                                  key={`${dia.fechaISO}-na`}

                                  style={
                                    celdaEditable
                                  }
                                >
                                  <input
                                    ref={(
                                      elemento
                                    ) => {
                                      inputRefs.current[
                                        claveCelda(
                                          dia.fechaISO!,
                                          "noAsistidas"
                                        )
                                      ] =
                                        elemento;
                                    }}

                                    value={
                                      valor.noAsistidas
                                    }

                                    inputMode="decimal"

                                    onChange={(
                                      event
                                    ) =>
                                      cambiarValor(
                                        dia.fechaISO!,
                                        "noAsistidas",
                                        event.target.value
                                      )
                                    }

                                    onKeyDown={(
                                      event
                                    ) =>
                                      manejarTecla(
                                        event,
                                        indiceFila,
                                        columnaBase +
                                          1
                                      )
                                    }

                                    style={
                                      inputCelda
                                    }
                                  />
                                </td>,
                              ];
                            }
                          )}
                        </tr>
                      )
                    )}
                  </tbody>
                </table>

                {/* ===============================
                    RESUMEN DERECHO
                    =============================== */}

                <aside
                  style={{
                    borderLeft:
                      "2px solid var(--cm-linea-tabla)",

                    background:
                      "#ffffff",
                  }}
                >
                  <div
                    style={{
                      height:
                        "52px",

                      display:
                        "flex",

                      alignItems:
                        "center",

                      justifyContent:
                        "center",

                      borderBottom:
                        "1px solid var(--cm-linea-tabla)",

                      fontSize:
                        "11px",

                      fontWeight:
                        700,
                    }}
                  >
                    ASISTENCIA MES
                  </div>

                  <div
                    style={{
                      padding:
                        "17px 12px",

                      borderBottom:
                        "1px solid var(--cm-linea-tabla)",
                    }}
                  >
                    <ResumenFila
                      label="Horas totales:"
                      valor={
                        formatearNumero(
                          resumen.horasTotales
                        )
                      }
                    />

                    <ResumenFila
                      label="Horas asistidas:"
                      valor={
                        formatearNumero(
                          resumen.horasAsistidas
                        )
                      }
                    />

                    <ResumenFila
                      label="No asistidas:"
                      valor={
                        formatearNumero(
                          resumen.horasNoAsistidas
                        )
                      }
                    />

                    <ResumenFila
                      label="% Asistencia:"
                      valor={`${formatearNumero(
                        resumen.porcentaje,
                        2
                      )}%`}
                    />
                  </div>

                  {/* OBSERVACIONES */}

                  <div
                    style={{
                      padding:
                        "10px",

                      fontSize:
                        "10px",

                      fontWeight:
                        700,

                      textAlign:
                        "center",

                      borderBottom:
                        "1px solid var(--cm-linea-tabla)",
                    }}
                  >
                    OBSERVACIONES / MES
                  </div>

                  <textarea
                    value={
                      observaciones
                    }

                    placeholder="Observaciones del mes..."

                    onChange={(
                      event
                    ) => {
                      setObservaciones(
                        event.target.value
                      );

                      setHayCambios(
                        true
                      );

                      setEstadoGuardado(
                        ""
                      );
                    }}

                    style={{
                      width:
                        "100%",

                      minHeight:
                        "116px",

                      resize:
                        "vertical",

                      border:
                        "none",

                      outline:
                        "none",

                      padding:
                        "10px",

                      boxSizing:
                        "border-box",

                      color:
                        "var(--cm-texto-2)",

                      fontFamily:
                        "inherit",

                      fontSize:
                        "11px",
                    }}
                  />
                </aside>
              </div>
            )}
          </div>

          {/* ===================================================
              AYUDA
              =================================================== */}

          <div
            style={{
              marginTop:
                "8px",

              color:
                "var(--cm-texto-3)",

              fontSize:
                "11px",
            }}
          >
            Utilice ← ↑ → ↓ para
            moverse por las celdas. Enter
            avanza a la siguiente.
            Los datos se guardan al pulsar
            GUARDAR ASISTENCIA.
          </div>

          {/* ===================================================
              BOTÓN GUARDAR
              =================================================== */}

          <div
            style={{
              display:
                "flex",

              justifyContent:
                "flex-end",

              alignItems:
                "center",

              gap:
                "14px",

              marginTop:
                "18px",
            }}
          >
            {hayCambios && (
              <span
                style={{
                  color:
                    "var(--cm-aviso)",

                  fontSize:
                    "11px",

                  fontWeight:
                    600,
                }}
              >
                Hay cambios sin guardar
              </span>
            )}

            <button
              type="button"

              onClick={
                guardarMes
              }

              disabled={
                guardando ||
                !matriculaId ||
                !asignaturaId
              }

              style={{
                minHeight:
                  "40px",

                padding:
                  "0 24px",

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
                  guardando
                    ? "default"
                    : "pointer",

                opacity:
                  guardando
                    ? 0.6
                    : 1,
              }}
            >
              {guardando
                ? "GUARDANDO..."
                : "GUARDAR ASISTENCIA"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/* =========================================================
   COMPONENTES AUXILIARES
   ========================================================= */

function Dato({
  label,
  valor,
}: {
  label: string;
  valor: string;
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

function ResumenFila({
  label,
  valor,
}: {
  label: string;
  valor: string;
}) {
  return (
    <div
      style={{
        display:
          "flex",

        justifyContent:
          "space-between",

        gap:
          "12px",

        marginBottom:
          "13px",

        fontSize:
          "11px",
      }}
    >
      <span>
        {label}
      </span>

      <strong>
        {valor}
      </strong>
    </div>
  );
}

/* =========================================================
   GENERAR MESES
   ========================================================= */

function generarMesesCurso(
  inicioTexto: string,
  finTexto: string
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
      nombre,

      valor:
        `${anio}-${String(
          mes
        ).padStart(
          2,
          "0"
        )}`,
    });

    fecha.setMonth(
      fecha.getMonth() +
        1
    );
  }

  return resultado;
}

/* =========================================================
   GENERAR SEMANAS
   ========================================================= */

function generarSemanas(
  anio: number,
  mes: number
): Semana[] {
  const primerDia =
    new Date(
      anio,
      mes,
      1
    );

  const ultimoDia =
    new Date(
      anio,
      mes + 1,
      0
    );

  /*
   * JavaScript:
   * domingo = 0
   * lunes = 1
   */

  const diaSemanaPrimero =
    primerDia.getDay();

  const desplazamientoLunes =
    diaSemanaPrimero ===
    0
      ? -6
      : 1 -
        diaSemanaPrimero;

  const primerLunes =
    new Date(
      anio,
      mes,
      1 +
        desplazamientoLunes
    );

  const semanas:
    Semana[] =
    [];

  let cursor =
    new Date(
      primerLunes
    );

  while (
    cursor <=
    ultimoDia
  ) {
    const inicio =
      new Date(
        cursor
      );

    const fin =
      new Date(
        cursor
      );

    fin.setDate(
      fin.getDate() +
        6
    );

    const inicioVisible =
      inicio <
      primerDia
        ? primerDia
        : inicio;

    const finVisible =
      fin >
      ultimoDia
        ? ultimoDia
        : fin;

    const dias:
      DiaSemana[] =
      [];

    /*
     * Solo lunes-viernes.
     */

    for (
      let indice = 0;
      indice < 5;
      indice++
    ) {
      const fecha =
        new Date(
          inicio
        );

      fecha.setDate(
        inicio.getDate() +
          indice
      );

      const dentroMes =
        fecha.getMonth() ===
          mes &&
        fecha.getFullYear() ===
          anio;

      dias.push({
        fecha:
          dentroMes
            ? fecha
            : null,

        fechaISO:
          dentroMes
            ? convertirFechaISO(
                fecha
              )
            : null,

        numero:
          dentroMes
            ? fecha.getDate()
            : null,

        dentroMes,
      });
    }

    semanas.push({
      inicio,
      fin,

      etiqueta:
        `${formatoCorto(
          inicioVisible
        )} a ${formatoCorto(
          finVisible
        )}`,

      dias,
    });

    cursor =
      new Date(
        cursor
      );

    cursor.setDate(
      cursor.getDate() +
        7
    );
  }

  return semanas;
}

/* =========================================================
   FECHAS
   ========================================================= */

function convertirFechaISO(
  fecha: Date
) {
  return `${fecha.getFullYear()}-${String(
    fecha.getMonth() +
      1
  ).padStart(
    2,
    "0"
  )}-${String(
    fecha.getDate()
  ).padStart(
    2,
    "0"
  )}`;
}

function formatoCorto(
  fecha: Date
) {
  return `${String(
    fecha.getDate()
  ).padStart(
    2,
    "0"
  )}/${String(
    fecha.getMonth() +
      1
  ).padStart(
    2,
    "0"
  )}`;
}

/* =========================================================
   NÚMEROS
   ========================================================= */

function valorANumero(
  valor: string
) {
  if (
    !valor.trim()
  ) {
    return 0;
  }

  const numero =
    Number(
      valor.replace(
        ",",
        "."
      )
    );

  return Number.isFinite(
    numero
  )
    ? numero
    : 0;
}

function numeroAInput(
  numero: number
) {
  if (
    numero === 0
  ) {
    return "";
  }

  return String(
    numero
  );
}

function formatearNumero(
  numero: number,
  decimales = 2
) {
  const tieneDecimales =
    !Number.isInteger(
      numero
    );

  return numero.toLocaleString(
    "es-ES",
    {
      minimumFractionDigits:
        decimales === 2 &&
        tieneDecimales
          ? 2
          : 0,

      maximumFractionDigits:
        decimales,
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
    "10px",

  fontWeight:
    700,
};

const thStyle:
  React.CSSProperties =
{
  height:
    "28px",

  borderRight:
    "1px solid var(--cm-linea-tabla)",

  borderBottom:
    "1px solid var(--cm-linea-tabla)",

  background:
    "#ffffff",

  color:
    "var(--cm-texto)",

  textAlign:
    "center",

  fontSize:
    "10px",

  fontWeight:
    700,
};

const subThStyle:
  React.CSSProperties =
{
  ...thStyle,

  height:
    "25px",

  fontSize:
    "9px",
};

const semanaStyle:
  React.CSSProperties =
{
  height:
    "48px",

  borderRight:
    "1px solid var(--cm-linea-tabla)",

  borderBottom:
    "1px solid var(--cm-linea-tabla)",

  textAlign:
    "center",

  background:
    "#ffffff",

  fontWeight:
    600,

  whiteSpace:
    "nowrap",
};

const celdaEditable:
  React.CSSProperties =
{
  height:
    "48px",

  padding:
    0,

  borderRight:
    "1px solid var(--cm-linea-tabla)",

  borderBottom:
    "1px solid var(--cm-linea-tabla)",

  background:
    "#ffffff",
};

const celdaFueraMes:
  React.CSSProperties =
{
  ...celdaEditable,

  background:
    "repeating-linear-gradient(135deg, var(--cm-fondo-suave), var(--cm-fondo-suave) 5px, var(--cm-borde) 5px, var(--cm-borde) 9px)",
};

const inputCelda:
  React.CSSProperties =
{
  width:
    "100%",

  height:
    "100%",

  boxSizing:
    "border-box",

  border:
    "none",

  background:
    "transparent",

  outline:
    "none",

  padding:
    "0 5px",

  textAlign:
    "center",

  color:
    "var(--cm-texto)",

  fontSize:
    "13px",

  fontWeight:
    600,
};

const botonMes:
  React.CSSProperties =
{
  width:
    "28px",

  height:
    "28px",

  border:
    "1px solid var(--cm-texto-2)",

  background:
    "var(--cm-oscuro)",

  color:
    "#ffffff",

  cursor:
    "pointer",

  fontSize:
    "16px",
};