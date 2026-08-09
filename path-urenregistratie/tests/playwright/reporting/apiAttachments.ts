import { attachment } from 'allure-js-commons';

const SENSITIVE_KEY = /authorization|cookie|csrf|password|passphrase|secret|token|session/i;

function sanitize(value: unknown, key = ''): unknown {
  if (SENSITIVE_KEY.test(key)) return '[REDACTED]';
  if (Buffer.isBuffer(value)) return `[Binary data: ${value.length} bytes]`;
  if (Array.isArray(value)) return value.map((item) => sanitize(item));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([childKey, childValue]) => [childKey, sanitize(childValue, childKey)]));
  }
  return value;
}

function json(value: unknown): string {
  return JSON.stringify(sanitize(value), null, 2);
}

export async function attachApiExchange(input: {
  method: string;
  endpoint: string;
  requestBody?: unknown;
  responseStatus: number;
  responseBody: unknown;
}): Promise<void> {
  const method = input.method.toUpperCase();
  await attachment(`API request · ${method} ${input.endpoint}`, json({
    method,
    endpoint: input.endpoint,
    body: input.requestBody ?? null,
  }), { contentType: 'application/json' });
  await attachment(`API response · ${input.responseStatus} ${input.endpoint}`, json({
    status: input.responseStatus,
    body: input.responseBody,
  }), { contentType: 'application/json' });
}