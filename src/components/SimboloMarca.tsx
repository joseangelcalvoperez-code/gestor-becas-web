import { MARCA } from "@/lib/marca";

/*
 * Símbolo de la cabecera. Usa el logotipo oficial solo si se
 * ha configurado (ver src/lib/marca.ts); si no, un símbolo
 * neutro en el rojo institucional.
 */
export default function SimboloMarca({
  tamano = 34,
  invertido = false,
}: {
  tamano?: number;
  invertido?: boolean;
}) {
  if (MARCA.logoInstitucional) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={MARCA.logoInstitucional}
        alt={MARCA.organismo}
        height={tamano}
        style={{ height: tamano, width: "auto" }}
      />
    );
  }

  const fondo = invertido ? "#ffffff" : "var(--cm-rojo)";
  const trazo = invertido ? "var(--cm-rojo)" : "#ffffff";

  return (
    <svg
      className="cm-marca-simbolo"
      width={tamano}
      height={tamano}
      viewBox="0 0 34 34"
      aria-hidden="true"
    >
      <rect width="34" height="34" rx="4" fill={fondo} />
      {/* Birrete estilizado: educación */}
      <path d="M17 9 6 14l11 5 11-5-11-5Z" fill={trazo} />
      <path
        d="M10.5 16.4v4.6c0 1.6 2.9 3.2 6.5 3.2s6.5-1.6 6.5-3.2v-4.6"
        fill="none"
        stroke={trazo}
        strokeWidth="2"
      />
      <path d="M27 14v6" stroke={trazo} strokeWidth="1.6" />
    </svg>
  );
}
