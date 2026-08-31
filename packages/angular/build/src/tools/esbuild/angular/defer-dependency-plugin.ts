/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { Plugin } from 'esbuild';
import { createVirtualModulePlugin } from '../virtual-module-plugin';
import {
  DEFER_DEPENDENCY_NAMESPACE,
  decodeDeferDependencySpecifier,
} from './defer-dependency-namespace';

/**
 * Turns a virtual specifier like `angular:defer-dep:some-lib:SomeComponent`
 * into a tiny file with a single line in it:
 *
 *   export { SomeComponent } from 'some-lib';
 *
 * That's the whole trick. A plain, static re-export like this tells
 * esbuild exactly which export is actually used, so it can tree-shake away
 * the rest of `some-lib`. A dynamic `import()` can never do that, because
 * `import()` always hands back the *entire* module, not just one export.
 */
export function createDeferDependencyPlugin(): Plugin {
  return createVirtualModulePlugin({
    namespace: DEFER_DEPENDENCY_NAMESPACE,
    // These virtual specifiers only ever show up inside a dynamic
    // import(), never as a build entry point on their own.
    entryPointOnly: false,
    loadContent: (args, build) => {
      const { specifier, symbol } = decodeDeferDependencySpecifier(args.path);

      return {
        contents: `export { ${symbol} } from ${JSON.stringify(specifier)};`,
        loader: 'js',
        // Resolve the package name from the project root, same as the
        // rest of the build does. This assumes one project with one
        // node_modules folder, which is true for a normal Angular CLI
        // app - just not something we've tested past that.
        resolveDir: build.initialOptions.absWorkingDir ?? process.cwd(),
      };
    },
  });
}
