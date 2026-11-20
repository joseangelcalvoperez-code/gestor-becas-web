"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import CerrarSesion from "@/components/CerrarSesion";

/* Iconos de trazo (24×24) — sin dependencias externas. */
const ICONOS: Record<string, React.ReactNode> = {
  inicio: (
    <>
      <path d="m3 10 9-7 9 7" />
      <path d="M5 9v11h14V9" />
      <path d="M10 20v-6h4v6" />
    </>
  ),
  alumnos: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5" />
      <path d="M16 4.8a3.3 3.3 0 0 1 0 6.4" />
      <path d="M18 14.8c1.8.7 3 2.4 3.5 5.2" />
    </>
  ),
  grados: (
    <>
      <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5Z" />
      <path d="M13 4h5.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H13Z" />
      <path d="M7 8h1.5M16 8h1.5" />
    </>
  ),
  asistencia: (
    <>
      <rect x="3" y="4.5" width="18" height="16" rx="2" />
      <path d="M3 9.5h18M8 2.5v4M16 2.5v4" />
      <path d="m8.5 15 2.2 2.2 4.8-4.7" />
    </>
  ),
  documentos: (
    <>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z" />
      <path d="M14 3v5h5" />
      <path d="M9 13h6M9 17h6" />
    </>
  ),
  centro: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.6 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
    </>
  ),
  ayuda: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.2a2.6 2.6 0 0 1 5 .9c0 1.7-2.5 2.4-2.5 2.4" />
      <path d="M12 16.5h.01" />
    </>
  ),
};

function Icono({ nombre }: { nombre: string }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ICONOS[nombre]}
    </svg>
  );
}

const items = [
  { href: "/inicio", label: "Inicio", icon: "inicio" },
  { href: "/alumnos", label: "Alumnado", icon: "alumnos" },
  { href: "/grados-asignaturas", label: "Grados y asignaturas", icon: "grados" },
  { href: "/asistencia", label: "Asistencia", icon: "asistencia" },
  { href: "/documentos", label: "Documentación", icon: "documentos" },
  { href: "/centro", label: "Datos del centro", icon: "centro" },
];

export default function SidebarWeb() {
  const pathname = usePathname();

  return (
    <aside className="cm-menu">
      <nav aria-label="Menú principal">
        <div className="cm-menu-titulo">
          Gestión del centro
        </div>

        {items.map((item) => {
          const activo =
            pathname === item.href ||
            pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className="cm-menu-enlace"
              aria-current={activo ? "page" : undefined}
              title={item.label}
            >
              <Icono nombre={item.icon} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="cm-menu-pie">
        <a
          className="cm-menu-ayuda"
          href="/documentos/Manual_Gestor_Becas_v1.0.pdf"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Icono nombre="ayuda" />
          <span>Manual de usuario</span>
        </a>

        <CerrarSesion />
      </div>
    </aside>
  );
}
