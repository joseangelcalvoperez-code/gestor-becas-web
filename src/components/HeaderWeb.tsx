import SelectorCursoAcademico from "@/components/SelectorCursoAcademico";

interface HeaderWebProps {
  nombreCentro: string;
}

export default function HeaderWeb({
  nombreCentro,
}: HeaderWebProps) {
  return (
    <header
      style={{
        height: "64px",
        minHeight: "64px",

        background: "#252c3a",
        color: "#ffffff",

        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",

        padding: "0 24px",

        borderBottom:
          "1px solid #1d2330",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
        }}
      >
        <div
          style={{
            width: "36px",
            height: "36px",

            borderRadius: "50%",
            background: "#e9423a",

            display: "flex",
            alignItems: "center",
            justifyContent: "center",

            fontSize: "16px",
            fontWeight: 700,
          }}
        >
          G
        </div>

        <div>
          <div
            style={{
              fontSize: "14px",
              fontWeight: 700,
              lineHeight: 1.2,
            }}
          >
            Gestor Becas
          </div>

          <div
            style={{
              marginTop: "2px",
              fontSize: "9px",
              color: "#c9d0dc",
            }}
          >
            Segunda Oportunidad
          </div>
        </div>
      </div>

      <div
  style={{
    display: "flex",
    alignItems: "center",
    gap: "24px",
  }}
>
  <SelectorCursoAcademico />

  <div
    style={{
      fontSize: "11px",
      fontWeight: 700,
    }}
  >
    {nombreCentro}
  </div>
</div>
    </header>
  );
}