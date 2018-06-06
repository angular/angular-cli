/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { JsonObject } from '../json/interface';
import { LogLevel, Logger } from './logger';

export class LevelTransformLogger extends Logger {
  constructor(
    public readonly name: string,
    public readonly parent: Logger | null = null,
    public readonly levelTransform: (level: LogLevel) => LogLevel,
  ) {
    super(name, parent);
  }

  log(level: LogLevel, message: string, metadata: JsonObject = {}): void {
    return super.log(this.levelTransform(level), message, metadata);
  }

  createChild(name: string): Logger {
    return new LevelTransformLogger(name, this, this.levelTransform);
  }
}

export class LevelCapLogger extends LevelTransformLogger {
  static levelMap: {[cap: string]: {[level: string]: string}} = {
    debug: { debug: 'debug', info: 'debug', warn: 'debug', error: 'debug', fatal: 'debug' },
    info: { debug: 'debug', info: 'info', warn: 'info', error: 'info', fatal: 'info' },
    warn: { debug: 'debug', info: 'info', warn: 'warn', error: 'warn', fatal: 'warn' },
    error: { debug: 'debug', info: 'info', warn: 'warn', error: 'error', fatal: 'error' },
    fatal: { debug: 'debug', info: 'info', warn: 'warn', error: 'error', fatal: 'fatal' },
  };

  constructor(
    public readonly name: string,
    public readonly parent: Logger | null = null,
    public readonly levelCap: LogLevel,
  ) {
    super(name, parent, (level: LogLevel) => {
      return (LevelCapLogger.levelMap[levelCap][level] || level) as LogLevel;
    });
  }
}
