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

const renames = [
  'use-lifecycle-interface',
  'no-host-metadata-property',
  'no-outputs-metadata-property',
  'no-inputs-metadata-property',
];

describe('Migration to version 8', () => {
  const schematicRunner = new SchematicTestRunner(
    'migrations',
    require.resolve('../migration-collection.json'),
  );

  let tree: UnitTestTree;
  const tslintPath = '/tslint.json';
  const packageJsonPath = '/package.json';
  const baseConfig = {};
  const defaultOptions = {};
  const configPath = `/angular-cli.json`;
  const tslintConfig = {
    rules: {
      'directive-selector': [
        true,
        'attribute',
        'app',
        'camelCase',
      ],
      'component-selector': [
        true,
        'element',
        'app',
        'kebab-case',
      ],
      'no-output-on-prefix': true,
      'use-input-property-decorator': true,
      'use-output-property-decorator': true,
      'use-host-property-decorator': true,
      'no-input-rename': true,
      'no-output-rename': true,
      'use-life-cycle-interface': true,
      'use-pipe-transform-interface': true,
      'component-class-suffix': true,
      'directive-class-suffix': true,
    },
  };
  const packageJson = {
    devDependencies: {
      codelyzer: '^4.5.0',
    },
  };

  describe('Migration of codelyzer to version 5', () => {
    beforeEach(() => {
      tree = new UnitTestTree(new EmptyTree());
      tree.create(configPath, JSON.stringify(baseConfig, null, 2));
      tree.create(packageJsonPath, JSON.stringify(packageJson, null, 2));
      tree.create(tslintPath, JSON.stringify(tslintConfig, null, 2));
    });

    it('should rename all previous rules', async () => {
      tree = await schematicRunner.runSchematicAsync('migration-07', defaultOptions, tree).toPromise();
      const tslint = JSON.parse(tree.readContent(tslintPath));
      for (const rule of renames) {
        expect(rule in tslint.rules).toBeTruthy(`Rule ${rule} not renamed`);
      }
    });

    it('should update codelyzer\'s version', async () => {
      tree = await schematicRunner.runSchematicAsync('migration-07', defaultOptions, tree).toPromise();
      const packageJson = JSON.parse(tree.readContent(packageJsonPath));
      expect(packageJson.devDependencies.codelyzer).toBe('^5.0.1');
    });
  });
});
