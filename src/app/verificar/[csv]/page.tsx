"use client";

import {
  ChangeEvent,
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  useParams,
  useRouter,
} from "next/navigation";

type Firma = {
  nombre:
    string;

  apellidos:
    string;

  dni:
    string;

  fechaFirma:
    string;

  evidenciaDisponibleHasta:
    string;
};

type Evidencia = {
  csv:
    string;

  documento: {
    nombreArchivo:
      string;

    tipo:
      "ANEXO_I" |
      "ANEXO_V" |
      "OTRO";

    estado:
      "FIRMADO" |
      "PARCIAL";

    anio:
      number | null;

    mes:
      number | null;

    hashFirmado:
      string;

    pdfDisponible:
      boolean;

    pdfDisponibleHasta:
      string | null;

    pdfEliminadoEn:
      string | null;
  };

  centro: {
    nombre:
      string;

    codigo:
      string;
  };

  cursoAcademico: {
    nombre:
      string;
  } | null;

  alumno: {
    nombre:
      string;

    apellidos:
      string;

    expediente:
      string;

    grado:
      string;
  } | null;

  asignatura: {
    codigo:
      string;

    nombre:
      string;
  } | null;

  firmas:
    Firma[];

  fechaUltimaFirma:
    string;

  evidenciaActiva:
    boolean;
};

type ResultadoComprobacion = {
  coincide:
    boolean;

  hashCalculado:
    string;

  hashRegistrado:
    string;
};

export default function VerificarCsvPage() {
  const params =
    useParams<{
      csv:
        string;
    }>();

  const router =
    useRouter();

  const csv =
    decodeURIComponent(
      String(
        params.csv ??
        ""
      )
    )
      .trim()
      .toUpperCase();

  const [
    datos,
    setDatos,
  ] =
    useState<
      Evidencia | null
    >(
      null
    );

  const [
    cargando,
    setCargando,
  ] =
    useState(
      true
    );

  const [
    error,
    setError,
  ] =
    useState(
      ""
    );

  const [
    archivo,
    setArchivo,
  ] =
    useState<
      File | null
    >(
      null
    );

  const [
    comprobando,
    setComprobando,
  ] =
    useState(
      false
    );

  const [
    resultado,
    setResultado,
  ] =
    useState<
      ResultadoComprobacion | null
    >(
      null
    );

  const cargar =
    useCallback(
      async () => {
        if (!csv) {
          setError(
            "El código seguro de verificación no es válido."
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
              `/api/verificar/${encodeURIComponent(
                csv
              )}`,
              {
                cache:
                  "no-store",
              }
            );

          const contenido =
            await respuesta.json();

          if (
            !respuesta.ok
          ) {
            setDatos(
              null
            );

            setError(
              contenido.error ??
                "No se ha encontrado una evidencia válida para este código."
            );

            return;
          }

          setDatos(
            contenido.evidencia
          );
        } catch {
          setError(
            "No se ha podido conectar con el servicio de verificación."
          );
        } finally {
          setCargando(
            false
          );
        }
      },
      [
        csv,
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

  const seleccionarArchivo =
    (
      event:
        ChangeEvent<HTMLInputElement>
    ) => {
      const seleccionado =
        event.target.files?.[0] ??
        null;

      setArchivo(
        seleccionado
      );

      setResultado(
        null
      );
    };

  const comprobarPdf =
    async () => {
      if (
        !archivo ||
        !datos
      ) {
        return;
      }

      try {
        setComprobando(
          true
        );

        setResultado(
          null
        );

        const formData =
          new FormData();

        formData.append(
          "archivo",
          archivo
        );

        const respuesta =
          await fetch(
            `/api/verificar/${encodeURIComponent(
              csv
            )}/comprobar`,
            {
              method:
                "POST",

              body:
                formData,
            }
          );

        const contenido =
          await respuesta.json();

        if (
          !respuesta.ok
        ) {
          window.alert(
            contenido.error ??
              "No se ha podido comprobar el documento."
          );

          return;
        }

        setResultado({
          coincide:
            Boolean(
              contenido.coincide
            ),

          hashCalculado:
            String(
              contenido.hashCalculado
            ),

          hashRegistrado:
            String(
              contenido.hashRegistrado
            ),
        });
      } catch {
        window.alert(
          "No se ha podido conectar con el servicio de verificación."
        );
      } finally {
        setComprobando(
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
          titulo="Comprobando documento"
          texto="Estamos consultando la evidencia asociada al código de verificación."
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
          titulo="No se puede verificar el documento"
          texto={
            error ||
            "No existe una evidencia disponible para este código."
          }
          error
          accion={() =>
            router.push(
              "/verificar"
            )
          }
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
            cabeceraContenido
          }
        >
          <div
            style={
              etiqueta
            }
          >
            EVIDENCIA LOCALIZADA
          </div>

          <div
            style={
              checkGrande
            }
          >
            ✓
          </div>

          <h1
            style={
              tituloPrincipal
            }
          >
            Evidencia de firma registrada
          </h1>

          <p
            style={
              introduccion
            }
          >
            El sistema ha localizado un registro de firma asociado al CSV indicado. Esta comprobación acredita la existencia de la evidencia registrada por la plataforma.
          </p>
        </div>

        <section
          style={
            estadoGeneral
          }
        >
          <div>
            <div
              style={
                estadoGeneralTitulo
              }
            >
              {datos.documento.estado ===
              "FIRMADO"
                ? "DOCUMENTO FIRMADO"
                : "DOCUMENTO CON FIRMA PARCIAL"}
            </div>

            <div
              style={
                estadoGeneralTexto
              }
            >
              Última firma registrada:{" "}
              <strong>
                {
                  formatearFechaHora(
                    datos.fechaUltimaFirma
                  )
                }
              </strong>
            </div>
          </div>

          <div
            style={
              selloEstado
            }
          >
            REGISTRO LOCALIZADO
          </div>
        </section>

        <section
          style={
            rejilla
          }
        >
          <Tarjeta
            titulo="DOCUMENTO"
          >
            <Dato
              etiqueta="Nombre"
              valor={
                datos.documento
                  .nombreArchivo
              }
            />

            <Dato
              etiqueta="Tipo"
              valor={
                etiquetaTipo(
                  datos.documento
                    .tipo
                )
              }
            />

            <Dato
              etiqueta="Periodo"
              valor={
                periodo(
                  datos.documento
                    .mes,
                  datos.documento
                    .anio
                )
              }
            />

            <Dato
              etiqueta="Centro"
              valor={`${datos.centro.nombre} · ${datos.centro.codigo}`}
            />

            <Dato
              etiqueta="Curso académico"
              valor={
                datos
                  .cursoAcademico
                  ?.nombre ??
                "Dato operativo no disponible"
              }
            />
          </Tarjeta>

          <Tarjeta
            titulo="DATOS ASOCIADOS"
          >
            <Dato
              etiqueta="Alumno"
              valor={
                datos.alumno
                  ? `${datos.alumno.nombre} ${datos.alumno.apellidos}`
                  : "Dato operativo no disponible"
              }
            />

            <Dato
              etiqueta="Expediente"
              valor={
                datos.alumno
                  ?.expediente ||
                "—"
              }
            />

            <Dato
              etiqueta="Grado"
              valor={
                datos.alumno
                  ?.grado ||
                "—"
              }
            />

            <Dato
              etiqueta="Asignatura"
              valor={
                datos.asignatura
                  ? `${datos.asignatura.codigo} · ${datos.asignatura.nombre}`
                  : datos.documento
                      .tipo ===
                    "ANEXO_I"
                    ? "ANEXO I GLOBAL"
                    : "—"
              }
            />
          </Tarjeta>
        </section>

        <Tarjeta
          titulo="FIRMANTES"
        >
          <div
            style={
              listaFirmantes
            }
          >
            {datos.firmas.map(
              (
                firma,
                indice
              ) => (
                <div
                  key={`${firma.nombre}-${firma.apellidos}-${firma.fechaFirma}-${indice}`}

                  style={
                    firmante
                  }
                >
                  <div
                    style={
                      firmanteNumero
                    }
                  >
                    {
                      indice +
                      1
                    }
                  </div>

                  <div
                    style={{
                      flex:
                        1,
                    }}
                  >
                    <div
                      style={
                        firmanteNombre
                      }
                    >
                      {
                        firma.nombre
                      }{" "}
                      {
                        firma.apellidos
                      }
                    </div>

                    <div
                      style={
                        firmanteDatos
                      }
                    >
                      DNI/NIE declarado:{" "}
                      <strong>
                        {
                          firma.dni
                        }
                      </strong>
                    </div>

                    <div
                      style={
                        firmanteDatos
                      }
                    >
                      Fecha y hora:{" "}
                      <strong>
                        {
                          formatearFechaHora(
                            firma.fechaFirma
                          )
                        }
                      </strong>
                    </div>

                    <div
                      style={
                        firmanteDatos
                      }
                    >
                      Evidencia conservada hasta:{" "}
                      <strong>
                        {
                          formatearFecha(
                            firma.evidenciaDisponibleHasta
                          )
                        }
                      </strong>
                    </div>
                  </div>
                </div>
              )
            )}
          </div>
        </Tarjeta>

        <section
          style={
            rejilla
          }
        >
          <Tarjeta
            titulo="CÓDIGO DE VERIFICACIÓN"
          >
            <Dato
              etiqueta="CSV"
              valor={
                datos.csv
              }
              monoespaciado
            />

            <Dato
              etiqueta="Huella SHA-256 registrada"
              valor={
                datos.documento
                  .hashFirmado
              }
              monoespaciado
              largo
            />

            <div
              style={
                notaTecnica
              }
            >
              La huella identifica criptográficamente el contenido exacto del PDF firmado registrado por el sistema.
            </div>
          </Tarjeta>

          <Tarjeta
            titulo="DISPONIBILIDAD DEL PDF"
          >
            <div
              style={
                datos.documento
                  .pdfDisponible
                  ? estadoDisponible
                  : estadoNoDisponible
              }
            >
              <strong>
                {datos.documento
                  .pdfDisponible
                  ? "✓ PDF todavía disponible"
                  : "PDF no almacenado"}
              </strong>

              <div
                style={{
                  marginTop:
                    "5px",
                }}
              >
                {datos.documento
                  .pdfDisponible
                  ? datos.documento
                      .pdfDisponibleHasta
                    ? `Periodo previsto de disponibilidad hasta ${formatearFecha(
                        datos.documento
                          .pdfDisponibleHasta
                      )}.`
                    : "El documento permanece dentro de su periodo de disponibilidad."
                  : "El archivo ya no se conserva en la plataforma. La evidencia de firma permanece disponible durante su periodo de retención."}
              </div>
            </div>

            <div
              style={
                notaTecnica
              }
            >
              La ausencia del PDF almacenado no invalida por sí misma la evidencia de firma registrada.
            </div>
          </Tarjeta>
        </section>

        <Tarjeta
          titulo="COMPROBAR UNA COPIA DEL PDF"
        >
          <p
            style={
              textoComprobar
            }
          >
            Si dispone de una copia del documento, puede seleccionarla para comparar su SHA-256 con la huella registrada. El archivo se utiliza únicamente para realizar esta comprobación y no se incorpora al archivo documental.
          </p>

          <div
            style={
              zonaArchivo
            }
          >
            <input
              type="file"

              accept="application/pdf,.pdf"

              onChange={
                seleccionarArchivo
              }

              style={
                inputArchivo
              }
            />

            <button
              type="button"

              disabled={
                !archivo ||
                comprobando
              }

              onClick={
                comprobarPdf
              }

              style={{
                ...botonPrincipal,

                opacity:
                  !archivo ||
                  comprobando
                    ? 0.5
                    : 1,
              }}
            >
              {comprobando
                ? "COMPROBANDO..."
                : "COMPROBAR DOCUMENTO"}
            </button>
          </div>

          {archivo && (
            <div
              style={
                archivoSeleccionado
              }
            >
              Archivo seleccionado:{" "}
              <strong>
                {
                  archivo.name
                }
              </strong>
            </div>
          )}

          {resultado && (
            <div
              style={
                resultado.coincide
                  ? resultadoCorrecto
                  : resultadoIncorrecto
              }
            >
              <div
                style={
                  resultadoTitulo
                }
              >
                {resultado.coincide
                  ? "✓ DOCUMENTO ÍNTEGRO"
                  : "✕ EL DOCUMENTO NO COINCIDE"}
              </div>

              <div
                style={
                  resultadoTexto
                }
              >
                {resultado.coincide
                  ? "La huella digital del PDF aportado coincide exactamente con la huella registrada para este CSV."
                  : "La huella digital del PDF aportado es distinta de la registrada para este CSV. No puede acreditarse que sea el mismo archivo."}
              </div>
            </div>
          )}
        </Tarjeta>

        <div
          style={
            accionesFinales
          }
        >
          <button
            type="button"

            onClick={() =>
              router.push(
                "/verificar"
              )
            }

            style={
              botonSecundario
            }
          >
            VERIFICAR OTRO CSV
          </button>
        </div>
      </main>
    </PantallaBase>
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
              circuloHeader
            }
          >
            ✓
          </span>

          VERIFICACIÓN PÚBLICA
        </div>
      </header>

      {children}

      <footer
        style={
          footer
        }
      >
        Servicio de comprobación de evidencias de firma documental.
      </footer>
    </div>
  );
}

function EstadoCentral({
  icono,
  titulo,
  texto,
  error = false,
  accion,
}: {
  icono:
    string;

  titulo:
    string;

  texto:
    string;

  error?:
    boolean;

  accion?:
    () => void;
}) {
  return (
    <main
      style={{
        ...main,

        minHeight:
          "calc(100vh - 150px)",

        display:
          "flex",

        alignItems:
          "center",

        justifyContent:
          "center",
      }}
    >
      <div
        style={
          estadoCentral
        }
      >
        <div
          style={{
            ...estadoCentralIcono,

            background:
              error
                ? "#fff1f0"
                : "#eef4f8",

            color:
              error
                ? "#c63f37"
                : "#52657c",
          }}
        >
          {icono}
        </div>

        <h1
          style={
            estadoCentralTitulo
          }
        >
          {titulo}
        </h1>

        <p
          style={
            estadoCentralTexto
          }
        >
          {texto}
        </p>

        {accion && (
          <button
            type="button"

            onClick={
              accion
            }

            style={{
              ...botonPrincipal,

              width:
                "auto",

              padding:
                "0 18px",
            }}
          >
            INTRODUCIR OTRO CSV
          </button>
        )}
      </div>
    </main>
  );
}

function Tarjeta({
  titulo,
  children,
}: {
  titulo:
    string;

  children:
    React.ReactNode;
}) {
  return (
    <section
      style={
        tarjeta
      }
    >
      <div
        style={
          tarjetaTitulo
        }
      >
        {titulo}
      </div>

      <div
        style={
          tarjetaContenido
        }
      >
        {children}
      </div>
    </section>
  );
}

function Dato({
  etiqueta,
  valor,
  monoespaciado = false,
  largo = false,
}: {
  etiqueta:
    string;

  valor:
    string;

  monoespaciado?:
    boolean;

  largo?:
    boolean;
}) {
  return (
    <div
      style={
        dato
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
        style={{
          ...datoValor,

          fontFamily:
            monoespaciado
              ? "Consolas, monospace"
              : "Arial, Helvetica, sans-serif",

          fontSize:
            largo
              ? "8px"
              : "10px",

          overflowWrap:
            "anywhere",
        }}
      >
        {valor}
      </div>
    </div>
  );
}

function etiquetaTipo(
  tipo:
    Evidencia["documento"]["tipo"]
) {
  if (
    tipo ===
    "ANEXO_I"
  ) {
    return "ANEXO I";
  }

  if (
    tipo ===
    "ANEXO_V"
  ) {
    return "ANEXO V";
  }

  return "OTRO DOCUMENTO";
}

function periodo(
  mes:
    number | null,

  anio:
    number | null
) {
  if (
    !mes ||
    !anio
  ) {
    return "—";
  }

  return `${nombreMes(
    mes
  )} ${anio}`;
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
    String(
      mes
    );
}

function formatearFechaHora(
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
      timeZone:
        "Europe/Madrid",

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

      second:
        "2-digit",
    }
  ).format(
    fecha
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
      timeZone:
        "Europe/Madrid",

      day:
        "2-digit",

      month:
        "2-digit",

      year:
        "numeric",
    }
  ).format(
    fecha
  );
}

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

const circuloHeader:
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

const cabeceraContenido:
  React.CSSProperties =
{
  textAlign:
    "center",

  maxWidth:
    "740px",

  margin:
    "0 auto",
};

const etiqueta:
  React.CSSProperties =
{
  display:
    "inline-block",

  padding:
    "6px 9px",

  borderRadius:
    "999px",

  background:
    "#eaf5ee",

  color:
    "#25804b",

  fontSize:
    "8px",

  fontWeight:
    700,

  letterSpacing:
    "0.07em",
};

const checkGrande:
  React.CSSProperties =
{
  width:
    "52px",

  height:
    "52px",

  margin:
    "18px auto 0",

  borderRadius:
    "50%",

  background:
    "#eaf7ef",

  color:
    "#21894d",

  display:
    "flex",

  alignItems:
    "center",

  justifyContent:
    "center",

  fontSize:
    "24px",

  fontWeight:
    700,
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
    "680px",

  color:
    "#6e7c91",

  fontSize:
    "11px",

  lineHeight:
    1.7,
};

const estadoGeneral:
  React.CSSProperties =
{
  marginTop:
    "26px",

  padding:
    "16px 18px",

  border:
    "1px solid #cfe4d6",

  background:
    "#f2faf5",

  display:
    "flex",

  alignItems:
    "center",

  justifyContent:
    "space-between",

  gap:
    "18px",

  flexWrap:
    "wrap",
};

const estadoGeneralTitulo:
  React.CSSProperties =
{
  color:
    "#237447",

  fontSize:
    "10px",

  fontWeight:
    700,
};

const estadoGeneralTexto:
  React.CSSProperties =
{
  marginTop:
    "4px",

  color:
    "#65776c",

  fontSize:
    "9px",
};

const selloEstado:
  React.CSSProperties =
{
  padding:
    "7px 9px",

  border:
    "1px solid #bcdac7",

  background:
    "#ffffff",

  color:
    "#237447",

  fontSize:
    "7px",

  fontWeight:
    700,

  letterSpacing:
    "0.05em",
};

const rejilla:
  React.CSSProperties =
{
  marginTop:
    "16px",

  display:
    "grid",

  gridTemplateColumns:
    "repeat(auto-fit, minmax(290px, 1fr))",

  gap:
    "16px",
};

const tarjeta:
  React.CSSProperties =
{
  marginTop:
    "16px",

  border:
    "1px solid #dce2e9",

  background:
    "#ffffff",

  boxShadow:
    "0 8px 24px rgba(38, 50, 70, 0.04)",
};

const tarjetaTitulo:
  React.CSSProperties =
{
  padding:
    "12px 15px",

  borderBottom:
    "1px solid #e4e8ed",

  background:
    "#f8fafc",

  color:
    "#536176",

  fontSize:
    "8px",

  fontWeight:
    700,

  letterSpacing:
    "0.05em",
};

const tarjetaContenido:
  React.CSSProperties =
{
  padding:
    "4px 15px 14px",
};

const dato:
  React.CSSProperties =
{
  padding:
    "11px 0",

  borderBottom:
    "1px solid #edf0f3",
};

const datoEtiqueta:
  React.CSSProperties =
{
  color:
    "#8a96a7",

  fontSize:
    "7px",

  fontWeight:
    700,

  letterSpacing:
    "0.04em",
};

const datoValor:
  React.CSSProperties =
{
  marginTop:
    "4px",

  color:
    "#2f394a",

  fontWeight:
    600,

  lineHeight:
    1.45,
};

const listaFirmantes:
  React.CSSProperties =
{
  paddingTop:
    "10px",
};

const firmante:
  React.CSSProperties =
{
  padding:
    "12px 0",

  display:
    "flex",

  alignItems:
    "flex-start",

  gap:
    "11px",

  borderBottom:
    "1px solid #edf0f3",
};

const firmanteNumero:
  React.CSSProperties =
{
  width:
    "25px",

  height:
    "25px",

  flex:
    "0 0 auto",

  borderRadius:
    "50%",

  background:
    "#eef2f6",

  color:
    "#536176",

  display:
    "flex",

  alignItems:
    "center",

  justifyContent:
    "center",

  fontSize:
    "8px",

  fontWeight:
    700,
};

const firmanteNombre:
  React.CSSProperties =
{
  color:
    "#263246",

  fontSize:
    "10px",

  fontWeight:
    700,
};

const firmanteDatos:
  React.CSSProperties =
{
  marginTop:
    "4px",

  color:
    "#748197",

  fontSize:
    "8px",

  lineHeight:
    1.5,
};

const notaTecnica:
  React.CSSProperties =
{
  marginTop:
    "12px",

  padding:
    "10px 11px",

  background:
    "#f5f7f9",

  color:
    "#778599",

  fontSize:
    "8px",

  lineHeight:
    1.55,
};

const estadoDisponible:
  React.CSSProperties =
{
  marginTop:
    "10px",

  padding:
    "12px",

  border:
    "1px solid #cfe4d6",

  background:
    "#f2faf5",

  color:
    "#347152",

  fontSize:
    "9px",

  lineHeight:
    1.5,
};

const estadoNoDisponible:
  React.CSSProperties =
{
  marginTop:
    "10px",

  padding:
    "12px",

  border:
    "1px solid #d9dfe6",

  background:
    "#f5f7f9",

  color:
    "#69778b",

  fontSize:
    "9px",

  lineHeight:
    1.5,
};

const textoComprobar:
  React.CSSProperties =
{
  margin:
    "12px 0 0",

  color:
    "#6e7c91",

  fontSize:
    "9px",

  lineHeight:
    1.65,
};

const zonaArchivo:
  React.CSSProperties =
{
  marginTop:
    "14px",

  display:
    "grid",

  gridTemplateColumns:
    "minmax(0, 1fr) 190px",

  gap:
    "10px",

  alignItems:
    "center",
};

const inputArchivo:
  React.CSSProperties =
{
  width:
    "100%",

  minHeight:
    "42px",

  boxSizing:
    "border-box",

  border:
    "1px solid #cbd3df",

  background:
    "#ffffff",

  padding:
    "9px",

  color:
    "#536176",

  fontSize:
    "9px",
};

const botonPrincipal:
  React.CSSProperties =
{
  minHeight:
    "42px",

  padding:
    "0 14px",

  border:
    "1px solid #d73d36",

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

const archivoSeleccionado:
  React.CSSProperties =
{
  marginTop:
    "9px",

  color:
    "#748197",

  fontSize:
    "8px",
};

const resultadoCorrecto:
  React.CSSProperties =
{
  marginTop:
    "15px",

  padding:
    "14px",

  border:
    "1px solid #bcdac7",

  background:
    "#f0faf4",

  color:
    "#276d47",
};

const resultadoIncorrecto:
  React.CSSProperties =
{
  marginTop:
    "15px",

  padding:
    "14px",

  border:
    "1px solid #edc2be",

  background:
    "#fff4f3",

  color:
    "#9f3c35",
};

const resultadoTitulo:
  React.CSSProperties =
{
  fontSize:
    "9px",

  fontWeight:
    700,
};

const resultadoTexto:
  React.CSSProperties =
{
  marginTop:
    "5px",

  fontSize:
    "8px",

  lineHeight:
    1.6,
};

const accionesFinales:
  React.CSSProperties =
{
  marginTop:
    "18px",

  display:
    "flex",

  justifyContent:
    "center",
};

const botonSecundario:
  React.CSSProperties =
{
  minHeight:
    "36px",

  padding:
    "0 14px",

  border:
    "1px solid #cbd3df",

  background:
    "#ffffff",

  color:
    "#536176",

  fontSize:
    "8px",

  fontWeight:
    700,

  cursor:
    "pointer",
};

const estadoCentral:
  React.CSSProperties =
{
  width:
    "min(100%, 560px)",

  padding:
    "32px",

  border:
    "1px solid #dce2e9",

  background:
    "#ffffff",

  textAlign:
    "center",

  boxSizing:
    "border-box",
};

const estadoCentralIcono:
  React.CSSProperties =
{
  width:
    "48px",

  height:
    "48px",

  margin:
    "0 auto",

  borderRadius:
    "50%",

  display:
    "flex",

  alignItems:
    "center",

  justifyContent:
    "center",

  fontSize:
    "20px",

  fontWeight:
    700,
};

const estadoCentralTitulo:
  React.CSSProperties =
{
  margin:
    "15px 0 0",

  color:
    "#263246",

  fontSize:
    "20px",
};

const estadoCentralTexto:
  React.CSSProperties =
{
  margin:
    "9px auto 18px",

  maxWidth:
    "430px",

  color:
    "#748197",

  fontSize:
    "10px",

  lineHeight:
    1.65,
};

const footer:
  React.CSSProperties =
{
  padding:
    "22px 20px",

  textAlign:
    "center",

  color:
    "#8995a6",

  fontSize:
    "8px",
};
