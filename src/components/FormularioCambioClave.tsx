"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function FormularioCambioClave({
  obligatorio,
  politica,
  endpoint = "/api/cambiar-clave",
  destino = "/inicio",
  endpointSalida = "/api/logout",
  rutaAcceso = "/login",
}: {
  obligatorio: boolean;
  politica: string;
  /** Rutas para reutilizarlo en el panel de administración. */
  endpoint?: string;
  destino?: string;
  endpointSalida?: string;
  rutaAcceso?: string;
}) {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [hecho, setHecho] = useState(false);

  const enviar = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    const datos = new FormData(event.currentTarget);

    try {
      setEnviando(true);

      const respuesta = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actual: datos.get("actual"),
          nueva: datos.get("nueva"),
          repetir: datos.get("repetir"),
        }),
      });

      const resultado = await respuesta.json();

      if (!respuesta.ok) {
        if (respuesta.status === 401) {
          router.push(rutaAcceso);
          return;
        }

        setError(resultado.error ?? "No se ha podido cambiar la contraseña.");
        return;
      }

      setHecho(true);
      window.setTimeout(() => {
        router.push(destino);
        router.refresh();
      }, 1500);
    } catch {
      setError("No se ha podido conectar con el servidor.");
    } finally {
      setEnviando(false);
    }
  };

  if (hecho) {
    return (
      <div className="cm-alerta cm-alerta-exito" role="status" style={{ marginTop: "24px" }}>
        Contraseña actualizada correctamente. Accediendo a la aplicación…
      </div>
    );
  }

  return (
    <form onSubmit={enviar} style={{ marginTop: "24px", display: "grid", gap: "16px" }}>
      <label className="cm-campo">
        <span>{obligatorio ? "Contraseña provisional" : "Contraseña actual"}</span>
        <input
          required
          type="password"
          name="actual"
          autoComplete="current-password"
          className="cm-input"
        />
      </label>

      <label className="cm-campo">
        <span>Nueva contraseña</span>
        <input
          required
          type="password"
          name="nueva"
          autoComplete="new-password"
          minLength={10}
          className="cm-input"
          aria-describedby="politica-clave"
        />
      </label>

      <label className="cm-campo">
        <span>Repetir nueva contraseña</span>
        <input
          required
          type="password"
          name="repetir"
          autoComplete="new-password"
          minLength={10}
          className="cm-input"
        />
      </label>

      <p id="politica-clave" style={{ fontSize: "13px", color: "var(--cm-texto-3)", marginTop: "-4px" }}>
        {politica} No puede coincidir con la actual ni contener su usuario de correo.
      </p>

      {error && (
        <div className="cm-alerta cm-alerta-error" role="alert">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={enviando}
        className="cm-btn cm-btn-primario cm-btn-bloque"
        style={{ minHeight: "46px", fontSize: "15px" }}
      >
        {enviando ? "Guardando…" : "Guardar contraseña"}
      </button>

      <div style={{ textAlign: "center", fontSize: "14px" }}>
        {obligatorio ? (
          <a
            href={endpointSalida}
            onClick={async (e) => {
              e.preventDefault();
              await fetch(endpointSalida, { method: "POST" });
              router.push(rutaAcceso);
            }}
            style={{ color: "var(--cm-texto-3)", textDecoration: "underline" }}
          >
            Cancelar y salir
          </a>
        ) : (
          <Link href={destino} style={{ color: "var(--cm-texto-3)", textDecoration: "underline" }}>
            Volver a la aplicación
          </Link>
        )}
      </div>
    </form>
  );
}
