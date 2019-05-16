/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import ReadableStream = NodeJS.ReadableStream;
import WriteStream = NodeJS.WriteStream;
import Socket = NodeJS.Socket;
const supportsColor = require('../../third_party/github.com/chalk/supports-color');

/**
 * Node specific stuff.
 */
declare const process: {
  env: { [name: string]: string };
  platform: string;
  versions: {
    node: string;
  };

  stdin: ReadableStream;
  stdout: WriteStream;
  stderr: WriteStream;
};
declare const os: {
  release: () => string;
};


const streamMap = new WeakMap<{}, StreamCapabilities>();


export interface StreamCapabilities {
  readable: boolean;
  writable: boolean;

  /**
   * Supports text. This should be true for any streams.
   */
  text: boolean;

  /**
   * Supports colors (16 colors).
   */
  colors: boolean;

  /**
   * Supports 256 colors.
   */
  color256: boolean;

  /**
   * Supports 16 millions (3x8-bit channels) colors.
   */
  color16m: boolean;

  /**
   * Height of the terminal. If the stream is not tied to a terminal, will be null.
   */
  rows: number | null;

  /**
   * Width of the terminal. If the stream is not tied to a terminal, will be null.
   */
  columns: number | null;
}

function _getRows() {
  return typeof process == 'object' && process.stdout.rows || null;
}
function _getColumns() {
  return typeof process == 'object' && process.stdout.columns || null;
}


function _createCapabilities(
  stream: Socket,
  isTerminalStream: boolean,
  level: 0|1|2|3 = supportsColor.stdout.level,
): StreamCapabilities {
  return {
    readable: stream.readable,
    writable: stream.writable,
    text: true,

    colors: level > 0,
    color256: level > 1,
    color16m: level > 2,

    rows: isTerminalStream ? _getRows() : null,
    columns: isTerminalStream ? _getColumns() : null,
  };
}


export function getCapabilities(
  stream: Socket,
  isTerminalStream = !!stream.isTTY,
): StreamCapabilities {
  let maybeCaps = streamMap.get(stream);
  if (!maybeCaps) {
    maybeCaps = _createCapabilities(stream, isTerminalStream);
    streamMap.set(stream, maybeCaps);
  }

  return maybeCaps;
}
