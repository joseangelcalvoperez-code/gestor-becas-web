"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type EstadoEnvio = "BORRADOR" | "PENDIENTE" | "PARCIAL" | "COMPLETADO" | "CANCELADO";

interface EnvioFirmaListado {
  id: number;
  nombre: string;
  tipo: "DOCUMENTOS_GENERADOS" | "DOCUMENTO_MANUAL";
  estado: EstadoEnvio;
  anio: number | null;
  mes: number | null;
  createdAt: string;
  _count: { documentos: number; firmantes: number };
}

export default function EnviosRealizadosPage() {
  const router = useRouter();
  const [envios, setEnvios] = useState<EnvioFirmaListado[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [estado, setEstado] = useState<"TODOS" | EstadoEnvio>("TODOS");
  const [tipo, setTipo] = useState<"TODOS" | EnvioFirmaListado["tipo"]>("TODOS");
  const [preparandoId, setPreparandoId] = useState<number | null>(null);
  const [eliminandoId, setEliminandoId] = useState<number | null>(null);

  const cargarEnvios = useCallback(async () => {
    try {
      setCargando(true);
      const respuesta = await fetch("/api/firmas", { cache: "no-store" });
      const resultado = await respuesta.json();
      if (!respuesta.ok) {
        setMensaje(resultado.error ?? "No se han podido cargar los envíos.");
        return;
      }
      setEnvios(resultado.envios ?? []);
    } catch {
      setMensaje("No se ha podido conectar con el servidor.");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { void cargarEnvios(); }, [cargarEnvios]);

  const enviosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLocaleLowerCase("es");
    return envios.filter((envio) => {
      if (estado !== "TODOS" && envio.estado !== estado) return false;
      if (tipo !== "TODOS" && envio.tipo !== tipo) return false;
      if (!q) return true;
      const periodo = envio.mes && envio.anio ? `${nombreMes(envio.mes)} ${envio.anio}` : "";
      return `${envio.id} ${envio.nombre} ${envio.estado} ${envio.tipo} ${periodo}`.toLocaleLowerCase("es").includes(q);
    });
  }, [envios, busqueda, estado, tipo]);

  const prepararEnvio = async (envio: EnvioFirmaListado) => {
    if (envio.estado !== "BORRADOR") return;
    const confirmar = window.confirm(
      `Se generarán y almacenarán ${envio._count.documentos} documento${envio._count.documentos === 1 ? "" : "s"} PDF definitivos. Después el envío pasará a PENDIENTE y quedará protegido mediante huella SHA-256.\n\n¿Desea continuar?`
    );
    if (!confirmar) return;
    try {
      setPreparandoId(envio.id);
      setMensaje("");
      const respuesta = await fetch(`/api/firmas/envios/${envio.id}/preparar`, { method: "POST" });
      const resultado = await respuesta.json();
      if (!respuesta.ok) {
        setMensaje(resultado.error ?? "No se ha podido preparar el envío.");
        return;
      }
      setMensaje(`✓ Envío preparado correctamente. ${resultado.documentosPreparados} documento${resultado.documentosPreparados === 1 ? "" : "s"} preparado${resultado.documentosPreparados === 1 ? "" : "s"}.`);
      await cargarEnvios();
    } catch {
      setMensaje("No se ha podido conectar con el servidor.");
    } finally {
      setPreparandoId(null);
    }
  };

  const eliminarEnvio = async (envio: EnvioFirmaListado) => {
    if (envio.estado === "COMPLETADO") {
      setMensaje("Los envíos COMPLETADOS no pueden eliminarse porque forman parte del histórico de firma.");
      return;
    }
    const confirmar = window.confirm(
      `Va a eliminar definitivamente el envío:\n\n${envio.nombre}\n\nSe eliminarán también sus documentos, firmantes, tokens, eventos, firmas asociadas y PDF almacenados.\n\nEsta acción no se puede deshacer.\n\n¿Desea continuar?`
    );
    if (!confirmar) return;
    try {
      setEliminandoId(envio.id);
      setMensaje("");
      const respuesta = await fetch(`/api/firmas/envios/${envio.id}`, { method: "DELETE" });
      const resultado = await respuesta.json();
      if (!respuesta.ok) {
        setMensaje(resultado.error ?? "No se ha podido eliminar el envío.");
        return;
      }
      setMensaje(resultado.advertencia ? `✓ El envío se ha eliminado. ${resultado.advertencia}` : "✓ El envío y todos sus datos asociados se han eliminado correctamente.");
      await cargarEnvios();
    } catch {
      setMensaje("No se ha podido conectar con el servidor.");
    } finally {
      setEliminandoId(null);
    }
  };

  return (
    <div style={contenedor}>
      <div style={cabecera}>
        <h1 style={titulo}>ENVÍOS REALIZADOS</h1>
        <p style={subtitulo}>Consulte, busque y gestione los envíos de documentos realizados desde el centro.</p>
      </div>

      {mensaje && <div style={mensaje.startsWith("✓") ? mensajeOk : mensajeError}>{mensaje}</div>}

      <section style={filtrosBox}>
        <div style={campoBusqueda}>
          <label style={label}>BUSCAR</label>
          <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Nombre del envío, ID, estado o periodo..." style={input} />
        </div>
        <div>
          <label style={label}>ESTADO</label>
          <select value={estado} onChange={(e) => setEstado(e.target.value as typeof estado)} style={select}>
            <option value="TODOS">Todos</option><option value="BORRADOR">Borrador</option><option value="PENDIENTE">Pendiente</option><option value="PARCIAL">Parcial</option><option value="COMPLETADO">Completado</option><option value="CANCELADO">Cancelado</option>
          </select>
        </div>
        <div>
          <label style={label}>TIPO</label>
          <select value={tipo} onChange={(e) => setTipo(e.target.value as typeof tipo)} style={select}>
            <option value="TODOS">Todos</option><option value="DOCUMENTOS_GENERADOS">Documentos del gestor</option><option value="DOCUMENTO_MANUAL">Documento manual</option>
          </select>
        </div>
      </section>

      <section style={tablaBox}>
        <div style={cabeceraTabla}><div><div style={tituloTabla}>HISTÓRICO DE ENVÍOS</div><div style={subtituloTabla}>{enviosFiltrados.length} envío{enviosFiltrados.length === 1 ? "" : "s"} mostrado{enviosFiltrados.length === 1 ? "" : "s"}</div></div></div>
        <div style={filaCabecera}><Celda>ENVÍO</Celda><Celda>FECHA</Celda><Celda>DOC.</Celda><Celda>FIRMANTES</Celda><Celda>ESTADO</Celda><Celda>ACCIONES</Celda></div>
        {cargando ? <div style={vacio}>Cargando envíos...</div> : enviosFiltrados.length === 0 ? <div style={vacio}>No hay envíos que coincidan con los filtros seleccionados.</div> : enviosFiltrados.map((envio) => (
          <div key={envio.id} style={filaEnvio}>
            <Celda><div><div style={nombreEnvio}>{envio.nombre}</div><div style={idEnvio}>ID ENVÍO: {envio.id}{envio.mes && envio.anio ? ` · ${nombreMes(envio.mes).toUpperCase()} ${envio.anio}` : ""}</div></div></Celda>
            <Celda>{formatearFecha(envio.createdAt)}</Celda>
            <Celda>{envio._count.documentos}</Celda>
            <Celda>{envio._count.firmantes}</Celda>
            <Celda><Estado estado={envio.estado} /></Celda>
            <Celda><div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              <button type="button" onClick={() => router.push(`/firmas/${envio.id}`)} style={botonAccionSecundario}>VER DETALLE</button>
              {envio.estado === "BORRADOR" && <button type="button" disabled={preparandoId === envio.id || eliminandoId === envio.id} onClick={() => prepararEnvio(envio)} style={{ ...botonAccion, opacity: preparandoId === envio.id || eliminandoId === envio.id ? 0.55 : 1 }}>{preparandoId === envio.id ? "PREPARANDO..." : "PREPARAR"}</button>}
              {envio.estado !== "COMPLETADO" && <button type="button" disabled={eliminandoId === envio.id || preparandoId === envio.id} onClick={() => eliminarEnvio(envio)} style={{ ...botonEliminar, opacity: eliminandoId === envio.id || preparandoId === envio.id ? 0.55 : 1 }}>{eliminandoId === envio.id ? "ELIMINANDO..." : "ELIMINAR"}</button>}
            </div></Celda>
          </div>
        ))}
      </section>
    </div>
  );
}

function Estado({ estado }: { estado: EstadoEnvio }) {
  return <span style={{ color: estado === "COMPLETADO" ? "#2f7d44" : estado === "CANCELADO" ? "#b9362f" : "#e9423a", fontSize: "8px", fontWeight: 700 }}>{estado}</span>;
}
function Celda({ children }: { children: React.ReactNode }) { return <div style={{ padding: "10px 12px", display: "flex", alignItems: "center", minWidth: 0 }}>{children}</div>; }
function formatearFecha(valor: string) { return new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(valor)); }
function nombreMes(mes: number) { return ["", "enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"][mes] ?? ""; }

const contenedor: React.CSSProperties = { background: "#fff", border: "1px solid #d7dde5", minHeight: "calc(100vh - 105px)", padding: "24px", boxSizing: "border-box" };
const cabecera: React.CSSProperties = { paddingBottom: "18px", borderBottom: "1px solid #d7dde5" };
const titulo: React.CSSProperties = { margin: 0, color: "#303b50", fontSize: "20px" };
const subtitulo: React.CSSProperties = { margin: "6px 0 0", color: "#8190a8", fontSize: "11px" };
const mensajeOk: React.CSSProperties = { marginTop: "15px", padding: "10px 12px", border: "1px solid #b9dec2", background: "#edf8f0", color: "#2f7d44", fontSize: "10px" };
const mensajeError: React.CSSProperties = { marginTop: "15px", padding: "10px 12px", border: "1px solid #efb0aa", background: "#fff0ef", color: "#b9362f", fontSize: "10px" };
const filtrosBox: React.CSSProperties = { marginTop: "20px", padding: "14px", border: "1px solid #d7dde5", background: "#f8fafc", display: "grid", gridTemplateColumns: "minmax(240px, 1fr) 180px 210px", gap: "12px", alignItems: "end" };
const campoBusqueda: React.CSSProperties = { minWidth: 0 };
const label: React.CSSProperties = { display: "block", marginBottom: "6px", color: "#596474", fontSize: "8px", fontWeight: 700 };
const input: React.CSSProperties = { width: "100%", height: "34px", boxSizing: "border-box", border: "1px solid #cbd3df", padding: "0 10px", background: "#fff", color: "#303b50", fontSize: "9px", outline: "none" };
const select: React.CSSProperties = { width: "100%", height: "34px", border: "1px solid #cbd3df", padding: "0 8px", background: "#fff", color: "#303b50", fontSize: "9px" };
const tablaBox: React.CSSProperties = { marginTop: "16px", border: "1px solid #d7dde5", overflowX: "auto" };
const cabeceraTabla: React.CSSProperties = { minHeight: "48px", padding: "0 16px", display: "flex", alignItems: "center", background: "#f8fafc", borderBottom: "1px solid #d7dde5" };
const tituloTabla: React.CSSProperties = { color: "#303b50", fontSize: "11px", fontWeight: 700 };
const subtituloTabla: React.CSSProperties = { marginTop: "3px", color: "#8793a5", fontSize: "8px" };
const filaCabecera: React.CSSProperties = { minWidth: "980px", display: "grid", gridTemplateColumns: "2fr 1fr 70px 90px 100px 270px", background: "#e1e5eb", color: "#455166", fontSize: "8px", fontWeight: 700 };
const filaEnvio: React.CSSProperties = { minWidth: "980px", display: "grid", gridTemplateColumns: "2fr 1fr 70px 90px 100px 270px", borderTop: "1px solid #d7dde5", color: "#4b576b", fontSize: "9px" };
const vacio: React.CSSProperties = { minHeight: "150px", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", color: "#8793a5", fontSize: "9px" };
const nombreEnvio: React.CSSProperties = { color: "#303b50", fontSize: "9px", fontWeight: 600 };
const idEnvio: React.CSSProperties = { marginTop: "3px", color: "#96a1b1", fontSize: "7px" };
const botonAccionSecundario: React.CSSProperties = { minHeight: "30px", padding: "0 9px", border: "1px solid #cbd3df", background: "#fff", color: "#455166", fontSize: "7px", fontWeight: 700, cursor: "pointer" };
const botonAccion: React.CSSProperties = { minHeight: "30px", padding: "0 10px", border: "1px solid #d73d36", background: "#e9423a", color: "#fff", fontSize: "8px", fontWeight: 700, cursor: "pointer" };
const botonEliminar: React.CSSProperties = { minHeight: "30px", padding: "0 9px", border: "1px solid #d69a95", background: "#fff8f7", color: "#b9362f", fontSize: "7px", fontWeight: 700, cursor: "pointer" };
