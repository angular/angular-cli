/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Action, EmptyTree } from '@angular-devkit/schematics';
import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';

// Randomly import stuff (including es6 and es7 reflects).
const oldPolyfills = `
/** IE9, IE10 and IE11 requires all of the following polyfills. **/
// import 'core-js/es6/symbol';
// import 'core-js/es6/object';
import 'core-js/es6/function';
import 'core-js/es6/parse-int';
// import 'core-js/es6/parse-float';
import 'core-js/es6/number';
// import 'core-js/es6/math';
// import 'core-js/es6/string';
import 'core-js/es6/date';
// import 'core-js/es6/array';
// import 'core-js/es6/regexp';

/** IE10 and IE11 requires the following for the Reflect API. */
import 'core-js/es6/reflect';


/** Evergreen browsers require these. **/
// Used for reflect-metadata in JIT. If you use AOT (and only Angular decorators), you can remove.
import 'core-js/es7/reflect';

import 'web-animations-js';  // Run \`npm install --save web-animations-js\`.

 (window as any).__Zone_disable_requestAnimationFrame = true; // disable patch requestAnimationFrame
 (window as any).__Zone_disable_on_property = true; // disable patch onProperty such as onclick

/***************************************************************************************************
 * Zone JS is required by default for Angular itself.
 */
import 'zone.js/dist/zone';  // Included with Angular CLI.
`;

const newPolyfills = `
/** IE9, IE10 and IE11 requires all of the following polyfills. **/
// import 'core-js/es6/symbol';
// import 'core-js/es6/object';
import 'core-js/es6/function';
import 'core-js/es6/parse-int';
// import 'core-js/es6/parse-float';
import 'core-js/es6/number';
// import 'core-js/es6/math';
// import 'core-js/es6/string';
import 'core-js/es6/date';
// import 'core-js/es6/array';
// import 'core-js/es6/regexp';

/** IE10 and IE11 requires the following for the Reflect API. */
import 'core-js/es6/reflect';

import 'web-animations-js';  // Run \`npm install --save web-animations-js\`.

 (window as any).__Zone_disable_requestAnimationFrame = true; // disable patch requestAnimationFrame
 (window as any).__Zone_disable_on_property = true; // disable patch onProperty such as onclick

/***************************************************************************************************
 * Zone JS is required by default for Angular itself.
 */
import 'zone.js/dist/zone';  // Included with Angular CLI.
`;


describe('polyfillMetadataRule', () => {
  const schematicRunner = new SchematicTestRunner(
    'migrations',
    require.resolve('../migration-collection.json'),
  );

  let tree: UnitTestTree;

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
  });

  it('is noop for new projects', async () => {
    const mapToIdem = (x: Action) => {
      const content = (x.kind == 'o' || x.kind == 'c') ? x.content.toString() : null;

      return { ...x, content, id: -1 };
    };

    const expected = [...tree.actions.map(mapToIdem)];
    const tree2 = await schematicRunner.runSchematicAsync('migration-03', {}, tree.branch())
      .toPromise();

    expect(tree2.actions.map(mapToIdem)).toEqual(expected);
  });

  it('should work as expected', async () => {
    const polyfillPath = '/src/polyfills.ts';
    tree.overwrite(polyfillPath, oldPolyfills);
    const tree2 = await schematicRunner.runSchematicAsync('migration-03', {}, tree.branch())
      .toPromise();

    expect(tree2.readContent(polyfillPath)).toBe(newPolyfills);
  });

  it('should work as expected for a project with a root', async () => {
    const originalContent = JSON.parse(tree.readContent('angular.json'));
    originalContent.projects['migration-test'].root = 'src';
    tree.overwrite('angular.json', JSON.stringify(originalContent));
    const polyfillPath = '/src/polyfills.ts';
    tree.overwrite(polyfillPath, oldPolyfills);
    const tree2 = await schematicRunner.runSchematicAsync('migration-03', {}, tree.branch())
      .toPromise();

    expect(tree2.readContent(polyfillPath)).toBe(newPolyfills);
  });
});
