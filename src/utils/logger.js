const fs = require('fs');
const path = require('path');

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

const currentLevel = levels[process.env.LOG_LEVEL] ?? levels.info;

function formatMessage(level, message, error) {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;

  if (error && error instanceof Error) {
    return `${prefix} ${message}\n${error.stack || error.message}`;
  }
  return `${prefix} ${message}`;
}

function log(level, message, error) {
  if (levels[level] > currentLevel) return;

  const formatted = formatMessage(level, message, error);

  switch (level) {
    case 'error':
      console.error(formatted);
      break;
    case 'warn':
      console.warn(formatted);
      break;
    case 'info':
      console.info(formatted);
      break;
    case 'debug':
      console.debug(formatted);
      break;
    default:
      console.log(formatted);
  }
}

const logger = {
  error: (message, error) => log('error', message, error),
  warn: (message, error) => log('warn', message, error),
  info: (message, error) => log('info', message, error),
  debug: (message, error) => log('debug', message, error)
};

module.exports = logger;
