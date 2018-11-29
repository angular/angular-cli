/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as fs from 'fs';


export interface BuildEventMessage {
  id: {};
  [key: string]: {};
}

export class BepGenerator {
  private constructor() {}

  static createBuildStarted(command: string, time?: number): BuildEventMessage {
    return {
      id: { started: {} },
      started: {
        command,
        start_time_millis: time == undefined ? Date.now() : time,
      },
    };
  }

  static createBuildFinished(code: number, time?: number): BuildEventMessage {
    return {
      id: { finished: {} },
      finished: {
        finish_time_millis: time == undefined ? Date.now() : time,
        exit_code: { code },
      },
    };
  }
}

export class BepJsonWriter {
  private stream = fs.createWriteStream(this.filename);

  constructor(public readonly filename: string) {

  }

  close(): void {
    this.stream.close();
  }

  writeEvent(event: BuildEventMessage): void {
    const raw = JSON.stringify(event);

    this.stream.write(raw + '\n');
  }

  writeBuildStarted(command: string, time?: number): void {
    const event = BepGenerator.createBuildStarted(command, time);

    this.writeEvent(event);
  }

  writeBuildFinished(code: number, time?: number): void {
    const event = BepGenerator.createBuildFinished(code, time);

    this.writeEvent(event);
  }
}
