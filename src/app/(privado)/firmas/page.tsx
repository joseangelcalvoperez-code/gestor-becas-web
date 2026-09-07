"use client";

import { useRouter } from "next/navigation";

export default function FirmasPage() {
  const router = useRouter();

  return (
    <div style={contenedor}>
      <div style={cabecera}>
        <h1 style={titulo}>FIRMAS</h1>
        <p style={subtitulo}>
          Prepare nuevos envíos de documentos para su firma electrónica.
        </p>
      </div>

      <section style={seccion}>
        <h2 style={tituloSeccion}>NUEVO ENVÍO A FIRMA</h2>
        <p style={textoAyuda}>
          Seleccione cómo desea preparar los documentos que serán enviados a firma.
        </p>

        <div style={gridDos}>
          <div style={tarjetaStyle}>
            <div>
              <div style={iconoStyle}>▤</div>
              <div style={tituloTarjetaStyle}>DOCUMENTOS DEL GESTOR</div>
              <div style={descripcionStyle}>
                Prepare para firma los Anexos I y Anexos V generados a partir de los datos del gestor.
              </div>
              <div style={detalleStyle}>
                Los Anexos V se agrupan por profesor. Cada Anexo I incorpora todos los profesores que deben firmarlo.
              </div>
            </div>

            <button
              type="button"
              style={botonRojo}
              onClick={() => router.push("/firmas/preparar")}
            >
              PREPARAR DOCUMENTOS
            </button>
          </div>

          <div style={tarjetaStyle}>
            <div>
              <div style={iconoStyle}>↑</div>
              <div style={tituloTarjetaStyle}>SUBIR DOCUMENTOS</div>
              <div style={descripcionStyle}>
                Cargue uno o varios PDF externos y seleccione sus firmantes.
              </div>
              <div style={detalleStyle}>
                Esta modalidad se implementará después del flujo de documentos del gestor.
              </div>
            </div>

            <button
              type="button"
              disabled
              style={{ ...botonSecundario, opacity: 0.55, cursor: "default" }}
            >
              SUBIR DOCUMENTOS
            </button>
          </div>
        </div>
      </section>

      <section style={info}>
        <div style={infoTitulo}>ORGANIZACIÓN DEL MÓDULO</div>
        <div style={infoTexto}>
          Utilice ENVÍOS REALIZADOS para consultar y gestionar el histórico de procesos de firma. Los documentos cuyo proceso haya finalizado correctamente estarán disponibles en DOCUMENTOS FIRMADOS.
        </div>
      </section>
    </div>
  );
}

const contenedor: React.CSSProperties = {
  background: "#ffffff",
  border: "1px solid #d7dde5",
  minHeight: "calc(100vh - 105px)",
  padding: "24px",
  boxSizing: "border-box",
};

const cabecera: React.CSSProperties = {
  paddingBottom: "18px",
  borderBottom: "1px solid #d7dde5",
};

const titulo: React.CSSProperties = { margin: 0, color: "#303b50", fontSize: "20px" };
const subtitulo: React.CSSProperties = { margin: "6px 0 0", color: "#8190a8", fontSize: "11px" };
const seccion: React.CSSProperties = { marginTop: "20px", border: "1px solid #d7dde5", padding: "18px" };
const tituloSeccion: React.CSSProperties = { margin: "0 0 6px", color: "#303b50", fontSize: "13px" };
const textoAyuda: React.CSSProperties = { margin: "0 0 18px", color: "#8190a8", fontSize: "10px" };
const gridDos: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "14px" };
const tarjetaStyle: React.CSSProperties = { minHeight: "220px", padding: "18px", border: "1px solid #d7dde5", display: "flex", flexDirection: "column", justifyContent: "space-between", gap: "20px" };
const iconoStyle: React.CSSProperties = { width: "34px", height: "34px", marginBottom: "14px", border: "1px solid #d7dde5", background: "#f4f6f8", display: "flex", alignItems: "center", justifyContent: "center", color: "#596474" };
const tituloTarjetaStyle: React.CSSProperties = { color: "#303b50", fontSize: "11px", fontWeight: 700 };
const descripcionStyle: React.CSSProperties = { marginTop: "8px", color: "#65758d", fontSize: "9px", lineHeight: 1.55 };
const detalleStyle: React.CSSProperties = { marginTop: "12px", paddingTop: "12px", borderTop: "1px solid #edf0f4", color: "#8a96a7", fontSize: "8px", lineHeight: 1.5 };
const botonRojo: React.CSSProperties = { minHeight: "36px", padding: "0 15px", border: "1px solid #d73d36", background: "#e9423a", color: "#ffffff", fontSize: "9px", fontWeight: 700, cursor: "pointer" };
const botonSecundario: React.CSSProperties = { minHeight: "36px", padding: "0 15px", border: "1px solid #cbd3df", background: "#ffffff", color: "#455166", fontSize: "9px", fontWeight: 700 };
const info: React.CSSProperties = { marginTop: "20px", padding: "14px 16px", border: "1px solid #d7dde5", background: "#f8fafc" };
const infoTitulo: React.CSSProperties = { color: "#303b50", fontSize: "9px", fontWeight: 700 };
const infoTexto: React.CSSProperties = { marginTop: "8px", color: "#65758d", fontSize: "9px", lineHeight: 1.6 };
