import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { obtenerSesion } from "@/lib/session";
import { MARCA } from "@/lib/marca";

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
        codigo: true,
      },
    });

  if (!centro) {
    redirect("/login");
  }

  return (
    <div className="cm-app">
      <a
        href="#contenido"
        className="cm-saltar"
      >
        Saltar al contenido
      </a>

      <HeaderWeb
        nombreCentro={centro.nombre}
        codigoCentro={centro.codigo}
        nombreUsuario={sesion.nombre}
      />

      <div className="cm-cuerpo">
        <SidebarWeb />

        <div className="cm-principal">
          <main
            id="contenido"
            className="cm-contenido"
          >
            {children}
          </main>

          <footer className="cm-pie">
            <span>
              {MARCA.organismo} · {MARCA.departamento}
            </span>

            <span>
              {MARCA.aplicacion} — Programa {MARCA.programa} · v{MARCA.version}
            </span>
          </footer>
        </div>
      </div>
    </div>
  );
}
