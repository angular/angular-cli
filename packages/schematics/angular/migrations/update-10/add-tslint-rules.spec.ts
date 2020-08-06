/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { EmptyTree } from '@angular-devkit/schematics';
import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';

describe('Migration add new tslint rules', () => {
  const schematicRunner = new SchematicTestRunner(
    'migrations',
    require.resolve('../migration-collection.json'),
  );

  let tree: UnitTestTree;
  const TSLINT_PATH = '/tslint.json';

  beforeEach(() => {
    tree = new UnitTestTree(new EmptyTree());
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

    const newTree = await schematicRunner.runSchematicAsync('add-tslint-rules', {}, tree).toPromise();
    const { rules } = JSON.parse(newTree.readContent(TSLINT_PATH));
    expect(rules['deprecation'].severity).toBe('warning');
    expect(rules['typedef']).toEqual([true, 'call-signature']);
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

    const newTree = await schematicRunner.runSchematicAsync('add-tslint-rules', {}, tree).toPromise();
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

    const newTree = await schematicRunner.runSchematicAsync('add-tslint-rules', {}, tree).toPromise();
    const { rules } = JSON.parse(newTree.readContent(TSLINT_PATH));
    expect(rules['deprecation'].severity).toBe('error');
  });
});
