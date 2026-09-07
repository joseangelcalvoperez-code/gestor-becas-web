"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import CursosAcademicos from "@/components/CursosAcademicos";

interface Centro {
  id: number;
  nombre: string;
  codigo: string;
  cif: string;
  direccion: string;
  localidad: string;
  provincia: string;
  telefono: string;
  email: string;
  directorNombre: string;
  directorApellidos: string;
  directorDni: string;
  directorEmail: string;
  selloFirmaUrl: string | null;
}

interface UsuarioAcceso {
  id: number;
  nombre: string;
  apellidos: string;
  email: string;
}

const centroInicial: Centro = {
  id: 0,
  nombre: "",
  codigo: "",
  cif: "",
  direccion: "",
  localidad: "",
  provincia: "",
  telefono: "",
  email: "",
  directorNombre: "",
  directorApellidos: "",
  directorDni: "",
  directorEmail: "",
  selloFirmaUrl: null,
};

const usuarioInicial: UsuarioAcceso = {
  id: 0,
  nombre: "",
  apellidos: "",
  email: "",
};

export default function CentroPage() {
  const [centro, setCentro] =
    useState<Centro>(centroInicial);

  const [usuarioAcceso, setUsuarioAcceso] =
    useState<UsuarioAcceso>(usuarioInicial);

  const [cargando, setCargando] =
    useState(true);

  const [guardando, setGuardando] =
    useState(false);
  const [sello, setSello] = useState<File | null>(null);

  const [mensaje, setMensaje] =
    useState("");

  const [tipoMensaje, setTipoMensaje] =
    useState<"success" | "error" | "">("");

  useEffect(() => {
    cargarCentro();
  }, []);

  const cargarCentro = async () => {
    try {
      setCargando(true);
      setMensaje("");
      setTipoMensaje("");

      const respuesta =
        await fetch(
          "/api/centro",
          {
            method: "GET",
            cache: "no-store",
          }
        );

      const resultado =
        await respuesta.json();

      if (!respuesta.ok) {
        setTipoMensaje("error");
        setMensaje(
          resultado.error ??
            "No se han podido cargar los datos del centro."
        );
        return;
      }

      setCentro(resultado.centro);
      setUsuarioAcceso(
        resultado.usuarioAcceso
      );
    } catch {
      setTipoMensaje("error");
      setMensaje(
        "No se ha podido conectar con el servidor."
      );
    } finally {
      setCargando(false);
    }
  };

  const cambiarCampoCentro =
    (campo: keyof Centro, valor: string) => {
      setCentro((anterior) => ({
        ...anterior,
        [campo]: valor,
      }));
    };

  const cambiarCampoUsuario =
    (campo: keyof UsuarioAcceso, valor: string) => {
      setUsuarioAcceso((anterior) => ({
        ...anterior,
        [campo]: valor,
      }));
    };

  const guardar = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    try {
      setGuardando(true);
      setMensaje("");
      setTipoMensaje("");

      const respuesta =
        await fetch(
          "/api/centro",
          {
            method: "PUT",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              nombre:
                centro.nombre,
              codigo:
                centro.codigo,
              cif:
                centro.cif,
              direccion:
                centro.direccion,
              localidad:
                centro.localidad,
              provincia:
                centro.provincia,
              telefono:
                centro.telefono,
              email:
                centro.email,
              directorNombre: centro.directorNombre,
              directorApellidos: centro.directorApellidos,
              directorDni: centro.directorDni,
              directorEmail: centro.directorEmail,

              usuarioNombre:
                usuarioAcceso.nombre,
              usuarioApellidos:
                usuarioAcceso.apellidos,
              usuarioEmail:
                usuarioAcceso.email,
            }),
          }
        );

      const resultado =
        await respuesta.json();

      if (!respuesta.ok) {
        setTipoMensaje("error");
        setMensaje(
          resultado.error ??
            "No se han podido guardar los datos."
        );
        return;
      }

      if (resultado.centro) {
        setCentro(resultado.centro);
      }

      if (resultado.usuarioAcceso) {
        setUsuarioAcceso(
          resultado.usuarioAcceso
        );
      }

      if (sello) {
        const datosSello = new FormData();
        datosSello.append("sello", sello);
        const respuestaSello = await fetch("/api/centro/sello", { method: "POST", body: datosSello });
        const resultadoSello = await respuestaSello.json();
        if (!respuestaSello.ok) {
          setTipoMensaje("error");
          setMensaje(resultadoSello.error ?? "Los datos se guardaron, pero no se pudo guardar el sello.");
          return;
        }
        setCentro((anterior) => ({ ...anterior, selloFirmaUrl: "configurado" }));
        setSello(null);
      }

      setTipoMensaje("success");
      setMensaje(
        "✓ Datos del centro y de acceso guardados correctamente"
      );
    } catch {
      setTipoMensaje("error");
      setMensaje(
        "No se ha podido conectar con el servidor."
      );
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) {
    return (
      <div
        style={{
          background: "#ffffff",
          border: "1px solid #d7dde5",
          minHeight: "calc(100vh - 105px)",
          padding: "24px",
          color: "#65758d",
          fontSize: "12px",
        }}
      >
        Cargando datos del centro...
      </div>
    );
  }

  return (
    <div
      style={{
        background: "#ffffff",
        border: "1px solid #d7dde5",
        minHeight: "calc(100vh - 105px)",
        padding: "24px",
      }}
    >
      <div
        style={{
          paddingBottom: "18px",
          borderBottom:
            "1px solid #d7dde5",
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: "20px",
            color: "#303b50",
          }}
        >
          CENTRO
        </h1>

        <p
          style={{
            margin: "6px 0 0",
            fontSize: "11px",
            color: "#7a879a",
          }}
        >
          Configure la información general del centro y los datos del usuario que accede a la herramienta.
        </p>
      </div>

      {mensaje && (
        <div
          style={{
            marginTop: "18px",
            padding: "12px 14px",
            border:
              tipoMensaje === "success"
                ? "1px solid #b9dec2"
                : "1px solid #efb0aa",
            background:
              tipoMensaje === "success"
                ? "#edf8f0"
                : "#fff0ef",
            color:
              tipoMensaje === "success"
                ? "#2f7d44"
                : "#b9362f",
            fontSize: "11px",
          }}
        >
          {mensaje}
        </div>
      )}

      <form
        onSubmit={guardar}
        style={{
          marginTop: "20px",
        }}
      >
        <BloqueFormulario
          titulo="Datos del centro"
          descripcion="Introduzca la información identificativa del centro educativo."
        >
          <div style={gridStyle}>
            <Campo
              label="Nombre del centro"
              valor={centro.nombre}
              onChange={(valor) =>
                cambiarCampoCentro(
                  "nombre",
                  valor
                )
              }
            />

            <Campo
              label="Código de centro"
              valor={centro.codigo}
              onChange={(valor) =>
                cambiarCampoCentro(
                  "codigo",
                  valor
                )
              }
            />

            <Campo
              label="CIF"
              valor={centro.cif}
              onChange={(valor) =>
                cambiarCampoCentro(
                  "cif",
                  valor
                )
              }
            />

            <Campo
              label="Dirección"
              valor={centro.direccion}
              onChange={(valor) =>
                cambiarCampoCentro(
                  "direccion",
                  valor
                )
              }
            />

            <Campo
              label="Localidad"
              valor={centro.localidad}
              onChange={(valor) =>
                cambiarCampoCentro(
                  "localidad",
                  valor
                )
              }
            />

            <Campo
              label="Provincia"
              valor={centro.provincia}
              onChange={(valor) =>
                cambiarCampoCentro(
                  "provincia",
                  valor
                )
              }
            />

            <Campo
              label="Teléfono"
              valor={centro.telefono}
              onChange={(valor) =>
                cambiarCampoCentro(
                  "telefono",
                  valor
                )
              }
            />

            <Campo
              label="Email general del centro"
              type="email"
              valor={centro.email}
              onChange={(valor) =>
                cambiarCampoCentro(
                  "email",
                  valor
                )
              }
            />
          </div>
        </BloqueFormulario>

        <div style={{ marginTop: "18px" }}>
          <BloqueFormulario
            titulo="Director y sello del centro"
            descripcion="Estos datos se incorporarán como evidencia en el Anexo I. El director solo podrá firmar cuando hayan terminado todos los profesores."
          >
            <div style={gridStyle}>
              <Campo label="Nombre del director" valor={centro.directorNombre} onChange={(valor) => cambiarCampoCentro("directorNombre", valor)} />
              <Campo label="Apellidos del director" valor={centro.directorApellidos} onChange={(valor) => cambiarCampoCentro("directorApellidos", valor)} />
              <Campo label="DNI/NIE del director" valor={centro.directorDni} onChange={(valor) => cambiarCampoCentro("directorDni", valor)} />
              <Campo label="Email del director" type="email" valor={centro.directorEmail} onChange={(valor) => cambiarCampoCentro("directorEmail", valor)} />
              <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <span style={{ fontSize: "9px", fontWeight: 700, color: "#566176", textTransform: "uppercase" }}>Sello del centro (PNG o JPG, máximo 2 MB)</span>
                <input
                  required={!centro.selloFirmaUrl}
                  type="file"
                  accept="image/png,image/jpeg"
                  onChange={(event) => setSello(event.target.files?.[0] ?? null)}
                  style={{ minHeight: "40px", border: "1px solid #cbd3df", padding: "7px 11px", color: "#303b50", fontSize: "11px" }}
                />
                <span style={{ color: centro.selloFirmaUrl ? "#2f7d44" : "#b9362f", fontSize: "10px" }}>
                  {sello ? `Nuevo archivo: ${sello.name}` : centro.selloFirmaUrl ? "✓ Sello configurado" : "Todavía no hay un sello configurado"}
                </span>
                {centro.selloFirmaUrl && <img src="/api/centro/sello" alt="Sello actual del centro" style={{ marginTop: "6px", maxWidth: "180px", maxHeight: "100px", objectFit: "contain", border: "1px solid #e1e5ea", padding: "6px" }} />}
              </label>
            </div>
          </BloqueFormulario>
        </div>

        <div style={{ marginTop: "18px" }}>
          <BloqueFormulario
            titulo="Datos de acceso"
            descripcion="Datos del usuario administrador que accede a este centro. Una misma dirección de email puede gestionar centros diferentes."
          >
            <div style={gridStyle}>
              <Campo
                label="Nombre"
                valor={
                  usuarioAcceso.nombre
                }
                onChange={(valor) =>
                  cambiarCampoUsuario(
                    "nombre",
                    valor
                  )
                }
              />

              <Campo
                label="Apellidos"
                valor={
                  usuarioAcceso.apellidos
                }
                onChange={(valor) =>
                  cambiarCampoUsuario(
                    "apellidos",
                    valor
                  )
                }
              />

              <Campo
                label="Email de acceso"
                type="email"
                valor={
                  usuarioAcceso.email
                }
                onChange={(valor) =>
                  cambiarCampoUsuario(
                    "email",
                    valor
                  )
                }
              />

              <div
                style={{
                  display: "flex",
                  alignItems: "end",
                }}
              >
                <div
                  style={{
                    width: "100%",
                    minHeight: "40px",
                    boxSizing: "border-box",
                    border: "1px solid #e1e5ea",
                    background: "#f7f9fb",
                    padding: "9px 11px",
                    color: "#7a879a",
                    fontSize: "10px",
                    lineHeight: 1.5,
                  }}
                >
                  La contraseña no se modifica aquí. Utilice la opción de recuperación de contraseña del inicio de sesión.
                </div>
              </div>
            </div>
          </BloqueFormulario>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginTop: "18px",
          }}
        >
          <button
            type="submit"
            disabled={guardando}
            style={{
              minHeight: "42px",
              padding: "0 22px",
              border: "none",
              background: "#e9423a",
              color: "#ffffff",
              fontSize: "10px",
              fontWeight: 700,
              cursor:
                guardando
                  ? "default"
                  : "pointer",
            }}
          >
            {guardando
              ? "GUARDANDO..."
              : "GUARDAR DATOS"}
          </button>
        </div>
      </form>

      <CursosAcademicos />
    </div>
  );
}

const gridStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(260px, 1fr))",
  gap: "18px",
};

function BloqueFormulario({
  titulo,
  descripcion,
  children,
}: {
  titulo: string;
  descripcion: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        border: "1px solid #d7dde5",
        background: "#ffffff",
        padding: "20px",
      }}
    >
      <div
        style={{
          paddingBottom: "14px",
          borderBottom:
            "1px solid #e1e5ea",
          marginBottom: "18px",
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: "14px",
            color: "#303b50",
          }}
        >
          {titulo}
        </h2>

        <p
          style={{
            margin: "5px 0 0",
            fontSize: "10px",
            color: "#7a879a",
            lineHeight: 1.5,
          }}
        >
          {descripcion}
        </p>
      </div>

      {children}
    </div>
  );
}

function Campo({
  label,
  valor,
  onChange,
  type = "text",
}: {
  label: string;
  valor: string;
  onChange: (valor: string) => void;
  type?: string;
}) {
  return (
    <label
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "6px",
      }}
    >
      <span
        style={{
          fontSize: "9px",
          fontWeight: 700,
          color: "#566176",
          textTransform: "uppercase",
        }}
      >
        {label}
      </span>

      <input
        required
        type={type}
        value={valor}
        onChange={(event) =>
          onChange(
            event.target.value
          )
        }
        style={{
          minHeight: "40px",
          border:
            "1px solid #cbd3df",
          padding: "0 11px",
          background: "#ffffff",
          color: "#303b50",
          fontSize: "12px",
          outline: "none",
        }}
      />
    </label>
  );
}
