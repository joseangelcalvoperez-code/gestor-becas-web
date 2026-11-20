"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import SimboloMarca from "@/components/SimboloMarca";
import { MARCA } from "@/lib/marca";

/* =========================================================
   TIPOS
   ========================================================= */

interface Solicitud {
  id: number;
  createdAt: string;
  usuario: {
    id: number;
    nombre: string;
    email: string;
    centro: { nombre: string; codigo: string; telefono: string };
  };
}

interface Cuenta {
  id: number;
  nombre: string;
  email: string;
  activo: boolean;
  debeCambiarClave: boolean;
  claveTemporalExpira: string | null;
  provisionalCaducada: boolean;
  centro: { nombre: string; codigo: string; activo: boolean };
  _count: { solicitudesRestablecimiento: number };
}

interface Actividad {
  id: number;
  accion: string;
  detalle: string | null;
  createdAt: string;
  administrador: { nombre: string };
}

interface Objetivo {
  usuarioId: number;
  email: string;
  responsable: string;
  centro: string;
  codigo: string;
  telefono?: string;
}

interface Resultado {
  provisional: string;
  expira: string;
  email: string;
  centro: string;
  codigoCentro: string;
  telefono?: string;
}

const fecha = (iso: string) =>
  new Date(iso).toLocaleString("es-ES", {
    timeZone: "Europe/Madrid",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const VALIDEZ = [
  { horas: 24, texto: "24 horas" },
  { horas: 72, texto: "3 días (recomendado)" },
  { horas: 168, texto: "7 días" },
];

/* =========================================================
   PANEL
   ========================================================= */

export default function PanelAdministracion({ nombre, email }: { nombre: string; email: string }) {
  const router = useRouter();

  const [solicitudes, setSolicitudes] = useState<Solicitud[] | null>(null);
  const [actividad, setActividad] = useState<Actividad[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [cuentas, setCuentas] = useState<Cuenta[] | null>(null);
  const [buscando, setBuscando] = useState(false);

  const [objetivo, setObjetivo] = useState<Objetivo | null>(null);
  const [horas, setHoras] = useState(72);
  const [generando, setGenerando] = useState(false);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: "error" | "exito"; texto: string } | null>(null);

  const salirSiCaduca = useCallback(
    (status: number) => {
      if (status === 401) {
        router.push("/admin/login");
        return true;
      }
      return false;
    },
    [router]
  );

  const cargarSolicitudes = useCallback(async () => {
    const r = await fetch("/api/admin/solicitudes", { cache: "no-store" });
    if (salirSiCaduca(r.status)) return;
    const j = await r.json();
    setSolicitudes(j.solicitudes ?? []);
  }, [salirSiCaduca]);

  const cargarActividad = useCallback(async () => {
    const r = await fetch("/api/admin/actividad", { cache: "no-store" });
    if (salirSiCaduca(r.status)) return;
    const j = await r.json();
    setActividad(j.actividad ?? []);
  }, [salirSiCaduca]);

  const buscar = useCallback(
    async (texto: string) => {
      if (texto.trim().length < 2) {
        setCuentas(null);
        return;
      }

      setBuscando(true);
      try {
        const r = await fetch(`/api/admin/usuarios?q=${encodeURIComponent(texto.trim())}`, { cache: "no-store" });
        if (salirSiCaduca(r.status)) return;
        const j = await r.json();
        setCuentas(j.usuarios ?? []);
      } finally {
        setBuscando(false);
      }
    },
    [salirSiCaduca]
  );

  useEffect(() => {
    // Carga inicial de datos del panel
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void cargarSolicitudes();
    void cargarActividad();
  }, [cargarSolicitudes, cargarActividad]);

  useEffect(() => {
    const t = window.setTimeout(() => void buscar(busqueda), 350);
    return () => window.clearTimeout(t);
  }, [busqueda, buscar]);

  const generar = async () => {
    if (!objetivo) return;

    setGenerando(true);
    setAviso(null);

    try {
      const r = await fetch("/api/admin/restablecer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuarioId: objetivo.usuarioId, horas }),
      });

      if (salirSiCaduca(r.status)) return;

      const j = await r.json();

      if (!r.ok) {
        setAviso({ tipo: "error", texto: j.error ?? "No se ha podido generar la contraseña." });
        setObjetivo(null);
        return;
      }

      setResultado({
        provisional: j.provisional,
        expira: j.expira,
        email: j.email,
        centro: j.centro,
        codigoCentro: j.codigoCentro,
        telefono: objetivo.telefono,
      });
      setObjetivo(null);
      setCopiado(false);

      await Promise.all([cargarSolicitudes(), cargarActividad(), buscar(busqueda)]);
    } catch {
      setAviso({ tipo: "error", texto: "No se ha podido conectar con el servidor." });
    } finally {
      setGenerando(false);
    }
  };

  const descartar = async (s: Solicitud) => {
    const ok = window.confirm(
      `¿Descartar la solicitud de ${s.usuario.centro.nombre} (${s.usuario.email}) sin generar contraseña?\n\nÚselo, por ejemplo, si el centro ya ha recuperado el acceso.`
    );
    if (!ok) return;

    const r = await fetch("/api/admin/solicitudes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: s.id }),
    });

    if (salirSiCaduca(r.status)) return;

    setAviso({ tipo: "exito", texto: "Solicitud descartada." });
    await Promise.all([cargarSolicitudes(), cargarActividad()]);
  };

  const copiar = async () => {
    if (!resultado) return;
    try {
      await navigator.clipboard.writeText(resultado.provisional);
      setCopiado(true);
    } catch {
      setCopiado(false);
    }
  };

  const salir = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
  };

  return (
    <div className="cm-app">
      {/* ---------- CABECERA ---------- */}
      <header className="cm-cabecera">
        <div className="cm-marca">
          <div className="cm-marca-institucion">
            <SimboloMarca />
            <span className="cm-marca-organismo">{MARCA.organismo.replace(/ de /, "\nde ")}</span>
            <span className="cm-marca-departamento">{MARCA.departamento}</span>
          </div>
          <div className="cm-marca-app">
            <strong>{MARCA.aplicacion}</strong>
            <span>Administración de la plataforma</span>
          </div>
        </div>

        <div className="cm-cabecera-derecha">
          <div className="cm-centro">
            <div className="cm-centro-icono" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3 4 6v6c0 4.5 3.4 8.3 8 9 4.6-.7 8-4.5 8-9V6l-8-3Z" />
                <path d="m9 12 2 2 4-4" />
              </svg>
            </div>
            <div className="cm-centro-textos">
              <span className="cm-centro-nombre">{nombre}</span>
              <span className="cm-centro-usuario">{email}</span>
            </div>
          </div>
          <Link href="/admin/cambiar-clave" className="cm-btn cm-btn-secundario">
            Mi contraseña
          </Link>
          <button type="button" className="cm-btn cm-btn-secundario" onClick={salir}>
            Cerrar sesión
          </button>
        </div>
      </header>

      <main className="cm-admin" id="contenido">
        <div className="cm-admin-titulo">
          <h1>Restablecer contraseñas de los centros</h1>
          <p>Cuando un centro no puede entrar porque ha olvidado su contraseña:</p>

          <ol className="cm-admin-pasos">
            <li>
              <b>Localice la cuenta</b>
              <span>En «Solicitudes pendientes» o con el buscador.</span>
            </li>
            <li>
              <b>Genere una contraseña provisional</b>
              <span>Botón «Generar contraseña». Solo se muestra una vez.</span>
            </li>
            <li>
              <b>Comuníquela al centro</b>
              <span>Por teléfono u otro canal oficial. Al entrar, el centro elegirá una nueva.</span>
            </li>
          </ol>
        </div>

        {aviso && (
          <div className={`cm-alerta ${aviso.tipo === "error" ? "cm-alerta-error" : "cm-alerta-exito"}`} role="status">
            {aviso.texto}
          </div>
        )}

        {/* ---------- SOLICITUDES ---------- */}
        <section className="cm-tarjeta" aria-labelledby="t-solicitudes">
          <div className="cm-tarjeta-cabecera">
            <h2 id="t-solicitudes">
              Solicitudes pendientes
              {solicitudes && solicitudes.length > 0 && <span className="cm-contador">{solicitudes.length}</span>}
            </h2>
            <p>Centros que han pulsado «¿Ha olvidado su contraseña?» en la pantalla de acceso.</p>
          </div>

          {solicitudes === null ? (
            <p className="cm-vacio">Cargando…</p>
          ) : solicitudes.length === 0 ? (
            <p className="cm-vacio">✓ No hay solicitudes pendientes.</p>
          ) : (
            <div className="cm-tabla-contenedor">
              <table className="cm-tabla">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Centro</th>
                    <th>Correo de acceso</th>
                    <th>Teléfono del centro</th>
                    <th aria-label="Acciones" />
                  </tr>
                </thead>
                <tbody>
                  {solicitudes.map((s) => (
                    <tr key={s.id}>
                      <td className="cm-nowrap">{fecha(s.createdAt)}</td>
                      <td>
                        <b>{s.usuario.centro.nombre}</b>
                        <div className="cm-secundario">Código {s.usuario.centro.codigo}</div>
                      </td>
                      <td>
                        {s.usuario.email}
                        <div className="cm-secundario">{s.usuario.nombre}</div>
                      </td>
                      <td className="cm-nowrap">{s.usuario.centro.telefono}</td>
                      <td className="cm-acciones">
                        <button
                          type="button"
                          className="cm-btn cm-btn-primario"
                          onClick={() =>
                            setObjetivo({
                              usuarioId: s.usuario.id,
                              email: s.usuario.email,
                              responsable: s.usuario.nombre,
                              centro: s.usuario.centro.nombre,
                              codigo: s.usuario.centro.codigo,
                              telefono: s.usuario.centro.telefono,
                            })
                          }
                        >
                          Generar contraseña
                        </button>
                        <button type="button" className="cm-btn cm-btn-enlace" onClick={() => descartar(s)}>
                          Descartar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ---------- BUSCADOR ---------- */}
        <section className="cm-tarjeta" aria-labelledby="t-buscar">
          <div className="cm-tarjeta-cabecera">
            <h2 id="t-buscar">Buscar un centro</h2>
            <p>Para restablecer la contraseña aunque el centro no haya hecho la solicitud (por ejemplo, si le llama por teléfono).</p>
          </div>

          <label className="cm-campo" style={{ maxWidth: "560px" }}>
            <span>Nombre del centro, código de centro o correo</span>
            <input
              className="cm-input"
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Por ejemplo: 28099999 o IES Ejemplo"
              autoComplete="off"
            />
          </label>

          {buscando && <p className="cm-vacio">Buscando…</p>}

          {!buscando && cuentas && cuentas.length === 0 && (
            <p className="cm-vacio">No se ha encontrado ninguna cuenta con «{busqueda.trim()}».</p>
          )}

          {!buscando && cuentas && cuentas.length > 0 && (
            <div className="cm-tabla-contenedor" style={{ marginTop: "16px" }}>
              <table className="cm-tabla">
                <thead>
                  <tr>
                    <th>Centro</th>
                    <th>Correo de acceso</th>
                    <th>Estado</th>
                    <th aria-label="Acciones" />
                  </tr>
                </thead>
                <tbody>
                  {cuentas.map((c) => {
                    const desactivada = !c.activo || !c.centro.activo;
                    const caducada = c.provisionalCaducada;

                    return (
                      <tr key={c.id}>
                        <td>
                          <b>{c.centro.nombre}</b>
                          <div className="cm-secundario">Código {c.centro.codigo}</div>
                        </td>
                        <td>
                          {c.email}
                          <div className="cm-secundario">{c.nombre}</div>
                        </td>
                        <td>
                          {desactivada ? (
                            <span className="cm-insignia cm-insignia-gris">Desactivada</span>
                          ) : caducada ? (
                            <span className="cm-insignia cm-insignia-roja">Provisional caducada</span>
                          ) : c.debeCambiarClave ? (
                            <span className="cm-insignia cm-insignia-aviso">
                              Provisional hasta {c.claveTemporalExpira ? fecha(c.claveTemporalExpira) : "—"}
                            </span>
                          ) : (
                            <span className="cm-insignia cm-insignia-verde">Activa</span>
                          )}
                          {c._count.solicitudesRestablecimiento > 0 && (
                            <span className="cm-insignia cm-insignia-roja" style={{ marginLeft: "6px" }}>
                              Solicitud pendiente
                            </span>
                          )}
                        </td>
                        <td className="cm-acciones">
                          <button
                            type="button"
                            className="cm-btn cm-btn-primario"
                            disabled={desactivada}
                            onClick={() =>
                              setObjetivo({
                                usuarioId: c.id,
                                email: c.email,
                                responsable: c.nombre,
                                centro: c.centro.nombre,
                                codigo: c.centro.codigo,
                              })
                            }
                          >
                            Generar contraseña
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ---------- ACTIVIDAD ---------- */}
        <section className="cm-tarjeta" aria-labelledby="t-actividad">
          <div className="cm-tarjeta-cabecera">
            <h2 id="t-actividad">Actividad reciente</h2>
            <p>Últimas acciones del personal de administración (queda constancia de todas).</p>
          </div>

          {actividad.length === 0 ? (
            <p className="cm-vacio">Todavía no hay actividad registrada.</p>
          ) : (
            <ul className="cm-actividad">
              {actividad.map((a) => (
                <li key={a.id}>
                  <span className="cm-nowrap cm-secundario">{fecha(a.createdAt)}</span>
                  <span>
                    <b>{a.administrador.nombre}</b> · {a.detalle}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      {/* ---------- VENTANA: CONFIRMAR ---------- */}
      {objetivo && (
        <Ventana titulo="Generar contraseña provisional" onCerrar={() => !generando && setObjetivo(null)}>
          <dl className="cm-datos">
            <dt>Centro</dt>
            <dd>
              {objetivo.centro} <span className="cm-secundario">(código {objetivo.codigo})</span>
            </dd>
            <dt>Cuenta</dt>
            <dd>
              {objetivo.email} <span className="cm-secundario">· {objetivo.responsable}</span>
            </dd>
          </dl>

          <fieldset className="cm-validez">
            <legend>Validez de la contraseña provisional</legend>
            {VALIDEZ.map((v) => (
              <label key={v.horas}>
                <input type="radio" name="validez" checked={horas === v.horas} onChange={() => setHoras(v.horas)} />
                {v.texto}
              </label>
            ))}
          </fieldset>

          <div className="cm-alerta cm-alerta-aviso">
            La contraseña actual dejará de funcionar y se cerrarán las sesiones abiertas de esta cuenta.
          </div>

          <div className="cm-ventana-botones">
            <button type="button" className="cm-btn cm-btn-secundario" onClick={() => setObjetivo(null)} disabled={generando}>
              Cancelar
            </button>
            <button type="button" className="cm-btn cm-btn-primario" onClick={generar} disabled={generando} autoFocus>
              {generando ? "Generando…" : "Generar contraseña"}
            </button>
          </div>
        </Ventana>
      )}

      {/* ---------- VENTANA: RESULTADO ---------- */}
      {resultado && (
        <Ventana titulo="Contraseña provisional generada" onCerrar={() => setResultado(null)}>
          <p>
            Para <b>{resultado.centro}</b> ({resultado.email})
          </p>

          <div className="cm-clave-provisional" aria-label="Contraseña provisional">
            {resultado.provisional}
          </div>

          <div style={{ display: "flex", gap: "12px", alignItems: "center", justifyContent: "center", flexWrap: "wrap" }}>
            <button type="button" className="cm-btn cm-btn-secundario" onClick={copiar}>
              {copiado ? "✓ Copiada" : "Copiar contraseña"}
            </button>
            <span className="cm-secundario">Válida hasta el {fecha(resultado.expira)}</span>
          </div>

          <div className="cm-alerta cm-alerta-info">
            <b>Cómo comunicarla:</b>
            <ul>
              <li>
                Llame al centro{resultado.telefono ? <> (<b>{resultado.telefono}</b>)</> : null} y dicte la contraseña. Distingue mayúsculas y minúsculas; los guiones forman parte de ella.
              </li>
              <li>Indique que entre con su correo de acceso y esta contraseña: la aplicación le pedirá una nueva.</li>
              <li>No la envíe en el mismo mensaje que el correo de acceso.</li>
            </ul>
          </div>

          <p className="cm-secundario" style={{ textAlign: "center" }}>
            Por seguridad no se volverá a mostrar. Si se pierde, genere otra.
          </p>

          <div className="cm-ventana-botones">
            <button type="button" className="cm-btn cm-btn-primario" onClick={() => setResultado(null)} autoFocus>
              Hecho, cerrar
            </button>
          </div>
        </Ventana>
      )}
    </div>
  );
}

/* =========================================================
   VENTANA MODAL ACCESIBLE
   ========================================================= */

function Ventana({
  titulo,
  onCerrar,
  children,
}: {
  titulo: string;
  onCerrar: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const anterior = document.activeElement as HTMLElement | null;
    const alPulsar = (e: KeyboardEvent) => e.key === "Escape" && onCerrar();
    document.addEventListener("keydown", alPulsar);
    return () => {
      document.removeEventListener("keydown", alPulsar);
      anterior?.focus();
    };
  }, [onCerrar]);

  return (
    <div className="cm-velo" onMouseDown={(e) => e.target === e.currentTarget && onCerrar()}>
      <div ref={ref} className="cm-ventana" role="dialog" aria-modal="true" aria-labelledby="ventana-titulo">
        <h2 id="ventana-titulo">{titulo}</h2>
        {children}
      </div>
    </div>
  );
}
