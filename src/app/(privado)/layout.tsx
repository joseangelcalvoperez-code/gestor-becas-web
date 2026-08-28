import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { obtenerSesion } from "@/lib/session";

import HeaderWeb from "@/components/HeaderWeb";
import SidebarWeb from "@/components/SidebarWeb";

export default async function LayoutPrivado({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const sesion =
    await obtenerSesion();

  if (!sesion) {
    redirect("/login");
  }

  const centro =
    await prisma.centro.findFirst({
      where: {
        id: sesion.centroId,
        activo: true,
      },

      select: {
        nombre: true,
      },
    });

  if (!centro) {
    redirect("/login");
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#e9edf2",
      }}
    >
      <HeaderWeb
        nombreCentro={centro.nombre}
      />

      <div
        style={{
          display: "flex",
          minHeight:
            "calc(100vh - 64px)",
        }}
      >
        <SidebarWeb />

        <main
          style={{
            flex: 1,
            minWidth: 0,
            padding: "20px",
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}