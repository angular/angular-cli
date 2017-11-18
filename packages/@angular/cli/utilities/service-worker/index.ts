import { Filesystem } from '@angular/service-worker/config';
import { oneLine } from 'common-tags';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import * as semver from 'semver';

export const NEW_SW_VERSION = '>= 5.0.0-rc.0';

class CliFilesystem implements Filesystem {
  constructor(private base: string) {}

  list(_path: string): Promise<string[]> {
    return Promise.resolve(this.syncList(_path));
  }

  private syncList(_path: string): string[] {
    const dir = this.canonical(_path);
    const entries = fs.readdirSync(dir).map(
        (entry: string) => ({entry, stats: fs.statSync(path.posix.join(dir, entry))}));
    const files = entries.filter((entry: any) => !entry.stats.isDirectory())
                      .map((entry: any) => path.posix.join(_path, entry.entry));

    return entries.filter((entry: any) => entry.stats.isDirectory())
      .map((entry: any) => path.posix.join(_path, entry.entry))
      .reduce((list: string[], subdir: string) => list.concat(this.syncList(subdir)), files);
  }

  read(_path: string): Promise<string> {
    const file = this.canonical(_path);
    return Promise.resolve(fs.readFileSync(file).toString());
  }

  hash(_path: string): Promise<string> {
    const sha1 = crypto.createHash('sha1');
    const file = this.canonical(_path);
    const contents: Buffer = fs.readFileSync(file);
    sha1.update(contents);
    return Promise.resolve(sha1.digest('hex'));
  }

  write(_path: string, contents: string): Promise<void> {
    const file = this.canonical(_path);
    fs.writeFileSync(file, contents);
    return Promise.resolve();
  }

  private canonical(_path: string): string { return path.posix.join(this.base, _path); }
}

export function usesServiceWorker(projectRoot: string): boolean {
  const nodeModules = path.resolve(projectRoot, 'node_modules');
  const swModule = path.resolve(nodeModules, '@angular/service-worker');
  if (!fs.existsSync(swModule)) {
    return false;
  }

  const swPackageJson = fs.readFileSync(`${swModule}/package.json`).toString();
  const swVersion = JSON.parse(swPackageJson)['version'];

  return semver.satisfies(swVersion, NEW_SW_VERSION);
}

export function augmentAppWithServiceWorker(projectRoot: string, appRoot: string,
    outputPath: string, baseHref: string): Promise<void> {
  const nodeModules = path.resolve(projectRoot, 'node_modules');
  const swModule = path.resolve(nodeModules, '@angular/service-worker');

  // Path to the worker script itself.
  const workerPath = path.resolve(swModule, 'ngsw-worker.js');
  const configPath = path.resolve(appRoot, 'ngsw-config.json');

  if (!fs.existsSync(configPath)) {
    throw new Error(oneLine`Error: Expected to find an ngsw-config.json configuration
      file in the ${appRoot} folder. Either provide one or disable Service Worker
      in .angular-cli.json.`);
  }
  const config = fs.readFileSync(configPath, 'utf8');

  const Generator = require('@angular/service-worker/config').Generator;
  const gen = new Generator(new CliFilesystem(outputPath), baseHref);
  return gen
    .process(JSON.parse(config))
    .then((output: Object) => {
      const manifest = JSON.stringify(output, null, 2);
      fs.writeFileSync(path.resolve(outputPath, 'ngsw.json'), manifest);
      // Copy worker script to dist directory.
      const workerCode = fs.readFileSync(workerPath);
      fs.writeFileSync(path.resolve(outputPath, 'ngsw-worker.js'), workerCode);
    });
}
