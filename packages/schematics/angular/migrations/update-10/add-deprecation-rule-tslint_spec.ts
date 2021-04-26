/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { EmptyTree } from '@angular-devkit/schematics';
import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';

describe('Migration of tslint to version 6', () => {
  const schematicRunner = new SchematicTestRunner(
    'migrations',
    require.resolve('../migration-collection.json'),
  );

  let tree: UnitTestTree;
  const TSLINT_PATH = '/tslint.json';
  const PACKAGE_JSON_PATH = '/package.json';

  const PACKAGE_JSON = {
    devDependencies: {
      tslint: '~6.1.0',
    },
  };

  beforeEach(() => {
    tree = new UnitTestTree(new EmptyTree());
    tree.create(PACKAGE_JSON_PATH, JSON.stringify(PACKAGE_JSON, null, 2));
  });

  it('should add new rules', async () => {
    const config = {
      extends: 'tslint:recommended',
      rules: {
        'no-use-before-declare': true,
        'arrow-return-shorthand': false,
        'label-position': true,
      },
    };
    tree.create(TSLINT_PATH, JSON.stringify(config, null, 2));

    const newTree = await schematicRunner.runSchematicAsync('tslint-add-deprecation-rule', {}, tree).toPromise();
    const { rules } = JSON.parse(newTree.readContent(TSLINT_PATH));
    expect(rules['deprecation'].severity).toBe('warning');
  });

  it('should not update already present rules', async () => {
    const config = {
      extends: 'tslint:recommended',
      rules: {
        'no-use-before-declare': true,
        'arrow-return-shorthand': false,
        'label-position': true,
        deprecation: false,
      },
    };
    tree.create(TSLINT_PATH, JSON.stringify(config, null, 2));

    const newTree = await schematicRunner.runSchematicAsync('tslint-add-deprecation-rule', {}, tree).toPromise();
    const { rules } = JSON.parse(newTree.readContent(TSLINT_PATH));
    expect(rules['deprecation']).toBe(false);
  });

  it('should not update already present rules with different severity', async () => {
    const config = {
      extends: 'tslint:recommended',
      rules: {
        'no-use-before-declare': true,
        'arrow-return-shorthand': false,
        'label-position': true,
        deprecation: {
          severity: 'error',
        },
      },
    };
    tree.create(TSLINT_PATH, JSON.stringify(config, null, 2));

    const newTree = await schematicRunner.runSchematicAsync('tslint-add-deprecation-rule', {}, tree).toPromise();
    const { rules } = JSON.parse(newTree.readContent(TSLINT_PATH));
    expect(rules['deprecation'].severity).toBe('error');
  });
});
