/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

/**
 * @fileoverview This file provides a function to optimize JavaScript chunks using rolldown.
 * It is designed to be used after an esbuild build to further optimize the output.
 * The main function, `optimizeChunks`, takes the result of an esbuild build,
 * identifies the main browser entry point, and then uses rolldown to rebundle
 * and optimize the chunks. This process can result in smaller and more efficient
 * code by combining and restructuring the original chunks. The file also includes
 * helper functions to convert rolldown's output into an esbuild-compatible
 * metafile, allowing for consistent analysis and reporting of the build output.
 */

import type { Message, Metafile } from 'esbuild';
import assert from 'node:assert';
import { type OutputAsset, type OutputChunk, rollup } from 'rollup';
import {
  BuildOutputFile,
  BuildOutputFileType,
  BundleContextResult,
  InitialFileRecord,
} from '../../tools/esbuild/bundler-context';
import { createOutputFile } from '../../tools/esbuild/utils';
import { assertIsError } from '../../utils/error';

/**
 * Converts the output of a rolldown build into an esbuild-compatible metafile.
 * @param rolldownOutput The output of a rolldown build.
 * @param originalMetafile The original esbuild metafile from the build.
 * @returns An esbuild-compatible metafile.
 */
function rolldownToEsbuildMetafile(
  rolldownOutput: (OutputChunk | OutputAsset)[],
  originalMetafile: Metafile,
): Metafile {
  const newMetafile: Metafile = {
    inputs: originalMetafile.inputs,
    outputs: {},
  };

  const intermediateChunkSizes: Record<string, number> = {};
  for (const [path, output] of Object.entries(originalMetafile.outputs)) {
    intermediateChunkSizes[path] = Object.values(output.inputs).reduce(
      (s, i) => s + i.bytesInOutput,
      0,
    );
  }

  for (const chunk of rolldownOutput) {
    if (chunk.type === 'asset') {
      newMetafile.outputs[chunk.fileName] = {
        bytes:
          typeof chunk.source === 'string'
            ? Buffer.byteLength(chunk.source, 'utf8')
            : chunk.source.length,
        inputs: {},
        imports: [],
        exports: [],
      };
      continue;
    }

    const newOutputInputs: Record<string, { bytesInOutput: number }> = {};
    if (chunk.modules) {
      for (const [moduleId, renderedModule] of Object.entries(chunk.modules)) {
        const originalOutputEntry = originalMetafile.outputs[moduleId];
        if (!originalOutputEntry?.inputs) {
          continue;
        }

        const totalOriginalBytesInModule = intermediateChunkSizes[moduleId];
        if (totalOriginalBytesInModule === 0) {
          continue;
        }

        for (const [originalInputPath, originalInputInfo] of Object.entries(
          originalOutputEntry.inputs,
        )) {
          const proportion = originalInputInfo.bytesInOutput / totalOriginalBytesInModule;
          const newBytesInOutput = Math.floor(renderedModule.renderedLength * proportion);

          const existing = newOutputInputs[originalInputPath];
          if (existing) {
            existing.bytesInOutput += newBytesInOutput;
          } else {
            newOutputInputs[originalInputPath] = { bytesInOutput: newBytesInOutput };
          }

          if (!newMetafile.inputs[originalInputPath]) {
            newMetafile.inputs[originalInputPath] = originalMetafile.inputs[originalInputPath];
          }
        }
      }
    }

    const imports = [
      ...chunk.imports.map((path) => ({ path, kind: 'import-statement' as const })),
      ...(chunk.dynamicImports?.map((path) => ({ path, kind: 'dynamic-import' as const })) ?? []),
    ];

    newMetafile.outputs[chunk.fileName] = {
      bytes: Buffer.byteLength(chunk.code, 'utf8'),
      inputs: newOutputInputs,
      imports,
      exports: chunk.exports ?? [],
      entryPoint:
        chunk.isEntry && chunk.facadeModuleId
          ? originalMetafile.outputs[chunk.facadeModuleId]?.entryPoint
          : undefined,
    };
  }

  return newMetafile;
}

/**
 * Creates an InitialFileRecord object with a specified depth.
 * @param depth The depth of the file in the dependency graph.
 * @returns An InitialFileRecord object.
 */
function createInitialFileRecord(depth: number): InitialFileRecord {
  return {
    type: 'script',
    entrypoint: false,
    external: false,
    serverFile: false,
    depth,
  };
}

/**
 * Creates an esbuild message object for a chunk optimization failure.
 * @param message The error message detailing the cause of the failure.
 * @returns A partial esbuild message object.
 */
function createChunkOptimizationFailureMessage(message: string): Message {
  // Most of these fields are not actually needed for printing the error
  return {
    id: '',
    text: 'Chunk optimization failed',
    detail: undefined,
    pluginName: '',
    location: null,
    notes: [
      {
        text: message,
        location: null,
      },
    ],
  };
}

/**
 * Optimizes the chunks of a build result using rolldown.
 *
 * This function takes the output of an esbuild build, identifies the main browser entry point,
 * and uses rolldown to bundle and optimize the JavaScript chunks. The optimized chunks
 * replace the original ones in the build result, and the metafile is updated to reflect
 * the changes.
 *
 * @param original The original build result from esbuild.
 * @param sourcemap A boolean or 'hidden' to control sourcemap generation.
 * @returns A promise that resolves to the updated build result with optimized chunks.
 */
export async function optimizeChunks(
  original: BundleContextResult,
  sourcemap: boolean | 'hidden',
): Promise<BundleContextResult> {
  // Failed builds cannot be optimized
  if (original.errors) {
    return original;
  }

  // Find the main browser entrypoint
  let mainFile;
  for (const [file, record] of original.initialFiles) {
    if (
      record.name === 'main' &&
      record.entrypoint &&
      !record.serverFile &&
      record.type === 'script'
    ) {
      mainFile = file;
      break;
    }
  }

  // No action required if no browser main entrypoint or metafile for stats
  if (!mainFile || !original.metafile) {
    return original;
  }

  const chunks: Record<string, BuildOutputFile> = {};
  const maps: Record<string, BuildOutputFile> = {};
  for (const originalFile of original.outputFiles) {
    if (originalFile.type !== BuildOutputFileType.Browser) {
      continue;
    }

    if (originalFile.path.endsWith('.js')) {
      chunks[originalFile.path] = originalFile;
    } else if (originalFile.path.endsWith('.js.map')) {
      // Create mapping of JS file to sourcemap content
      maps[originalFile.path.slice(0, -4)] = originalFile;
    }
  }

  const usedChunks = new Set<string>();

  let bundle;
  let optimizedOutput;
  try {
    bundle = await rollup({
      input: mainFile,
      plugins: [
        {
          name: 'angular-bundle',
          resolveId(source) {
            // Remove leading `./` if present
            const file = source[0] === '.' && source[1] === '/' ? source.slice(2) : source;

            if (chunks[file]) {
              return file;
            }

            // All other identifiers are considered external to maintain behavior
            return { id: source, external: true };
          },
          load(id) {
            assert(
              chunks[id],
              `Angular chunk content should always be present in chunk optimizer [${id}].`,
            );

            usedChunks.add(id);

            const result = {
              code: chunks[id].text,
              map: maps[id]?.text,
            };

            return result;
          },
        },
      ],
    });

    const result = await bundle.generate({
      compact: true,
      sourcemap,
      chunkFileNames: (chunkInfo) => `${chunkInfo.name.replace(/-[a-zA-Z0-9]{8}$/, '')}-[hash].js`,
    });
    optimizedOutput = result.output;
  } catch (e) {
    assertIsError(e);

    return {
      errors: [createChunkOptimizationFailureMessage(e.message)],
      warnings: original.warnings,
    };
  } finally {
    await bundle?.close();
  }

  // Update metafile
  const newMetafile = rolldownToEsbuildMetafile(optimizedOutput, original.metafile);
  // Add back the outputs that were not part of the optimization
  for (const [path, output] of Object.entries(original.metafile.outputs)) {
    if (usedChunks.has(path)) {
      continue;
    }

    newMetafile.outputs[path] = output;
    for (const inputPath of Object.keys(output.inputs)) {
      if (!newMetafile.inputs[inputPath]) {
        newMetafile.inputs[inputPath] = original.metafile.inputs[inputPath];
      }
    }
  }
  original.metafile = newMetafile;

  // Remove used chunks and associated sourcemaps from the original result
  original.outputFiles = original.outputFiles.filter(
    (file) =>
      !usedChunks.has(file.path) &&
      !(file.path.endsWith('.map') && usedChunks.has(file.path.slice(0, -4))),
  );

  // Add new optimized chunks
  const importsPerFile: Record<string, string[]> = {};
  for (const optimizedFile of optimizedOutput) {
    if (optimizedFile.type !== 'chunk') {
      continue;
    }

    importsPerFile[optimizedFile.fileName] = optimizedFile.imports;

    original.outputFiles.push(
      createOutputFile(optimizedFile.fileName, optimizedFile.code, BuildOutputFileType.Browser),
    );
    if (optimizedFile.map && optimizedFile.sourcemapFileName) {
      original.outputFiles.push(
        createOutputFile(
          optimizedFile.sourcemapFileName,
          optimizedFile.map.toString(),
          BuildOutputFileType.Browser,
        ),
      );
    }
  }

  // Update initial files to reflect optimized chunks
  const entriesToAnalyze: [string, InitialFileRecord][] = [];
  for (const usedFile of usedChunks) {
    // Leave the main file since its information did not change
    if (usedFile === mainFile) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      entriesToAnalyze.push([mainFile, original.initialFiles.get(mainFile)!]);
      continue;
    }

    // Remove all other used chunks
    original.initialFiles.delete(usedFile);
  }

  // Analyze for transitive initial files
  let currentEntry;
  while ((currentEntry = entriesToAnalyze.pop())) {
    const [entryPath, entryRecord] = currentEntry;

    for (const importPath of importsPerFile[entryPath]) {
      const existingRecord = original.initialFiles.get(importPath);
      if (existingRecord) {
        // Store the smallest value depth
        if (existingRecord.depth > entryRecord.depth + 1) {
          existingRecord.depth = entryRecord.depth + 1;
        }

        continue;
      }

      const record = createInitialFileRecord(entryRecord.depth + 1);

      entriesToAnalyze.push([importPath, record]);
    }
  }

  return original;
}
