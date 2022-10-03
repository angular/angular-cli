/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import type { Config, Filesystem } from '@angular/service-worker/config';
import * as crypto from 'crypto';
import { constants as fsConstants, promises as fsPromises } from 'fs';
import * as path from 'path';
import { assertIsError } from './error';
import { loadEsmModule } from './load-esm';

class CliFilesystem implements Filesystem {
  constructor(private fs: typeof fsPromises, private base: string) {}

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
        items.push('/' + path.relative(this.base, entryPath).replace(/\\/g, '/'));
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

export async function augmentAppWithServiceWorker(
  appRoot: string,
  workspaceRoot: string,
  outputPath: string,
  baseHref: string,
  ngswConfigPath?: string,
  inputputFileSystem = fsPromises,
  outputFileSystem = fsPromises,
): Promise<void> {
  // Determine the configuration file path
  const configPath = ngswConfigPath
    ? path.join(workspaceRoot, ngswConfigPath)
    : path.join(appRoot, 'ngsw-config.json');

  // Read the configuration file
  let config: Config | undefined;
  try {
    const configurationData = await inputputFileSystem.readFile(configPath, 'utf-8');
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

  return augmentAppWithServiceWorkerCore(
    config,
    outputPath,
    baseHref,
    inputputFileSystem,
    outputFileSystem,
  );
}

// This is currently used by the esbuild-based builder
export async function augmentAppWithServiceWorkerEsbuild(
  workspaceRoot: string,
  configPath: string,
  outputPath: string,
  baseHref: string,
): Promise<void> {
  // Read the configuration file
  let config: Config | undefined;
  try {
    const configurationData = await fsPromises.readFile(configPath, 'utf-8');
    config = JSON.parse(configurationData) as Config;
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

  // TODO: Return the output files and any errors/warnings
  return augmentAppWithServiceWorkerCore(config, outputPath, baseHref);
}

export async function augmentAppWithServiceWorkerCore(
  config: Config,
  outputPath: string,
  baseHref: string,
  inputputFileSystem = fsPromises,
  outputFileSystem = fsPromises,
): Promise<void> {
  // Load ESM `@angular/service-worker/config` using the TypeScript dynamic import workaround.
  // Once TypeScript provides support for keeping the dynamic import this workaround can be
  // changed to a direct dynamic import.
  const GeneratorConstructor = (
    await loadEsmModule<typeof import('@angular/service-worker/config')>(
      '@angular/service-worker/config',
    )
  ).Generator;

  // Generate the manifest
  const generator = new GeneratorConstructor(
    new CliFilesystem(outputFileSystem, outputPath),
    baseHref,
  );
  const output = await generator.process(config);

  // Write the manifest
  const manifest = JSON.stringify(output, null, 2);
  await outputFileSystem.writeFile(path.join(outputPath, 'ngsw.json'), manifest);

  // Find the service worker package
  const workerPath = require.resolve('@angular/service-worker/ngsw-worker.js');

  const copy = async (src: string, dest: string): Promise<void> => {
    const resolvedDest = path.join(outputPath, dest);

    return inputputFileSystem === outputFileSystem
      ? // Native FS (Builder).
        inputputFileSystem.copyFile(workerPath, resolvedDest, fsConstants.COPYFILE_FICLONE)
      : // memfs (Webpack): Read the file from the input FS (disk) and write it to the output FS (memory).
        outputFileSystem.writeFile(resolvedDest, await inputputFileSystem.readFile(src));
  };

  // Write the worker code
  await copy(workerPath, 'ngsw-worker.js');

  // If present, write the safety worker code
  try {
    const safetyPath = path.join(path.dirname(workerPath), 'safety-worker.js');
    await copy(safetyPath, 'worker-basic.min.js');
    await copy(safetyPath, 'safety-worker.js');
  } catch (error) {
    assertIsError(error);
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
}
