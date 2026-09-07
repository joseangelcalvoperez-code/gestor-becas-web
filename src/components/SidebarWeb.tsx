"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import CerrarSesion from "@/components/CerrarSesion";

const itemsAntesFirmas = [
  { href: "/inicio", label: "INICIO", icon: "⌂" },
  { href: "/alumnos", label: "ALUMNOS", icon: "👤" },
  { href: "/grados-asignaturas", label: "GRADOS Y ASIGNATURAS", icon: "▦" },
  { href: "/asistencia", label: "ASISTENCIA", icon: "✓" },
  { href: "/documentos", label: "DOCUMENTOS", icon: "▤" },
];

const subitemsFirmas = [
  { href: "/firmas", label: "NUEVO ENVÍO" },
  { href: "/firmas/envios-realizados", label: "ENVÍOS REALIZADOS" },
  { href: "/firmas/documentos-firmados", label: "DOCUMENTOS FIRMADOS" },
];

export default function SidebarWeb() {
  const pathname = usePathname();
  const firmasActivas = pathname === "/firmas" || pathname.startsWith("/firmas/");

  return (
    <aside style={asideStyle}>
      <nav style={{ paddingTop: "14px" }}>
        {itemsAntesFirmas.map((item) => (
          <MenuLink key={item.href} item={item} activo={pathname === item.href || pathname.startsWith(`${item.href}/`)} />
        ))}

        <div>
          <Link href="/firmas" style={{ ...menuLinkStyle, borderLeft: firmasActivas ? "3px solid #e9423a" : "3px solid transparent", background: firmasActivas ? "#e3e7ed" : "transparent", fontWeight: firmasActivas ? 700 : 600 }}>
            <span style={{ ...iconStyle, color: firmasActivas ? "#e9423a" : "#596474" }}>✎</span>
            <span style={{ flex: 1 }}>FIRMAS</span>
            <span style={{ color: "#7a879a", fontSize: "10px" }}>{firmasActivas ? "⌄" : "›"}</span>
          </Link>

          {firmasActivas && (
            <div style={submenuStyle}>
              {subitemsFirmas.map((item) => {
                const activo = pathname === item.href;
                return (
                  <Link key={item.href} href={item.href} style={{ ...submenuLinkStyle, color: activo ? "#e9423a" : "#596474", fontWeight: activo ? 700 : 600, background: activo ? "#eef1f5" : "transparent" }}>
                    <span style={submenuPunto}>•</span>{item.label}
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        <MenuLink item={{ href: "/centro", label: "CENTRO", icon: "⚙" }} activo={pathname === "/centro" || pathname.startsWith("/centro/")} />
      </nav>

      <div style={{ marginTop: "auto", padding: "16px" }}><CerrarSesion /></div>
    </aside>
  );
}

function MenuLink({ item, activo }: { item: { href: string; label: string; icon: string }; activo: boolean }) {
  return (
    <Link href={item.href} style={{ ...menuLinkStyle, borderLeft: activo ? "3px solid #e9423a" : "3px solid transparent", background: activo ? "#e3e7ed" : "transparent", fontWeight: activo ? 700 : 600 }}>
      <span style={{ ...iconStyle, color: activo ? "#e9423a" : "#596474" }}>{item.icon}</span>
      <span>{item.label}</span>
    </Link>
  );
}

const asideStyle: React.CSSProperties = { width: "220px", minWidth: "220px", minHeight: "calc(100vh - 64px)", background: "#f4f6f8", borderRight: "1px solid #d7dde5", display: "flex", flexDirection: "column" };
const menuLinkStyle: React.CSSProperties = { minHeight: "48px", padding: "0 18px", display: "flex", alignItems: "center", gap: "13px", color: "#344056", fontSize: "11px", textDecoration: "none", boxSizing: "border-box" };
const iconStyle: React.CSSProperties = { width: "18px", fontSize: "14px", textAlign: "center" };
const submenuStyle: React.CSSProperties = { padding: "4px 0 8px 0", background: "#f7f8fa", borderBottom: "1px solid #e2e6ec" };
const submenuLinkStyle: React.CSSProperties = { minHeight: "34px", padding: "0 14px 0 48px", display: "flex", alignItems: "center", gap: "8px", fontSize: "8px", textDecoration: "none", letterSpacing: "0.02em" };
const submenuPunto: React.CSSProperties = { fontSize: "10px", lineHeight: 1 };
