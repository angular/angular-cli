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
  const defaultOptions = {};
  const lazyRoutePath = '/lazy-route.ts';
  const lazyRoute = `

import { Route } from '@angular/router';

const routes: Array<Route> = [
  {
    path: '',
    loadChildren: './lazy/lazy.module#LazyModule'
  }
];

`;

  const lazyChildRoute = `

import { Route } from '@angular/router';

const routes: Array<Route> = [
  {
    path: '',
    children: [{
      path: 'child',
      loadChildren: './lazy/lazy.module#LazyModule'
    }]
  }
];

`;
  const packageJson = {
    devDependencies: {
      codelyzer: '^4.5.0',
    },
  };
  const packageJsonPath = '/package.json';

  describe('Migration to import() style lazy routes', () => {
    beforeEach(() => {
      tree = new UnitTestTree(new EmptyTree());
      tree.create(packageJsonPath, JSON.stringify(packageJson, null, 2));
    });

    it('should replace the module path string', () => {
      tree.create(lazyRoutePath, lazyRoute);
      tree = schematicRunner.runSchematic('migration-07', defaultOptions, tree);
      const routes = tree.readContent(lazyRoutePath);
      expect(routes).not.toContain('./lazy/lazy.module#LazyModule');

      expect(routes).toContain(
        `loadChildren: () => import('./lazy/lazy.module').then(m => m.LazyModule)`);
    });

    it('should replace the module path string in a child path', () => {
      tree.create(lazyRoutePath, lazyChildRoute);
      tree = schematicRunner.runSchematic('migration-07', defaultOptions, tree);
      const routes = tree.readContent(lazyRoutePath);
      expect(routes).not.toContain('./lazy/lazy.module#LazyModule');

      expect(routes).toContain(
        `loadChildren: () => import('./lazy/lazy.module').then(m => m.LazyModule)`);
    });
  });
});
