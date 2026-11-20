import LogotipoInstitucional from "@/components/LogotipoInstitucional";

import { MARCA } from "@/lib/marca";

/*
 * Panel institucional de la pantalla de acceso.
 */
export default function PanelAcceso({
  administracion = false,
}: {
  /** Variante para el acceso del personal de administración. */
  administracion?: boolean;
}) {
  return (
    <section
      className="cm-acceso-lateral"
      aria-label={`${MARCA.organismo} · ${MARCA.departamento}`}
    >
      <div className="cm-acceso-logotipo">
        <LogotipoInstitucional />
      </div>

      <div style={{ position: "relative", zIndex: 1 }}>
        <h2>
          {MARCA.aplicacion}
          <br />
          {administracion ? "Administración" : `Programa ${MARCA.programa}`}
        </h2>

        {administracion ? (
          <>
            <p>
              Panel del servicio de soporte para atender a los
              centros educativos de la plataforma.
            </p>

            <ul className="cm-acceso-lista">
              <li>Solicitudes de restablecimiento de contraseña</li>
              <li>Contraseñas provisionales para los centros</li>
              <li>Registro de la actividad realizada</li>
            </ul>
          </>
        ) : (
          <>
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
          </>
        )}
      </div>

      <p className="cm-acceso-nota">
        {administracion
          ? "Acceso exclusivo para el personal de administración de la plataforma. Todas las acciones quedan registradas."
          : "Acceso restringido al personal autorizado de los centros educativos. La actividad queda registrada."}
      </p>
    </section>
  );
}
