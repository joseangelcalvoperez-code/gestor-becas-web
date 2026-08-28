"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import CerrarSesion from "@/components/CerrarSesion";

const items = [
  {
    href: "/inicio",
    label: "INICIO",
    icon: "⌂",
  },
  {
    href: "/alumnos",
    label: "ALUMNOS",
    icon: "👤",
  },
  {
    href: "/grados-asignaturas",
    label: "GRADOS Y ASIGNATURAS",
    icon: "▦",
  },
  {
    href: "/asistencia",
    label: "ASISTENCIA",
    icon: "✓",
  },
  {
    href: "/documentos",
    label: "DOCUMENTOS",
    icon: "▤",
  },
  {
    href: "/centro",
    label: "CENTRO",
    icon: "⚙",
  },
];

export default function SidebarWeb() {
  const pathname = usePathname();

  return (
    <aside
      style={{
        width: "220px",
        minWidth: "220px",
        minHeight: "calc(100vh - 64px)",
        background: "#f4f6f8",
        borderRight: "1px solid #d7dde5",

        display: "flex",
        flexDirection: "column",
      }}
    >
      <nav
        style={{
          paddingTop: "14px",
        }}
      >
        {items.map((item) => {
          const activo =
            pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                minHeight: "48px",
                padding: "0 18px",

                display: "flex",
                alignItems: "center",
                gap: "13px",

                borderLeft: activo
                  ? "3px solid #e9423a"
                  : "3px solid transparent",

                background: activo
                  ? "#e3e7ed"
                  : "transparent",

                color: "#344056",

                fontSize: "11px",
                fontWeight: activo
                  ? 700
                  : 600,

                textDecoration: "none",
              }}
            >
              <span
                style={{
                  width: "18px",
                  color: activo
                    ? "#e9423a"
                    : "#596474",

                  fontSize: "14px",
                  textAlign: "center",
                }}
              >
                {item.icon}
              </span>

              <span>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      <div
        style={{
          marginTop: "auto",
          padding: "16px",
        }}
      >
        <CerrarSesion />
      </div>
    </aside>
  );
}