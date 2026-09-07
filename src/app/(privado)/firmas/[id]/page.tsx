"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useParams,
  useRouter,
} from "next/navigation";

type EstadoEnvio =
  | "BORRADOR"
  | "PENDIENTE"
  | "PARCIAL"
  | "COMPLETADO"
  | "CANCELADO";

interface Documento {
  id: number;
  tipo:
    | "ANEXO_I"
    | "ANEXO_V"
    | "OTRO";
  nombreArchivo:
    string;
  archivoOriginalKey:
    string | null;
  hashOriginal:
    string | null;
  archivoFirmadoKey:
    string | null;
  hashFirmado:
    string | null;
  csv: string;
  estado:
    string;

  matricula: {
    id: number;
    expediente:
      string;

    alumno: {
      id: number;
      nombre: string;
      apellidos:
        string;
      dni: string;
    };
  } | null;

  asignatura: {
    id: number;
    codigo: string;
    nombre: string;
  } | null;

  rechazos: {
    id: number;
    observaciones:
      string | null;
    fechaRechazo:
      string;

    firmante: {
      id: number;
      nombre: string;
      apellidos:
        string;
      dni: string;
      email:
        string | null;
    };
  }[];
}

interface Firmante {
  id: number;
  tipo: "PROFESOR" | "DIRECTOR";
  profesorId:
    number | null;
  nombre: string;
  apellidos:
    string;
  dni: string;
  email:
    string | null;
  token: string;
  estado:
    string;
  fechaFirma:
    string | null;
}

interface Evento {
  id: number;
  tipo: string;
  descripcion:
    string;
  ip:
    string | null;
  createdAt:
    string;
}

interface Envio {
  id: number;
  nombre: string;
  tipo: string;
  estado:
    EstadoEnvio;
  anio:
    number | null;
  mes:
    number | null;
  createdAt:
    string;
  updatedAt:
    string;

  cursoAcademico: {
    id: number;
    nombre: string;
  } | null;

  documentos:
    Documento[];

  firmantes:
    Firmante[];

  eventos:
    Evento[];
}

export default function DetalleEnvioFirmaPage() {
  const router =
    useRouter();

  const params =
    useParams<{
      id: string;
    }>();

  const envioId =
    Number(
      params.id
    );

  const [
    envio,
    setEnvio,
  ] =
    useState<Envio | null>(
      null
    );

  const [
    cargando,
    setCargando,
  ] =
    useState(true);

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
    copiado,
    setCopiado,
  ] =
    useState<number | null>(
      null
    );

  const [
    origen,
    setOrigen,
  ] =
    useState("");

  useEffect(
    () => {
      setOrigen(
        window.location.origin
      );
    },
    []
  );

  const cargar =
    useCallback(
      async () => {
        if (
          !Number.isInteger(
            envioId
          ) ||
          envioId <=
            0
        ) {
          setMensaje(
            "El envío seleccionado no es válido."
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

          const respuesta =
            await fetch(
              `/api/firmas/envios/${envioId}`,
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
                "No se ha podido cargar el envío."
            );

            return;
          }

          setEnvio(
            resultado.envio
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
        envioId,
      ]
    );

  useEffect(
    () => {
      void cargar();
    },
    [
      cargar,
    ]
  );

  const periodo =
    useMemo(
      () => {
        if (
          !envio?.anio ||
          !envio?.mes
        ) {
          return "-";
        }

        return `${nombreMes(
          envio.mes
        )} ${envio.anio}`;
      },
      [
        envio,
      ]
    );

  const copiarEnlace =
    async (
      firmante:
        Firmante
    ) => {
      const enlace =
        `${origen}/firma/${firmante.token}`;

      try {
        await navigator.clipboard.writeText(
          enlace
        );

        setCopiado(
          firmante.id
        );

        window.setTimeout(
          () =>
            setCopiado(
              null
            ),
          1800
        );
      } catch {
        setMensaje(
          "No se ha podido copiar automáticamente. Seleccione el enlace y cópielo manualmente."
        );
      }
    };

  const eliminarEnvio =
    async () => {
      if (!envio) {
        return;
      }

      if (
        envio.estado ===
        "COMPLETADO"
      ) {
        setMensaje(
          "Los envíos completados no pueden eliminarse."
        );

        return;
      }

      const confirmar =
        window.confirm(
          `Va a eliminar definitivamente el envío:\n\n${envio.nombre}\n\nSe eliminarán también todos sus documentos, firmantes, tokens, eventos, firmas asociadas y archivos PDF almacenados.\n\nEsta acción no se puede deshacer.\n\n¿Desea continuar?`
        );

      if (
        !confirmar
      ) {
        return;
      }

      try {
        setEliminando(
          true
        );

        setMensaje(
          ""
        );

        const respuesta =
          await fetch(
            `/api/firmas/envios/${envio.id}`,
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
              "No se ha podido eliminar el envío."
          );

          return;
        }

        window.sessionStorage.setItem(
          "mensajeFirmas",
          resultado.advertencia
            ? `✓ El envío se ha eliminado. ${resultado.advertencia}`
            : "✓ El envío y todos sus datos asociados se han eliminado correctamente."
        );

        router.push(
          "/firmas"
        );
      } catch {
        setMensaje(
          "No se ha podido conectar con el servidor."
        );
      } finally {
        setEliminando(
          false
        );
      }
    };

  if (
    cargando
  ) {
    return (
      <div
        style={
          contenedor
        }
      >
        <div
          style={
            vacio
          }
        >
          Cargando envío...
        </div>
      </div>
    );
  }

  if (
    !envio
  ) {
    return (
      <div
        style={
          contenedor
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

        <Mensaje
          texto={
            mensaje ||
            "No se ha encontrado el envío."
          }
        />
      </div>
    );
  }

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

        <div
          style={
            cabeceraPrincipal
          }
        >
          <div>
            <h1
              style={
                titulo
              }
            >
              DETALLE DEL ENVÍO
            </h1>

            <div
              style={
                nombreEnvio
              }
            >
              {
                envio.nombre
              }
            </div>
          </div>

          <Estado
            estado={
              envio.estado
            }
          />
        </div>
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
          resumenGrid
        }
      >
        <Dato
          etiqueta="ID ENVÍO"
          valor={
            String(
              envio.id
            )
          }
        />

        <Dato
          etiqueta="CURSO ACADÉMICO"
          valor={
            envio.cursoAcademico
              ?.nombre ??
            "-"
          }
        />

        <Dato
          etiqueta="PERIODO"
          valor={
            periodo
          }
        />

        <Dato
          etiqueta="CREADO"
          valor={
            formatearFecha(
              envio.createdAt
            )
          }
        />

        <Dato
          etiqueta="DOCUMENTOS"
          valor={
            String(
              envio.documentos
                .length
            )
          }
        />

        <Dato
          etiqueta="FIRMANTES"
          valor={
            String(
              envio.firmantes
                .length
            )
          }
        />
      </section>

      <section
        style={
          seccion
        }
      >
        <CabeceraSeccion
          titulo="ENLACES DE FIRMA"
          descripcion="En esta fase los enlaces se muestran para pruebas. Todavía no se envían automáticamente por email."
        />

        {envio.firmantes.length ===
        0 ? (
          <Vacio
            texto="Este envío no tiene firmantes."
          />
        ) : (
          envio.firmantes.map(
            (
              firmante
            ) => {
              const enlace =
                `${origen}/firma/${firmante.token}`;
              const directorBloqueado =
                firmante.tipo === "DIRECTOR" &&
                envio.firmantes.some(
                  (otro) => otro.tipo === "PROFESOR" && otro.estado !== "FIRMADO"
                );

              return (
                <div
                  key={
                    firmante.id
                  }
                  style={
                    firmanteFila
                  }
                >
                  <div
                    style={{
                      flex:
                        1,
                    }}
                  >
                    <div
                      style={
                        nombreFirmante
                      }
                    >
                      {
                        firmante.nombre
                      }{" "}
                      {
                        firmante.apellidos
                      }
                      {firmante.tipo === "DIRECTOR" ? " · DIRECTOR" : " · PROFESOR"}
                    </div>

                    <div
                      style={
                        datoSecundario
                      }
                    >
                      DNI/NIE:{" "}
                      {
                        ocultarDni(
                          firmante.dni
                        )
                      }
                      {firmante.email
                        ? ` · ${firmante.email}`
                        : ""}
                    </div>

                    <div
                      style={
                        enlaceBox
                      }
                    >
                      {
                        enlace
                      }
                    </div>

                    <div
                      style={
                        avisoEnlace
                      }
                    >
                      {directorBloqueado
                        ? "Este enlace se habilitará automáticamente cuando hayan firmado todos los profesores."
                        : "Este enlace es personal para este firmante. No debe compartirse con otra persona."}
                    </div>
                  </div>

                  <div
                    style={
                      accionesVerticales
                    }
                  >
                    <span
                      style={
                        estadoFirmante
                      }
                    >
                      {
                        firmante.estado
                      }
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        copiarEnlace(
                          firmante
                        )
                      }
                      disabled={directorBloqueado}
                      style={
                        { ...botonSecundario, opacity: directorBloqueado ? 0.5 : 1, cursor: directorBloqueado ? "not-allowed" : "pointer" }
                      }
                    >
                      {copiado ===
                      firmante.id
                        ? "COPIADO ✓"
                        : "COPIAR ENLACE"}
                    </button>
                  </div>
                </div>
              );
            }
          )
        )}
      </section>

      <section
        style={
          seccion
        }
      >
        <CabeceraSeccion
          titulo="DOCUMENTOS"
          descripcion="Documentos incluidos en este envío y su identificación de validación."
        />

        <div
          style={
            cabeceraDocumentos
          }
        >
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
            CSV
          </Celda>

          <Celda>
            ESTADO
          </Celda>

          <Celda>
            ACCIONES
          </Celda>
        </div>

        {envio.documentos.map(
          (
            documento
          ) => (
            <div
              key={
                documento.id
              }
            >
              <div
                style={
                  filaDocumento
                }
              >
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
                      datoSecundario
                    }
                  >
                    ID:{" "}
                    {
                      documento.id
                    }
                    {documento.hashOriginal
                      ? " · SHA-256 generado"
                      : " · PDF pendiente de preparar"}
                  </div>
                </div>
              </Celda>

              <Celda>
                {documento.matricula
                  ? `${documento.matricula.alumno.apellidos}, ${documento.matricula.alumno.nombre}`
                  : "-"}
              </Celda>

              <Celda>
                {documento.asignatura
                  ? `${documento.asignatura.codigo} · ${documento.asignatura.nombre}`
                  : documento.tipo ===
                      "ANEXO_I"
                    ? "ANEXO I GLOBAL"
                    : "-"}
              </Celda>

              <Celda>
                <span
                  style={
                    csvStyle
                  }
                >
                  {
                    documento.csv
                  }
                </span>
              </Celda>

              <Celda>
                <span
                  style={{
                    color:
                      documento.estado ===
                      "RECHAZADO"
                        ? "#b9362f"
                        : documento.estado ===
                            "FIRMADO"
                          ? "#2f7d44"
                          : "#4b576b",

                    fontWeight:
                      documento.estado ===
                        "RECHAZADO" ||
                      documento.estado ===
                        "FIRMADO"
                        ? 700
                        : 400,
                  }}
                >
                  {
                    documento.estado
                  }
                </span>
              </Celda>
              </div>

            {documento.rechazos.length > 0 && (
              <div
                style={
                  rechazoCentroBox
                }
              >
                <div
                  style={
                    rechazoCentroTitulo
                  }
                >
                  DOCUMENTO RECHAZADO
                </div>

                {documento.rechazos.map(
                  (
                    rechazo
                  ) => (
                    <div
                      key={
                        rechazo.id
                      }
                      style={
                        rechazoCentroFila
                      }
                    >
                      <div>
                        <strong>
                          {
                            rechazo.firmante
                              .nombre
                          }{" "}
                          {
                            rechazo.firmante
                              .apellidos
                          }
                        </strong>

                        <div
                          style={
                            datoSecundario
                          }
                        >
                          {
                            formatearFecha(
                              rechazo.fechaRechazo
                            )
                          }
                        </div>
                      </div>

                      <div
                        style={
                          rechazoObservacion
                        }
                      >
                        {
                          rechazo.observaciones ||
                          "Sin observaciones."
                        }
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
            </div>
          )
        )}
      </section>

      <section
        style={
          seccion
        }
      >
        <CabeceraSeccion
          titulo="TRAZABILIDAD"
          descripcion="Eventos registrados hasta este momento para el envío."
        />

        {envio.eventos.length ===
        0 ? (
          <Vacio
            texto="Todavía no hay eventos registrados."
          />
        ) : (
          envio.eventos.map(
            (
              evento
            ) => (
              <div
                key={
                  evento.id
                }
                style={
                  eventoFila
                }
              >
                <div>
                  <div
                    style={
                      textoPrincipal
                    }
                  >
                    {
                      evento.tipo
                    }
                  </div>

                  <div
                    style={
                      datoSecundario
                    }
                  >
                    {
                      formatearFecha(
                        evento.createdAt
                      )
                    }
                    {evento.ip
                      ? ` · IP ${evento.ip}`
                      : ""}
                  </div>
                </div>

                <div
                  style={
                    descripcionEvento
                  }
                >
                  {
                    evento.descripcion
                  }
                </div>
              </div>
            )
          )
        )}
      </section>

      <section
        style={
          zonaPeligro
        }
      >
        <div>
          <div
            style={
              tituloPeligro
            }
          >
            ELIMINAR ENVÍO
          </div>

          <div
            style={
              textoPeligro
            }
          >
            Elimina el envío, sus documentos, firmantes, tokens, eventos, firmas asociadas y los PDF almacenados. Los envíos COMPLETADOS se conservan como evidencia y no pueden eliminarse.
          </div>
        </div>

        <button
          type="button"
          disabled={
            eliminando ||
            envio.estado ===
              "COMPLETADO"
          }
          onClick={
            eliminarEnvio
          }
          style={{
            ...botonEliminar,
            opacity:
              eliminando ||
              envio.estado ===
                "COMPLETADO"
                ? 0.5
                : 1,
          }}
        >
          {eliminando
            ? "ELIMINANDO..."
            : "ELIMINAR ENVÍO"}
        </button>
      </section>
    </div>
  );
}

function Estado({
  estado,
}: {
  estado:
    EstadoEnvio;
}) {
  return (
    <span
      style={{
        padding:
          "7px 10px",
        border:
          "1px solid #d7dde5",
        background:
          "#f8fafc",
        color:
          estado ===
          "COMPLETADO"
            ? "#2f7d44"
            : estado ===
                "CANCELADO"
              ? "#b9362f"
              : "#e9423a",
        fontSize:
          "9px",
        fontWeight:
          700,
      }}
    >
      {estado}
    </span>
  );
}

function Dato({
  etiqueta,
  valor,
}: {
  etiqueta:
    string;
  valor:
    string;
}) {
  return (
    <div
      style={
        datoBox
      }
    >
      <div
        style={
          datoEtiqueta
        }
      >
        {etiqueta}
      </div>

      <div
        style={
          datoValor
        }
      >
        {valor}
      </div>
    </div>
  );
}

function CabeceraSeccion({
  titulo,
  descripcion,
}: {
  titulo:
    string;
  descripcion:
    string;
}) {
  return (
    <div
      style={
        cabeceraSeccion
      }
    >
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

function Vacio({
  texto,
}: {
  texto:
    string;
}) {
  return (
    <div
      style={
        vacio
      }
    >
      {texto}
    </div>
  );
}

function formatearFecha(
  valor:
    string
) {
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
    new Date(
      valor
    )
  );
}

function nombreMes(
  mes:
    number
) {
  return new Intl.DateTimeFormat(
    "es-ES",
    {
      month:
        "long",
    }
  )
    .format(
      new Date(
        2026,
        mes - 1,
        1
      )
    )
    .toUpperCase();
}

function ocultarDni(
  dni:
    string
) {
  if (
    dni.length <=
    4
  ) {
    return dni;
  }

  return `${"*".repeat(
    Math.max(
      0,
      dni.length - 4
    )
  )}${dni.slice(
    -4
  )}`;
}

/* =========================================================
   ESTILOS
   ========================================================= */

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

const cabeceraPrincipal:
  React.CSSProperties =
{
  marginTop:
    "12px",
  display:
    "flex",
  alignItems:
    "flex-start",
  justifyContent:
    "space-between",
  gap:
    "20px",
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

const nombreEnvio:
  React.CSSProperties =
{
  marginTop:
    "6px",
  color:
    "#65758d",
  fontSize:
    "11px",
};

const resumenGrid:
  React.CSSProperties =
{
  marginTop:
    "18px",
  display:
    "grid",
  gridTemplateColumns:
    "repeat(3, 1fr)",
  borderTop:
    "1px solid #d7dde5",
  borderLeft:
    "1px solid #d7dde5",
};

const datoBox:
  React.CSSProperties =
{
  minHeight:
    "68px",
  padding:
    "12px",
  borderRight:
    "1px solid #d7dde5",
  borderBottom:
    "1px solid #d7dde5",
  background:
    "#f8fafc",
};

const datoEtiqueta:
  React.CSSProperties =
{
  color:
    "#8793a5",
  fontSize:
    "8px",
  fontWeight:
    700,
};

const datoValor:
  React.CSSProperties =
{
  marginTop:
    "7px",
  color:
    "#303b50",
  fontSize:
    "10px",
  fontWeight:
    600,
};

const seccion:
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
  padding:
    "13px 16px",
  background:
    "#f8fafc",
  borderBottom:
    "1px solid #d7dde5",
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

const firmanteFila:
  React.CSSProperties =
{
  padding:
    "16px",
  borderTop:
    "1px solid #edf0f4",
  display:
    "flex",
  alignItems:
    "flex-start",
  justifyContent:
    "space-between",
  gap:
    "20px",
};

const nombreFirmante:
  React.CSSProperties =
{
  color:
    "#303b50",
  fontSize:
    "11px",
  fontWeight:
    700,
};

const datoSecundario:
  React.CSSProperties =
{
  marginTop:
    "4px",
  color:
    "#8793a5",
  fontSize:
    "8px",
};

const enlaceBox:
  React.CSSProperties =
{
  marginTop:
    "10px",
  padding:
    "9px 10px",
  border:
    "1px solid #d7dde5",
  background:
    "#ffffff",
  color:
    "#455166",
  fontSize:
    "9px",
  fontFamily:
    "monospace",
  overflowWrap:
    "anywhere",
};

const avisoEnlace:
  React.CSSProperties =
{
  marginTop:
    "6px",
  color:
    "#9a6b32",
  fontSize:
    "8px",
};

const accionesVerticales:
  React.CSSProperties =
{
  display:
    "flex",
  flexDirection:
    "column",
  alignItems:
    "flex-end",
  gap:
    "10px",
};

const estadoFirmante:
  React.CSSProperties =
{
  color:
    "#e9423a",
  fontSize:
    "8px",
  fontWeight:
    700,
};

const botonSecundario:
  React.CSSProperties =
{
  minHeight:
    "32px",
  padding:
    "0 11px",
  border:
    "1px solid #cbd3df",
  background:
    "#ffffff",
  color:
    "#455166",
  fontSize:
    "8px",
  fontWeight:
    700,
  cursor:
    "pointer",
};

const cabeceraDocumentos:
  React.CSSProperties =
{
  display:
    "grid",
  gridTemplateColumns:
    "1.5fr 1.1fr 1.1fr 1fr 90px 130px",
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
    "1.5fr 1.1fr 1.1fr 1fr 90px 130px",
  borderTop:
    "1px solid #d7dde5",
  color:
    "#4b576b",
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

const csvStyle:
  React.CSSProperties =
{
  fontFamily:
    "monospace",
  fontSize:
    "8px",
  overflowWrap:
    "anywhere",
};

const botonPdf:
  React.CSSProperties =
{
  minHeight:
    "30px",

  padding:
    "0 9px",

  border:
    "1px solid #cbd3df",

  background:
    "#ffffff",

  color:
    "#455166",

  fontSize:
    "7px",

  fontWeight:
    700,

  cursor:
    "pointer",

  whiteSpace:
    "nowrap",
};

const rechazoCentroBox:
  React.CSSProperties =
{
  margin:
    "0 12px 12px",

  padding:
    "11px 12px",

  border:
    "1px solid #efc7c3",

  background:
    "#fff8f7",
};

const rechazoCentroTitulo:
  React.CSSProperties =
{
  color:
    "#b9362f",

  fontSize:
    "8px",

  fontWeight:
    700,
};

const rechazoCentroFila:
  React.CSSProperties =
{
  marginTop:
    "9px",

  display:
    "grid",

  gridTemplateColumns:
    "220px 1fr",

  gap:
    "16px",

  color:
    "#5f4a48",

  fontSize:
    "9px",
};

const rechazoObservacion:
  React.CSSProperties =
{
  lineHeight:
    1.5,

  overflowWrap:
    "anywhere",
};

const eventoFila:
  React.CSSProperties =
{
  padding:
    "12px 16px",
  borderTop:
    "1px solid #edf0f4",
  display:
    "grid",
  gridTemplateColumns:
    "220px 1fr",
  gap:
    "18px",
};

const descripcionEvento:
  React.CSSProperties =
{
  color:
    "#65758d",
  fontSize:
    "9px",
  lineHeight:
    1.5,
};

const zonaPeligro:
  React.CSSProperties =
{
  marginTop:
    "20px",
  padding:
    "16px",
  border:
    "1px solid #efb0aa",
  background:
    "#fff8f7",
  display:
    "flex",
  alignItems:
    "center",
  justifyContent:
    "space-between",
  gap:
    "20px",
};

const tituloPeligro:
  React.CSSProperties =
{
  color:
    "#b9362f",
  fontSize:
    "10px",
  fontWeight:
    700,
};

const textoPeligro:
  React.CSSProperties =
{
  marginTop:
    "5px",
  maxWidth:
    "700px",
  color:
    "#7b6260",
  fontSize:
    "8px",
  lineHeight:
    1.5,
};

const botonEliminar:
  React.CSSProperties =
{
  minHeight:
    "36px",
  padding:
    "0 14px",
  border:
    "1px solid #b9362f",
  background:
    "#b9362f",
  color:
    "#ffffff",
  fontSize:
    "8px",
  fontWeight:
    700,
  cursor:
    "pointer",
};

const vacio:
  React.CSSProperties =
{
  minHeight:
    "120px",
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
};
