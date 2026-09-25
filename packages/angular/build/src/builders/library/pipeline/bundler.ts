/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import assert from 'node:assert';
import path from 'node:path';
import {
  type OutputChunk,
  type OutputOptions,
  type Plugin,
  type RolldownOutput,
  type RolldownPluginOption,
  rolldown,
} from 'rolldown';
import { dts } from 'rolldown-plugin-dts';
import { toPosixPath } from '../../../utils/path';
import type { NormalizedEntryPoint, NormalizedLibraryOptions } from '../options';
import {
  FESM_OUTPUT_DIR,
  type MemoryOutputFile,
  TYPES_OUTPUT_DIR,
  createMemoryOutputFile,
} from './utils';

/**
 * Cached module ID sets for a bundled entry point.
 */
export interface BundleResult {
  /** Exact set of virtual ESM module IDs bundled into this entry point. */
  esmModuleIds: ReadonlySet<string>;

  /** Exact set of virtual DTS module IDs bundled into this entry point. */
  dtsModuleIds: ReadonlySet<string>;
}

export interface BundleEntryPointsOutput {
  filesToEmit: MemoryOutputFile[];
  bundleResults: Map<string, BundleResult>;
}

export interface BundleEntryPointInput {
  entryPoint: NormalizedEntryPoint;
  hasEsmChanges: boolean;
  hasDtsChanges: boolean;
  previousBundleResult?: BundleResult;
}

const ESM_EXTENSIONS = ['.js', '.mjs', '/index.js', '/index.mjs'] as const;
const DTS_EXTENSIONS = ['.d.ts', '.d.mts', '/index.d.ts', '/index.d.mts'] as const;

export type EntryPointLookup = (filePath: string) => NormalizedEntryPoint | undefined;

interface MultiBundleOutput {
  filesToEmit: MemoryOutputFile[];
  moduleIdsByBundle: Map<string, Set<string>>;
}

/**
 * Bundles the compiled in-memory JavaScript and declaration files for all dirty entry points
 * using at most 2 Rolldown instances total (1 for all .mjs bundles, 1 for all .d.ts bundles).
 */
export async function bundleEntryPoints(
  items: readonly BundleEntryPointInput[],
  esmFiles: ReadonlyMap<string, string>,
  dtsFiles: ReadonlyMap<string, string>,
  options: NormalizedLibraryOptions,
  findEntryPoint: EntryPointLookup = createEntryDirectoryLookup(options.entryPoints.values()),
): Promise<BundleEntryPointsOutput> {
  const bundleResults = new Map<string, BundleResult>();
  if (items.length === 0) {
    return { filesToEmit: [], bundleResults };
  }

  const esmEntryPoints: NormalizedEntryPoint[] = [];
  const dtsEntryPoints: NormalizedEntryPoint[] = [];

  for (const item of items) {
    if (item.hasEsmChanges || !item.previousBundleResult) {
      esmEntryPoints.push(item.entryPoint);
    }
    if (item.hasDtsChanges || !item.previousBundleResult) {
      dtsEntryPoints.push(item.entryPoint);
    }
  }

  const [esmOutput, dtsOutput] = await Promise.all([
    bundleAllEsm(esmEntryPoints, esmFiles, options, findEntryPoint),
    bundleAllDts(dtsEntryPoints, dtsFiles, options, findEntryPoint),
  ]);

  for (const { entryPoint, previousBundleResult } of items) {
    const { bundleName, name } = entryPoint;
    bundleResults.set(name, {
      esmModuleIds:
        esmOutput.moduleIdsByBundle.get(bundleName) ??
        previousBundleResult?.esmModuleIds ??
        new Set(),
      dtsModuleIds:
        dtsOutput.moduleIdsByBundle.get(bundleName) ??
        previousBundleResult?.dtsModuleIds ??
        new Set(),
    });
  }

  return {
    filesToEmit: [...esmOutput.filesToEmit, ...dtsOutput.filesToEmit],
    bundleResults,
  };
}

export function createEntryDirectoryLookup(
  entryPoints: Iterable<NormalizedEntryPoint>,
): EntryPointLookup {
  const dirs = Array.from(entryPoints, (ep) => {
    const dir = toPosixPath(path.dirname(ep.entryFilePath));

    return {
      ep,
      dir,
      dirSlash: dir.endsWith('/') ? dir : `${dir}/`,
    };
  }).sort((a, b) => b.dir.length - a.dir.length);

  const cache = new Map<string, NormalizedEntryPoint | undefined>();

  return (filePath: string): NormalizedEntryPoint | undefined => {
    const posix = toPosixPath(filePath);
    const cached = cache.get(posix);
    if (cached !== undefined || cache.has(posix)) {
      return cached;
    }
    const found = dirs.find(({ dir, dirSlash }) => posix === dir || posix.startsWith(dirSlash))?.ep;
    cache.set(posix, found);

    return found;
  };
}

function resolveEntryInputMap(
  entryPoints: readonly NormalizedEntryPoint[],
  dtsMode: boolean,
): Record<string, string> {
  const input: Record<string, string> = {};
  for (const { bundleName, entryFilePath } of entryPoints) {
    const posixPath = toPosixPath(entryFilePath);
    input[bundleName] = dtsMode
      ? posixPath.replace(/\.([cm]?ts)$/, '.d.$1')
      : posixPath.replace(/\.([cm]?)ts$/, '.$1js');
  }

  return input;
}

function createMemoryFileLoaderPlugin(
  files: ReadonlyMap<string, string>,
  extensions: readonly string[],
  includeMap: boolean,
  findEntryPoint: EntryPointLookup,
): Plugin {
  return {
    name: 'memory-file-loader',
    resolveId: {
      order: 'pre',
      handler(id, importer) {
        if (id[0] === '\0') {
          return undefined;
        }

        if (!importer) {
          return files.has(id) ? { id, external: false } : undefined;
        }

        if (id[0] !== '.' && !path.isAbsolute(id)) {
          return { id, external: true };
        }

        const posixId = toPosixPath(id);
        const importerPosix = toPosixPath(importer);
        const resolved =
          posixId[0] === '.'
            ? path.posix.join(path.posix.dirname(importerPosix), posixId)
            : posixId;

        let resolvedCandidate: string | undefined;
        if (files.has(resolved)) {
          resolvedCandidate = resolved;
        } else {
          const base = resolved.replace(/\.[cm]?js$/, '');
          for (const ext of extensions) {
            const candidate = base + ext;
            if (files.has(candidate)) {
              resolvedCandidate = candidate;
              break;
            }
          }
        }

        const importerEp = findEntryPoint(importerPosix);
        const targetEp = findEntryPoint(resolvedCandidate ?? resolved);
        if (importerEp && targetEp && importerEp.name !== targetEp.name) {
          throw new Error(
            `Entry point '${importerEp.name}' cannot import '${id}' from sibling entry point directly. ` +
              `Import using the entry point package name instead.`,
          );
        }

        if (resolvedCandidate) {
          return { id: resolvedCandidate, external: false };
        }

        return { id, external: true };
      },
    },
    load(id) {
      const code = files.get(id);
      if (code === undefined) {
        return null;
      }

      return {
        code,
        map: includeMap ? files.get(`${id}.map`) : undefined,
      };
    },
  };
}

function resolveChunkBundleName(
  findEntryPoint: EntryPointLookup,
  moduleIds: readonly string[],
): string | undefined {
  for (const modId of moduleIds) {
    const ep = findEntryPoint(modId);
    if (ep) {
      return ep.bundleName;
    }
  }

  return undefined;
}

function processRolldownOutput(output: RolldownOutput['output'], dir: string): MultiBundleOutput {
  const filesToEmit: MemoryOutputFile[] = [];
  const moduleIdsByBundle = new Map<string, Set<string>>();
  const chunksByFileName = new Map<string, OutputChunk>();
  const entryChunks: OutputChunk[] = [];

  for (const item of output) {
    filesToEmit.push(
      createMemoryOutputFile(
        path.posix.join(dir, item.fileName),
        item.type === 'chunk' ? item.code : item.source,
      ),
    );

    if (item.type === 'chunk') {
      chunksByFileName.set(item.fileName, item);
      if (item.isEntry) {
        entryChunks.push(item);
      }
    }
  }

  for (const entryChunk of entryChunks) {
    const modSet = new Set<string>();
    moduleIdsByBundle.set(entryChunk.name, modSet);

    const visited = new Set<OutputChunk>();
    const queue: OutputChunk[] = [entryChunk];

    while (queue.length) {
      const chunk = queue.pop();
      if (!chunk) {
        break;
      }

      if (visited.has(chunk)) {
        continue;
      }

      visited.add(chunk);

      for (const modId of chunk.moduleIds) {
        if (modId[0] !== '\0') {
          modSet.add(toPosixPath(modId));
        }
      }

      for (const depFile of [...chunk.imports, ...chunk.dynamicImports]) {
        const depChunk = chunksByFileName.get(depFile);
        if (depChunk && !visited.has(depChunk)) {
          queue.push(depChunk);
        }
      }
    }
  }

  return { filesToEmit, moduleIdsByBundle };
}

async function executeMultiBundle(
  input: Record<string, string>,
  plugins: RolldownPluginOption[],
  preserveSymlinks: boolean,
  extension: 'mjs' | 'd.ts',
  sourcemap: boolean,
  findEntryPoint: EntryPointLookup,
): Promise<MultiBundleOutput> {
  const isDts = extension === 'd.ts';
  const dir = isDts ? TYPES_OUTPUT_DIR : FESM_OUTPUT_DIR;
  const comments: OutputOptions['comments'] = isDts ? false : { legal: true, annotation: true };
  const bundle = await rolldown({
    context: 'this',
    input,
    plugins,
    treeshake: false,
    resolve: { symlinks: preserveSymlinks },
    checks: { circularDependency: false },
    experimental: {
      attachDebugInfo: 'none',
    },
  });

  try {
    const { output } = await bundle.generate({
      format: 'es',
      dir,
      entryFileNames: `[name].${extension}`,
      chunkFileNames: (chunk) => {
        const bundleName = resolveChunkBundleName(findEntryPoint, chunk.moduleIds);
        const prefix = bundleName ? `${bundleName}-` : '';

        return `${prefix}[name]-[hash].${extension}`;
      },
      sourcemap,
      hoistTransitiveImports: false,
      comments,
    });

    return processRolldownOutput(output, dir);
  } finally {
    await bundle.close();
  }
}

async function bundleAllEsm(
  entryPoints: readonly NormalizedEntryPoint[],
  esmFiles: ReadonlyMap<string, string>,
  options: NormalizedLibraryOptions,
  findEntryPoint: EntryPointLookup,
): Promise<MultiBundleOutput> {
  if (entryPoints.length === 0) {
    return { filesToEmit: [], moduleIdsByBundle: new Map() };
  }

  return executeMultiBundle(
    resolveEntryInputMap(entryPoints, false),
    [createMemoryFileLoaderPlugin(esmFiles, ESM_EXTENSIONS, true, findEntryPoint)],
    options.preserveSymlinks,
    'mjs',
    true,
    findEntryPoint,
  );
}

async function bundleAllDts(
  entryPoints: readonly NormalizedEntryPoint[],
  dtsFiles: ReadonlyMap<string, string>,
  options: NormalizedLibraryOptions,
  findEntryPoint: EntryPointLookup,
): Promise<MultiBundleOutput> {
  if (entryPoints.length === 0) {
    return { filesToEmit: [], moduleIdsByBundle: new Map() };
  }

  const dtsSourcemap = options.declarationMap;
  // Filter out `rolldown-plugin-dts:resolver` because all `.d.ts` files are already emitted
  // in-memory by the Angular/TypeScript compilation and resolved via `createMemoryFileLoaderPlugin`.
  // The default `rolldown-plugin-dts:resolver` plugin performs filesystem resolution (`oxc-resolver`)
  // and calls `this.load()` on on-disk `.ts` source files, which is unnecessary and causes a
  // significant performance regression across multi-entry builds.
  const rawDtsPlugins = dts({
    dtsInput: true,
    tsconfig: false,
    sourcemap: dtsSourcemap,
  });
  const dtsPlugins = rawDtsPlugins.filter(
    (plugin) => plugin.name !== 'rolldown-plugin-dts:resolver',
  );
  assert(
    dtsPlugins.length < rawDtsPlugins.length,
    'Expected "rolldown-plugin-dts:resolver" plugin to be present in rolldown-plugin-dts.',
  );

  return executeMultiBundle(
    resolveEntryInputMap(entryPoints, true),
    [
      createMemoryFileLoaderPlugin(dtsFiles, DTS_EXTENSIONS, dtsSourcemap, findEntryPoint),
      ...dtsPlugins,
    ],
    options.preserveSymlinks,
    'd.ts',
    dtsSourcemap,
    findEntryPoint,
  );
}
