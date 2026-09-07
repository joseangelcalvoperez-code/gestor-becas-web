"""Genera el PDF del manual v2 desde docs/manual-v2.md (requiere reportlab)."""
from pathlib import Path
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "public/documentos/Manual_Gestor_Becas_v2.0.pdf"
styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name="ManualBody", fontName="Helvetica", fontSize=10.5,
                          leading=15, spaceAfter=10, textColor=colors.HexColor("#303b50")))
styles.add(ParagraphStyle(name="ManualHeading", fontName="Helvetica-Bold", fontSize=16,
                          leading=21, spaceBefore=12, spaceAfter=14, keepWithNext=True,
                          textColor=colors.HexColor("#252c3a")))
styles.add(ParagraphStyle(name="ManualTitle", fontName="Helvetica-Bold", fontSize=29,
                          leading=35, spaceBefore=36, spaceAfter=22, textColor=colors.black))
styles.add(ParagraphStyle(name="ManualBullet", parent=styles["ManualBody"], leftIndent=12,
                          firstLineIndent=-9, spaceAfter=5))

source = (ROOT / "docs/manual-v2.md").read_text(encoding="utf-8")
story = []
headings = [line[3:] for line in source.splitlines() if line.startswith("## ")]
for block in source.strip().split("\n\n"):
    if block.startswith("# "):
        story.append(Paragraph(escape(block[2:]), styles["ManualTitle"]))
    elif block.startswith("## "):
        number = int(block.split()[1])
        if number == 1:
            story.append(Spacer(1, 20))
            story.append(Paragraph("Contenido", styles["ManualHeading"]))
            for heading in headings:
                story.append(Paragraph(escape(heading), styles["ManualBody"]))
        if number in (1, 3, 5, 7, 9, 10, 12):
            story.append(PageBreak())
        story.append(Paragraph(escape(block[3:]), styles["ManualHeading"]))
    elif block.startswith("- "):
        for line in block.splitlines():
            story.append(Paragraph("- " + escape(line[2:]), styles["ManualBullet"]))
    else:
        story.append(Paragraph(escape(block.replace("`", "")), styles["ManualBody"]))

def footer(canvas, doc):
    canvas.saveState()
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(colors.HexColor("#65758d"))
    canvas.drawString(48, 29, "Gestor de Becas · v2.0 · Con módulo de firmas")
    canvas.drawRightString(A4[0] - 48, 29, str(doc.page))
    canvas.restoreState()

OUTPUT.parent.mkdir(parents=True, exist_ok=True)
SimpleDocTemplate(str(OUTPUT), pagesize=A4, rightMargin=48, leftMargin=48,
                  topMargin=40, bottomMargin=49, title="Manual del Gestor de Becas v2.0",
                  author="", subject="Gestión académica y módulo de firmas").build(
                      story, onFirstPage=footer, onLaterPages=footer)
print(OUTPUT)
