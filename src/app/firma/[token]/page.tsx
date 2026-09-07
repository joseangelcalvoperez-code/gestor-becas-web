"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useParams,
} from "next/navigation";

type EstadoFirmante =
  | "PENDIENTE"
  | "PARCIAL"
  | "FIRMADO"
  | "RECHAZADO";

interface Documento {
  id: number;

  tipo:
    | "ANEXO_I"
    | "ANEXO_V"
    | "OTRO";

  nombreArchivo:
    string;

  estado:
    string;

  csv:
    string;

  firmadoPorMi:
    boolean;

  rechazo: {
    observaciones:
      string | null;

    fechaRechazo:
      string;
  } | null;

  bloqueadoPorOtroRechazo:
    boolean;

  alumno: {
    id: number;
    nombre: string;
    apellidos:
      string;
    expediente:
      string;
  } | null;

  asignatura: {
    id: number;
    codigo: string;
    nombre: string;
  } | null;
}

interface DatosPortal {
  firmante: {
    id: number;
    nombre: string;
    apellidos:
      string;
    dni: string;
    email:
      string | null;
    estado:
      EstadoFirmante;
    fechaFirma:
      string | null;
  };

  envio: {
    id: number;
    nombre: string;
    estado:
      string;
    anio:
      number | null;
    mes:
      number | null;
    createdAt:
      string;

    cursoAcademico: {
      id: number;
      nombre: string;
    } | null;

    centro: {
      id: number;
      nombre: string;
      codigo: string;
      localidad:
        string;
      provincia:
        string;
    };
  };

  documentos:
    Documento[];

  resumen: {
    totalDocumentos:
      number;

    totalParaFirmar:
      number;

    totalRechazados:
      number;

    totalFirmados:
      number;

    totalBloqueados:
      number;

    procesoFinalizado:
      boolean;
  };
}

type Paso =
  | "documentos"
  | "confirmar";

interface ResultadoProceso {
  totalFirmados:
    number;

  totalRechazados:
    number;

  totalBloqueados:
    number;

  fecha:
    string;
}

export default function FirmaTokenPage() {
  const params =
    useParams<{
      token: string;
    }>();

  const token =
    String(
      params.token ??
        ""
    );

  const [
    datos,
    setDatos,
  ] =
    useState<DatosPortal | null>(
      null
    );

  const [
    cargando,
    setCargando,
  ] =
    useState(true);

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    paso,
    setPaso,
  ] =
    useState<Paso>(
      "documentos"
    );

  const [
    documentoAbierto,
    setDocumentoAbierto,
  ] =
    useState<Documento | null>(
      null
    );

  const [
    aceptado,
    setAceptado,
  ] =
    useState(false);

  const [
    documentoRechazo,
    setDocumentoRechazo,
  ] =
    useState<Documento | null>(
      null
    );

  const [
    observacionesRechazo,
    setObservacionesRechazo,
  ] =
    useState("");

  const [
    guardandoRechazo,
    setGuardandoRechazo,
  ] =
    useState(false);

  const [
    firmando,
    setFirmando,
  ] =
    useState(false);

  const [
    resultadoProceso,
    setResultadoProceso,
  ] =
    useState<ResultadoProceso | null>(
      null
    );

  const cargar =
    useCallback(
      async () => {
        if (!token) {
          setError(
            "El enlace de firma no es válido."
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

          setError(
            ""
          );

          const respuesta =
            await fetch(
              `/api/firma/${encodeURIComponent(
                token
              )}`,
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
            setError(
              resultado.error ??
                "No se ha podido cargar la solicitud de firma."
            );

            return;
          }

          setDatos(
            resultado
          );
        } catch {
          setError(
            "No se ha podido conectar con el servidor."
          );
        } finally {
          setCargando(
            false
          );
        }
      },
      [
        token,
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
          !datos?.envio
            .anio ||
          !datos?.envio
            .mes
        ) {
          return "-";
        }

        return `${nombreMes(
          datos.envio.mes
        )} ${datos.envio.anio}`;
      },
      [
        datos,
      ]
    );

  const abrirRechazo =
    (
      documento:
        Documento
    ) => {
      setDocumentoRechazo(
        documento
      );

      setObservacionesRechazo(
        documento.rechazo
          ?.observaciones ??
          ""
      );
    };

  const guardarRechazo =
    async () => {
      if (
        !documentoRechazo
      ) {
        return;
      }

      try {
        setGuardandoRechazo(
          true
        );

        const respuesta =
          await fetch(
            `/api/firma/${encodeURIComponent(
              token
            )}/documentos/${documentoRechazo.id}/rechazo`,
            {
              method:
                "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify({
                  observaciones:
                    observacionesRechazo,
                }),
            }
          );

        const resultado =
          await respuesta.json();

        if (
          !respuesta.ok
        ) {
          window.alert(
            resultado.error ??
              "No se ha podido registrar el rechazo."
          );

          return;
        }

        setDocumentoRechazo(
          null
        );

        setObservacionesRechazo(
          ""
        );

        await cargar();
      } catch {
        window.alert(
          "No se ha podido conectar con el servidor."
        );
      } finally {
        setGuardandoRechazo(
          false
        );
      }
    };

  const retirarRechazo =
    async () => {
      if (
        !documentoRechazo
      ) {
        return;
      }

      const confirmar =
        window.confirm(
          "El documento volverá a incluirse entre los documentos que se firmarán. ¿Desea retirar el rechazo?"
        );

      if (
        !confirmar
      ) {
        return;
      }

      try {
        setGuardandoRechazo(
          true
        );

        const respuesta =
          await fetch(
            `/api/firma/${encodeURIComponent(
              token
            )}/documentos/${documentoRechazo.id}/rechazo`,
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
          window.alert(
            resultado.error ??
              "No se ha podido retirar el rechazo."
          );

          return;
        }

        setDocumentoRechazo(
          null
        );

        setObservacionesRechazo(
          ""
        );

        await cargar();
      } catch {
        window.alert(
          "No se ha podido conectar con el servidor."
        );
      } finally {
        setGuardandoRechazo(
          false
        );
      }
    };

  const finalizarFirma =
    async () => {
      if (!aceptado) {
        return;
      }

      const total =
        datos?.resumen
          .totalParaFirmar ??
        0;

      const rechazados =
        datos?.resumen
          .totalRechazados ??
        0;

      const confirmar =
        window.confirm(
          `Se firmarán ${total} documento${total === 1 ? "" : "s"} y se mantendrán ${rechazados} rechazo${rechazados === 1 ? "" : "s"}.\n\n¿Desea finalizar el proceso?`
        );

      if (
        !confirmar
      ) {
        return;
      }

      try {
        setFirmando(
          true
        );

        const respuesta =
          await fetch(
            `/api/firma/${encodeURIComponent(
              token
            )}/firmar`,
            {
              method:
                "POST",
            }
          );

        const resultado =
          await respuesta.json();

        if (
          !respuesta.ok
        ) {
          window.alert(
            resultado.error ??
              "No se ha podido completar el proceso de firma."
          );

          return;
        }

        setResultadoProceso({
          totalFirmados:
            resultado.totalFirmados ??
            0,

          totalRechazados:
            resultado.totalRechazados ??
            0,

          totalBloqueados:
            resultado.totalBloqueados ??
            0,

          fecha:
            resultado.fecha,
        });
      } catch {
        window.alert(
          "No se ha podido conectar con el servidor."
        );
      } finally {
        setFirmando(
          false
        );
      }
    };

  if (
    cargando
  ) {
    return (
      <PantallaBase>
        <EstadoCentral
          icono="…"
          titulo="Cargando solicitud"
          texto="Estamos recuperando los documentos pendientes de firma."
        />
      </PantallaBase>
    );
  }

  if (
    error ||
    !datos
  ) {
    return (
      <PantallaBase>
        <EstadoCentral
          icono="!"
          titulo="No se puede abrir la solicitud"
          texto={
            error ||
            "El enlace de firma no está disponible."
          }
          error
        />
      </PantallaBase>
    );
  }

  if (
    resultadoProceso
  ) {
    return (
      <PantallaBase>
        <ResultadoFinal
          resultado={
            resultadoProceso
          }
        />
      </PantallaBase>
    );
  }

  if (
    datos.resumen.procesoFinalizado
  ) {
    return (
      <PantallaBase>
        <ResultadoFinal
          resultado={{
            totalFirmados:
              datos.resumen
                .totalFirmados,

            totalRechazados:
              datos.resumen
                .totalRechazados,

            totalBloqueados:
              datos.resumen
                .totalBloqueados,

            fecha:
              datos.firmante
                .fechaFirma ??
              datos.envio.createdAt,
          }}
        />
      </PantallaBase>
    );
  }

  return (
    <PantallaBase>
      <main
        style={
          main
        }
      >
        <div
          style={
            saludo
          }
        >
          <div
            style={
              etiquetaSegura
            }
          >
            FIRMA SEGURA
          </div>

          <h1
            style={
              tituloPrincipal
            }
          >
            {paso ===
            "documentos"
              ? "Documentos pendientes de firma"
              : "Confirmar firma"}
          </h1>

          <p
            style={
              introduccion
            }
          >
            Hola{" "}
            <strong>
              {
                datos.firmante
                  .nombre
              }{" "}
              {
                datos.firmante
                  .apellidos
              }
            </strong>
            .
            {paso ===
            "documentos"
              ? ` ${datos.envio.centro.nombre} ha solicitado que revise los siguientes documentos.`
              : " Revise el resumen antes de continuar con la firma electrónica."}
          </p>
        </div>

        <section
          style={
            identidad
          }
        >
          <DatoResumen
            etiqueta="FIRMANTE"
            valor={`${datos.firmante.nombre} ${datos.firmante.apellidos}`}
          />

          <DatoResumen
            etiqueta="DNI/NIE"
            valor={
              datos.firmante.dni
            }
          />

          <DatoResumen
            etiqueta="CENTRO"
            valor={
              datos.envio.centro.nombre
            }
          />

          <DatoResumen
            etiqueta="PERIODO"
            valor={
              periodo
            }
          />
        </section>

        {paso ===
        "documentos" ? (
          <>
            <section
              style={
                tarjeta
              }
            >
              <div
                style={
                  cabeceraTarjeta
                }
              >
                <div>
                  <div
                    style={
                      tituloTarjeta
                    }
                  >
                    DOCUMENTOS A REVISAR
                  </div>

                  <div
                    style={
                      textoSecundario
                    }
                  >
                    Puede abrir cualquier documento antes de continuar.
                  </div>
                </div>

                <div
                  style={
                    contador
                  }
                >
                  {
                    datos.documentos
                      .length
                  }{" "}
                  DOCUMENTO
                  {
                    datos.documentos
                      .length ===
                    1
                      ? ""
                      : "S"
                  }
                </div>
              </div>

              <div
                style={
                  lista
                }
              >
                {datos.documentos.map(
                  (
                    documento,
                    indice
                  ) => (
                    <DocumentoFila
                      key={
                        documento.id
                      }

                      numero={
                        indice +
                        1
                      }

                      documento={
                        documento
                      }

                      onVer={() =>
                        setDocumentoAbierto(
                          documento
                        )
                      }

                      onRechazar={() =>
                        abrirRechazo(
                          documento
                        )
                      }
                    />
                  )
                )}
              </div>
            </section>

            <div
              style={
                ayuda
              }
            >
              <div
                style={
                  ayudaIcono
                }
              >
                i
              </div>

              <div>
                <strong>
                  Revise los documentos antes de firmar.
                </strong>

                <div
                  style={{
                    marginTop:
                      "4px",
                  }}
                >
                  La siguiente pantalla mostrará un resumen y la confirmación expresa de firma.
                </div>
              </div>
            </div>

            <div
              style={
                acciones
              }
            >
              <button
                type="button"

                onClick={() =>
                  setPaso(
                    "confirmar"
                  )
                }

                style={
                  botonPrincipal
                }
              >
                CONTINUAR A FIRMA
                <span>
                  →
                </span>
              </button>
            </div>
          </>
        ) : (
          <>
            <section
              style={
                tarjetaConfirmacion
              }
            >
              <div
                style={
                  checkGrande
                }
              >
                ✓
              </div>

              <div
                style={
                  confirmacionTitulo
                }
              >
                Va a firmar{" "}
                {
                  datos.resumen
                    .totalParaFirmar
                }{" "}
                documento
                {
                  datos.resumen
                    .totalParaFirmar ===
                  1
                    ? ""
                    : "s"
                }
              </div>

              <div
                style={
                  confirmacionTexto
                }
              >
                Todos los documentos se consideran aceptados para firma por defecto. Solo quedarán fuera de la firma aquellos que haya rechazado expresamente.
              </div>

              <div
                style={
                  miniResumen
                }
              >
                <div>
                  <span
                    style={
                      miniEtiqueta
                    }
                  >
                    FIRMANTE
                  </span>

                  <strong>
                    {
                      datos.firmante
                        .nombre
                    }{" "}
                    {
                      datos.firmante
                        .apellidos
                    }
                  </strong>
                </div>

                <div>
                  <span
                    style={
                      miniEtiqueta
                    }
                  >
                    DNI/NIE
                  </span>

                  <strong>
                    {
                      datos.firmante
                        .dni
                    }
                  </strong>
                </div>

                <div>
                  <span
                    style={
                      miniEtiqueta
                    }
                  >
                    A FIRMAR
                  </span>

                  <strong>
                    {
                      datos.resumen
                        .totalParaFirmar
                    }
                  </strong>
                </div>
              </div>

              {datos.resumen.totalRechazados > 0 && (
                <div
                  style={
                    avisoRechazos
                  }
                >
                  <strong>
                    {
                      datos.resumen
                        .totalRechazados
                    }{" "}
                    documento
                    {
                      datos.resumen
                        .totalRechazados ===
                      1
                        ? ""
                        : "s"
                    }{" "}
                    rechazado
                    {
                      datos.resumen
                        .totalRechazados ===
                      1
                        ? ""
                        : "s"
                    }.
                  </strong>{" "}
                  No se firmarán y quedarán registrados con sus observaciones.
                </div>
              )}

              <label
                style={
                  declaracion
                }
              >
                <input
                  type="checkbox"

                  checked={
                    aceptado
                  }

                  onChange={(
                    event
                  ) =>
                    setAceptado(
                      event.target.checked
                    )
                  }
                />

                <span>
                  He revisado la solicitud y confirmo que deseo firmar todos los documentos no rechazados. Los documentos rechazados quedarán excluidos de la firma.
                </span>
              </label>
            </section>

            <div
              style={
                accionesDoble
              }
            >
              <button
                type="button"

                onClick={() => {
                  setAceptado(
                    false
                  );

                  setPaso(
                    "documentos"
                  );
                }}

                style={
                  botonVolver
                }
              >
                ← VOLVER A DOCUMENTOS
              </button>

              <button
                type="button"

                disabled={
                  !aceptado ||
                  firmando
                }

                onClick={
                  finalizarFirma
                }

                style={{
                  ...botonPrincipal,

                  opacity:
                    aceptado &&
                    !firmando
                      ? 1
                      : 0.45,

                  cursor:
                    aceptado &&
                    !firmando
                      ? "pointer"
                      : "not-allowed",
                }}
              >
                {firmando
                  ? "PROCESANDO..."
                  : `FIRMAR ${datos.resumen.totalParaFirmar} DOCUMENTO${datos.resumen.totalParaFirmar === 1 ? "" : "S"}`}
              </button>
            </div>
          </>
        )}

        <div
          style={
            pieInfo
          }
        >
          Solicitud #{datos.envio.id} · Curso{" "}
          {datos.envio.cursoAcademico
            ?.nombre ??
            "-"}{" "}
          · Acceso personal y no transferible
        </div>
      </main>

      {documentoAbierto && (
        <ModalPdf
          documento={
            documentoAbierto
          }

          token={
            token
          }

          cerrar={() =>
            setDocumentoAbierto(
              null
            )
          }
        />
      )}

      {documentoRechazo && (
        <ModalRechazo
          documento={
            documentoRechazo
          }

          observaciones={
            observacionesRechazo
          }

          setObservaciones={
            setObservacionesRechazo
          }

          guardando={
            guardandoRechazo
          }

          guardar={
            guardarRechazo
          }

          retirar={
            retirarRechazo
          }

          cerrar={() =>
            setDocumentoRechazo(
              null
            )
          }
        />
      )}
    </PantallaBase>
  );
}

function DocumentoFila({
  numero,
  documento,
  onVer,
  onRechazar,
}: {
  numero:
    number;

  documento:
    Documento;

  onVer:
    () => void;

  onRechazar:
    () => void;
}) {
  const rechazado =
    Boolean(
      documento.rechazo
    );

  const bloqueado =
    documento.bloqueadoPorOtroRechazo;

  return (
    <div
      style={{
        ...filaDocumento,

        background:
          rechazado
            ? "#fff8f7"
            : bloqueado
              ? "#f7f7f8"
              : "#ffffff",
      }}
    >
      <div
        style={{
          ...numeroDocumento,

          background:
            rechazado
              ? "#fde8e6"
              : "#f0f3f7",

          color:
            rechazado
              ? "#b9362f"
              : "#69778d",
        }}
      >
        {numero}
      </div>

      <div
        style={{
          flex:
            1,
          minWidth:
            0,
        }}
      >
        <div
          style={
            nombreDocumento
          }
        >
          {documento.tipo ===
          "ANEXO_V"
            ? "ANEXO V"
            : documento.tipo ===
                "ANEXO_I"
              ? "ANEXO I"
              : "DOCUMENTO"}
          {" · "}
          {documento.alumno
            ? `${documento.alumno.apellidos}, ${documento.alumno.nombre}`
            : documento.nombreArchivo}
        </div>

        <div
          style={
            metaDocumento
          }
        >
          {documento.asignatura
            ? `${documento.asignatura.codigo} · ${documento.asignatura.nombre}`
            : "Documento general del alumno"}

          {documento.alumno
            ?.expediente
            ? ` · Expediente ${documento.alumno.expediente}`
            : ""}
        </div>

        {rechazado && (
          <div
            style={
              rechazoInfo
            }
          >
            RECHAZADO
            {documento.rechazo
              ?.observaciones
              ? ` · ${documento.rechazo.observaciones}`
              : ""}
          </div>
        )}

        {bloqueado && !rechazado && (
          <div
            style={
              bloqueoInfo
            }
          >
            No se firmará: otro firmante ha rechazado este documento.
          </div>
        )}
      </div>

      <div
        style={
          accionesDocumento
        }
      >
        <button
          type="button"

          onClick={
            onVer
          }

          style={
            botonVer
          }
        >
          VER PDF
        </button>

        {!bloqueado && (
          <button
            type="button"

            onClick={
              onRechazar
            }

            style={
              rechazado
                ? botonRechazado
                : botonRechazar
            }
          >
            {rechazado
              ? "VER RECHAZO"
              : "RECHAZAR"}
          </button>
        )}
      </div>
    </div>
  );
}

function ModalPdf({
  documento,
  token,
  cerrar,
}: {
  documento:
    Documento;

  token:
    string;

  cerrar:
    () => void;
}) {
  const url =
    `/api/firma/${encodeURIComponent(
      token
    )}/documentos/${documento.id}`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={
        overlay
      }
    >
      <div
        style={
          modal
        }
      >
        <div
          style={
            modalCabecera
          }
        >
          <div>
            <div
              style={
                modalTitulo
              }
            >
              {documento.tipo ===
              "ANEXO_V"
                ? "ANEXO V"
                : documento.tipo ===
                    "ANEXO_I"
                  ? "ANEXO I"
                  : "DOCUMENTO"}
            </div>

            <div
              style={
                modalSubtitulo
              }
            >
              {documento.alumno
                ? `${documento.alumno.apellidos}, ${documento.alumno.nombre}`
                : documento.nombreArchivo}
            </div>
          </div>

          <button
            type="button"

            onClick={
              cerrar
            }

            style={
              cerrarModal
            }
          >
            ×
          </button>
        </div>

        <iframe
          title={
            documento.nombreArchivo
          }

          src={
            url
          }

          style={
            iframe
          }
        />

        <div
          style={
            modalPie
          }
        >
          <button
            type="button"

            onClick={
              cerrar
            }

            style={
              botonPrincipalPequeno
            }
          >
            DOCUMENTO REVISADO
          </button>
        </div>
      </div>
    </div>
  );
}

function ModalRechazo({
  documento,
  observaciones,
  setObservaciones,
  guardando,
  guardar,
  retirar,
  cerrar,
}: {
  documento:
    Documento;

  observaciones:
    string;

  setObservaciones:
    (
      valor:
        string
    ) => void;

  guardando:
    boolean;

  guardar:
    () => void;

  retirar:
    () => void;

  cerrar:
    () => void;
}) {
  const yaRechazado =
    Boolean(
      documento.rechazo
    );

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={
        overlay
      }
    >
      <div
        style={
          modalRechazo
        }
      >
        <div
          style={
            modalCabecera
          }
        >
          <div>
            <div
              style={
                modalTitulo
              }
            >
              {yaRechazado
                ? "RECHAZO REGISTRADO"
                : "RECHAZAR DOCUMENTO"}
            </div>

            <div
              style={
                modalSubtitulo
              }
            >
              {documento.alumno
                ? `${documento.alumno.apellidos}, ${documento.alumno.nombre}`
                : documento.nombreArchivo}
            </div>
          </div>

          <button
            type="button"

            onClick={
              cerrar
            }

            style={
              cerrarModal
            }
          >
            ×
          </button>
        </div>

        <div
          style={
            rechazoContenido
          }
        >
          <div
            style={
              rechazoAviso
            }
          >
            Este documento quedará fuera de la firma. El resto de documentos se firmará con normalidad.
          </div>

          <label
            style={
              rechazoLabel
            }
          >
            OBSERVACIONES / MOTIVO
            <span
              style={
                opcional
              }
            >
              OPCIONAL
            </span>
          </label>

          <textarea
            value={
              observaciones
            }

            maxLength={
              2000
            }

            onChange={(
              event
            ) =>
              setObservaciones(
                event.target.value
              )
            }

            placeholder="Puede indicar el motivo del rechazo para que el centro pueda revisarlo..."

            style={
              textareaRechazo
            }
          />

          <div
            style={
              contadorCaracteres
            }
          >
            {
              observaciones.length
            }
            /2000
          </div>
        </div>

        <div
          style={
            modalPieRechazo
          }
        >
          {yaRechazado ? (
            <button
              type="button"

              disabled={
                guardando
              }

              onClick={
                retirar
              }

              style={
                botonRetirarRechazo
              }
            >
              VOLVER A INCLUIR EN LA FIRMA
            </button>
          ) : (
            <div />
          )}

          <div
            style={{
              display:
                "flex",

              gap:
                "8px",
            }}
          >
            <button
              type="button"

              disabled={
                guardando
              }

              onClick={
                cerrar
              }

              style={
                botonVolver
              }
            >
              CANCELAR
            </button>

            <button
              type="button"

              disabled={
                guardando
              }

              onClick={
                guardar
              }

              style={
                botonConfirmarRechazo
              }
            >
              {guardando
                ? "GUARDANDO..."
                : yaRechazado
                  ? "GUARDAR OBSERVACIONES"
                  : "CONFIRMAR RECHAZO"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ResultadoFinal({
  resultado,
}: {
  resultado:
    ResultadoProceso;
}) {
  return (
    <main
      style={
        estadoCentral
      }
    >
      <div
        style={{
          ...estadoIcono,

          background:
            "#eef8f1",

          color:
            "#2f7d44",
        }}
      >
        ✓
      </div>

      <h1
        style={
          estadoTitulo
        }
      >
        Proceso completado
      </h1>

      <p
        style={
          estadoTexto
        }
      >
        Su decisión ha quedado registrada correctamente.
      </p>

      <div
        style={
          resultadoGrid
        }
      >
        <div
          style={
            resultadoDato
          }
        >
          <strong>
            {
              resultado.totalFirmados
            }
          </strong>

          <span>
            FIRMADOS
          </span>
        </div>

        <div
          style={
            resultadoDato
          }
        >
          <strong>
            {
              resultado.totalRechazados
            }
          </strong>

          <span>
            RECHAZADOS
          </span>
        </div>

        {resultado.totalBloqueados > 0 && (
          <div
            style={
              resultadoDato
            }
          >
            <strong>
              {
                resultado.totalBloqueados
              }
            </strong>

            <span>
              BLOQUEADOS
            </span>
          </div>
        )}
      </div>

      <div
        style={
          resultadoFecha
        }
      >
        {
          formatearFecha(
            resultado.fecha
          )
        }
      </div>
    </main>
  );
}

function DatoResumen({
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
        datoResumen
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

function PantallaBase({
  children,
}: {
  children:
    React.ReactNode;
}) {
  return (
    <div
      style={
        pagina
      }
    >
      <header
        style={
          header
        }
      >
        <div
          style={
            marca
          }
        >
          <div
            style={
              logo
            }
          >
            G
          </div>

          <div>
            <div
              style={
                marcaTitulo
              }
            >
              Gestor Becas
            </div>

            <div
              style={
                marcaSubtitulo
              }
            >
              Segunda Oportunidad
            </div>
          </div>
        </div>

        <div
          style={
            headerSeguro
          }
        >
          <span
            style={
              candado
            }
          >
            ✓
          </span>

          ACCESO DE FIRMA
        </div>
      </header>

      {children}

      <footer
        style={
          footer
        }
      >
        Este acceso es personal. No comparta el enlace de firma con otras personas.
      </footer>
    </div>
  );
}

function EstadoCentral({
  icono,
  titulo,
  texto,
  error = false,
}: {
  icono:
    string;

  titulo:
    string;

  texto:
    string;

  error?:
    boolean;
}) {
  return (
    <main
      style={
        estadoCentral
      }
    >
      <div
        style={{
          ...estadoIcono,

          background:
            error
              ? "#fff1f0"
              : "#eef8f1",

          color:
            error
              ? "#c13e36"
              : "#2f7d44",
        }}
      >
        {icono}
      </div>

      <h1
        style={
          estadoTitulo
        }
      >
        {titulo}
      </h1>

      <p
        style={
          estadoTexto
        }
      >
        {texto}
      </p>
    </main>
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

/* =========================================================
   ESTILOS
   ========================================================= */

const pagina:
  React.CSSProperties =
{
  minHeight:
    "100vh",

  background:
    "#f2f5f8",

  color:
    "#2f394a",

  fontFamily:
    "Arial, Helvetica, sans-serif",
};

const header:
  React.CSSProperties =
{
  minHeight:
    "72px",

  padding:
    "0 28px",

  background:
    "#263246",

  display:
    "flex",

  alignItems:
    "center",

  justifyContent:
    "space-between",

  gap:
    "20px",

  boxSizing:
    "border-box",
};

const marca:
  React.CSSProperties =
{
  display:
    "flex",

  alignItems:
    "center",

  gap:
    "11px",
};

const logo:
  React.CSSProperties =
{
  width:
    "38px",

  height:
    "38px",

  borderRadius:
    "50%",

  background:
    "#ef4238",

  color:
    "#ffffff",

  display:
    "flex",

  alignItems:
    "center",

  justifyContent:
    "center",

  fontSize:
    "16px",

  fontWeight:
    700,
};

const marcaTitulo:
  React.CSSProperties =
{
  color:
    "#ffffff",

  fontSize:
    "14px",

  fontWeight:
    700,
};

const marcaSubtitulo:
  React.CSSProperties =
{
  marginTop:
    "2px",

  color:
    "#d9e0e9",

  fontSize:
    "8px",
};

const headerSeguro:
  React.CSSProperties =
{
  display:
    "flex",

  alignItems:
    "center",

  gap:
    "7px",

  color:
    "#ffffff",

  fontSize:
    "9px",

  fontWeight:
    700,

  letterSpacing:
    "0.04em",
};

const candado:
  React.CSSProperties =
{
  width:
    "20px",

  height:
    "20px",

  border:
    "1px solid #64738a",

  borderRadius:
    "50%",

  display:
    "flex",

  alignItems:
    "center",

  justifyContent:
    "center",

  fontSize:
    "10px",
};

const main:
  React.CSSProperties =
{
  width:
    "min(100% - 32px, 980px)",

  margin:
    "0 auto",

  padding:
    "42px 0 50px",
};

const saludo:
  React.CSSProperties =
{
  textAlign:
    "center",

  maxWidth:
    "720px",

  margin:
    "0 auto",
};

const etiquetaSegura:
  React.CSSProperties =
{
  display:
    "inline-block",

  padding:
    "6px 9px",

  borderRadius:
    "999px",

  background:
    "#eef2f6",

  color:
    "#617087",

  fontSize:
    "8px",

  fontWeight:
    700,

  letterSpacing:
    "0.07em",
};

const tituloPrincipal:
  React.CSSProperties =
{
  margin:
    "14px 0 0",

  color:
    "#263246",

  fontSize:
    "27px",

  lineHeight:
    1.2,
};

const introduccion:
  React.CSSProperties =
{
  margin:
    "12px auto 0",

  maxWidth:
    "650px",

  color:
    "#6e7c91",

  fontSize:
    "13px",

  lineHeight:
    1.6,
};

const identidad:
  React.CSSProperties =
{
  marginTop:
    "28px",

  display:
    "grid",

  gridTemplateColumns:
    "repeat(4, 1fr)",

  background:
    "#ffffff",

  border:
    "1px solid #dce2e9",

  borderRadius:
    "8px",

  overflow:
    "hidden",

  boxShadow:
    "0 4px 14px rgba(33, 45, 64, 0.04)",
};

const datoResumen:
  React.CSSProperties =
{
  minHeight:
    "68px",

  padding:
    "14px",

  borderRight:
    "1px solid #e5e9ee",

  boxSizing:
    "border-box",
};

const datoEtiqueta:
  React.CSSProperties =
{
  color:
    "#909bad",

  fontSize:
    "7px",

  fontWeight:
    700,

  letterSpacing:
    "0.05em",
};

const datoValor:
  React.CSSProperties =
{
  marginTop:
    "7px",

  color:
    "#344156",

  fontSize:
    "10px",

  fontWeight:
    700,

  overflowWrap:
    "anywhere",
};

const tarjeta:
  React.CSSProperties =
{
  marginTop:
    "22px",

  background:
    "#ffffff",

  border:
    "1px solid #dce2e9",

  borderRadius:
    "8px",

  overflow:
    "hidden",

  boxShadow:
    "0 5px 16px rgba(33, 45, 64, 0.05)",
};

const cabeceraTarjeta:
  React.CSSProperties =
{
  minHeight:
    "65px",

  padding:
    "14px 18px",

  display:
    "flex",

  alignItems:
    "center",

  justifyContent:
    "space-between",

  gap:
    "18px",

  background:
    "#f8fafc",

  borderBottom:
    "1px solid #e3e7ed",
};

const tituloTarjeta:
  React.CSSProperties =
{
  color:
    "#344156",

  fontSize:
    "11px",

  fontWeight:
    700,
};

const textoSecundario:
  React.CSSProperties =
{
  marginTop:
    "4px",

  color:
    "#8793a6",

  fontSize:
    "9px",
};

const contador:
  React.CSSProperties =
{
  padding:
    "7px 9px",

  borderRadius:
    "5px",

  background:
    "#eef2f6",

  color:
    "#5a687e",

  fontSize:
    "8px",

  fontWeight:
    700,

  whiteSpace:
    "nowrap",
};

const lista:
  React.CSSProperties =
{
  padding:
    "0 18px",
};

const filaDocumento:
  React.CSSProperties =
{
  minHeight:
    "70px",

  display:
    "flex",

  alignItems:
    "center",

  gap:
    "13px",

  borderBottom:
    "1px solid #edf0f4",
};

const numeroDocumento:
  React.CSSProperties =
{
  width:
    "28px",

  height:
    "28px",

  flex:
    "0 0 auto",

  borderRadius:
    "6px",

  background:
    "#f0f3f7",

  color:
    "#69778d",

  display:
    "flex",

  alignItems:
    "center",

  justifyContent:
    "center",

  fontSize:
    "9px",

  fontWeight:
    700,
};

const nombreDocumento:
  React.CSSProperties =
{
  color:
    "#344156",

  fontSize:
    "10px",

  fontWeight:
    700,

  overflowWrap:
    "anywhere",
};

const metaDocumento:
  React.CSSProperties =
{
  marginTop:
    "5px",

  color:
    "#8b96a7",

  fontSize:
    "8px",

  lineHeight:
    1.4,
};

const botonVer:
  React.CSSProperties =
{
  minHeight:
    "32px",

  padding:
    "0 12px",

  flex:
    "0 0 auto",

  border:
    "1px solid #cbd3df",

  borderRadius:
    "4px",

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

const ayuda:
  React.CSSProperties =
{
  marginTop:
    "16px",

  padding:
    "12px 14px",

  border:
    "1px solid #dce2e9",

  borderRadius:
    "6px",

  background:
    "#f8fafc",

  display:
    "flex",

  alignItems:
    "flex-start",

  gap:
    "10px",

  color:
    "#66758b",

  fontSize:
    "9px",

  lineHeight:
    1.5,
};

const ayudaIcono:
  React.CSSProperties =
{
  width:
    "22px",

  height:
    "22px",

  flex:
    "0 0 auto",

  borderRadius:
    "50%",

  background:
    "#e5ebf2",

  display:
    "flex",

  alignItems:
    "center",

  justifyContent:
    "center",

  color:
    "#56657a",

  fontWeight:
    700,
};

const acciones:
  React.CSSProperties =
{
  marginTop:
    "22px",

  display:
    "flex",

  justifyContent:
    "flex-end",
};

const accionesDoble:
  React.CSSProperties =
{
  marginTop:
    "22px",

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

const botonPrincipal:
  React.CSSProperties =
{
  minHeight:
    "44px",

  padding:
    "0 20px",

  border:
    "1px solid #dd3d35",

  borderRadius:
    "5px",

  background:
    "#ef4238",

  color:
    "#ffffff",

  display:
    "inline-flex",

  alignItems:
    "center",

  justifyContent:
    "center",

  gap:
    "12px",

  fontSize:
    "9px",

  fontWeight:
    700,

  cursor:
    "pointer",
};

const botonVolver:
  React.CSSProperties =
{
  minHeight:
    "42px",

  padding:
    "0 15px",

  border:
    "1px solid #cbd3df",

  borderRadius:
    "5px",

  background:
    "#ffffff",

  color:
    "#55647a",

  fontSize:
    "8px",

  fontWeight:
    700,

  cursor:
    "pointer",
};

const tarjetaConfirmacion:
  React.CSSProperties =
{
  marginTop:
    "24px",

  padding:
    "30px",

  background:
    "#ffffff",

  border:
    "1px solid #dce2e9",

  borderRadius:
    "8px",

  boxShadow:
    "0 5px 16px rgba(33, 45, 64, 0.05)",

  textAlign:
    "center",
};

const checkGrande:
  React.CSSProperties =
{
  width:
    "50px",

  height:
    "50px",

  margin:
    "0 auto",

  borderRadius:
    "50%",

  background:
    "#eef8f1",

  color:
    "#2f7d44",

  display:
    "flex",

  alignItems:
    "center",

  justifyContent:
    "center",

  fontSize:
    "22px",

  fontWeight:
    700,
};

const confirmacionTitulo:
  React.CSSProperties =
{
  marginTop:
    "16px",

  color:
    "#2f3b4e",

  fontSize:
    "18px",

  fontWeight:
    700,
};

const confirmacionTexto:
  React.CSSProperties =
{
  margin:
    "9px auto 0",

  maxWidth:
    "620px",

  color:
    "#7a879a",

  fontSize:
    "10px",

  lineHeight:
    1.6,
};

const miniResumen:
  React.CSSProperties =
{
  width:
    "min(100%, 620px)",

  margin:
    "22px auto 0",

  padding:
    "14px",

  border:
    "1px solid #e1e5eb",

  borderRadius:
    "6px",

  background:
    "#f8fafc",

  display:
    "grid",

  gridTemplateColumns:
    "2fr 1fr 1fr",

  gap:
    "12px",

  textAlign:
    "left",

  boxSizing:
    "border-box",

  color:
    "#344156",

  fontSize:
    "9px",
};

const miniEtiqueta:
  React.CSSProperties =
{
  display:
    "block",

  marginBottom:
    "5px",

  color:
    "#909bad",

  fontSize:
    "7px",

  fontWeight:
    700,
};

const declaracion:
  React.CSSProperties =
{
  width:
    "min(100%, 680px)",

  margin:
    "20px auto 0",

  padding:
    "14px",

  border:
    "1px solid #dce2e9",

  borderRadius:
    "6px",

  display:
    "flex",

  alignItems:
    "flex-start",

  gap:
    "10px",

  boxSizing:
    "border-box",

  color:
    "#536176",

  fontSize:
    "9px",

  lineHeight:
    1.55,

  textAlign:
    "left",

  cursor:
    "pointer",
};

const pieInfo:
  React.CSSProperties =
{
  marginTop:
    "28px",

  color:
    "#9ba5b4",

  fontSize:
    "8px",

  textAlign:
    "center",
};

const overlay:
  React.CSSProperties =
{
  position:
    "fixed",

  inset:
    0,

  zIndex:
    1000,

  background:
    "rgba(19, 28, 42, 0.72)",

  display:
    "flex",

  alignItems:
    "center",

  justifyContent:
    "center",

  padding:
    "18px",

  boxSizing:
    "border-box",
};

const modal:
  React.CSSProperties =
{
  width:
    "min(1180px, 100%)",

  height:
    "min(880px, 94vh)",

  background:
    "#ffffff",

  borderRadius:
    "8px",

  overflow:
    "hidden",

  display:
    "flex",

  flexDirection:
    "column",

  boxShadow:
    "0 18px 60px rgba(0, 0, 0, 0.3)",
};

const modalCabecera:
  React.CSSProperties =
{
  minHeight:
    "62px",

  padding:
    "10px 16px",

  borderBottom:
    "1px solid #dce2e9",

  display:
    "flex",

  alignItems:
    "center",

  justifyContent:
    "space-between",

  gap:
    "16px",
};

const modalTitulo:
  React.CSSProperties =
{
  color:
    "#2f3b4e",

  fontSize:
    "11px",

  fontWeight:
    700,
};

const modalSubtitulo:
  React.CSSProperties =
{
  marginTop:
    "4px",

  color:
    "#8793a5",

  fontSize:
    "8px",
};

const cerrarModal:
  React.CSSProperties =
{
  width:
    "34px",

  height:
    "34px",

  border:
    "none",

  borderRadius:
    "50%",

  background:
    "#eef2f6",

  color:
    "#46556a",

  fontSize:
    "22px",

  lineHeight:
    1,

  cursor:
    "pointer",
};

const iframe:
  React.CSSProperties =
{
  flex:
    1,

  width:
    "100%",

  border:
    "none",

  background:
    "#e9edf2",
};

const modalPie:
  React.CSSProperties =
{
  minHeight:
    "56px",

  padding:
    "9px 14px",

  borderTop:
    "1px solid #dce2e9",

  display:
    "flex",

  alignItems:
    "center",

  justifyContent:
    "flex-end",
};

const botonPrincipalPequeno:
  React.CSSProperties =
{
  minHeight:
    "34px",

  padding:
    "0 13px",

  border:
    "1px solid #dd3d35",

  borderRadius:
    "4px",

  background:
    "#ef4238",

  color:
    "#ffffff",

  fontSize:
    "8px",

  fontWeight:
    700,

  cursor:
    "pointer",
};

const accionesDocumento:
  React.CSSProperties =
{
  display:
    "flex",

  alignItems:
    "center",

  gap:
    "7px",

  flex:
    "0 0 auto",
};

const botonRechazar:
  React.CSSProperties =
{
  minHeight:
    "32px",

  padding:
    "0 11px",

  border:
    "1px solid #e1aaa5",

  borderRadius:
    "4px",

  background:
    "#fff8f7",

  color:
    "#b9362f",

  fontSize:
    "8px",

  fontWeight:
    700,

  cursor:
    "pointer",
};

const botonRechazado:
  React.CSSProperties =
{
  ...botonRechazar,

  background:
    "#fde8e6",

  border:
    "1px solid #d98982",
};

const rechazoInfo:
  React.CSSProperties =
{
  marginTop:
    "6px",

  color:
    "#b9362f",

  fontSize:
    "8px",

  fontWeight:
    700,

  lineHeight:
    1.4,
};

const bloqueoInfo:
  React.CSSProperties =
{
  marginTop:
    "6px",

  color:
    "#7d695f",

  fontSize:
    "8px",

  fontWeight:
    700,
};

const modalRechazo:
  React.CSSProperties =
{
  width:
    "min(620px, 100%)",

  background:
    "#ffffff",

  borderRadius:
    "8px",

  overflow:
    "hidden",

  boxShadow:
    "0 18px 60px rgba(0, 0, 0, 0.3)",
};

const rechazoContenido:
  React.CSSProperties =
{
  padding:
    "20px",
};

const rechazoAviso:
  React.CSSProperties =
{
  padding:
    "11px 12px",

  border:
    "1px solid #efc7c3",

  borderRadius:
    "5px",

  background:
    "#fff8f7",

  color:
    "#7b5956",

  fontSize:
    "9px",

  lineHeight:
    1.55,
};

const rechazoLabel:
  React.CSSProperties =
{
  marginTop:
    "18px",

  display:
    "flex",

  alignItems:
    "center",

  gap:
    "8px",

  color:
    "#55647a",

  fontSize:
    "8px",

  fontWeight:
    700,
};

const opcional:
  React.CSSProperties =
{
  padding:
    "3px 5px",

  borderRadius:
    "4px",

  background:
    "#eef2f6",

  color:
    "#8b96a7",

  fontSize:
    "7px",
};

const textareaRechazo:
  React.CSSProperties =
{
  width:
    "100%",

  minHeight:
    "130px",

  marginTop:
    "8px",

  padding:
    "11px",

  border:
    "1px solid #cbd3df",

  borderRadius:
    "5px",

  resize:
    "vertical",

  boxSizing:
    "border-box",

  color:
    "#344156",

  fontFamily:
    "Arial, Helvetica, sans-serif",

  fontSize:
    "10px",

  lineHeight:
    1.5,

  outline:
    "none",
};

const contadorCaracteres:
  React.CSSProperties =
{
  marginTop:
    "5px",

  color:
    "#a0a9b6",

  fontSize:
    "7px",

  textAlign:
    "right",
};

const modalPieRechazo:
  React.CSSProperties =
{
  minHeight:
    "64px",

  padding:
    "10px 14px",

  borderTop:
    "1px solid #dce2e9",

  background:
    "#f8fafc",

  display:
    "flex",

  alignItems:
    "center",

  justifyContent:
    "space-between",

  gap:
    "12px",
};

const botonConfirmarRechazo:
  React.CSSProperties =
{
  minHeight:
    "38px",

  padding:
    "0 13px",

  border:
    "1px solid #b9362f",

  borderRadius:
    "5px",

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

const botonRetirarRechazo:
  React.CSSProperties =
{
  minHeight:
    "38px",

  padding:
    "0 13px",

  border:
    "1px solid #78a786",

  borderRadius:
    "5px",

  background:
    "#f1f8f3",

  color:
    "#2f7d44",

  fontSize:
    "8px",

  fontWeight:
    700,

  cursor:
    "pointer",
};

const avisoRechazos:
  React.CSSProperties =
{
  width:
    "min(100%, 680px)",

  margin:
    "16px auto 0",

  padding:
    "12px",

  border:
    "1px solid #efc7c3",

  borderRadius:
    "6px",

  background:
    "#fff8f7",

  color:
    "#795956",

  fontSize:
    "9px",

  lineHeight:
    1.5,

  boxSizing:
    "border-box",
};

const resultadoGrid:
  React.CSSProperties =
{
  marginTop:
    "24px",

  display:
    "flex",

  justifyContent:
    "center",

  gap:
    "10px",

  flexWrap:
    "wrap",
};

const resultadoDato:
  React.CSSProperties =
{
  minWidth:
    "110px",

  padding:
    "15px",

  border:
    "1px solid #dce2e9",

  borderRadius:
    "6px",

  background:
    "#ffffff",

  display:
    "flex",

  flexDirection:
    "column",

  gap:
    "5px",

  color:
    "#344156",
};

const resultadoFecha:
  React.CSSProperties =
{
  marginTop:
    "16px",

  color:
    "#909bad",

  fontSize:
    "8px",
};

const footer:
  React.CSSProperties =
{
  padding:
    "20px 16px",

  borderTop:
    "1px solid #dde3ea",

  color:
    "#98a3b2",

  fontSize:
    "8px",

  textAlign:
    "center",

  background:
    "#ffffff",
};

const estadoCentral:
  React.CSSProperties =
{
  width:
    "min(100% - 32px, 600px)",

  minHeight:
    "calc(100vh - 150px)",

  margin:
    "0 auto",

  display:
    "flex",

  flexDirection:
    "column",

  alignItems:
    "center",

  justifyContent:
    "center",

  textAlign:
    "center",
};

const estadoIcono:
  React.CSSProperties =
{
  width:
    "54px",

  height:
    "54px",

  borderRadius:
    "50%",

  display:
    "flex",

  alignItems:
    "center",

  justifyContent:
    "center",

  fontSize:
    "22px",

  fontWeight:
    700,
};

const estadoTitulo:
  React.CSSProperties =
{
  margin:
    "17px 0 0",

  color:
    "#2f3b4e",

  fontSize:
    "20px",
};

const estadoTexto:
  React.CSSProperties =
{
  margin:
    "10px 0 0",

  maxWidth:
    "470px",

  color:
    "#7b8799",

  fontSize:
    "10px",

  lineHeight:
    1.6,
};
