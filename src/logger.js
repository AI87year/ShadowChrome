import { browser } from './browser-api.js';

export const LogLevel = {
  DEBUG: 10,
  INFO: 20,
  WARN: 30,
  ERROR: 40
};

class Logger {
  constructor() {
    this.level = LogLevel.INFO;
    this.logs = [];
  }

  setLevel(level) {
    this.level = level;
  }

  log(level, message, context = {}) {
    if (level < this.level) {
      return;
    }
    const entry = { level, message, context, time: new Date().toISOString() };
    this.logs.push(entry);
    const method = level >= LogLevel.ERROR
      ? 'error'
      : level >= LogLevel.WARN
        ? 'warn'
        : level >= LogLevel.INFO
          ? 'info'
          : 'log';
    console[method](message, context);
  }

  debug(msg, ctx) {
    this.log(LogLevel.DEBUG, msg, ctx);
  }

  info(msg, ctx) {
    this.log(LogLevel.INFO, msg, ctx);
  }

  warn(msg, ctx) {
    this.log(LogLevel.WARN, msg, ctx);
  }

  error(msg, ctx) {
    this.log(LogLevel.ERROR, msg, ctx);
  }

  getLogs(level = null) {
    return level ? this.logs.filter(l => l.level >= level) : [...this.logs];
  }

  clear() {
    this.logs = [];
  }

  async save() {
    await browser.storage.local.set({ logs: this.logs });
  }

  async load() {
    const { logs } = await browser.storage.local.get('logs');
    this.logs = Array.isArray(logs) ? logs : [];
  }
}

const logger = new Logger();
export default logger;
// Updated: 2025-11-13
