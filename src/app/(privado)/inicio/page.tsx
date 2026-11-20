export default function InicioPage() {
  const pasoStyle:
    React.CSSProperties =
  {
    flex:
      "1 1 150px",

    minWidth:
      "150px",

    padding:
      "14px",

    border:
      "1px solid var(--cm-borde)",

    background:
      "#ffffff",
  };

  const numeroStyle:
    React.CSSProperties =
  {
    width:
      "24px",

    height:
      "24px",

    borderRadius:
      "50%",

    background:
      "var(--cm-rojo)",

    color:
      "#ffffff",

    display:
      "flex",

    alignItems:
      "center",

    justifyContent:
      "center",

    fontSize:
      "12px",

    fontWeight:
      700,

    marginBottom:
      "9px",
  };

  const tituloPasoStyle:
    React.CSSProperties =
  {
    color:
      "var(--cm-texto)",

    fontSize:
      "12px",

    fontWeight:
      700,

    marginBottom:
      "5px",
  };

  const textoPasoStyle:
    React.CSSProperties =
  {
    margin:
      0,

    color:
      "var(--cm-texto-3)",

    fontSize:
      "11px",

    lineHeight:
      1.5,
  };

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
      {/* =====================================================
          CABECERA
          ===================================================== */}

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
            margin:
              0,

            color:
              "var(--cm-texto)",

            fontSize:
              "20px",
          }}
        >
          Gestión de Becas de Segunda
          Oportunidad
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
          Aplicación web para la gestión
          de alumnos, asistencia y
          documentación.
        </p>
      </div>

      {/* =====================================================
          MANUAL
          ===================================================== */}

      <section
        style={{
          marginTop:
            "22px",

          padding:
            "20px",

          border:
            "1px solid var(--cm-borde)",

          background:
            "var(--cm-fondo-suave)",

          display:
            "flex",

          alignItems:
            "center",

          justifyContent:
            "space-between",

          gap:
            "20px",

          flexWrap:
            "wrap",
        }}
      >
        <div
          style={{
            flex:
              "1 1 520px",
          }}
        >
          <h2
            style={{
              margin:
                0,

              fontSize:
                "14px",

              color:
                "var(--cm-texto)",
            }}
          >
            Manual de usuario
          </h2>

          <p
            style={{
              margin:
                "9px 0 0",

              maxWidth:
                "850px",

              color:
                "var(--cm-texto-3)",

              fontSize:
                "13px",

              lineHeight:
                1.7,
            }}
          >
            Consulte el funcionamiento
            completo de la aplicación,
            el orden recomendado de
            trabajo y las principales
            opciones disponibles.
          </p>
        </div>

        <a
          href="/documentos/Manual_Gestor_Becas_v1.1.pdf"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            minHeight:
              "40px",

            padding:
              "0 18px",

            display:
              "inline-flex",

            alignItems:
              "center",

            justifyContent:
              "center",

            background:
              "var(--cm-rojo)",

            color:
              "#ffffff",

            fontSize:
              "11px",

            fontWeight:
              700,

            textDecoration:
              "none",

            whiteSpace:
              "nowrap",
          }}
        >
          VER / DESCARGAR MANUAL
        </a>
      </section>

      {/* =====================================================
          FLUJO BÁSICO
          ===================================================== */}

      <section
        style={{
          marginTop:
            "18px",

          padding:
            "20px",

          border:
            "1px solid var(--cm-borde)",

          background:
            "#ffffff",
        }}
      >
        <div
          style={{
            marginBottom:
              "16px",
          }}
        >
          <h2
            style={{
              margin:
                0,

              fontSize:
                "14px",

              color:
                "var(--cm-texto)",
            }}
          >
            Flujo básico de trabajo
          </h2>

          <p
            style={{
              margin:
                "7px 0 0",

              color:
                "var(--cm-texto-3)",

              fontSize:
                "12px",

              lineHeight:
                1.6,
            }}
          >
            Orden recomendado para
            configurar y utilizar la
            aplicación.
          </p>
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
          <div
            style={
              pasoStyle
            }
          >
            <div
              style={
                numeroStyle
              }
            >
              1
            </div>

            <div
              style={
                tituloPasoStyle
              }
            >
              CENTRO
            </div>

            <p
              style={
                textoPasoStyle
              }
            >
              Configure los datos del
              centro y el curso
              académico de trabajo.
            </p>
          </div>

          <div
            style={
              pasoStyle
            }
          >
            <div
              style={
                numeroStyle
              }
            >
              2
            </div>

            <div
              style={
                tituloPasoStyle
              }
            >
              GRADOS Y ASIGNATURAS
            </div>

            <p
              style={
                textoPasoStyle
              }
            >
              Cree los grados,
              asignaturas y profesores
              responsables.
            </p>
          </div>

          <div
            style={
              pasoStyle
            }
          >
            <div
              style={
                numeroStyle
              }
            >
              3
            </div>

            <div
              style={
                tituloPasoStyle
              }
            >
              ALUMNOS
            </div>

            <p
              style={
                textoPasoStyle
              }
            >
              Matricule alumnos y
              configure las
              convalidaciones cuando
              proceda.
            </p>
          </div>

          <div
            style={
              pasoStyle
            }
          >
            <div
              style={
                numeroStyle
              }
            >
              4
            </div>

            <div
              style={
                tituloPasoStyle
              }
            >
              ASISTENCIA
            </div>

            <p
              style={
                textoPasoStyle
              }
            >
              Registre la asistencia
              manualmente o mediante
              Excel.
            </p>
          </div>

          <div
            style={
              pasoStyle
            }
          >
            <div
              style={
                numeroStyle
              }
            >
              5
            </div>

            <div
              style={
                tituloPasoStyle
              }
            >
              DOCUMENTOS
            </div>

            <p
              style={
                textoPasoStyle
              }
            >
              Revise los datos y genere
              Anexos V, Anexo I o
              expedientes completos.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}