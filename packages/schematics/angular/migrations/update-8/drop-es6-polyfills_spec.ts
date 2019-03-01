/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// tslint:disable:no-big-function
import { EmptyTree } from '@angular-devkit/schematics';
import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';

describe('Migration to version 8', () => {
  const schematicRunner = new SchematicTestRunner(
    'migrations',
    require.resolve('../migration-collection.json'),
  );

  let tree: UnitTestTree;
  const polyfillsPath = '/polyfills.ts';
  const defaultOptions = {};
  const polyfills = `/**
 */

/***************************************************************************************************
 * BROWSER POLYFILLS
 */

/** IE9, IE10 and IE11 requires all of the following polyfills. **/
import 'core-js/es6/symbol';
import 'core-js/es6/object';
import 'core-js/es6/function';
import 'core-js/es6/parse-int';
import 'core-js/es6/parse-float';
import 'core-js/es6/number';
import 'core-js/es6/math';
import 'core-js/es6/string';
import 'core-js/es6/date';
import 'core-js/es6/array';
import 'core-js/es6/regexp';
import 'core-js/es6/map';
// import 'core-js/es6/weak-map';
import 'core-js/es6/set';

/** IE10 and IE11 requires the following for NgClass support on SVG elements */
// import 'classlist.js';  // Run "npm install --save classlist.js".

/** IE10 and IE11 requires the following for the Reflect API. */
// import 'core-js/es6/reflect';

/** Evergreen browsers require these. **/
// Used for reflect-metadata in JIT. If you use AOT (and only Angular decorators), you can remove.
import 'core-js/es7/reflect';

/***************************************************************************************************
 * Zone JS is required by default for Angular itself.
 */
import 'zone.js/dist/zone'; // Included with Angular CLI.

/***************************************************************************************************
 * APPLICATION IMPORTS
 */
`;

  const packageJson = {
    devDependencies: {
      codelyzer: '^4.5.0',
    },
  };
  const packageJsonPath = '/package.json';

  describe('Migration to differential polyfill loading', () => {
    beforeEach(() => {
      tree = new UnitTestTree(new EmptyTree());
      tree.create(polyfillsPath, polyfills);
      tree.create(packageJsonPath, JSON.stringify(packageJson, null, 2));
    });

    it('should drop the es6 polyfills', () => {
      tree = schematicRunner.runSchematic('migration-07', defaultOptions, tree);
      const polyfills = tree.readContent(polyfillsPath);
      expect(polyfills).not.toContain('core-js/es6/symbol');
      expect(polyfills).not.toContain('core-js/es6/set');
      expect(polyfills).not.toContain('zone.js');
      expect(polyfills).not.toContain('Zone');

      // We don't want to drop this commented import comments
      expect(polyfills).toContain('core-js/es6/reflect');
      expect(polyfills).toContain('core-js/es7/reflect');
      expect(polyfills).toContain('BROWSER POLYFILLS');
      expect(polyfills).toContain('core-js/es6/weak-map');
    });
  });
});
