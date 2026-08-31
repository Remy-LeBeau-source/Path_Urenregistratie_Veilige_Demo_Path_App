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

/** Render a branded text PDF with a PNG logo embedded as a JPEG image XObject. */
function simple_pdf_branded_text_document(array $lines, string $logoPath): string
{
    if (!function_exists('imagecreatefrompng') || !is_file($logoPath)) {
        throw new RuntimeException('PNG logo rendering is unavailable.');
    }
    $source = @imagecreatefrompng($logoPath);
    if ($source === false) {
        throw new RuntimeException('PNG logo could not be loaded.');
    }
    $width = imagesx($source);
    $height = imagesy($source);
    $flattened = imagecreatetruecolor($width, $height);
    $white = imagecolorallocate($flattened, 255, 255, 255);
    imagefill($flattened, 0, 0, $white);
    imagealphablending($flattened, true);
    imagecopy($flattened, $source, 0, 0, 0, 0, $width, $height);
    ob_start();
    imagejpeg($flattened, null, 90);
    $jpegBytes = (string)ob_get_clean();
    imagedestroy($source);
    imagedestroy($flattened);
    if ($jpegBytes === '') {
        throw new RuntimeException('Logo JPEG conversion failed.');
    }

    $pageW = 595.28;
    $pageH = 841.89;
    $marginLeft = 56.0;
    $y = 690.0;
    $lineHeight = 16.0;
    $drawW = 122.0;
    $drawH = $drawW * ($height / max(1, $width));
    $content = "q\n0.05 0.11 0.22 rg\n0 730 595.28 111 re f\nQ\n";
    $content .= sprintf("q\n%.2F 0 0 %.2F 56 %.2F cm\n/Im1 Do\nQ\n", $drawW, $drawH, 758.0);
    $content .= "BT\n";
    foreach ($lines as $line) {
        $text = is_array($line) ? (string)($line['text'] ?? '') : (string)$line;
        $size = is_array($line) ? max(6, (int)($line['size'] ?? 11)) : 11;
        $escaped = simple_pdf_escape_text($text);
        $content .= sprintf("/F1 %d Tf\n1 0 0 1 %.2F %.2F Tm\n(%s) Tj\n", $size, $marginLeft, $y, $escaped);
        $y -= $lineHeight;
    }
    $content .= 'ET';

    return simple_pdf_assemble([
        '<< /Type /Catalog /Pages 2 0 R >>',
        '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
        sprintf(
            '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 %.2F %.2F] /Resources << /Font << /F1 5 0 R >> /XObject << /Im1 6 0 R >> >> /Contents 4 0 R >>',
            $pageW,
            $pageH
        ),
        '<< /Length ' . strlen($content) . ">>\nstream\n{$content}\nendstream",
        '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
        sprintf(
            '<< /Type /XObject /Subtype /Image /Width %d /Height %d /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length %d >>' . "\nstream\n%s\nendstream",
            $width,
            $height,
            strlen($jpegBytes),
            $jpegBytes
        ),
    ]);
}

/**
 * Render a fallback PDF with branding-consistent layout but no logo image.
 * Used when GD extension is unavailable to ensure mail attachment matches app preview layout.
 */
function simple_pdf_text_document_with_branding_fallback(array $lines): string
{
    $pageW = 595.28;
    $pageH = 841.89;
    $marginLeft = 56.0;
    $y = 690.0;  // Same starting position as branded version (not 780)
    $lineHeight = 16.0;

    // Render header bar area (without actual image)
    $content = "q\n0.05 0.11 0.22 rg\n0 730 595.28 111 re f\nQ\n";
    $content .= "BT\n";
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
        '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 %.2F %.2F] /Resources << /Font << /F1 4 0 R >> >> /Contents 3 0 R >>',
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
    if (strlen($bytes) < 64 || !str_starts_with($bytes, '%PDF-')) {
        return false;
    }

    // Alleen een %PDF-header en %%EOF is onvoldoende: zo accepteerden de
    // uploadtests eerder een bestand zonder catalogus, pagina's en xref-tabel.
    // Dat zag er technisch uit als PDF, maar gangbare lezers konden het niet
    // openen. Elke complete klassieke PDF én PDF met xref-stream eindigt met
    // startxref, een byte-offset en %%EOF.
    if (!preg_match('/startxref\s+(\d+)\s+%%EOF\s*$/s', $bytes, $match)) {
        return false;
    }

    $xrefOffset = (int)$match[1];
    if ($xrefOffset <= 0 || $xrefOffset >= strlen($bytes)) {
        return false;
    }

    $xrefTarget = substr($bytes, $xrefOffset, 32);
    $pointsToXref = str_starts_with($xrefTarget, 'xref');
    $pointsToXrefStream = preg_match('/^\d+\s+\d+\s+obj\b/', $xrefTarget) === 1;

    return ($pointsToXref || $pointsToXrefStream)
        && str_contains($bytes, '/Type /Catalog')
        && str_contains($bytes, '/Type /Page');
}
