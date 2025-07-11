/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { Config, Filesystem } from '@angular/service-worker/config';
import * as crypto from 'node:crypto';
import { existsSync, constants as fsConstants, promises as fsPromises } from 'node:fs';
import * as path from 'node:path';
import { BuildOutputFile, BuildOutputFileType } from '../tools/esbuild/bundler-context';
import { BuildOutputAsset } from '../tools/esbuild/bundler-execution-result';
import { assertIsError } from './error';
import { loadEsmModule } from './load-esm';
import { toPosixPath } from './path';

class CliFilesystem implements Filesystem {
  constructor(
    private fs: typeof fsPromises,
    private base: string,
  ) {}

  list(dir: string): Promise<string[]> {
    return this._recursiveList(this._resolve(dir), []);
  }

  read(file: string): Promise<string> {
    return this.fs.readFile(this._resolve(file), 'utf-8');
  }

  async hash(file: string): Promise<string> {
    return crypto
      .createHash('sha1')
      .update(await this.fs.readFile(this._resolve(file)))
      .digest('hex');
  }

  write(_file: string, _content: string): never {
    throw new Error('This should never happen.');
  }

  private _resolve(file: string): string {
    return path.join(this.base, file);
  }

  private async _recursiveList(dir: string, items: string[]): Promise<string[]> {
    const subdirectories = [];
    for (const entry of await this.fs.readdir(dir)) {
      const entryPath = path.join(dir, entry);
      const stats = await this.fs.stat(entryPath);

      if (stats.isFile()) {
        // Uses posix paths since the service worker expects URLs
        items.push('/' + toPosixPath(path.relative(this.base, entryPath)));
      } else if (stats.isDirectory()) {
        subdirectories.push(entryPath);
      }
    }

    for (const subdirectory of subdirectories) {
      await this._recursiveList(subdirectory, items);
    }

    return items;
  }
}

class ResultFilesystem implements Filesystem {
  private readonly fileReaders = new Map<string, () => Promise<Uint8Array>>();

  constructor(
    outputFiles: BuildOutputFile[],
    assetFiles: { source: string; destination: string }[],
  ) {
    for (const file of outputFiles) {
      if (file.type === BuildOutputFileType.Media || file.type === BuildOutputFileType.Browser) {
        this.fileReaders.set('/' + toPosixPath(file.path), async () => file.contents);
      }
    }
    for (const file of assetFiles) {
      this.fileReaders.set('/' + toPosixPath(file.destination), () =>
        fsPromises.readFile(file.source),
      );
    }
  }

  async list(dir: string): Promise<string[]> {
    if (dir !== '/') {
      throw new Error('Serviceworker manifest generator should only list files from root.');
    }

    return [...this.fileReaders.keys()];
  }

  async read(file: string): Promise<string> {
    const reader = this.fileReaders.get(file);
    if (reader === undefined) {
      throw new Error('File does not exist.');
    }
    const contents = await reader();

    return Buffer.from(contents.buffer, contents.byteOffset, contents.byteLength).toString('utf-8');
  }

  async hash(file: string): Promise<string> {
    const reader = this.fileReaders.get(file);
    if (reader === undefined) {
      throw new Error('File does not exist.');
    }

    return crypto
      .createHash('sha1')
      .update(await reader())
      .digest('hex');
  }

  write(): never {
    throw new Error('Serviceworker manifest generator should not attempted to write.');
  }
}

export async function augmentAppWithServiceWorker(
  appRoot: string,
  workspaceRoot: string,
  outputPath: string,
  baseHref: string,
  ngswConfigPath?: string,
  inputFileSystem = fsPromises,
  outputFileSystem = fsPromises,
): Promise<void> {
  // Determine the configuration file path
  const configPath = ngswConfigPath
    ? path.join(workspaceRoot, ngswConfigPath)
    : path.join(appRoot, 'ngsw-config.json');

  // Read the configuration file
  let config: Config | undefined;
  try {
    const configurationData = await inputFileSystem.readFile(configPath, 'utf-8');
    config = JSON.parse(configurationData) as Config;
  } catch (error) {
    assertIsError(error);
    if (error.code === 'ENOENT') {
      throw new Error(
        'Error: Expected to find an ngsw-config.json configuration file' +
          ` in the ${appRoot} folder. Either provide one or` +
          ' disable Service Worker in the angular.json configuration file.',
      );
    } else {
      throw error;
    }
  }

  const result = await augmentAppWithServiceWorkerCore(
    config,
    new CliFilesystem(outputFileSystem, outputPath),
    baseHref,
  );

  const copy = async (src: string, dest: string): Promise<void> => {
    const resolvedDest = path.join(outputPath, dest);

    return outputFileSystem.writeFile(resolvedDest, await inputFileSystem.readFile(src));
  };

  await outputFileSystem.writeFile(path.join(outputPath, 'ngsw.json'), result.manifest);

  for (const { source, destination } of result.assetFiles) {
    await copy(source, destination);
  }
}

// This is currently used by the esbuild-based builder
export async function augmentAppWithServiceWorkerEsbuild(
  workspaceRoot: string,
  configPath: string,
  baseHref: string,
  indexHtml: string | undefined,
  outputFiles: BuildOutputFile[],
  assetFiles: BuildOutputAsset[],
): Promise<{ manifest: string; assetFiles: BuildOutputAsset[] }> {
  // Read the configuration file
  let config: Config | undefined;
  try {
    const configurationData = await fsPromises.readFile(configPath, 'utf-8');
    config = JSON.parse(configurationData) as Config;

    if (indexHtml) {
      config.index = indexHtml;
    }
  } catch (error) {
    assertIsError(error);
    if (error.code === 'ENOENT') {
      // TODO: Generate an error object that can be consumed by the esbuild-based builder
      const message = `Service worker configuration file "${path.relative(
        workspaceRoot,
        configPath,
      )}" could not be found.`;
      throw new Error(message);
    } else {
      throw error;
    }
  }

  return augmentAppWithServiceWorkerCore(
    config,
    new ResultFilesystem(outputFiles, assetFiles),
    baseHref,
  );
}

export async function augmentAppWithServiceWorkerCore(
  config: Config,
  serviceWorkerFilesystem: Filesystem,
  baseHref: string,
): Promise<{ manifest: string; assetFiles: { source: string; destination: string }[] }> {
  // Load ESM `@angular/service-worker/config` using the TypeScript dynamic import workaround.
  // Once TypeScript provides support for keeping the dynamic import this workaround can be
  // changed to a direct dynamic import.
  const GeneratorConstructor = (
    await loadEsmModule<typeof import('@angular/service-worker/config')>(
      '@angular/service-worker/config',
    )
  ).Generator;

  // Generate the manifest
  const generator = new GeneratorConstructor(serviceWorkerFilesystem, baseHref);
  const output = await generator.process(config);

  // Write the manifest
  const manifest = JSON.stringify(output, null, 2);

  // Find the service worker package
  const workerPath = require.resolve('@angular/service-worker/ngsw-worker.js');

  const result = {
    manifest,
    // Main worker code
    assetFiles: [{ source: workerPath, destination: 'ngsw-worker.js' }],
  };

  // If present, write the safety worker code
  const safetyPath = path.join(path.dirname(workerPath), 'safety-worker.js');
  if (existsSync(safetyPath)) {
    result.assetFiles.push({ source: safetyPath, destination: 'worker-basic.min.js' });
    result.assetFiles.push({ source: safetyPath, destination: 'safety-worker.js' });
  }

  return result;
}
