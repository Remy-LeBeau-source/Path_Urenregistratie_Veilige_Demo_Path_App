from pathlib import Path

from reportlab.lib.colors import HexColor, white
from reportlab.lib.enums import TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from reportlab.platypus import Paragraph


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "output" / "pdf" / "Path_Conceptfactuur_Shawn_Juli_2026.pdf"
LOGO = ROOT / "assets" / "path-logo.png"

NAVY = HexColor("#0D1B38")
NAVY_SOFT = HexColor("#152747")
MINT = HexColor("#3ABD9D")
MINT_DARK = HexColor("#169276")
TEAL = HexColor("#165D64")
MINT_LIGHT = HexColor("#E7F8F3")
INK = HexColor("#172332")
MUTED = HexColor("#6C7886")
LINE = HexColor("#DFE6E9")
BACKGROUND = HexColor("#F6F9F8")
WARNING = HexColor("#A45F13")


pdfmetrics.registerFont(TTFont("PathSans", "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"))
pdfmetrics.registerFont(TTFont("PathSans-Bold", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"))


def text(pdf, x, y, value, size=8.5, color=INK, font="PathSans"):
    pdf.setFillColor(color)
    pdf.setFont(font, size)
    pdf.drawString(x * mm, y * mm, value)


def right_text(pdf, x, y, value, size=8.5, color=INK, font="PathSans"):
    pdf.setFillColor(color)
    pdf.setFont(font, size)
    pdf.drawRightString(x * mm, y * mm, value)


def label(pdf, x, y, value):
    text(pdf, x, y, value.upper(), size=6.3, color=MUTED, font="PathSans-Bold")


def rounded_box(pdf, x, y, width, height, fill, stroke=None, radius=3):
    pdf.setFillColor(fill)
    pdf.setStrokeColor(stroke or fill)
    pdf.roundRect(x * mm, y * mm, width * mm, height * mm, radius * mm, fill=1, stroke=1 if stroke else 0)


def draw_invoice():
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    pdf = canvas.Canvas(str(OUTPUT), pagesize=A4)
    page_width, page_height = A4
    pdf.setTitle("Path conceptfactuur Shawn juli 2026")
    pdf.setAuthor("QSI Consultancy")
    pdf.setSubject("Conceptfactuur - niet verzonden")

    # Header in de kleuren van Path.
    pdf.setFillColor(NAVY)
    pdf.rect(0, 251 * mm, page_width, 46 * mm, fill=1, stroke=0)
    pdf.setFillColor(MINT)
    pdf.rect(0, 249.5 * mm, page_width, 1.5 * mm, fill=1, stroke=0)
    pdf.drawImage(ImageReader(str(LOGO)), 15 * mm, 267 * mm, width=45 * mm, height=15 * mm, mask="auto", preserveAspectRatio=True)
    text(pdf, 15, 260, "UREN & FACTURATIE", size=6.8, color=HexColor("#BFD9D2"), font="PathSans-Bold")

    right_text(pdf, 195, 281, "FACTUUR", size=21, color=white, font="PathSans-Bold")
    right_text(pdf, 195, 271.0, "Factuurnummer: Bel-Shawn-2026-juli", size=9.2, color=white, font="PathSans-Bold")
    right_text(pdf, 195, 263.5, "Factuurdatum  01-08-2026   |   Betreft  juli", size=7.2, color=HexColor("#DDE9E6"))
    rounded_box(pdf, 151.5, 254, 43.5, 6.5, MINT)
    right_text(pdf, 192.5, 256.2, "CONCEPT - NIET VERZONDEN", size=5.9, color=NAVY, font="PathSans-Bold")

    # Afzender en ontvanger.
    rounded_box(pdf, 14, 184, 88, 58, BACKGROUND, LINE)
    rounded_box(pdf, 107, 184, 89, 58, MINT_LIGHT)
    label(pdf, 20, 234, "Facturerende onderneming")
    text(pdf, 20, 226.5, "QSI Consultancy", size=11, color=NAVY, font="PathSans-Bold")
    text(pdf, 20, 220, "Du Perronstraat 12")
    text(pdf, 20, 214.5, "3067 HN Rotterdam")
    pdf.setStrokeColor(LINE)
    pdf.line(20 * mm, 209 * mm, 96 * mm, 209 * mm)
    label(pdf, 20, 203.5, "KvK")
    text(pdf, 36, 203.5, "89320018")
    label(pdf, 59, 203.5, "BTW")
    text(pdf, 72, 203.5, "NL001622017B32")
    label(pdf, 20, 197.5, "IBAN")
    text(pdf, 36, 197.5, "NL95INGB0006947972", font="PathSans-Bold")
    text(pdf, 20, 190.5, "06 21 46 91 72  |  info@pathconsultancy.nl", size=7.5, color=TEAL)

    label(pdf, 113, 234, "Factuur aan")
    text(pdf, 113, 226.5, "circle8", size=11, color=NAVY, font="PathSans-Bold")
    text(pdf, 113, 220, "Plettenburg-West,")
    text(pdf, 113, 214.5, "Fultonbaan 6,")
    text(pdf, 113, 209, "3439 NE Nieuwegein")
    pdf.setStrokeColor(HexColor("#C6E9E0"))
    pdf.line(113 * mm, 203.5 * mm, 190 * mm, 203.5 * mm)
    label(pdf, 113, 197.5, "Project")
    text(pdf, 136, 197.5, "belastingdienst", color=TEAL, font="PathSans-Bold")
    label(pdf, 113, 191, "Omschrijving")
    text(pdf, 143, 191, "Maand juli")

    # Shawn-specifieke referenties.
    rounded_box(pdf, 14, 157, 182, 20, NAVY_SOFT)
    reference_columns = [
        (20, "OVEREENKOMSTNUMMER:", "202636991"),
        (80, "CREDITEURENNUMMER:", "622085"),
        (136, "NUMMER OPDRACHTUITVOERDER:", "217744"),
    ]
    for x, heading, value in reference_columns:
        text(pdf, x, 169, heading, size=5.5, color=HexColor("#A9C6C0"), font="PathSans-Bold")
        text(pdf, x, 162, value, size=9, color=white, font="PathSans-Bold")

    text(pdf, 14, 147.5, "Beste,", size=8.3)
    text(pdf, 14, 141.5, "Hierbij doe ik u de factuur toekomen betreft de volgende werkzaamheden.", size=8.3)

    # Urenregel.
    pdf.setFillColor(NAVY)
    pdf.roundRect(14 * mm, 123 * mm, 182 * mm, 10 * mm, 2.5 * mm, fill=1, stroke=0)
    text(pdf, 18, 126.3, "OMSCHRIJVING", size=6.8, color=white, font="PathSans-Bold")
    right_text(pdf, 132, 126.3, "UREN", size=6.8, color=white, font="PathSans-Bold")
    right_text(pdf, 162, 126.3, "TARIEF", size=6.8, color=white, font="PathSans-Bold")
    right_text(pdf, 191, 126.3, "TOTAAL", size=6.8, color=white, font="PathSans-Bold")
    pdf.setFillColor(BACKGROUND)
    pdf.rect(14 * mm, 109 * mm, 182 * mm, 13 * mm, fill=1, stroke=0)
    text(pdf, 18, 114, "Maand juli", size=8.5, font="PathSans-Bold")
    right_text(pdf, 132, 114, "144")
    right_text(pdf, 162, 114, "€ 85.50")
    right_text(pdf, 191, 114, "€ 12,312.00", font="PathSans-Bold")

    # Totalenblok.
    label(pdf, 122, 99.5, "Totaal exclusief")
    right_text(pdf, 191, 99.5, "€ 12,312.00", size=9, font="PathSans-Bold")
    label(pdf, 122, 91.5, "BTW 21 %")
    right_text(pdf, 191, 91.5, "€ 2,585.52", size=9, font="PathSans-Bold")
    pdf.setStrokeColor(MINT)
    pdf.setLineWidth(1.2)
    pdf.line(122 * mm, 86 * mm, 191 * mm, 86 * mm)
    text(pdf, 122, 77.5, "TOTAAL INCLUSIEF", size=7, color=NAVY, font="PathSans-Bold")
    right_text(pdf, 191, 76.5, "€ 14,897.52", size=13, color=NAVY, font="PathSans-Bold")

    # Betaling en afsluiting.
    rounded_box(pdf, 14, 47, 182, 21, MINT_LIGHT)
    label(pdf, 20, 61.5, "Betalingsinformatie")
    payment_style = ParagraphStyle(
        "payment",
        fontName="PathSans",
        fontSize=7.5,
        leading=11,
        textColor=TEAL,
    )
    payment = Paragraph(
        "U wordt vriendelijk verzocht uw betaling binnen 30 dagen van de factuurdatum over te maken op rekening: "
        "<b>NL95INGB0006947972</b> onder vermelding van factuurnummer: <b>Bel-Shawn-2026-juli</b>",
        payment_style,
    )
    payment.wrapOn(pdf, 169 * mm, 12 * mm)
    payment.drawOn(pdf, 20 * mm, 50.5 * mm)

    text(pdf, 14, 35, "Met vriendelijke groet,", size=8)
    text(pdf, 14, 28, "QSI Consultancy", size=9, color=NAVY, font="PathSans-Bold")

    # Duidelijke juridische scheiding tussen vormgeving en afzender.
    pdf.setFillColor(NAVY)
    pdf.rect(0, 0, page_width, 15 * mm, fill=1, stroke=0)
    text(pdf, 14, 6, "Path-vormgeving  |  Facturerende onderneming: QSI Consultancy", size=6.2, color=HexColor("#DDE9E6"))
    right_text(pdf, 196, 6, "CONCEPTVOORBEELD", size=6.2, color=MINT, font="PathSans-Bold")

    pdf.showPage()
    pdf.save()
    print(OUTPUT)


if __name__ == "__main__":
    draw_invoice()
