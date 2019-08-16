/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { EmptyTree } from '@angular-devkit/schematics';
import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import { WorkspaceTargets } from '../../utility/workspace-models';

// tslint:disable-next-line: no-any
function getWorkspaceTargets(tree: UnitTestTree): any {
  return JSON.parse(tree.readContent(workspacePath))
    .projects['migration-lib'].architect;
}

function updateWorkspaceTargets(tree: UnitTestTree, workspaceTargets: WorkspaceTargets) {
  const config = JSON.parse(tree.readContent(workspacePath));
  config.projects['migration-lib'].architect = workspaceTargets;
  tree.overwrite(workspacePath, JSON.stringify(config, undefined, 2));
}

const workspacePath = '/angular.json';
const libProdTsConfig = 'migration-lib/tsconfig.lib.prod.json';

// tslint:disable:no-big-function
describe('Migration to version 9', () => {
  describe('Migrate Ivy Libraries', () => {
    const schematicRunner = new SchematicTestRunner(
      'migrations',
      require.resolve('../migration-collection.json'),
    );

    let tree: UnitTestTree;

    beforeEach(async () => {
      tree = new UnitTestTree(new EmptyTree());
      tree = await schematicRunner
        .runExternalSchematicAsync(
          require.resolve('../../collection.json'),
          'workspace',
          {
            name: 'migration-test',
            version: '1.2.3',
            directory: '.',
          },
          tree,
        )
        .toPromise();
      tree = await schematicRunner
        .runExternalSchematicAsync(
          require.resolve('../../collection.json'),
          'library',
          {
            name: 'migration-lib',
          },
          tree,
        )
        .toPromise();

      tree.delete(libProdTsConfig);
    });

    it(`should add 'tsConfig' option in production when configurations doesn't exists`, async () => {
      let config = getWorkspaceTargets(tree);
      config.build.configurations = undefined;

      updateWorkspaceTargets(tree, config);

      const tree2 = await schematicRunner.runSchematicAsync('migration-09', {}, tree.branch()).toPromise();
      config = getWorkspaceTargets(tree2).build;
      expect(config.configurations.production.tsConfig).toEqual(libProdTsConfig);
      expect(tree2.exists(libProdTsConfig)).toBeTruthy();
    });

    it(`should add 'tsConfig' option in production when configurations exists`, async () => {
      let config = getWorkspaceTargets(tree);
      config.build.configurations = {};

      updateWorkspaceTargets(tree, config);

      const tree2 = await schematicRunner.runSchematicAsync('migration-09', {}, tree.branch()).toPromise();
      config = getWorkspaceTargets(tree2).build;
      expect(config.configurations.production.tsConfig).toEqual(libProdTsConfig);
      expect(tree2.exists(libProdTsConfig)).toBeTruthy();
    });

    it(`should add 'tsConfig' option in production when production configurations exists`, async () => {
      let config = getWorkspaceTargets(tree);
      config.build.configurations = { production: {} };

      updateWorkspaceTargets(tree, config);

      const tree2 = await schematicRunner.runSchematicAsync('migration-09', {}, tree.branch()).toPromise();
      config = getWorkspaceTargets(tree2).build;
      expect(config.configurations.production.tsConfig).toEqual(libProdTsConfig);
      expect(tree2.exists(libProdTsConfig)).toBeTruthy();
    });

    it(`should add enableIvy false in prod tsconfig if already exists`, async () => {
      let config = getWorkspaceTargets(tree);
      const prodLibTsConfig = 'migration-lib/tsconfig.library.prod.json';
      config.build.configurations = { production: { tsConfig: prodLibTsConfig } };

      updateWorkspaceTargets(tree, config);

      const tsconfig = {
        compilerOptions: {},
      };

      tree.create(prodLibTsConfig, JSON.stringify(tsconfig, undefined, 2));

      const tree2 = await schematicRunner.runSchematicAsync('migration-09', {}, tree.branch()).toPromise();
      config = getWorkspaceTargets(tree2).build;
      expect(config.configurations.production.tsConfig).toEqual(prodLibTsConfig);

      const tsConfigContent = tree2.readContent(prodLibTsConfig);
      expect(JSON.parse(tsConfigContent).angularCompilerOptions).toEqual({ enableIvy: false });
    });

    it('should set enableIvy to false in prod tsconfig if true', async () => {
      let config = getWorkspaceTargets(tree);
      const prodLibTsConfig = 'migration-lib/tsconfig.library.prod.json';
      config.build.configurations = { production: { tsConfig: prodLibTsConfig } };

      updateWorkspaceTargets(tree, config);

      const tsconfig = {
        compilerOptions: {},
        angularCompilerOptions: {
          enableIvy: true,
        },
      };

      tree.create(prodLibTsConfig, JSON.stringify(tsconfig, undefined, 2));

      const tree2 = await schematicRunner.runSchematicAsync('migration-09', {}, tree.branch()).toPromise();
      config = getWorkspaceTargets(tree2).build;
      expect(config.configurations.production.tsConfig).toEqual(prodLibTsConfig);

      const tsConfigContent = tree2.readContent(prodLibTsConfig);
      expect(JSON.parse(tsConfigContent).angularCompilerOptions).toEqual({ enableIvy: false });
    });
  });
});
