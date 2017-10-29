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


const _env = (typeof process == 'object' && process.env) || {};
const _platform = (typeof process == 'object' && process.platform) || '';
const _versions = (typeof process == 'object' && process.versions) || { node: '' };
const _os = (typeof os == 'object' && os) || { release: () => '' };

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


const ciVars = ['TRAVIS', 'CIRCLECI', 'APPVEYOR', 'GITLAB_CI'];


function _getColorLevel(stream: Socket): number {
  if (stream && !stream.isTTY) {
    return 0;
  }

  if (_platform.startsWith('win32')) {
    // Node.js 7.5.0 is the first version of Node.js to include a patch to
    // libuv that enables 256 color output on Windows. Anything earlier and it
    // won't work. However, here we target Node.js 8 at minimum as it is an LTS
    // release, and Node.js 7 is not. Windows 10 build 10586 is the first Windows
    // release that supports 256 colors.
    const osRelease = _os.release().split('.');
    if (Number(_versions.node.split('.')[0]) >= 8
        && Number(osRelease[0]) >= 10
        && Number(osRelease[2]) >= 10586) {
      return 2;
    }

    return 1;
  }

  if ('CI' in _env) {
    if (ciVars.some(sign => sign in _env) || _env.CI_NAME === 'codeship') {
      return 1;
    }

    return 0;
  }

  if ('TEAMCITY_VERSION' in _env) {
    return /^(9\.(0*[1-9]\d*)\.|\d{2,}\.)/.test(_env.TEAMCITY_VERSION) ? 1 : 0;
  }

  if ('TERM_PROGRAM' in _env) {
    const version = parseInt((_env.TERM_PROGRAM_VERSION || '').split('.')[0], 10);

    switch (_env.TERM_PROGRAM) {
      case 'iTerm.app':
        return version >= 3 ? 3 : 2;
      case 'Hyper':
        return 3;
      case 'Apple_Terminal':
        return 2;

      // No default
    }
  }

  if (/-256(color)?$/i.test(_env.TERM)) {
    return 2;
  }

  if (/^screen|^xterm|^vt100|^rxvt|color|ansi|cygwin|linux/i.test(_env.TERM)) {
    return 1;
  }

  if ('COLORTERM' in _env) {
    return 1;
  }

  if (_env.TERM === 'dumb') {
    return 0;
  }

  return 0;
}


function _getRows() {
  return process.stdout.rows || null;
}
function _getColumns() {
  return process.stdout.columns || null;
}


function _createCapabilities(stream: Socket, isTerminalStream: boolean): StreamCapabilities {
  const level = _getColorLevel(stream);

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


export const stdin = getCapabilities(process.stdin as Socket);
export const stdout = getCapabilities(process.stdout);
export const stderr = getCapabilities(process.stderr);
