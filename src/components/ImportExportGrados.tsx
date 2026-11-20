"use client";

import { ChangeEvent, useRef, useState } from "react";

interface ErrorImportacion {
  fila: number;
  mensaje: string;
}

interface Resumen {
  gradosCreados: number;
  gradosReactivados: number;
  profesoresCreados: number;
  profesoresReactivados: number;
  asignaturasCreadas: number;
  asignaturasActualizadas: number;
  asignaturasSinCambios: number;
}

interface Props {
  /** Botones adicionales que se muestran junto a los de importación. */
  extra?: React.ReactNode;
  onImportacionCorrecta: () => void | Promise<void>;
  onMensaje: (tipo: "success" | "error", mensaje: string) => void;
}

/* Botones con el mismo aspecto que la importación de alumnado */
const botonRojo: React.CSSProperties = {
  minHeight: "40px",
  padding: "0 18px",
  border: "none",
  background: "var(--cm-rojo)",
  color: "#ffffff",
  fontSize: "11px",
  fontWeight: 700,
  cursor: "pointer",
};

const botonSecundario: React.CSSProperties = {
  ...botonRojo,
  background: "var(--cm-texto-2)",
};

function plural(n: number, singular: string, pluralTexto: string) {
  return `${n} ${n === 1 ? singular : pluralTexto}`;
}

/*
 * Exportación de la plantilla de grados y asignaturas e
 * importación masiva (todo o nada, sin borrar nada).
 */
export default function ImportExportGrados({ extra, onImportacionCorrecta, onMensaje }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [exportando, setExportando] = useState(false);
  const [importando, setImportando] = useState(false);
  const [errores, setErrores] = useState<ErrorImportacion[]>([]);

  const exportar = async () => {
    try {
      setExportando(true);

      const respuesta = await fetch("/api/grados/plantilla", { cache: "no-store" });

      if (!respuesta.ok) {
        const resultado = await respuesta.json().catch(() => ({}));
        onMensaje("error", resultado.error ?? "No se ha podido generar la plantilla.");
        return;
      }

      const blob = await respuesta.blob();
      const disposition = respuesta.headers.get("Content-Disposition") ?? "";
      const nombre = /filename="([^"]+)"/.exec(disposition)?.[1] ?? "Plantilla_Grados_Asignaturas.xlsx";
      const url = URL.createObjectURL(blob);
      const enlace = document.createElement("a");
      enlace.href = url;
      enlace.download = nombre;
      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();
      URL.revokeObjectURL(url);
    } catch {
      onMensaje("error", "No se ha podido conectar con el servidor.");
    } finally {
      setExportando(false);
    }
  };

  const importar = async (event: ChangeEvent<HTMLInputElement>) => {
    const archivo = event.target.files?.[0];
    event.target.value = "";

    if (!archivo) return;

    const confirmar = window.confirm(
      `Va a importar grados y asignaturas.\n\nArchivo: ${archivo.name}\n\n` +
        "• Se crearán los grados, asignaturas y profesores nuevos.\n" +
        "• En las asignaturas existentes se actualizarán el código y el profesor.\n" +
        "• No se eliminará nada.\n\n" +
        "Si se detecta algún error no se importará ninguna fila.\n\n¿Desea continuar?"
    );

    if (!confirmar) return;

    try {
      setImportando(true);
      setErrores([]);

      const formData = new FormData();
      formData.append("archivo", archivo);

      const respuesta = await fetch("/api/grados/importar", { method: "POST", body: formData });
      const resultado = await respuesta.json();

      if (!respuesta.ok) {
        if (Array.isArray(resultado.errores)) setErrores(resultado.errores);
        onMensaje("error", resultado.error ?? "No se ha podido importar la plantilla.");
        return;
      }

      const r: Resumen = resultado.resumen;
      const partes = [
        r.gradosCreados && plural(r.gradosCreados, "grado nuevo", "grados nuevos"),
        r.gradosReactivados && plural(r.gradosReactivados, "grado recuperado", "grados recuperados"),
        r.asignaturasCreadas && plural(r.asignaturasCreadas, "asignatura nueva", "asignaturas nuevas"),
        r.asignaturasActualizadas && plural(r.asignaturasActualizadas, "asignatura actualizada", "asignaturas actualizadas"),
        r.profesoresCreados && plural(r.profesoresCreados, "profesor nuevo", "profesores nuevos"),
        r.profesoresReactivados && plural(r.profesoresReactivados, "profesor recuperado", "profesores recuperados"),
      ].filter(Boolean);

      onMensaje(
        "success",
        partes.length
          ? `✓ Importación correcta: ${partes.join(", ")}.`
          : `✓ Importación correcta: no había cambios (${plural(r.asignaturasSinCambios, "asignatura revisada", "asignaturas revisadas")}).`
      );

      await onImportacionCorrecta();
    } catch {
      onMensaje("error", "No se ha podido conectar con el servidor.");
    } finally {
      setImportando(false);
    }
  };

  return (
    <>
      <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
        <button
          type="button"
          onClick={exportar}
          disabled={exportando}
          style={botonSecundario}
          title="Descarga la plantilla Excel con los grados y asignaturas actuales"
        >
          {exportando ? "GENERANDO..." : "EXPORTAR PLANTILLA"}
        </button>

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={importando}
          style={botonRojo}
          title="Importa la plantilla cumplimentada"
        >
          {importando ? "IMPORTANDO..." : "IMPORTAR EXCEL"}
        </button>

        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          onChange={importar}
          style={{ display: "none" }}
        />

        {extra}
      </div>

      {errores.length > 0 && (
        <div
          role="alert"
          style={{
            width: "100%",
            marginTop: "14px",
            border: "1px solid var(--cm-rojo-borde)",
            background: "var(--cm-rojo-claro)",
          }}
        >
          <div
            style={{
              padding: "11px 14px",
              color: "var(--cm-rojo-oscuro)",
              fontSize: "13px",
              fontWeight: 700,
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <span>ERRORES DE IMPORTACIÓN ({errores.length})</span>
            <button
              type="button"
              onClick={() => setErrores([])}
              style={{ border: "none", background: "transparent", color: "inherit", fontWeight: 700, cursor: "pointer" }}
            >
              CERRAR
            </button>
          </div>

          <div style={{ maxHeight: "240px", overflowY: "auto" }}>
            {errores.map((e, i) => (
              <div
                key={`${e.fila}-${i}`}
                style={{
                  display: "grid",
                  gridTemplateColumns: "80px 1fr",
                  padding: "9px 14px",
                  borderTop: "1px solid var(--cm-rojo-borde)",
                  color: "var(--cm-rojo-oscuro)",
                  fontSize: "13px",
                }}
              >
                <strong>Fila {e.fila}</strong>
                <span>{e.mensaje}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
