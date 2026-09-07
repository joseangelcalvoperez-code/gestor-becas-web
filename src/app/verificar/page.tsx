"use client";

import {
  FormEvent,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

export default function VerificarPage() {
  const router =
    useRouter();

  const [
    csv,
    setCsv,
  ] =
    useState(
      ""
    );

  const [
    error,
    setError,
  ] =
    useState(
      ""
    );

  const enviar =
    (
      event:
        FormEvent<HTMLFormElement>
    ) => {
      event.preventDefault();

      const valor =
        normalizarCsv(
          csv
        );

      if (!valor) {
        setError(
          "Introduzca el código seguro de verificación que figura en el documento."
        );

        return;
      }

      setError(
        ""
      );

      router.push(
        `/verificar/${encodeURIComponent(
          valor
        )}`
      );
    };

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
            VERIFICACIÓN PÚBLICA
          </div>

          <h1
            style={
              tituloPrincipal
            }
          >
            Verificar un documento
          </h1>

          <p
            style={
              introduccion
            }
          >
            Introduzca el código seguro de verificación (CSV) que aparece impreso en el documento para consultar la evidencia de firma registrada.
          </p>
        </div>

        <section
          style={
            tarjeta
          }
        >
          <div
            style={
              tarjetaCabecera
            }
          >
            <div
              style={
                iconoVerificacion
              }
            >
              ✓
            </div>

            <div>
              <div
                style={
                  tarjetaTitulo
                }
              >
                CÓDIGO SEGURO DE VERIFICACIÓN
              </div>

              <div
                style={
                  tarjetaSubtitulo
                }
              >
                El CSV permite localizar el registro asociado al documento.
              </div>
            </div>
          </div>

          <form
            onSubmit={
              enviar
            }

            style={
              formulario
            }
          >
            <label
              style={
                label
              }
            >
              CSV DEL DOCUMENTO
            </label>

            <input
              type="text"

              value={
                csv
              }

              onChange={(
                event
              ) =>
                setCsv(
                  event.target.value
                )
              }

              autoComplete="off"

              spellCheck={
                false
              }

              placeholder="Ej. A1B2-C3D4-E5F6-G7H8"

              style={
                input
              }
            />

            {error && (
              <div
                style={
                  errorBox
                }
              >
                {error}
              </div>
            )}

            <button
              type="submit"

              style={
                botonPrincipal
              }
            >
              VERIFICAR DOCUMENTO
            </button>
          </form>
        </section>

        <section
          style={
            aviso
          }
        >
          <strong>
            ¿QUÉ COMPRUEBA ESTE SERVICIO?
          </strong>

          <div
            style={{
              marginTop:
                "6px",
            }}
          >
            Permite consultar la evidencia registrada por el sistema para ese CSV. Cuando disponga de una copia del PDF también podrá comprobar si su huella digital coincide con la registrada.
          </div>
        </section>
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

function normalizarCsv(
  valor:
    string
) {
  return valor
    .trim()
    .toUpperCase()
    .replace(
      /\s+/g,
      ""
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
    "min(100% - 32px, 760px)",

  margin:
    "0 auto",

  padding:
    "54px 0 60px",
};

const cabeceraContenido:
  React.CSSProperties =
{
  textAlign:
    "center",

  maxWidth:
    "680px",

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
    "630px",

  color:
    "#6e7c91",

  fontSize:
    "12px",

  lineHeight:
    1.7,
};

const tarjeta:
  React.CSSProperties =
{
  marginTop:
    "28px",

  background:
    "#ffffff",

  border:
    "1px solid #dce2e9",

  boxShadow:
    "0 12px 30px rgba(38, 50, 70, 0.06)",
};

const tarjetaCabecera:
  React.CSSProperties =
{
  padding:
    "20px 22px",

  borderBottom:
    "1px solid #e4e8ed",

  display:
    "flex",

  alignItems:
    "center",

  gap:
    "12px",
};

const iconoVerificacion:
  React.CSSProperties =
{
  width:
    "34px",

  height:
    "34px",

  borderRadius:
    "50%",

  background:
    "#edf8f1",

  color:
    "#21894d",

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

const tarjetaTitulo:
  React.CSSProperties =
{
  color:
    "#263246",

  fontSize:
    "10px",

  fontWeight:
    700,

  letterSpacing:
    "0.04em",
};

const tarjetaSubtitulo:
  React.CSSProperties =
{
  marginTop:
    "4px",

  color:
    "#8591a2",

  fontSize:
    "9px",
};

const formulario:
  React.CSSProperties =
{
  padding:
    "24px 22px 26px",
};

const label:
  React.CSSProperties =
{
  display:
    "block",

  marginBottom:
    "7px",

  color:
    "#536176",

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
    "46px",

  boxSizing:
    "border-box",

  border:
    "1px solid #cbd3df",

  background:
    "#ffffff",

  padding:
    "0 13px",

  color:
    "#263246",

  fontSize:
    "13px",

  letterSpacing:
    "0.04em",

  outline:
    "none",
};

const botonPrincipal:
  React.CSSProperties =
{
  width:
    "100%",

  minHeight:
    "44px",

  marginTop:
    "15px",

  border:
    "1px solid #d73d36",

  background:
    "#ef4238",

  color:
    "#ffffff",

  fontSize:
    "9px",

  fontWeight:
    700,

  cursor:
    "pointer",
};

const errorBox:
  React.CSSProperties =
{
  marginTop:
    "12px",

  padding:
    "10px 12px",

  border:
    "1px solid #efb4af",

  background:
    "#fff3f2",

  color:
    "#a93832",

  fontSize:
    "9px",

  lineHeight:
    1.5,
};

const aviso:
  React.CSSProperties =
{
  marginTop:
    "18px",

  padding:
    "15px 17px",

  border:
    "1px solid #dce2e9",

  background:
    "#eef2f6",

  color:
    "#65748a",

  fontSize:
    "9px",

  lineHeight:
    1.6,
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
