/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { FilePattern, InlinePluginDef } from 'karma';
import { createRequire } from 'node:module';

const localResolve = createRequire(__filename).resolve;

export class AngularPolyfillsPlugin {
  static readonly $inject = ['config.files'];

  static readonly NAME = 'angular-polyfills';

  static createPlugin(
    polyfillsFile: FilePattern,
    jasmineCleanupFiles: FilePattern,
    scriptsFiles: FilePattern[],
  ): InlinePluginDef {
    return {
      // This has to be a "reporter" because reporters run _after_ frameworks
      // and karma-jasmine-html-reporter injects additional scripts that may
      // depend on Jasmine but aren't modules - which means that they would run
      // _before_ all module code (including jasmine).
      [`reporter:${AngularPolyfillsPlugin.NAME}`]: [
        'factory',
        Object.assign((files: (string | FilePattern)[]) => {
          // The correct order is zone.js -> jasmine -> zone.js/testing.
          // Jasmine has to see the patched version of the global `setTimeout`
          // function so it doesn't cache the unpatched version. And /testing
          // needs to see the global `jasmine` object so it can patch it.
          const polyfillsIndex = 0;
          files.splice(polyfillsIndex, 0, polyfillsFile);

          // Insert just before test_main.js.
          const zoneTestingIndex = files.findIndex((f) => {
            if (typeof f === 'string') {
              return false;
            }

            return f.pattern.endsWith('/test_main.js');
          });
          if (zoneTestingIndex === -1) {
            throw new Error('Could not find test entrypoint file.');
          }
          files.splice(zoneTestingIndex, 0, jasmineCleanupFiles);

          // We need to ensure that all files are served as modules, otherwise
          // the order in the files list gets really confusing: Karma doesn't
          // set defer on scripts, so all scripts with type=js will run first,
          // even if type=module files appeared earlier in `files`.
          for (const f of files) {
            if (typeof f === 'string') {
              throw new Error(`Unexpected string-based file: "${f}"`);
            }
            if (f.included === false) {
              // Don't worry about files that aren't included on the initial
              // page load. `type` won't affect them.
              continue;
            }
            if (f.pattern.endsWith('.js') && 'js' === (f.type ?? 'js')) {
              f.type = 'module';
            }
          }

          // Add "scripts" option files as classic scripts
          files.unshift(...scriptsFiles);

          // Add browser sourcemap support as a classic script
          files.unshift({
            pattern: localResolve('source-map-support/browser-source-map-support.js'),
            included: true,
            watched: false,
          });

          // Karma needs a return value for a factory and Karma's multi-reporter expects an `adapters` array
          return { adapters: [] };
        }, AngularPolyfillsPlugin),
      ],
    };
  }
}
