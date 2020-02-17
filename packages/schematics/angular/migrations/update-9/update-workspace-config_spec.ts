/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { EmptyTree } from '@angular-devkit/schematics';
import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import { latestVersions } from '../../utility/latest-versions';
import { WorkspaceTargets } from '../../utility/workspace-models';
import { ANY_COMPONENT_STYLE_BUDGET } from './update-workspace-config';

// tslint:disable-next-line: no-any
export function getWorkspaceTargets(tree: UnitTestTree, project = 'migration-test'): any {
  return JSON.parse(tree.readContent(workspacePath)).projects[project].architect;
}

export function updateWorkspaceTargets(
  tree: UnitTestTree,
  workspaceTargets: WorkspaceTargets,
  project = 'migration-test',
) {
  const config = JSON.parse(tree.readContent(workspacePath));
  config.projects[project].architect = workspaceTargets;
  tree.overwrite(workspacePath, JSON.stringify(config, undefined, 2));
}

const scriptsWithLazy = [
  { bundleName: 'one', input: 'one.js', lazy: false },
  { bundleName: 'two', input: 'two.js', lazy: true },
  { bundleName: 'tree', input: 'tree.js' },
  'four.js',
];

const scriptsExpectWithLazy = [
  { bundleName: 'one', input: 'one.js' },
  { bundleName: 'two', inject: false, input: 'two.js' },
  { bundleName: 'tree', input: 'tree.js' },
  'four.js',
];

const stylesWithLazy = [
  { bundleName: 'one', input: 'one.css', lazy: false },
  { bundleName: 'two', input: 'two.css', lazy: true },
  { bundleName: 'tree', input: 'tree.css' },
  'four.css',
];

const stylesExpectWithLazy = [
  { bundleName: 'one', input: 'one.css' },
  { bundleName: 'two', inject: false, input: 'two.css' },
  { bundleName: 'tree', input: 'tree.css' },
  'four.css',
];

const workspacePath = '/angular.json';

// tslint:disable:no-big-function
describe('Migration to version 9', () => {
  describe('Migrate workspace config', () => {
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
          'ng-new',
          {
            name: 'migration-test',
            version: '1.2.3',
            directory: '.',
          },
          tree,
        )
        .toPromise();
    });

    describe('scripts and style options', () => {
      it('should update scripts in build target', async () => {
        let config = getWorkspaceTargets(tree);
        config.build.options.scripts = scriptsWithLazy;
        config.build.configurations.production.scripts = scriptsWithLazy;

        updateWorkspaceTargets(tree, config);
        const tree2 = await schematicRunner.runSchematicAsync('workspace-version-9', {}, tree.branch()).toPromise();
        config = getWorkspaceTargets(tree2).build;
        expect(config.options.scripts).toEqual(scriptsExpectWithLazy);
        expect(config.configurations.production.scripts).toEqual(scriptsExpectWithLazy);
      });

      it('should update styles in build target', async () => {
        let config = getWorkspaceTargets(tree);
        config.build.options.styles = stylesWithLazy;
        config.build.configurations.production.styles = stylesWithLazy;

        updateWorkspaceTargets(tree, config);
        const tree2 = await schematicRunner.runSchematicAsync('workspace-version-9', {}, tree.branch()).toPromise();
        config = getWorkspaceTargets(tree2).build;
        expect(config.options.styles).toEqual(stylesExpectWithLazy);
        expect(config.configurations.production.styles).toEqual(stylesExpectWithLazy);
      });

      it('should update scripts in test target', async () => {
        let config = getWorkspaceTargets(tree);
        config.test.options.scripts = scriptsWithLazy;
        config.test.configurations = { production: { scripts: scriptsWithLazy } };

        updateWorkspaceTargets(tree, config);
        const tree2 = await schematicRunner.runSchematicAsync('workspace-version-9', {}, tree.branch()).toPromise();
        config = getWorkspaceTargets(tree2).test;
        expect(config.options.scripts).toEqual(scriptsExpectWithLazy);
        expect(config.configurations.production.scripts).toEqual(scriptsExpectWithLazy);
      });

      it('should update styles in test target', async () => {
        let config = getWorkspaceTargets(tree);
        config.test.options.styles = stylesWithLazy;
        config.test.configurations = { production: { styles: stylesWithLazy } };

        updateWorkspaceTargets(tree, config);
        const tree2 = await schematicRunner.runSchematicAsync('workspace-version-9', {}, tree.branch()).toPromise();
        config = getWorkspaceTargets(tree2).test;
        expect(config.options.styles).toEqual(stylesExpectWithLazy);
        expect(config.configurations.production.styles).toEqual(stylesExpectWithLazy);
      });
    });

    describe('anyComponentStyle bundle budget', () => {
      it('should not append budget when already exists', async () => {
        const defaultBudget = [
          { type: 'initial', maximumWarning: '2mb', maximumError: '5mb' },
          { type: 'anyComponentStyle', maximumWarning: '10kb', maximumError: '50kb' },
        ];

        let config = getWorkspaceTargets(tree);
        config.build.configurations.production.budgets = defaultBudget;
        updateWorkspaceTargets(tree, config);

        const tree2 = await schematicRunner.runSchematicAsync('workspace-version-9', {}, tree.branch()).toPromise();
        config = getWorkspaceTargets(tree2).build;
        expect(config.configurations.production.budgets).toEqual(defaultBudget);
      });

      it('should append budget in build target', async () => {
        const defaultBudget = [{ type: 'initial', maximumWarning: '2mb', maximumError: '5mb' }];
        let config = getWorkspaceTargets(tree);
        config.build.configurations.production.budgets = defaultBudget;
        updateWorkspaceTargets(tree, config);

        const tree2 = await schematicRunner.runSchematicAsync('workspace-version-9', {}, tree.branch()).toPromise();
        config = getWorkspaceTargets(tree2).build;
        expect(config.configurations.production.budgets).toEqual([
          ...defaultBudget,
          ANY_COMPONENT_STYLE_BUDGET,
        ]);
      });

      it('should add budget in build target', async () => {
        let config = getWorkspaceTargets(tree);
        config.build.configurations.production.budgets = undefined;
        updateWorkspaceTargets(tree, config);

        const tree2 = await schematicRunner.runSchematicAsync('workspace-version-9', {}, tree.branch()).toPromise();
        config = getWorkspaceTargets(tree2).build;
        expect(config.configurations.production.budgets).toEqual([ANY_COMPONENT_STYLE_BUDGET]);
      });
    });

    describe('aot option', () => {
      it('should update aot option when false', async () => {
        let config = getWorkspaceTargets(tree);
        config.build.options.aot = false;
        updateWorkspaceTargets(tree, config);

        const tree2 = await schematicRunner.runSchematicAsync('workspace-version-9', {}, tree.branch()).toPromise();
        config = getWorkspaceTargets(tree2).build;
        expect(config.options.aot).toBe(true);
      });

      it('should add aot option when not defined', async () => {
        let config = getWorkspaceTargets(tree);
        config.build.options.aot = undefined;
        updateWorkspaceTargets(tree, config);

        const tree2 = await schematicRunner.runSchematicAsync('workspace-version-9', {}, tree.branch()).toPromise();
        config = getWorkspaceTargets(tree2).build;
        expect(config.options.aot).toBe(true);
      });

      it('should not add aot option when opted-out of Ivy', async () => {
        const tsConfig = JSON.stringify(
          {
            extends: './tsconfig.json',
            angularCompilerOptions: {
              enableIvy: false,
            },
          },
          null,
          2,
        );

        tree.overwrite('/tsconfig.app.json', tsConfig);

        let config = getWorkspaceTargets(tree);
        config.build.options.aot = false;
        updateWorkspaceTargets(tree, config);

        const tree2 = await schematicRunner.runSchematicAsync('workspace-version-9', {}, tree.branch()).toPromise();
        config = getWorkspaceTargets(tree2).build;
        expect(config.options.aot).toBe(false);
      });

      it('should not add aot option when opted-out of Ivy in workspace', async () => {
        const tsConfig = JSON.stringify(
          {
            angularCompilerOptions: {
              enableIvy: false,
            },
          },
          null,
          2,
        );

        tree.overwrite('/tsconfig.json', tsConfig);

        let config = getWorkspaceTargets(tree);
        config.build.options.aot = false;
        updateWorkspaceTargets(tree, config);

        const tree2 = await schematicRunner.runSchematicAsync('workspace-version-9', {}, tree.branch()).toPromise();
        config = getWorkspaceTargets(tree2).build;
        expect(config.options.aot).toBe(false);
      });

      it('should remove aot option from production configuration', async () => {
        let config = getWorkspaceTargets(tree);
        config.build.options.aot = false;
        config.build.configurations.production.aot = true;
        updateWorkspaceTargets(tree, config);

        const tree2 = await schematicRunner.runSchematicAsync('workspace-version-9', {}, tree.branch()).toPromise();
        config = getWorkspaceTargets(tree2).build;
        expect(config.options.aot).toBe(true);
        expect(config.configurations.production.aot).toBeUndefined();
      });
    });

    describe('server optimization option', () => {
      beforeEach(async () => {
        tree = await schematicRunner
          .runExternalSchematicAsync(
            require.resolve('../../collection.json'),
            'universal',
            {
              clientProject: 'migration-test',
            },
            tree,
          )
          .toPromise();
      });

      it('should add optimization option when not defined', async () => {
        let config = getWorkspaceTargets(tree);
        config.server.configurations.production.optimization = undefined;
        updateWorkspaceTargets(tree, config);

        const tree2 = await schematicRunner.runSchematicAsync('workspace-version-9', {}, tree.branch()).toPromise();
        config = getWorkspaceTargets(tree2).server.configurations;
        expect(config.production.optimization).toBe(true);
      });

      it('should set optimization to true when false', async () => {
        let config = getWorkspaceTargets(tree);
        config.server.configurations.production.optimization = false;
        updateWorkspaceTargets(tree, config);

        const tree2 = await schematicRunner.runSchematicAsync('workspace-version-9', {}, tree.branch()).toPromise();
        config = getWorkspaceTargets(tree2).server.configurations;
        expect(config.production.optimization).toBe(true);
      });

      it('should set optimization to true when optimization is fine grained', async () => {
        let config = getWorkspaceTargets(tree);
        config.server.configurations.production.optimization = {
          scripts: false,
          styles: true,
        };
        updateWorkspaceTargets(tree, config);

        const tree2 = await schematicRunner.runSchematicAsync('workspace-version-9', {}, tree.branch()).toPromise();
        config = getWorkspaceTargets(tree2).server.configurations;
        expect(config.production.optimization).toBe(true);
      });
    });

  });
});
