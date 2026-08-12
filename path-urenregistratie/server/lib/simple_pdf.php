<?php

declare(strict_types=1);

/**
 * Minimal, dependency-free PDF writer.
 *
 * Deliberately hand-rolled instead of adding a Composer/third-party PDF library:
 * both use cases in this app (wrapping one JPEG as a page, and a simple text
 * invoice) only need a tiny, well-documented subset of the PDF spec (Helvetica
 * base font + a DCTDecode image XObject), so a small dependency-free writer
 * avoids an extra supply-chain dependency in a security-conscious app.
 */

/** Assemble a list of PDF object bodies (1-indexed by array position) into a full PDF byte string. */
function simple_pdf_assemble(array $objects): string
{
    $out = "%PDF-1.4\n";
    $offsets = [];
    foreach (array_values($objects) as $idx => $body) {
        $objNum = $idx + 1;
        $offsets[$objNum] = strlen($out);
        $out .= $objNum . " 0 obj\n" . $body . "\nendobj\n";
    }

    $xrefStart = strlen($out);
    $total = count($objects) + 1;
    $out .= "xref\n0 {$total}\n0000000000 65535 f \n";
    for ($n = 1; $n < $total; $n++) {
        $out .= sprintf("%010d 00000 n \n", $offsets[$n]);
    }
    $out .= "trailer\n<< /Size {$total} /Root 1 0 R >>\nstartxref\n{$xrefStart}\n%%EOF";

    return $out;
}

/** Escape a text string for use inside a PDF "(...)" literal string operand. */
function simple_pdf_escape_text(string $text): string
{
    $encoded = $text;
    if (function_exists('mb_convert_encoding')) {
        $converted = @mb_convert_encoding($text, 'Windows-1252', 'UTF-8');
        if (is_string($converted) && $converted !== '') {
            $encoded = $converted;
        }
    }

    return str_replace(['\\', '(', ')'], ['\\\\', '\\(', '\\)'], $encoded);
}

/**
 * Wrap a single JPEG image (raw bytes) as a one-page PDF, scaled to fit A4
 * with a margin. Used to turn an uploaded JPG/PNG klanturenstaat into a PDF.
 */
function simple_pdf_from_jpeg(string $jpegBytes, int $pixelWidth, int $pixelHeight): string
{
    $pageW = 595.28;
    $pageH = 841.89;
    $margin = 24.0;
    $maxW = $pageW - (2 * $margin);
    $maxH = $pageH - (2 * $margin);

    $pixelWidth = max(1, $pixelWidth);
    $pixelHeight = max(1, $pixelHeight);
    $scale = min($maxW / $pixelWidth, $maxH / $pixelHeight);
    $drawW = $pixelWidth * $scale;
    $drawH = $pixelHeight * $scale;
    $x = ($pageW - $drawW) / 2;
    $y = ($pageH - $drawH) / 2;

    $content = sprintf("q\n%.2F 0 0 %.2F %.2F %.2F cm\n/Im1 Do\nQ", $drawW, $drawH, $x, $y);

    $objects = [];
    $objects[] = '<< /Type /Catalog /Pages 2 0 R >>';
    $objects[] = '<< /Type /Pages /Kids [3 0 R] /Count 1 >>';
    $objects[] = sprintf(
        '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 %.2F %.2F] /Resources << /XObject << /Im1 5 0 R >> >> /Contents 4 0 R >>',
        $pageW,
        $pageH
    );
    $objects[] = '<< /Length ' . strlen($content) . " >>\nstream\n{$content}\nendstream";
    $objects[] = sprintf(
        '<< /Type /XObject /Subtype /Image /Width %d /Height %d /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length %d >>' . "\nstream\n%s\nendstream",
        $pixelWidth,
        $pixelHeight,
        strlen($jpegBytes),
        $jpegBytes
    );

    return simple_pdf_assemble($objects);
}

/**
 * Render a simple, single-page, text-only PDF from an ordered list of lines.
 * Each line is either a string, or ['text' => string, 'size' => int].
 */
function simple_pdf_text_document(array $lines): string
{
    $pageW = 595.28;
    $pageH = 841.89;
    $marginLeft = 56.0;
    $y = 780.0;
    $lineHeight = 16.0;

    $content = "BT\n";
    foreach ($lines as $line) {
        $text = is_array($line) ? (string)($line['text'] ?? '') : (string)$line;
        $size = is_array($line) ? max(6, (int)($line['size'] ?? 11)) : 11;
        $escaped = simple_pdf_escape_text($text);
        $content .= sprintf("/F1 %d Tf\n1 0 0 1 %.2F %.2F Tm\n(%s) Tj\n", $size, $marginLeft, $y, $escaped);
        $y -= $lineHeight;
    }
    $content .= 'ET';

    $objects = [];
    $objects[] = '<< /Type /Catalog /Pages 2 0 R >>';
    $objects[] = '<< /Type /Pages /Kids [3 0 R] /Count 1 >>';
    $objects[] = sprintf(
        '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 %.2F %.2F] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
        $pageW,
        $pageH
    );
    $objects[] = '<< /Length ' . strlen($content) . " >>\nstream\n{$content}\nendstream";
    $objects[] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';

    return simple_pdf_assemble($objects);
}

/** True when the given bytes look like a structurally valid, non-empty PDF file. */
function simple_pdf_looks_valid(string $bytes): bool
{
    if (strlen($bytes) < 16) {
        return false;
    }

    return str_starts_with($bytes, '%PDF-') && str_contains(substr($bytes, -32), '%%EOF');
}
