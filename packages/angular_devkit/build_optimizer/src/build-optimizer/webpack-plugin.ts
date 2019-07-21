
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Compiler } from 'webpack';  // tslint:disable-line:no-implicit-dependencies

export class BuildOptimizerWebpackPlugin {
  apply(compiler: Compiler) {
    compiler.hooks.normalModuleFactory.tap('BuildOptimizerWebpackPlugin', nmf => {
      nmf.hooks.module.tap('BuildOptimizerWebpackPlugin', (module, data) => {
        const resolveData = data.resourceResolveData;
        if (resolveData && resolveData.descriptionFileData) {
          // Only TS packages should use Build Optimizer.
          const typings = resolveData.descriptionFileData.typings;
          // Notes:
          // - a TS package might not have defined typings but still use .d.ts files next to their
          // .js files. We don't cover that case because the Angular Package Format (APF) calls for
          // using the Typings field and Build Optimizer is geared towards APF. Maybe we could
          // provide configuration options to the plugin to cover that case if there's demand.
          // - a JS-only package that also happens to provides typings will also be flagged by this
          // check. Not sure there's a good way to skip those.
          module.factoryMeta.skipBuildOptimizer = !typings;
        }

        return module;
      });
    });
  }
}
