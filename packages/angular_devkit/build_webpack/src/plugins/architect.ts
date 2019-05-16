/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { BuilderContext } from '@angular-devkit/architect';
import { strings } from '@angular-devkit/core';
import * as path from 'path';
import * as webpack from 'webpack';

/**
 * This list was taken from a list of events we want to listen to, from the list of hooks in
 * webpack's typings.
 */
const hookSafelist: (keyof webpack.compilation.CompilationHooks)[] = [
  'seal',
  'optimizeDependenciesBasic',
  'optimizeDependencies',
  'optimizeDependenciesAdvanced',
  'afterOptimizeDependencies',
  'optimize',
  'optimizeModulesBasic',
  'optimizeModules',
  'optimizeModulesAdvanced',
  'afterOptimizeModules',
  'optimizeChunksBasic',
  'optimizeChunks',
  'optimizeChunksAdvanced',
  'afterOptimizeChunks',
  'optimizeTree',
  'afterOptimizeTree',
  'optimizeChunkModulesBasic',
  'optimizeChunkModules',
  'optimizeChunkModulesAdvanced',
  'afterOptimizeChunkModules',
  'reviveModules',
  'optimizeModuleOrder',
  'advancedOptimizeModuleOrder',
  'beforeModuleIds',
  'moduleIds',
  'optimizeModuleIds',
  'afterOptimizeModuleIds',
  'reviveChunks',
  'optimizeChunkOrder',
  'beforeChunkIds',
  'optimizeChunkIds',
  'afterOptimizeChunkIds',
  'recordModules',
  'recordChunks',
  'beforeHash',
  'afterHash',
  'recordHash',
  'record',
  'beforeModuleAssets',
  'shouldGenerateChunkAssets',
  'beforeChunkAssets',
  'additionalChunkAssets',
  'additionalAssets',
  'optimizeChunkAssets',
  'afterOptimizeChunkAssets',
  'optimizeAssets',
  'afterOptimizeAssets',
  'afterSeal',
  'optimizeExtractedChunksBasic',
  'optimizeExtractedChunks',
  'optimizeExtractedChunksAdvanced',
  'afterOptimizeExtractedChunks',
];

/**
 * A webpack plugin that reports status and progress to Architect.
 */
export class ArchitectPlugin {
  constructor(protected context: BuilderContext) {}

  apply(compiler: webpack.Compiler) {
    const context = this.context;
    let modulesCount = 0;
    let modulesDone = 0;
    let hooksDone = 0;
    let numberOfHooks = 0;
    let reset = false;  // Will be true when a full compilation is done.

    function done() {
      modulesDone = modulesCount;
      hooksDone = Math.max(hooksDone, numberOfHooks);
      update('Done.');
      reset = true;
    }
    function update(status: string) {
      context.reportProgress(
        modulesDone + hooksDone,
        modulesCount + Math.max(hooksDone, numberOfHooks),
        status,
      );
    }
    function updateModule(module: webpack.Module) {
      // This is safe since we still verify it.
      const m = module as unknown as { identifier?: () => string };
      const moduleId = '' + (typeof m.identifier == 'function' ? m.identifier() : '');
      const id = moduleId.split(/!|\s+|\bmulti\b/).slice(-1)[0].trim();
      const p = path.relative(context.workspaceRoot, id);

      update(`Building ${p}`);
    }

    function buildModule(module: webpack.Module) {
      modulesCount++;
      updateModule(module);
    }
    function failedModule(module: webpack.Module) {
      modulesDone++;
      updateModule(module);
    }
    function succeedModule(module: webpack.Module) {
      modulesDone++;
      updateModule(module);
    }

    // On the start of a new compilation, maybe reset the counters (and update the total), then
    // listen to all hooks we're interested in.
    compiler.hooks.compilation.tap('ArchitectPlugin', compilation => {
      const hooks = hookSafelist;
      if (reset) {
        reset = false;
        modulesCount = modulesDone = hooksDone = numberOfHooks = 0;
      }
      // Need to add hooks for each compilation.
      numberOfHooks += hooks.length;

      // Pre-emptively tell the user.
      context.reportRunning();
      update('Preparing...');

      compilation.hooks.buildModule.tap('ArchitectPlugin', buildModule);
      compilation.hooks.failedModule.tap('ArchitectPlugin', failedModule);
      compilation.hooks.succeedModule.tap('ArchitectPlugin', succeedModule);

      for (const name of hooks) {
        // Transforms `camelCase` into `Camel case`. decamelize() transforms it into `camel_case`
        // and then we replace the `_` with spaces.
        const title = strings.capitalize(strings.decamelize(name).replace(/_/g, ' '));

        compilation.hooks[name].intercept({
          call: () => {
            hooksDone++;
            update(title);
          },
        });
      }
    });

    compiler.hooks.done.tap('ArchitectPlugin', done);
  }
}
