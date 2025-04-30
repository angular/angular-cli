/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { JsonObject } from '../json/utils';
import { LogLevel, Logger } from './logger';

export class LevelTransformLogger extends Logger {
  constructor(
    public override readonly name: string,
    public override readonly parent: Logger | null,
    public readonly levelTransform: (level: LogLevel) => LogLevel,
  ) {
    super(name, parent);
  }

  override log(level: LogLevel, message: string, metadata: JsonObject = {}): void {
    return super.log(this.levelTransform(level), message, metadata);
  }

  override createChild(name: string): Logger {
    return new LevelTransformLogger(name, this, this.levelTransform);
  }
}

export class LevelCapLogger extends LevelTransformLogger {
  static levelMap: { [cap: string]: { [level: string]: string } } = {
    debug: { debug: 'debug', info: 'debug', warn: 'debug', error: 'debug', fatal: 'debug' },
    info: { debug: 'debug', info: 'info', warn: 'info', error: 'info', fatal: 'info' },
    warn: { debug: 'debug', info: 'info', warn: 'warn', error: 'warn', fatal: 'warn' },
    error: { debug: 'debug', info: 'info', warn: 'warn', error: 'error', fatal: 'error' },
    fatal: { debug: 'debug', info: 'info', warn: 'warn', error: 'error', fatal: 'fatal' },
  };

  constructor(
    public override readonly name: string,
    public override readonly parent: Logger | null,
    public readonly levelCap: LogLevel,
  ) {
    super(name, parent, (level: LogLevel) => {
      return (LevelCapLogger.levelMap[levelCap][level] || level) as LogLevel;
    });
  }
}
