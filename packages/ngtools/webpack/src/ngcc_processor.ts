/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Logger, PathMappings, process as mainNgcc } from '@angular/compiler-cli/ngcc';
import { existsSync } from 'fs';
import * as path from 'path';
import * as ts from 'typescript';
import { InputFileSystem } from 'webpack';
import { time, timeEnd } from './benchmark';

// We cannot create a plugin for this, because NGTSC requires addition type
// information which ngcc creates when processing a package which was compiled with NGC.

// Example of such errors:
// ERROR in node_modules/@angular/platform-browser/platform-browser.d.ts(42,22):
// error TS-996002: Appears in the NgModule.imports of AppModule,
// but could not be resolved to an NgModule class

// We now transform a package and it's typings when NGTSC is resolving a module.

export class NgccProcessor {
  private _processedModules = new Set<string>();
  private _logger: NgccLogger;
  private _nodeModulesDirectory: string;
  private _pathMappings: PathMappings | undefined;

  constructor(
    private readonly propertiesToConsider: string[],
    private readonly inputFileSystem: InputFileSystem,
    private readonly compilationWarnings: (Error | string)[],
    private readonly compilationErrors: (Error | string)[],
    private readonly basePath: string,
    private readonly compilerOptions: ts.CompilerOptions,
  ) {
    this._logger = new NgccLogger(this.compilationWarnings, this.compilationErrors);
    this._nodeModulesDirectory = this.findNodeModulesDirectory(this.basePath);

    const { baseUrl, paths } = this.compilerOptions;
    if (baseUrl && paths) {
      this._pathMappings = {
        baseUrl,
        paths,
      };
    }
  }

  processModule(
    moduleName: string,
    resolvedModule: ts.ResolvedModule | ts.ResolvedTypeReferenceDirective,
  ): void {
    const resolvedFileName = resolvedModule.resolvedFileName;
    if (!resolvedFileName || moduleName.startsWith('.') || this._processedModules.has(moduleName)) {
      // Skip when module is unknown, relative or NGCC compiler is not found or already processed.
      return;
    }

    const packageJsonPath = this.tryResolvePackage(moduleName, resolvedFileName);
    if (!packageJsonPath) {
      // add it to processed so the second time round we skip this.
      this._processedModules.add(moduleName);

      return;
    }

    const timeLabel = `NgccProcessor.processModule.ngcc.process+${moduleName}`;
    time(timeLabel);
    mainNgcc({
      basePath: this._nodeModulesDirectory,
      targetEntryPointPath: path.dirname(packageJsonPath),
      propertiesToConsider: this.propertiesToConsider,
      compileAllFormats: false,
      createNewEntryPointFormats: true,
      logger: this._logger,
      pathMappings: this._pathMappings,
    });
    timeEnd(timeLabel);

    // Purge this file from cache, since NGCC add new mainFields. Ex: module_ivy_ngcc
    // which are unknown in the cached file.

    // tslint:disable-next-line:no-any
    (this.inputFileSystem as any).purge(packageJsonPath);

    this._processedModules.add(moduleName);
  }

  /**
   * Try resolve a package.json file from the resolved .d.ts file.
   */
  private tryResolvePackage(moduleName: string, resolvedFileName: string): string | undefined {
    try {
      // This is based on the logic in the NGCC compiler
      // tslint:disable-next-line:max-line-length
      // See: https://github.com/angular/angular/blob/b93c1dffa17e4e6900b3ab1b9e554b6da92be0de/packages/compiler-cli/src/ngcc/src/packages/dependency_host.ts#L85-L121
      return require.resolve(`${moduleName}/package.json`, {
        paths: [resolvedFileName],
      });
    } catch {
      // if it fails this might be a deep import which doesn't have a package.json
      // Ex: @angular/compiler/src/i18n/i18n_ast/package.json
      // or local libraries which don't reside in node_modules
      const packageJsonPath = path.resolve(resolvedFileName, '../package.json');

      return existsSync(packageJsonPath) ? packageJsonPath : undefined;
    }
  }

  private findNodeModulesDirectory(startPoint: string): string {
    let current = startPoint;
    while (path.dirname(current) !== current) {
      const nodePath = path.join(current, 'node_modules');
      if (existsSync(nodePath)) {
        return nodePath;
      }

      current = path.dirname(current);
    }

    throw new Error(`Cannot locate the 'node_modules' directory.`);
  }
}

class NgccLogger implements Logger {
  constructor(
    private readonly compilationWarnings: (Error | string)[],
    private readonly compilationErrors: (Error | string)[],
  ) {}

  debug(..._args: string[]) {}

  info(...args: string[]) {
    // Log to stderr because it's a progress-like info message.
    process.stderr.write(`\n${args.join(' ')}\n`);
  }

  warn(...args: string[]) {
    this.compilationWarnings.push(args.join(' '));
  }

  error(...args: string[]) {
    this.compilationErrors.push(new Error(args.join(' ')));
  }
}
