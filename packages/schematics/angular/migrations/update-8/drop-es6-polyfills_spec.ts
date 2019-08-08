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
  const polyfillsPath = '/src/polyfills.ts';
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

  describe('Migration to differential polyfill loading', () => {
    beforeEach(async () => {
      tree = new UnitTestTree(new EmptyTree());
      tree = await schematicRunner.runExternalSchematicAsync(
        require.resolve('../../collection.json'), 'ng-new',
        {
          name: 'migration-test',
          version: '1.2.3',
          directory: '.',
        },
        tree,
      ).toPromise();
      tree.overwrite(polyfillsPath, polyfills);
    });

    it('should drop the es6 polyfills', async () => {
      tree = await schematicRunner.runSchematicAsync('migration-07', defaultOptions, tree).toPromise();
      const polyfills = tree.readContent(polyfillsPath);
      expect(polyfills).not.toContain('core-js/es6/symbol');
      expect(polyfills).not.toContain('core-js/es6/set');
      expect(polyfills).toContain('zone.js');
      expect(polyfills).toContain('Zone');

      // We don't want to drop this commented import comments
      expect(polyfills).toContain('core-js/es6/reflect');
      expect(polyfills).toContain('core-js/es7/reflect');
      expect(polyfills).toContain('BROWSER POLYFILLS');
    });

    it('should work as expected for a project with a root', async () => {
      const originalContent = JSON.parse(tree.readContent('angular.json'));
      originalContent
        .projects['migration-test']
        .architect
        .build
        .options
        .polyfills = 'foo/src/polyfills.ts';
      tree.overwrite('angular.json', JSON.stringify(originalContent));
      const polyfillPath = '/foo/src/polyfills.ts';
      tree.create(polyfillPath, polyfills);
      tree = await schematicRunner.runSchematicAsync('migration-07', defaultOptions, tree).toPromise();
      const newPolyfills = tree.readContent(polyfillPath);
      expect(newPolyfills).not.toContain('core-js/es6/symbol');
      expect(newPolyfills).not.toContain('core-js/es6/set');
      expect(newPolyfills).toContain('zone.js');
      expect(newPolyfills).toContain('Zone');

      // We don't want to drop this commented import comments
      expect(newPolyfills).toContain('core-js/es6/reflect');
      expect(newPolyfills).toContain('core-js/es7/reflect');
      expect(newPolyfills).toContain('BROWSER POLYFILLS');
    });
  });
});
