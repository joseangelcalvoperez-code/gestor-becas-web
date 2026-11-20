import SelectorCursoAcademico from "@/components/SelectorCursoAcademico";
import SimboloMarca from "@/components/SimboloMarca";

import { MARCA } from "@/lib/marca";

interface HeaderWebProps {
  nombreCentro: string;
  codigoCentro?: string;
  nombreUsuario?: string;
}

export default function HeaderWeb({
  nombreCentro,
  codigoCentro,
  nombreUsuario,
}: HeaderWebProps) {
  return (
    <header className="cm-cabecera">
      <div className="cm-marca">
        <div className="cm-marca-institucion">
          <SimboloMarca />

          <div className="cm-marca-textos">
            <span className="cm-marca-organismo">
              {MARCA.organismo}
            </span>

            <span className="cm-marca-departamento">
              {MARCA.departamento}
            </span>
          </div>
        </div>

        <div className="cm-marca-app">
          <strong>{MARCA.aplicacion}</strong>
          <span>{MARCA.programa}</span>
        </div>
      </div>

      <div className="cm-cabecera-derecha">
        <SelectorCursoAcademico />

        <div
          className="cm-centro"
          title={nombreCentro}
        >
          <div
            className="cm-centro-icono"
            aria-hidden="true"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 21h18" />
              <path d="M5 21V8l7-5 7 5v13" />
              <path d="M9 21v-6h6v6" />
            </svg>
          </div>

          <div className="cm-centro-textos">
            <span className="cm-centro-nombre">
              {nombreCentro}
            </span>

            <span className="cm-centro-usuario">
              {[
                codigoCentro
                  ? `Código ${codigoCentro}`
                  : null,
                nombreUsuario || null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
