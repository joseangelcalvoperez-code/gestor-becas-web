"use client";

import {
  ChangeEvent,
  useRef,
  useState,
} from "react";

interface ErrorImportacion {
  fila: number;
  mensaje: string;
}

interface Props {
  cursoAcademicoId:
    number | null;

  nombreCursoAcademico:
    string;

  onImportacionCorrecta:
    () => void | Promise<void>;

  onMensaje: (
    tipo:
      | "success"
      | "error",

    mensaje:
      string
  ) => void;
}

export default function ImportExportAlumnos({
  cursoAcademicoId,
  nombreCursoAcademico,
  onImportacionCorrecta,
  onMensaje,
}: Props) {
  const inputRef =
    useRef<HTMLInputElement>(
      null
    );

  const [
    exportando,
    setExportando,
  ] =
    useState(false);

  const [
    importando,
    setImportando,
  ] =
    useState(false);

  const [
    exportandoListado,
    setExportandoListado,
  ] =
    useState(false);

  const [
    errores,
    setErrores,
  ] =
    useState<
      ErrorImportacion[]
    >([]);

  /* =====================================================
     EXPORTAR PLANTILLA
     ===================================================== */

  const exportar =
    async () => {
      if (
        !cursoAcademicoId
      ) {
        onMensaje(
          "error",
          "Debe seleccionar un curso académico."
        );

        return;
      }

      try {
        setExportando(
          true
        );

        setErrores(
          []
        );

        const respuesta =
          await fetch(
            `/api/alumnos/plantilla?cursoAcademicoId=${cursoAcademicoId}`,
            {
              cache:
                "no-store",
            }
          );

        if (
          !respuesta.ok
        ) {
          const resultado =
            await respuesta.json();

          onMensaje(
            "error",
            resultado.error ??
              "No se ha podido generar la plantilla."
          );

          return;
        }

        const blob =
          await respuesta.blob();

        const disposition =
          respuesta.headers.get(
            "Content-Disposition"
          );

        const coincidencia =
          disposition?.match(
            /filename="([^"]+)"/
          );

        const nombre =
          coincidencia?.[1] ??
          "Plantilla_Alumnos.xlsx";

        const url =
          URL.createObjectURL(
            blob
          );

        const enlace =
          document.createElement(
            "a"
          );

        enlace.href =
          url;

        enlace.download =
          nombre;

        document.body.appendChild(
          enlace
        );

        enlace.click();

        enlace.remove();

        URL.revokeObjectURL(
          url
        );

        onMensaje(
          "success",
          `✓ Plantilla generada para ${nombreCursoAcademico}`
        );
      } catch {
        onMensaje(
          "error",
          "No se ha podido conectar con el servidor."
        );
      } finally {
        setExportando(
          false
        );
      }
    };

  /* =====================================================
     EXPORTAR LISTADO
     ===================================================== */

  const exportarListado =
    async () => {
      if (
        !cursoAcademicoId
      ) {
        onMensaje(
          "error",
          "Debe seleccionar un curso académico."
        );

        return;
      }

      try {
        setExportandoListado(
          true
        );

        const respuesta =
          await fetch(
            `/api/alumnos/exportar?cursoAcademicoId=${cursoAcademicoId}`,
            {
              cache:
                "no-store",
            }
          );

        if (
          !respuesta.ok
        ) {
          const resultado =
            await respuesta.json();

          onMensaje(
            "error",
            resultado.error ??
              "No se ha podido generar el listado."
          );

          return;
        }

        const blob =
          await respuesta.blob();

        const disposition =
          respuesta.headers.get(
            "Content-Disposition"
          );

        const coincidencia =
          disposition?.match(
            /filename="([^"]+)"/
          );

        const nombre =
          coincidencia?.[1] ??
          "Listado_Alumnos.xlsx";

        const url =
          URL.createObjectURL(
            blob
          );

        const enlace =
          document.createElement(
            "a"
          );

        enlace.href =
          url;

        enlace.download =
          nombre;

        document.body.appendChild(
          enlace
        );

        enlace.click();

        enlace.remove();

        URL.revokeObjectURL(
          url
        );

        onMensaje(
          "success",
          `✓ Listado de alumnos de ${nombreCursoAcademico} exportado correctamente`
        );
      } catch {
        onMensaje(
          "error",
          "No se ha podido conectar con el servidor."
        );
      } finally {
        setExportandoListado(
          false
        );
      }
    };

  /* =====================================================
     SELECCIONAR ARCHIVO
     ===================================================== */

  const seleccionarArchivo =
    () => {
      if (
        !cursoAcademicoId
      ) {
        onMensaje(
          "error",
          "Debe seleccionar un curso académico."
        );

        return;
      }

      inputRef.current?.click();
    };

  /* =====================================================
     IMPORTAR
     ===================================================== */

  const importar =
    async (
      event:
        ChangeEvent<HTMLInputElement>
    ) => {
      const archivo =
        event.target.files?.[0];

      event.target.value =
        "";

      if (
        !archivo ||
        !cursoAcademicoId
      ) {
        return;
      }

      const confirmar =
        window.confirm(
          `Va a importar alumnos en el curso académico ${nombreCursoAcademico}.\n\nArchivo: ${archivo.name}\n\nNo se importará ninguna fila si se detecta algún error.\n\n¿Desea continuar?`
        );

      if (!confirmar) {
        return;
      }

      try {
        setImportando(
          true
        );

        setErrores(
          []
        );

        const formData =
          new FormData();

        formData.append(
          "archivo",
          archivo
        );

        formData.append(
          "cursoAcademicoId",
          String(
            cursoAcademicoId
          )
        );

        const respuesta =
          await fetch(
            "/api/alumnos/importar",
            {
              method:
                "POST",

              body:
                formData,
            }
          );

        const resultado =
          await respuesta.json();

        if (
          !respuesta.ok
        ) {
          if (
            Array.isArray(
              resultado.errores
            )
          ) {
            setErrores(
              resultado.errores
            );
          }

          onMensaje(
            "error",
            resultado.error ??
              "No se ha podido importar la plantilla."
          );

          return;
        }

        onMensaje(
          "success",
          `✓ ${resultado.importados} matrícula${resultado.importados === 1 ? "" : "s"} importada${resultado.importados === 1 ? "" : "s"} correctamente`
        );

        await onImportacionCorrecta();
      } catch {
        onMensaje(
          "error",
          "No se ha podido conectar con el servidor."
        );
      } finally {
        setImportando(
          false
        );
      }
    };

  /* =====================================================
     RENDER
     ===================================================== */

  return (
    <>
      <div
        style={{
          display:
            "flex",

          gap:
            "10px",

          alignItems:
            "center",

          flexWrap:
            "wrap",
        }}
      >
        {/* EXPORTAR PLANTILLA */}

        <button
          type="button"

          onClick={
            exportar
          }

          disabled={
            exportando ||
            !cursoAcademicoId
          }

          style={{
            ...botonSecundario,

            opacity:
              !cursoAcademicoId ||
              exportando
                ? 0.5
                : 1,
          }}
        >
          {exportando
            ? "GENERANDO..."
            : "EXPORTAR PLANTILLA"}
        </button>

        {/* IMPORTAR EXCEL */}

        <button
          type="button"

          onClick={
            seleccionarArchivo
          }

          disabled={
            importando ||
            !cursoAcademicoId
          }

          style={{
            ...botonRojo,

            opacity:
              !cursoAcademicoId ||
              importando
                ? 0.5
                : 1,
          }}
        >
          {importando
            ? "IMPORTANDO..."
            : "IMPORTAR EXCEL"}
        </button>

        {/* EXPORTAR LISTADO */}

        <button
          type="button"

          onClick={
            exportarListado
          }

          disabled={
            exportandoListado ||
            !cursoAcademicoId
          }

          style={{
            ...botonSecundario,

            opacity:
              !cursoAcademicoId ||
              exportandoListado
                ? 0.5
                : 1,
          }}
        >
          {exportandoListado
            ? "EXPORTANDO..."
            : "EXPORTAR LISTADO"}
        </button>

        {/* INPUT OCULTO */}

        <input
          ref={
            inputRef
          }

          type="file"

          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

          onChange={
            importar
          }

          style={{
            display:
              "none",
          }}
        />
      </div>

      {/* ERRORES DE IMPORTACIÓN */}

      {errores.length >
        0 && (
        <div
          style={{
            width:
              "100%",

            marginTop:
              "14px",

            border:
              "1px solid #efb0aa",

            background:
              "#fff7f6",
          }}
        >
          <div
            style={{
              padding:
                "11px 14px",

              color:
                "#a72d27",

              fontSize:
                "10px",

              fontWeight:
                700,
            }}
          >
            ERRORES DE IMPORTACIÓN (
            {
              errores.length
            })
          </div>

          <div
            style={{
              maxHeight:
                "220px",

              overflowY:
                "auto",
            }}
          >
            {errores.map(
              (
                error,
                index
              ) => (
                <div
                  key={`${error.fila}-${index}`}

                  style={{
                    display:
                      "grid",

                    gridTemplateColumns:
                      "70px 1fr",

                    padding:
                      "9px 14px",

                    borderTop:
                      "1px solid #f0d5d2",

                    color:
                      "#7c4140",

                    fontSize:
                      "10px",
                  }}
                >
                  <strong>
                    Fila{" "}
                    {
                      error.fila
                    }
                  </strong>

                  <span>
                    {
                      error.mensaje
                    }
                  </span>
                </div>
              )
            )}
          </div>
        </div>
      )}
    </>
  );
}

/* =========================================================
   ESTILOS
   ========================================================= */

const botonRojo:
  React.CSSProperties =
{
  minHeight:
    "40px",

  padding:
    "0 18px",

  border:
    "none",

  background:
    "#e9423a",

  color:
    "#ffffff",

  fontSize:
    "9px",

  fontWeight:
    700,

  cursor:
    "pointer",
};

const botonSecundario:
  React.CSSProperties =
{
  ...botonRojo,

  background:
    "#596474",
};