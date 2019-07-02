/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { EmptyTree } from '@angular-devkit/schematics';
import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';

function readWorkspaceConfig(tree: UnitTestTree) {
  return JSON.parse(tree.readContent('/angular.json'));
}

const scriptsWithLazy = [
  { bundleName: 'one', input: 'one.js', lazy: false },
  { bundleName: 'two', input: 'two.js', lazy: true },
  { bundleName: 'tree', input: 'tree.js' },
  'four.js',
]

const scriptsExpectWithLazy = [
  { bundleName: 'one', input: 'one.js' },
  { bundleName: 'two', inject: false, input: 'two.js' },
  { bundleName: 'tree', input: 'tree.js' },
  'four.js',
]

const stylesWithLazy = [
  { bundleName: 'one', input: 'one.css', lazy: false },
  { bundleName: 'two', input: 'two.css', lazy: true },
  { bundleName: 'tree', input: 'tree.css' },
  'four.css',
]

const stylesExpectWithLazy = [
  { bundleName: 'one', input: 'one.css' },
  { bundleName: 'two', inject: false, input: 'two.css' },
  { bundleName: 'tree', input: 'tree.css' },
  'four.css',
]

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

    it('should update scripts in build target', () => {
      let config = readWorkspaceConfig(tree);
      let build = config.projects['migration-test'].architect.build;
      build.options.scripts = scriptsWithLazy;
      build.configurations.production.scripts = scriptsWithLazy;

      tree.overwrite(workspacePath, JSON.stringify(config));
      const tree2 = schematicRunner.runSchematic('migration-09', {}, tree.branch());
      config = readWorkspaceConfig(tree2);
      build = config.projects['migration-test'].architect.build;
      expect(build.options.scripts).toEqual(scriptsExpectWithLazy);
      expect(build.configurations.production.scripts).toEqual(scriptsExpectWithLazy);
    });

    it('should update styles in build target', () => {
      let config = readWorkspaceConfig(tree);
      let build = config.projects['migration-test'].architect.build;
      build.options.styles = stylesWithLazy;
      build.configurations.production.styles = stylesWithLazy;

      tree.overwrite(workspacePath, JSON.stringify(config));
      const tree2 = schematicRunner.runSchematic('migration-09', {}, tree.branch());
      config = readWorkspaceConfig(tree2);
      build = config.projects['migration-test'].architect.build;
      expect(build.options.styles).toEqual(stylesExpectWithLazy);
      expect(build.configurations.production.styles).toEqual(stylesExpectWithLazy);
    });

    it('should update scripts in test target', () => {
      let config = readWorkspaceConfig(tree);
      let test = config.projects['migration-test'].architect.test;
      test.options.scripts = scriptsWithLazy;
      test.configurations = { production: { scripts: scriptsWithLazy } };

      tree.overwrite(workspacePath, JSON.stringify(config));
      const tree2 = schematicRunner.runSchematic('migration-09', {}, tree.branch());
      config = readWorkspaceConfig(tree2);
      test = config.projects['migration-test'].architect.test;
      expect(test.options.scripts).toEqual(scriptsExpectWithLazy);
      expect(test.configurations.production.scripts).toEqual(scriptsExpectWithLazy);
    });

    it('should update styles in test target', () => {
      let config = readWorkspaceConfig(tree);
      let test = config.projects['migration-test'].architect.test;
      test.options.styles = stylesWithLazy;
      test.configurations = { production: { styles: stylesWithLazy } };

      tree.overwrite(workspacePath, JSON.stringify(config));
      const tree2 = schematicRunner.runSchematic('migration-09', {}, tree.branch());
      config = readWorkspaceConfig(tree2);
      test = config.projects['migration-test'].architect.test;
      expect(test.options.styles).toEqual(stylesExpectWithLazy);
      expect(test.configurations.production.styles).toEqual(stylesExpectWithLazy);
    });
  });
});
