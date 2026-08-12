<?php

declare(strict_types=1);

/**
 * Minimal Google Workspace SMTP Relay transport.
 *
 * The relay is authenticated by the production server IP. Username/password
 * authentication is intentionally unsupported. STARTTLS and certificate
 * validation are mandatory before any envelope or message data is sent.
 */

function smtp_assert_single_line(string $value, string $field): void
{
    if ($value === '' || str_contains($value, "\r") || str_contains($value, "\n")) {
        throw new RuntimeException('Invalid SMTP ' . $field . '.');
    }
}

function smtp_assert_email(string $value, string $field): void
{
    smtp_assert_single_line($value, $field);
    if (!filter_var($value, FILTER_VALIDATE_EMAIL)) {
        throw new RuntimeException('Invalid SMTP ' . $field . '.');
    }
}

function smtp_normalize_newlines(string $value): string
{
    return preg_replace("/\r\n|\r|\n/", "\r\n", $value) ?? $value;
}

function smtp_write_all($socket, string $bytes): void
{
    $length = strlen($bytes);
    $offset = 0;
    while ($offset < $length) {
        $written = fwrite($socket, substr($bytes, $offset));
        if ($written === false || $written === 0) {
            throw new RuntimeException('SMTP socket write failed.');
        }
        $offset += $written;
    }
}

function smtp_read_response($socket, string $context): string
{
    $response = '';
    while (($line = fgets($socket, 2048)) !== false) {
        $response .= $line;
        if (isset($line[3]) && $line[3] !== '-') {
            break;
        }
    }

    $metadata = stream_get_meta_data($socket);
    if (($metadata['timed_out'] ?? false) === true) {
        throw new RuntimeException('SMTP timeout during ' . $context . '.');
    }
    if ($response === '') {
        throw new RuntimeException('SMTP connection closed during ' . $context . '.');
    }

    return $response;
}

function smtp_expect(array $acceptedCodes, string $response, string $context): void
{
    $code = substr($response, 0, 3);
    if (!in_array($code, $acceptedCodes, true)) {
        // SMTP replies can contain recipient/server details but never application secrets.
        throw new RuntimeException('SMTP ' . $context . ' rejected with code ' . ($code ?: 'unknown') . '.');
    }
}

/**
 * @param array{host?:string,port?:int,encryption?:string,timeout?:int} $smtpConfig
 * @param list<array{filename:string,mime:string,data:string}> $attachments
 */
function smtp_relay_send(
    array $smtpConfig,
    string $to,
    ?string $cc,
    string $subject,
    string $body,
    string $fromEmail,
    string $fromName,
    array $attachments = []
): void {
    $host = strtolower(trim((string)($smtpConfig['host'] ?? '')));
    $port = (int)($smtpConfig['port'] ?? 0);
    $encryption = strtolower(trim((string)($smtpConfig['encryption'] ?? '')));
    $timeout = max(5, min(120, (int)($smtpConfig['timeout'] ?? 30)));

    if ($host !== 'smtp-relay.gmail.com' || $port !== 587 || $encryption !== 'starttls') {
        throw new RuntimeException('SMTP relay must use smtp-relay.gmail.com:587 with STARTTLS.');
    }
    smtp_assert_email($fromEmail, 'from address');
    smtp_assert_email($to, 'recipient address');
    if ($cc !== null && $cc !== '') {
        smtp_assert_email($cc, 'cc address');
    }
    smtp_assert_single_line($subject, 'subject');
    smtp_assert_single_line($fromName, 'from name');

    $context = stream_context_create([
        'ssl' => [
            'verify_peer' => true,
            'verify_peer_name' => true,
            'peer_name' => $host,
            'SNI_enabled' => true,
            'disable_compression' => true,
        ],
    ]);

    $errno = 0;
    $errstr = '';
    $socket = @stream_socket_client(
        'tcp://' . $host . ':' . $port,
        $errno,
        $errstr,
        $timeout,
        STREAM_CLIENT_CONNECT,
        $context
    );
    if ($socket === false) {
        throw new RuntimeException('SMTP connection failed with code ' . $errno . '.');
    }

    try {
        stream_set_timeout($socket, $timeout);
        smtp_expect(['220'], smtp_read_response($socket, 'greeting'), 'greeting');

        $ehloName = preg_replace('/[^A-Za-z0-9.-]/', '', (string)(gethostname() ?: 'localhost')) ?: 'localhost';
        smtp_write_all($socket, 'EHLO ' . $ehloName . "\r\n");
        $ehlo = smtp_read_response($socket, 'EHLO');
        smtp_expect(['250'], $ehlo, 'EHLO');

        if (stripos($ehlo, 'STARTTLS') === false) {
            throw new RuntimeException('SMTP relay did not advertise mandatory STARTTLS.');
        }
        smtp_write_all($socket, "STARTTLS\r\n");
        smtp_expect(['220'], smtp_read_response($socket, 'STARTTLS'), 'STARTTLS');
        if (stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT) !== true) {
            throw new RuntimeException('SMTP STARTTLS certificate negotiation failed.');
        }

        smtp_write_all($socket, 'EHLO ' . $ehloName . "\r\n");
        smtp_expect(['250'], smtp_read_response($socket, 'EHLO after STARTTLS'), 'EHLO after STARTTLS');

        smtp_write_all($socket, 'MAIL FROM:<' . $fromEmail . ">\r\n");
        smtp_expect(['250'], smtp_read_response($socket, 'MAIL FROM'), 'MAIL FROM');
        smtp_write_all($socket, 'RCPT TO:<' . $to . ">\r\n");
        smtp_expect(['250', '251'], smtp_read_response($socket, 'RCPT TO'), 'RCPT TO');
        if ($cc !== null && $cc !== '') {
            smtp_write_all($socket, 'RCPT TO:<' . $cc . ">\r\n");
            smtp_expect(['250', '251'], smtp_read_response($socket, 'RCPT TO cc'), 'RCPT TO cc');
        }

        smtp_write_all($socket, "DATA\r\n");
        smtp_expect(['354'], smtp_read_response($socket, 'DATA'), 'DATA');
        $message = smtp_build_message($fromEmail, $fromName, $to, $cc, $subject, $body, $attachments);
        $message = smtp_normalize_newlines($message);
        $stuffed = preg_replace('/^\./m', '..', $message) ?? $message;
        smtp_write_all($socket, rtrim($stuffed, "\r\n") . "\r\n.\r\n");
        smtp_expect(['250'], smtp_read_response($socket, 'message acceptance'), 'message acceptance');

        // A 250 response means Google accepted responsibility for the message.
        // A dropped connection during QUIT must not turn that accepted send into a retry.
        @fwrite($socket, "QUIT\r\n");
    } finally {
        if (is_resource($socket)) {
            fclose($socket);
        }
    }
}

/** @param list<array{filename:string,mime:string,data:string}> $attachments */
function smtp_build_message(
    string $fromEmail,
    string $fromName,
    string $to,
    ?string $cc,
    string $subject,
    string $body,
    array $attachments
): string {
    smtp_assert_email($fromEmail, 'from address');
    smtp_assert_email($to, 'recipient address');
    if ($cc !== null && $cc !== '') {
        smtp_assert_email($cc, 'cc address');
    }
    smtp_assert_single_line($subject, 'subject');
    smtp_assert_single_line($fromName, 'from name');

    $headers = 'Date: ' . date('r') . "\r\n";
    $headers .= 'Message-ID: <' . bin2hex(random_bytes(16)) . '@pathconsultancy.nl>' . "\r\n";
    $headers .= 'From: ' . smtp_encode_header($fromName) . ' <' . $fromEmail . '>' . "\r\n";
    $headers .= 'To: ' . $to . "\r\n";
    if ($cc !== null && $cc !== '') {
        $headers .= 'Cc: ' . $cc . "\r\n";
    }
    $headers .= 'Subject: ' . smtp_encode_header($subject) . "\r\n";
    $headers .= "MIME-Version: 1.0\r\n";
    $encodedBody = quoted_printable_encode(smtp_normalize_newlines($body));

    if ($attachments === []) {
        return $headers
            . "Content-Type: text/plain; charset=UTF-8\r\n"
            . "Content-Transfer-Encoding: quoted-printable\r\n\r\n"
            . $encodedBody;
    }

    $boundary = '----=_Path_' . bin2hex(random_bytes(12));
    $message = $headers . 'Content-Type: multipart/mixed; boundary="' . $boundary . "\"\r\n\r\n";
    $message .= '--' . $boundary . "\r\n";
    $message .= "Content-Type: text/plain; charset=UTF-8\r\n";
    $message .= "Content-Transfer-Encoding: quoted-printable\r\n\r\n" . $encodedBody . "\r\n";

    foreach ($attachments as $attachment) {
        $filename = preg_replace('/[^A-Za-z0-9._-]/', '_', (string)($attachment['filename'] ?? 'attachment.pdf')) ?: 'attachment.pdf';
        $mime = strtolower(trim((string)($attachment['mime'] ?? '')));
        $data = (string)($attachment['data'] ?? '');
        $decoded = base64_decode($data, true);
        if ($mime !== 'application/pdf' || $decoded === false || !str_starts_with($decoded, '%PDF-')) {
            throw new RuntimeException('SMTP attachment must be a valid base64-encoded PDF.');
        }
        $message .= '--' . $boundary . "\r\n";
        $message .= 'Content-Type: application/pdf; name="' . $filename . "\"\r\n";
        $message .= 'Content-Disposition: attachment; filename="' . $filename . "\"\r\n";
        $message .= "Content-Transfer-Encoding: base64\r\n\r\n";
        $message .= rtrim(chunk_split($data, 76, "\r\n"), "\r\n") . "\r\n";
    }

    return $message . '--' . $boundary . "--\r\n";
}

function smtp_encode_header(string $value): string
{
    smtp_assert_single_line($value, 'header value');
    if (preg_match('/[^\x20-\x7E]/', $value)) {
        return '=?UTF-8?B?' . base64_encode($value) . '?=';
    }
    return $value;
}
