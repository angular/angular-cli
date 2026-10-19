/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { Metafile, OutputFile } from 'esbuild';
import { calculateHash } from '../../utils/hash';

export interface InitialFileRecord {
  entrypoint: boolean;
  name?: string;
  type: 'script' | 'style';
  external?: boolean;
  serverFile: boolean;
  depth: number;
}

/**
 * Analyzes a metafile to find and record all transitive initial files starting from the given
 * initial entries using breadth-first traversal so each file is recorded at its minimum depth.
 *
 * @param metafile The esbuild metafile containing output import relationships.
 * @param initialFiles The map of initial files to populate.
 * @param entriesToAnalyze Optional starting entries to traverse; defaults to all current `initialFiles`.
 *   Entries must share the same starting depth (or be ordered by non-decreasing depth) to guarantee
 *   that each transitive file is visited at its minimum depth first.
 * @param initialFilter Optional filter predicate to determine whether a discovered record should be added.
 */
export function findTransitiveInitialFiles(
  metafile: Metafile,
  initialFiles: Map<string, InitialFileRecord>,
  entriesToAnalyze: Iterable<[string, InitialFileRecord]> = initialFiles,
  initialFilter?: (initial: Readonly<InitialFileRecord>) => boolean,
): void {
  const queue = [...entriesToAnalyze];
  for (let i = 0; i < queue.length; i++) {
    const [entryPath, entryRecord] = queue[i];
    const entryOutput = metafile.outputs[entryPath];
    if (!entryOutput) {
      continue;
    }

    for (const initialImport of entryOutput.imports) {
      if (initialFiles.has(initialImport.path)) {
        continue;
      }

      if (initialImport.kind === 'import-statement' || initialImport.kind === 'import-rule') {
        const record: InitialFileRecord = {
          type: initialImport.kind === 'import-rule' ? 'style' : 'script',
          entrypoint: false,
          external: initialImport.external,
          serverFile: entryRecord.serverFile,
          depth: entryRecord.depth + 1,
        };

        if (!initialFilter || initialFilter(record)) {
          initialFiles.set(initialImport.path, record);

          if (!initialImport.external) {
            queue.push([initialImport.path, record]);
          }
        }
      }
    }
  }
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
        cachedHash ??= calculateHash(cachedText ?? this.contents);

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
        cachedHash ??= calculateHash(this.contents);

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
