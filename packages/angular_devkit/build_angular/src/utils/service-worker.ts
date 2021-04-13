/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Path, getSystemPath, normalize } from '@angular-devkit/core';
import { Config, Filesystem, Generator } from '@angular/service-worker/config';
import * as crypto from 'crypto';
import { constants as fsConstants, createReadStream, promises as fs } from 'fs';
import * as path from 'path';
import { pipeline } from 'stream';

class CliFilesystem implements Filesystem {
  constructor(private base: string) {}

  list(dir: string): Promise<string[]> {
    return this._recursiveList(this._resolve(dir), []);
  }

  read(file: string): Promise<string> {
    return fs.readFile(this._resolve(file), 'utf-8');
  }

  hash(file: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha1').setEncoding('hex');
      pipeline(
        createReadStream(this._resolve(file)),
        hash,
        (error) => error ? reject(error) : resolve(hash.read()),
      );
    });
  }

  write(file: string, content: string): Promise<void> {
    return fs.writeFile(this._resolve(file), content);
  }

  private _resolve(file: string): string {
    return path.join(this.base, file);
  }

  private async _recursiveList(dir: string, items: string[]): Promise<string[]> {
    const subdirectories = [];
    for await (const entry of await fs.opendir(dir)) {
      if (entry.isFile()) {
        // Uses posix paths since the service worker expects URLs
        items.push('/' + path.posix.relative(this.base, path.posix.join(dir, entry.name)));
      } else if (entry.isDirectory()) {
        subdirectories.push(path.join(dir, entry.name));
      }
    }

    for (const subdirectory of subdirectories) {
      await this._recursiveList(subdirectory, items);
    }

    return items;
  }
}

export async function augmentAppWithServiceWorker(
  projectRoot: Path,
  appRoot: Path,
  outputPath: Path,
  baseHref: string,
  ngswConfigPath?: string,
): Promise<void> {
  const distPath = getSystemPath(normalize(outputPath));
  const systemProjectRoot = getSystemPath(projectRoot);

  // Find the service worker package
  const workerPath = require.resolve('@angular/service-worker/ngsw-worker.js', {
    paths: [systemProjectRoot],
  });
  const swConfigPath = require.resolve('@angular/service-worker/config', {
    paths: [systemProjectRoot],
  });

  // Determine the configuration file path
  let configPath;
  if (ngswConfigPath) {
    configPath = getSystemPath(normalize(ngswConfigPath));
  } else {
    configPath = path.join(getSystemPath(appRoot), 'ngsw-config.json');
  }

  // Read the configuration file
  let config: Config | undefined;
  try {
    const configurationData = await fs.readFile(configPath, 'utf-8');
    config = JSON.parse(configurationData) as Config;
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error(
        'Error: Expected to find an ngsw-config.json configuration file' +
          ` in the ${getSystemPath(appRoot)} folder. Either provide one or` +
          ' disable Service Worker in the angular.json configuration file.',
      );
    } else {
      throw error;
    }
  }

  // Generate the manifest
  const GeneratorConstructor = require(swConfigPath).Generator as typeof Generator;
  const generator = new GeneratorConstructor(new CliFilesystem(distPath), baseHref);
  const output = await generator.process(config);

  // Write the manifest
  const manifest = JSON.stringify(output, null, 2);
  await fs.writeFile(path.join(distPath, 'ngsw.json'), manifest);

  // Write the worker code
  await fs.copyFile(
    workerPath,
    path.join(distPath, 'ngsw-worker.js'),
    fsConstants.COPYFILE_FICLONE,
  );

  // If present, write the safety worker code
  const safetyPath = path.join(path.dirname(workerPath), 'safety-worker.js');
  try {
    await fs.copyFile(
      safetyPath,
      path.join(distPath, 'worker-basic.min.js'),
      fsConstants.COPYFILE_FICLONE,
    );
    await fs.copyFile(
      safetyPath,
      path.join(distPath, 'safety-worker.js'),
      fsConstants.COPYFILE_FICLONE,
    );
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
}
