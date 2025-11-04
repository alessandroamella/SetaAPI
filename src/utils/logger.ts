import { access, appendFile, constants, writeFile } from 'node:fs/promises';
import path from 'node:path';
import util from 'node:util';
import chalk from 'chalk';

export interface LoggerOptions {
  logFile?: string;
  enableConsole?: boolean;
  enableFile?: boolean;
  dateFormat?: 'iso' | 'locale';
}

type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

export class Logger {
  private logFile: string;
  private enableConsole: boolean;
  private enableFile: boolean;
  private dateFormat: 'iso' | 'locale';

  constructor(options: LoggerOptions = {}) {
    this.logFile = options.logFile || path.join(process.cwd(), 'app.log');
    this.enableConsole = options.enableConsole !== false;
    this.enableFile = options.enableFile !== false;
    this.dateFormat = options.dateFormat || 'iso';

    this.init().catch((err) => {
      console.error(chalk.red('Logger initialization failed:'), err);
    });
  }

  private async init() {
    this.info('Logger initialized');

    if (this.enableFile) {
      try {
        await access(this.logFile, constants.F_OK);
        this.info(`Logging to file: ${this.logFile}`);
      } catch {
        try {
          await writeFile(this.logFile, '');
          this.info(`Log file created at: ${this.logFile}`);
        } catch (err) {
          console.error(chalk.red('Failed to create log file:'), err);
        }
      }
    }
  }

  private formatTimestamp(): string {
    const now = new Date();
    return this.dateFormat === 'locale'
      ? now.toLocaleString()
      : now.toISOString();
  }

  private formatArgs(...args: unknown[]): string {
    return args
      .map((arg) => {
        if (typeof arg === 'object') {
          return util.inspect(arg, {
            depth: null,
            colors: this.enableConsole,
            compact: false,
          });
        }
        return String(arg);
      })
      .join(' ');
  }

  private getLevelColor(level: LogLevel): (text: string) => string {
    switch (level) {
      case 'INFO':
        return chalk.cyan;
      case 'WARN':
        return chalk.yellow;
      case 'ERROR':
        return chalk.red;
      case 'DEBUG':
        return chalk.magenta;
      default:
        return chalk.white;
    }
  }

  private async logWithLevel(
    level: LogLevel,
    ...args: unknown[]
  ): Promise<void> {
    const timestamp = this.formatTimestamp();
    const message = this.formatArgs(...args);
    const levelColor = this.getLevelColor(level);

    const consoleEntry = `${chalk.gray(`[${timestamp}]`)} ${levelColor(`[${level}]`)} ${message}`;
    const fileEntry = `[${timestamp}] [${level}] ${message}\n`;

    if (this.enableConsole) {
      // if error print on stderr
      if (level === 'ERROR') {
        console.error(consoleEntry);
      } else {
        console.log(consoleEntry);
      }
    }

    if (this.enableFile) {
      try {
        await appendFile(this.logFile, fileEntry);
      } catch (err) {
        console.error(chalk.red('Failed to write to log file:'), err);
      }
    }
  }

  log(...args: unknown[]): void {
    void this.logWithLevel('INFO', ...args);
  }

  info(...args: unknown[]): void {
    void this.logWithLevel('INFO', ...args);
  }

  warn(...args: unknown[]): void {
    void this.logWithLevel('WARN', ...args);
  }

  error(...args: unknown[]): void {
    void this.logWithLevel('ERROR', ...args);
  }

  debug(...args: unknown[]): void {
    void this.logWithLevel('DEBUG', ...args);
  }
}

export const logger = new Logger();
