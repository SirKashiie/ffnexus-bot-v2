/**
 * Logger com Sanitização de Dados Sensíveis
 */

const SENSITIVE_PATTERNS = [
  { pattern: /token[:\s]*([^\s]+)/gi, name: 'token' },
  { pattern: /password[:\s]*([^\s]+)/gi, name: 'password' },
  { pattern: /api[_-]?key[:\s]*([^\s]+)/gi, name: 'api_key' },
  { pattern: /secret[:\s]*([^\s]+)/gi, name: 'secret' },
  { pattern: /bearer\s+([^\s]+)/gi, name: 'bearer' },
];

const SENSITIVE_FIELDS = [
  'token',
  'password',
  'secret',
  'privateKey',
  'clientSecret',
  'apiKey',
];

export function sanitize(text) {
  if (typeof text !== 'string') {
    return text;
  }

  let sanitized = text;
  for (const { pattern } of SENSITIVE_PATTERNS) {
    sanitized = sanitized.replace(pattern, '[REDACTED]');
  }
  return sanitized;
}

export function sanitizeObject(obj) {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  const sanitized = { ...obj };
  for (const field of SENSITIVE_FIELDS) {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]';
    }
  }
  return sanitized;
}

class Logger {
  constructor(module = 'App') {
    this.module = module;
  }

  _format(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${this.module}] [${level}]`;
    if (data) {
      const sanitizedData = sanitizeObject(data);
      return `${prefix} ${message} ${JSON.stringify(sanitizedData)}`;
    }
    return `${prefix} ${message}`;
  }

  info(message, data = null) {
    console.log(this._format('INFO', sanitize(message), data));
  }

  warn(message, data = null) {
    console.warn(this._format('WARN', sanitize(message), data));
  }

  error(message, data = null) {
    console.error(this._format('ERROR', sanitize(message), data));
  }

  debug(message, data = null) {
    if (process.env.DEBUG === 'true') {
      console.debug(this._format('DEBUG', sanitize(message), data));
    }
  }

  success(message, data = null) {
    console.log(this._format('✅ SUCCESS', sanitize(message), data));
  }

  command(userId, command, args = {}) {
    console.log(this._format('COMMAND', `User ${userId} executed /${command}`, { args }));
  }
}

export function createLogger(module) {
  return new Logger(module);
}

export default { sanitize, sanitizeObject, createLogger, Logger };
