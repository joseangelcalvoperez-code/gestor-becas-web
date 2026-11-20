import SimboloMarca from "@/components/SimboloMarca";

import { MARCA } from "@/lib/marca";

/*
 * Panel institucional de la pantalla de acceso.
 */
export default function PanelAcceso() {
  return (
    <section
      className="cm-acceso-lateral"
      aria-label={`${MARCA.organismo} · ${MARCA.departamento}`}
    >
      <div className="cm-acceso-institucion">
        <SimboloMarca
          tamano={40}
          invertido
        />

        <div>
          {MARCA.organismo}
          <small>{MARCA.departamento}</small>
        </div>
      </div>

      <div style={{ position: "relative", zIndex: 1 }}>
        <h2>
          {MARCA.aplicacion}
          <br />
          Programa {MARCA.programa}
        </h2>

        <p>
          Espacio de trabajo de los centros para la gestión del
          alumnado becado, el registro de asistencia y la
          emisión de la documentación justificativa.
        </p>

        <ul className="cm-acceso-lista">
          <li>Registro mensual de asistencia por asignatura</li>
          <li>Generación de Anexo I y Anexo V</li>
          <li>Expedientes individuales y masivos</li>
        </ul>
      </div>

      <p className="cm-acceso-nota">
        Acceso restringido al personal autorizado de los centros
        educativos. La actividad queda registrada.
      </p>
    </section>
  );
}
