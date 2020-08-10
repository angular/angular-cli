/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { EmptyTree } from '@angular-devkit/schematics';
import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';

describe('Migration of add typedef tslint rule', () => {
  const schematicName = 'tslint-add-typedef-rule';

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
    tree.create(TSLINT_PATH, JSON.stringify({ rules: {} }, null, 2));
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
    tree.overwrite(TSLINT_PATH, JSON.stringify(config, null, 2));

    const newTree = await schematicRunner.runSchematicAsync(schematicName, {}, tree).toPromise();
    const { rules } = JSON.parse(newTree.readContent(TSLINT_PATH));
    expect(rules['typedef']).toEqual([true, 'call-signature']);
  });

  it('should not update already present rules', async () => {
    const config = {
      extends: 'tslint:recommended',
      rules: {
        'no-use-before-declare': true,
        'arrow-return-shorthand': false,
        'label-position': true,
        typedef: false,
      },
    };
    tree.overwrite(TSLINT_PATH, JSON.stringify(config, null, 2));

    const newTree = await schematicRunner.runSchematicAsync(schematicName, {}, tree).toPromise();
    const { rules } = JSON.parse(newTree.readContent(TSLINT_PATH));
    expect(rules['typedef']).toBe(false);
  });

  it('should add tslint:disable-next-line comments to offending code.', async () => {
    tree.create('/main.ts', `
      export function bar(): boolean {
        return true;
      }

      /** @deprecated */
      export function foo() {
        return true;
      }
    `);

    tree.create('/index.ts', `
      export class Foo {
        bar(): boolean {
          return true;
        }

        baz() {
          return true;
        }
      }
    `);

    const newTree = await schematicRunner.runSchematicAsync(schematicName, {}, tree).toPromise();
    expect(newTree.readContent('/main.ts')).toContain(`
      /** @deprecated */
      // tslint:disable-next-line:typedef
      export function foo() {
        return true;
      }
    `);

    expect(newTree.readContent('/index.ts')).toContain(`
        // tslint:disable-next-line:typedef
        baz() {
          return true;
        }
    `);
  });
});
