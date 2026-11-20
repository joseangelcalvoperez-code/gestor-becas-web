import SimboloMarca from "@/components/SimboloMarca";

import { MARCA } from "@/lib/marca";

/*
 * Logotipo completo (emblema + "Comunidad de Madrid" +
 * Consejería). Para espacios amplios: acceso y registro.
 */
export default function LogotipoInstitucional({
  ancho = 260,
}: {
  ancho?: number;
}) {
  if (MARCA.logotipo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={MARCA.logotipo}
        alt={`${MARCA.organismo}. ${MARCA.departamento}`}
        width={ancho}
        style={{ width: ancho, height: "auto", display: "block" }}
      />
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <SimboloMarca />
      <div style={{ lineHeight: 1.2 }}>
        <strong>{MARCA.organismo}</strong>
        <div style={{ fontSize: 13 }}>{MARCA.departamento}</div>
      </div>
    </div>
  );
}
