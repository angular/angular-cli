/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import path from 'node:path';
import {
  type OutputOptions,
  type Plugin,
  type RolldownOptions,
  type RolldownPluginOption,
  rolldown,
} from 'rolldown';
import { dts } from 'rolldown-plugin-dts';
import { calculateHash } from '../../../utils/hash';
import { toPosixPath } from '../../../utils/path';
import type { NormalizedEntryPoint, NormalizedLibraryOptions } from '../options';
import type { CompilationOutput } from './compilation';
import {
  FESM_OUTPUT_DIR,
  type MemoryOutputFile,
  TYPES_OUTPUT_DIR,
  createMemoryOutputFile,
  getFileText,
  isDeclarationFile,
} from './utils';

/**
 * Result of bundling an entry point.
 */
export interface BundleResult {
  /** Hash of the declaration file content used for downstream invalidation. */
  dtsHash: string;

  /** All current output files for this entry point (chunks, sourcemaps, etc.). */
  files: MemoryOutputFile[];

  /** Newly generated files that need to be written to disk in this build iteration. */
  filesToEmit: MemoryOutputFile[];
}

const ESM_EXTENSIONS = ['.js', '.mjs', '/index.js'] as const;
const DTS_EXTENSIONS = ['.d.ts', '.d.mts', '/index.d.ts'] as const;

/**
 * Bundles the compiled in-memory JavaScript and declaration files for an entry point using Rolldown.
 *
 * @param entryPoint The normalized entry point being bundled.
 * @param compilation The in-memory compilation output containing emitted JavaScript and declaration files.
 * @param options The normalized library builder options.
 * @param previousBundleResult Optional bundle result from a previous compilation run.
 * @returns The bundle result containing file paths and DTS content hash.
 */
export async function bundleEntryPoint(
  entryPoint: NormalizedEntryPoint,
  compilation: CompilationOutput,
  options: NormalizedLibraryOptions,
  previousBundleResult?: BundleResult,
): Promise<BundleResult> {
  const { entryFilePath, bundleName } = entryPoint;
  const { preserveSymlinks } = options;
  const { esmFiles, dtsFiles, dtsSourcemap, hasDtsChanges, hasEsmChanges } = compilation;

  const entryBase = entryFilePath.replace(/\.m?ts$/, '');
  const jsEntry = entryFilePath.endsWith('.mts') ? `${entryBase}.mjs` : `${entryBase}.js`;
  const dtsEntry = entryFilePath.endsWith('.mts') ? `${entryBase}.d.mts` : `${entryBase}.d.ts`;

  const isExternal = createExternalDependencyPredicate(entryPoint, options);

  const [esmResult, dtsResult] = await Promise.all([
    bundleEsm(
      jsEntry,
      bundleName,
      esmFiles,
      isExternal,
      preserveSymlinks,
      hasEsmChanges,
      previousBundleResult,
    ),
    bundleDts(
      dtsEntry,
      bundleName,
      dtsFiles,
      dtsSourcemap,
      isExternal,
      preserveSymlinks,
      hasDtsChanges,
      previousBundleResult,
    ),
  ]);

  return {
    dtsHash: dtsResult.dtsHash,
    files: [...esmResult.files, ...dtsResult.files],
    filesToEmit: [...esmResult.filesToEmit, ...dtsResult.filesToEmit],
  };
}

/**
 * Creates an external dependency predicate that prevents relative imports across entry point boundaries.
 *
 * @param entryPoint The normalized entry point being bundled.
 * @param options The normalized library options.
 * @returns A predicate function for Rolldown.
 */
function createExternalDependencyPredicate(
  entryPoint: NormalizedEntryPoint,
  options: NormalizedLibraryOptions,
): (moduleId: string, importer?: string) => boolean {
  const { name: epName } = entryPoint;
  const { entryPoints } = options;

  const entryPointBases = new Map<string, NormalizedEntryPoint>();
  const entryPointsByDirLength = Array.from(entryPoints.values())
    .map((ep) => {
      const epDir = toPosixPath(path.dirname(ep.entryFilePath));
      const epEntryBase = toPosixPath(ep.entryFilePath).replace(/\.(?:d\.)?[cm]?[jt]s$/, '');
      entryPointBases.set(epEntryBase, ep);

      return {
        ep,
        epDir,
        epDirSlash: epDir.endsWith('/') ? epDir : `${epDir}/`,
        epDirLength: epDir.length,
      };
    })
    .sort((a, b) => {
      if (b.epDirLength !== a.epDirLength) {
        return b.epDirLength - a.epDirLength;
      }

      if (a.ep.name === epName) {
        return -1;
      }

      if (b.ep.name === epName) {
        return 1;
      }

      return 0;
    });

  const predicateCache = new Map<string, boolean>();

  return (moduleId: string, importer?: string): boolean => {
    if (moduleId[0] === '.' || path.isAbsolute(moduleId)) {
      if (importer) {
        const cacheKey = `${importer}\0${moduleId}`;
        const cached = predicateCache.get(cacheKey);
        if (cached !== undefined) {
          return cached;
        }

        const resolved = toPosixPath(path.resolve(path.dirname(importer), moduleId));
        const resolvedBase = resolved.replace(/\.(?:d\.)?[cm]?[jt]s$/, '');

        let owner = entryPointBases.get(resolvedBase);
        if (!owner) {
          for (const { ep, epDir, epDirSlash } of entryPointsByDirLength) {
            if (resolved === epDir || resolved.startsWith(epDirSlash)) {
              owner = ep;
              break;
            }
          }
        }

        if (owner && owner.name !== epName) {
          throw new Error(
            `Entry point '${epName}' cannot import '${moduleId}' from sibling entry point directly. ` +
              `Import using the entry point package name instead.`,
          );
        }

        predicateCache.set(cacheKey, false);
      }

      return false;
    }

    return true;
  };
}

/**
 * Creates the Rolldown options shared across ESM and DTS bundling.
 *
 * @param input Entry file path in memory.
 * @param plugins Array of Rolldown plugins.
 * @param isExternal Predicate determining if a module specifier is external.
 * @param preserveSymlinks Whether to preserve symlinks when resolving dependencies.
 * @returns Rolldown options configuration.
 */
function createRolldownOptions(
  input: string,
  plugins: RolldownPluginOption[],
  isExternal: (moduleId: string, parentId?: string) => boolean,
  preserveSymlinks: boolean,
): RolldownOptions {
  return {
    context: 'this',
    input,
    external: isExternal,
    plugins,
    treeshake: false, // APF preserves top-level exports without treeshaking
    resolve: { symlinks: preserveSymlinks },
    checks: { circularDependency: false },
    experimental: {
      attachDebugInfo: 'none',
    },
  };
}

interface BundleOutputOptions {
  dir: string;
  bundleName: string;
  extension: 'mjs' | 'd.ts';
  sourcemap: boolean;
  comments: OutputOptions['comments'];
}

/**
 * Executes a Rolldown build and generates the output bundle in memory.
 *
 * @param inputOptions Rolldown input options.
 * @param outputOptions Output configuration for generating the bundle.
 * @returns An object containing the primary output file path, emitted code, and all generated files.
 */
async function executeBundle(
  inputOptions: RolldownOptions,
  outputOptions: BundleOutputOptions,
): Promise<MemoryOutputFile[]> {
  const bundle = await rolldown(inputOptions);

  try {
    const { dir, bundleName, extension, sourcemap, comments } = outputOptions;
    const { output } = await bundle.generate({
      format: 'es',
      dir,
      entryFileNames: `${bundleName}.${extension}`,
      chunkFileNames: `${bundleName}-[name]-[hash].${extension}`,
      sourcemap,
      hoistTransitiveImports: false,
      comments,
    });

    return output.map((item) =>
      createMemoryOutputFile(
        path.join(dir, item.fileName),
        'code' in item ? item.code : item.source,
      ),
    );
  } finally {
    await bundle.close();
  }
}

/**
 * Bundles the compiled in-memory JavaScript into a flattened FESM module.
 *
 * @param jsEntry Absolute path to the JavaScript entry file in memory.
 * @param bundleName Base name of the output bundle.
 * @param esmFiles Map of in-memory JavaScript files and sourcemaps.
 * @param isExternal Predicate determining if a module specifier is external.
 * @param preserveSymlinks Whether to preserve symlinks when resolving dependencies.
 * @param hasChanges Whether the compiled JavaScript files changed in this compilation.
 * @param previousBundleResult Optional bundle result from a previous compilation run.
 * @returns All generated or cached FESM files, and files that need to be emitted to disk.
 */
async function bundleEsm(
  jsEntry: string,
  bundleName: string,
  esmFiles: Map<string, string>,
  isExternal: (moduleId: string, parentId?: string) => boolean,
  preserveSymlinks: boolean,
  hasChanges: boolean,
  previousBundleResult?: BundleResult,
): Promise<{ files: MemoryOutputFile[]; filesToEmit: MemoryOutputFile[] }> {
  if (!hasChanges && previousBundleResult) {
    // If compiled JavaScript hasn't changed, skip Rolldown bundling and disk writes.
    // Preserving previous ESM files maintains a complete file list in BundleResult.files.
    return {
      files: previousBundleResult.files.filter((f) => f.path.startsWith(FESM_OUTPUT_DIR)),
      filesToEmit: [],
    };
  }

  const files = await executeBundle(
    createRolldownOptions(
      jsEntry,
      [createMemoryFileLoaderPlugin(esmFiles, false, true)],
      isExternal,
      preserveSymlinks,
    ),
    {
      dir: FESM_OUTPUT_DIR,
      bundleName,
      extension: 'mjs',
      sourcemap: true,
      comments: {
        legal: true,
        annotation: true,
      },
    },
  );

  return { files, filesToEmit: files };
}

/**
 * Bundles compiled in-memory declaration files (.d.ts) into a single declaration file.
 *
 * @param dtsEntry Absolute path to the declaration entry file in memory.
 * @param bundleName Base name of the output bundle.
 * @param dtsFiles Map of in-memory declaration files and sourcemaps.
 * @param dtsSourcemap Whether declaration sourcemaps are enabled.
 * @param isExternal Predicate determining if a module specifier is external.
 * @param preserveSymlinks Whether to preserve symlinks when resolving dependencies.
 * @param hasChanges Whether the compiled declaration files changed in this compilation.
 * @param previousBundleResult Optional bundle result from a previous compilation run.
 * @returns An object containing the content hash, all generated or cached files, and files to emit.
 */
async function bundleDts(
  dtsEntry: string,
  bundleName: string,
  dtsFiles: Map<string, string>,
  dtsSourcemap: boolean,
  isExternal: (moduleId: string, parentId?: string) => boolean,
  preserveSymlinks: boolean,
  hasChanges: boolean,
  previousBundleResult?: BundleResult,
): Promise<{ dtsHash: string; files: MemoryOutputFile[]; filesToEmit: MemoryOutputFile[] }> {
  if (!hasChanges && previousBundleResult) {
    // If declaration files (.d.ts) haven't changed, skip Rolldown DTS bundling and disk writes.
    // Retaining the previous `dtsHash` signals to the build pipeline that downstream dependents
    // do not need to be marked dirty or recompiled.
    // Crucially, `previousDtsFiles` are preserved in `files` so downstream entry points can continue
    // to resolve this entry point's type declarations in memory via `collectUpstreamDts`.
    return {
      dtsHash: previousBundleResult.dtsHash,
      files: previousBundleResult.files.filter((f) => f.path.startsWith(TYPES_OUTPUT_DIR)),
      filesToEmit: [],
    };
  }

  const files = await executeBundle(
    createRolldownOptions(
      dtsEntry,
      [
        createMemoryFileLoaderPlugin(dtsFiles, true, dtsSourcemap),
        dts({
          dtsInput: true,
          tsconfig: false,
          generator: 'oxc',
          sourcemap: dtsSourcemap,
        }),
      ],
      isExternal,
      preserveSymlinks,
    ),
    {
      dir: TYPES_OUTPUT_DIR,
      bundleName,
      extension: 'd.ts',
      sourcemap: dtsSourcemap,
      comments: {
        legal: true,
        jsdoc: true,
      },
    },
  );

  // Compute hash from all declaration chunks (excluding sourcemaps) sorted by path for determinism
  const dtsFilesOnly = files
    .filter((f) => isDeclarationFile(f.path))
    .sort((a, b) => a.path.localeCompare(b.path));
  const dtsHash =
    dtsFilesOnly.length > 0
      ? calculateHash(dtsFilesOnly.map(({ contents }) => getFileText(contents)).join('\0'))
      : '';

  return {
    dtsHash,
    files,
    filesToEmit: files,
  };
}

/**
 * Resolves a file specifier against in-memory virtual files.
 *
 * @param id The import specifier or file path.
 * @param importer The path of the importing file, if any.
 * @param files Map of virtual files.
 * @param extensions Array of candidate extensions to search.
 * @returns The resolved virtual file path, or undefined if not found.
 */
function resolveFile(
  id: string,
  importer: string | undefined,
  files: Map<string, string>,
  extensions: readonly string[],
): string | undefined {
  if (importer && id[0] !== '.' && id[0] !== '/' && !path.isAbsolute(id)) {
    return undefined;
  }

  const resolved = toPosixPath(
    importer ? path.resolve(path.dirname(importer), id) : path.resolve(id),
  );
  if (files.has(resolved)) {
    return resolved;
  }

  const base = resolved.replace(/\.m?js$/, '');
  for (const extension of extensions) {
    const candidate = base + extension;
    if (files.has(candidate)) {
      return candidate;
    }
  }

  return undefined;
}

/**
 * Creates a Rolldown plugin to load virtual files from in-memory maps.
 *
 * @param files Map of virtual files and their hashes.
 * @param dtsMode Whether the plugin is operating in declaration file mode.
 * @param includeMap Whether to include sourcemaps when loading virtual files.
 * @returns A Rolldown plugin.
 */
function createMemoryFileLoaderPlugin(
  files: Map<string, string>,
  dtsMode: boolean,
  includeMap = true,
): Plugin {
  const extensions = dtsMode ? DTS_EXTENSIONS : ESM_EXTENSIONS;
  const resolutionCache = new Map<string, string | undefined>();

  return {
    name: 'memory-file-loader',
    resolveId: (id, importer) => {
      const cacheKey = importer ? `${importer}\0${id}` : id;
      if (resolutionCache.has(cacheKey)) {
        return resolutionCache.get(cacheKey);
      }

      const resolved = resolveFile(id, importer, files, extensions);
      resolutionCache.set(cacheKey, resolved);

      return resolved;
    },
    load: (id) => {
      const normalizedId = toPosixPath(id);
      let file = files.get(normalizedId);
      let fileKey = normalizedId;

      if (file === undefined) {
        const dtsMatch = /\.d\.m?ts$/.exec(normalizedId);
        const ext = dtsMatch ? dtsMatch[0] : path.extname(normalizedId);
        const base = ext.length > 0 ? normalizedId.slice(0, -ext.length) : normalizedId;
        const fallback = dtsMode ? `${base}.d.ts` : `${base}.js`;
        file = files.get(fallback);
        if (file !== undefined) {
          fileKey = fallback;
        }
      }

      if (file === undefined) {
        return null;
      }

      return {
        code: file,
        map: includeMap ? files.get(`${fileKey}.map`) : undefined,
      };
    },
  };
}
