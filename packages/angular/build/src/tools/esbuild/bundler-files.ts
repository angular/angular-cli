/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { OutputFile } from 'esbuild';
import { createHash } from 'node:crypto';

export interface InitialFileRecord {
  entrypoint: boolean;
  name?: string;
  type: 'script' | 'style';
  external?: boolean;
  serverFile: boolean;
  depth: number;
}

export enum BuildOutputFileType {
  Browser,
  Media,
  ServerApplication,
  ServerRoot,
  Root,
}

export interface BuildOutputFile extends OutputFile {
  type: BuildOutputFileType;
  readonly size: number;
  clone: () => BuildOutputFile;
}

export function createOutputFile(
  path: string,
  data: string | Uint8Array,
  type: BuildOutputFileType,
): BuildOutputFile {
  if (typeof data === 'string') {
    let cachedContents: Uint8Array | null = null;
    let cachedText: string | null = data;
    let cachedHash: string | null = null;

    return {
      path,
      type,
      get contents(): Uint8Array {
        cachedContents ??= new TextEncoder().encode(data);

        return cachedContents;
      },
      set contents(value: Uint8Array) {
        cachedContents = value;
        cachedText = null;
      },
      get text(): string {
        cachedText ??= new TextDecoder('utf-8').decode(this.contents);

        return cachedText;
      },
      get size(): number {
        return this.contents.byteLength;
      },
      get hash(): string {
        cachedHash ??= createHash('sha256')
          .update(cachedText ?? this.contents)
          .digest('hex');

        return cachedHash;
      },
      clone(): BuildOutputFile {
        return createOutputFile(this.path, cachedText ?? this.contents, this.type);
      },
    };
  } else {
    let cachedContents = data;
    let cachedText: string | null = null;
    let cachedHash: string | null = null;

    return {
      get contents(): Uint8Array {
        return cachedContents;
      },
      set contents(value: Uint8Array) {
        cachedContents = value;
        cachedText = null;
      },
      path,
      type,
      get size(): number {
        return this.contents.byteLength;
      },
      get text(): string {
        cachedText ??= new TextDecoder('utf-8').decode(this.contents);

        return cachedText;
      },
      get hash(): string {
        cachedHash ??= createHash('sha256').update(this.contents).digest('hex');

        return cachedHash;
      },
      clone(): BuildOutputFile {
        return createOutputFile(this.path, this.contents, this.type);
      },
    };
  }
}

export function convertOutputFile(file: OutputFile, type: BuildOutputFileType): BuildOutputFile {
  let { contents: cachedContents } = file;
  let cachedText: string | null = null;

  return {
    get contents(): Uint8Array {
      return cachedContents;
    },
    set contents(value: Uint8Array) {
      cachedContents = value;
      cachedText = null;
    },
    hash: file.hash,
    path: file.path,
    type,
    get size(): number {
      return this.contents.byteLength;
    },
    get text(): string {
      cachedText ??= new TextDecoder('utf-8').decode(this.contents);

      return cachedText;
    },
    clone(): BuildOutputFile {
      return convertOutputFile(this, this.type);
    },
  };
}
